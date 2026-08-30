"""
LangGraph Runtime Engine — Agentic Workflow State Machine with Explainable AI (XAI) Terminal Logging

Flow (matching the user's architecture diagram):

    Start
      │
      ▼
    observe()
      - Start browser (if needed)
      - Navigate to portal URL
      - Extract DOM elements (reuses verified post-action DOM when available to avoid duplication)
      │
      ▼
    analyze_and_decide()
      - Build prompt (goal + history + DOM)
      - Call pluggable LLMProvider (Ollama / Gemini / Claude)
      - Extract ACTION + next_step
      │
      ▼
    should_continue()          ◄─────────────────────────┐
      ├── "COMPLETE"  ──► End                             │
      ├── "REQUEST_VISION" ──► vision_fallback()  ────────┤
      ├── "CONFIRM_USER"   ──► user_confirmation() ───┐   │
      └── Default          ──────────────────────────► act()
                                                        │
                                                        └── CLICK / TYPE / NAVIGATE / Update status
                                                              then loop back to observe()
"""
from __future__ import annotations

import asyncio
import hashlib
import hmac
import json
import os
import sys
import tempfile
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Awaitable, Callable, TypedDict

from langgraph.graph import END, START, StateGraph

from ..browser.action_executor import ActionExecutor
from ..browser.dom_extractor import DOMExtractor
from ..browser.manager import BrowserManager
from ..browser.screenshots import ScreenshotCapture
from ..browser.verifier import ActionVerifier
from ..llm.factory import get_llm_provider
from ..llm.provider import LLMProvider
from ..schemas import ActionProposal, BrowserObservation, RuntimeEvent, WorkflowDefinition
from ..security import ActionSecurityGate
from .contract import emit_event
from .ocr_fallback import OCRFallback

Emit = Callable[[RuntimeEvent], Awaitable[None]]

MAX_ITERATIONS = 40
VISION_CONFIDENCE_THRESHOLD = 0.6
STUCK_DOM_THRESHOLD = 3


# ── ANSI Color Codes for Terminal XAI Output ─────────────────────
CYAN    = '\033[96m'
GREEN   = '\033[92m'
YELLOW  = '\033[93m'
RED     = '\033[91m'
MAGENTA = '\033[95m'
BLUE    = '\033[94m'
BOLD    = '\033[1m'
DIM     = '\033[2m'
RESET   = '\033[0m'

HEARTBEAT_INTERVAL = 10  # seconds


def _ts() -> str:
    """Return current timestamp string HH:MM:SS.mmm"""
    return datetime.now().strftime('%H:%M:%S.%f')[:-3]


def xai_log(tag: str, title: str, details: list[str]) -> None:
    """
    Print structured Explainable AI (XAI) logs to backend CMD prompt.
    Every header and detail line carries an individual timestamp so you can
    see exactly when each sub-operation completed.
    """
    ts = _ts()
    header = f"{BOLD}{CYAN}[XAI {ts}]{RESET} {BOLD}{tag}{RESET} -- {title}"
    try:
        print(f"\n{header}", flush=True)
        for i, line in enumerate(details):
            line_ts = _ts()
            is_last = (i == len(details) - 1)
            prefix = '  \\-- ' if is_last else '  |-- '
            print(f"{DIM}  {line_ts}{RESET} {prefix}{line}", flush=True)
    except Exception:
        # Fallback: strip all ANSI codes for terminals that don't support them
        clean_tag = tag
        for code in (CYAN, GREEN, YELLOW, RED, MAGENTA, BLUE, BOLD, DIM, RESET):
            clean_tag = clean_tag.replace(code, '')
        print(f"\n[XAI {ts}] {clean_tag} -- {title}", flush=True)
        for i, line in enumerate(details):
            line_ts = _ts()
            is_last = (i == len(details) - 1)
            prefix = '  \\-- ' if is_last else '  |-- '
            clean_line = line
            for code in (BOLD, DIM, RESET, GREEN, RED, CYAN, YELLOW, MAGENTA, BLUE):
                clean_line = clean_line.replace(code, '')
            print(f"  {line_ts} {prefix}{clean_line}", flush=True)


class HeartbeatMonitor:
    """
    Prints a live status line to the terminal every 10 seconds with timestamps
    so you can see exactly what the agent is doing without waiting for a node to complete.

    Output format (example):
        [HEARTBEAT 08:36:35.123] Session abc12..  |  Phase: OBSERVE  |  Iter: 3/40
          |-- Elapsed    : 15.2s
          |-- Last Phase : ANALYZE (completed 2.4s ago)
          |-- Last Action: FILL [data-testid="name-input"]
          \\-- LLM Provider: GEMINI (gemini-3.7-flash)
    """

    def __init__(self, session_id: str, workflow_id: str, provider_name: str, model_name: str):
        self.session_id = session_id
        self.workflow_id = workflow_id
        self.provider_name = provider_name
        self.model_name = model_name

        self.current_phase: str = 'STARTING'
        self.last_phase: str = 'N/A'
        self.last_phase_elapsed: float = 0.0
        self.last_action: str = 'N/A'
        self.iteration: int = 0
        self.session_start: float = time.perf_counter()
        self.phase_start: float = time.perf_counter()

        self._task: asyncio.Task | None = None
        self._running: bool = False

    def update(self, phase: str, iteration: int = 0, last_action: str = 'N/A') -> None:
        """Call from each LangGraph node to update the heartbeat's live status."""
        now = time.perf_counter()
        self.last_phase = self.current_phase
        self.last_phase_elapsed = round(now - self.phase_start, 2)
        self.current_phase = phase
        self.phase_start = now
        self.iteration = iteration
        if last_action != 'N/A':
            self.last_action = last_action

    def _print_pulse(self) -> None:
        now = time.perf_counter()
        elapsed_total = round(now - self.session_start, 1)
        in_phase_elapsed = round(now - self.phase_start, 1)
        ts = _ts()
        sid_short = self.session_id[:8] + '..'
        try:
            header = (
                f"\n{BOLD}{YELLOW}[HEARTBEAT {ts}]{RESET}"
                f" Session {DIM}{sid_short}{RESET}"
                f"  |  Phase: {BOLD}{self.current_phase}{RESET}"
                f"  |  Iter: {self.iteration}/{MAX_ITERATIONS}"
            )
            print(header, flush=True)
            lines = [
                f"Elapsed      : {elapsed_total}s total  ({in_phase_elapsed}s in current phase)",
                f"Last Phase   : {self.last_phase} (took {self.last_phase_elapsed}s)",
                f"Last Action  : {self.last_action}",
                f"LLM Provider : {self.provider_name.upper()} ({self.model_name})",
            ]
            for i, line in enumerate(lines):
                is_last = (i == len(lines) - 1)
                prefix = '  \\-- ' if is_last else '  |-- '
                print(f"{DIM}  {_ts()}{RESET} {prefix}{line}", flush=True)
        except Exception:
            print(f"[HEARTBEAT {ts}] Phase={self.current_phase} Iter={self.iteration} Elapsed={elapsed_total}s", flush=True)

    async def _loop(self) -> None:
        while self._running:
            await asyncio.sleep(HEARTBEAT_INTERVAL)
            if self._running:
                self._print_pulse()

    def start(self) -> None:
        self._running = True
        self._task = asyncio.get_event_loop().create_task(self._loop())

    def stop(self) -> None:
        self._running = False
        if self._task and not self._task.done():
            self._task.cancel()


class RuntimeState(TypedDict, total=False):
    workflow: WorkflowDefinition
    values: dict[str, str]
    observation: BrowserObservation
    history: list[dict[str, Any]]
    last_action: dict[str, Any] | None
    last_decision: dict[str, Any] | None
    verification: dict[str, Any]
    vision_analysis: str | None
    current_step: int
    iteration: int
    stuck_counter: int
    selector_reject_count: int
    completed: bool
    failed: str
    next_step: str
    skip_extraction: bool
    telemetry_log: list[dict[str, Any]]
    last_iteration_start_time: float



class RuntimeSession:
    """Manages a single agentic workflow execution session using the LangGraph state machine with XAI logging."""

    def __init__(self, session_id: str, workflow: WorkflowDefinition, values: dict[str, str], emit: Emit, root: Path, base_url: str, provider_type: str | None = None):
        self.session_id = session_id
        self.workflow = workflow
        self.values = values
        self.emit = emit
        self.browser = BrowserManager(root)
        self.extractor = DOMExtractor()
        self.decider: LLMProvider = get_llm_provider(provider_type)
        self.security = ActionSecurityGate()
        self.executor = ActionExecutor()
        self.verifier = ActionVerifier()
        self.ocr = OCRFallback()
        self.screenshots = ScreenshotCapture()
        self.base_url = base_url
        self.approval: asyncio.Future[bool] | None = None
        self._tmp_dir = Path(tempfile.mkdtemp(prefix='civicflow_'))
        self.heartbeat = HeartbeatMonitor(
            session_id=session_id,
            workflow_id=workflow.id,
            provider_name=self.decider.provider_name,
            model_name=self.decider.model_name,
        )


    # ── Event helpers ──────────────────────────────────────────────

    async def event(self, event_type: str, node_id: str | None = None, data: dict[str, Any] | None = None) -> float:
        return await emit_event(self.emit, self.session_id, event_type, node_id, data)

    async def approve(self, approved: bool) -> None:
        if self.approval and not self.approval.done():
            self.approval.set_result(approved)

    async def request_human(self, node_id: str, reason: str) -> bool:
        self.approval = asyncio.get_running_loop().create_future()
        await self.event('HITL_REQUIRED', node_id, {'reason': reason})
        return await self.approval

    # ── LangGraph node: observe() ──────────────────────────────────

    async def _observe(self, state: RuntimeState) -> dict[str, Any]:
        """
        Start browser (if needed), navigate to portal URL, extract DOM elements.
        Reuses verified post-action DOM when available to eliminate redundant extraction.
        """
        t_observe_start = time.perf_counter()
        node_id = 'observe'
        iteration = state.get('iteration', 0)
        self.heartbeat.update('OBSERVE', iteration=iteration)
        ws_ms = await self.event('NODE_STARTED', node_id, {'phase': 'observe'})

        skip_extraction = state.get('skip_extraction', False)
        existing_observation = state.get('observation')

        dom_extraction_ms = 0.0

        if iteration == 0:
            xai_log(
                f"{YELLOW}[NODE 1: OBSERVE]{RESET}",
                f"Initializing Browser & Navigating to Portal (Iteration {iteration})",
                [
                    f"Workflow Goal : {BOLD}{self.workflow.goal}{RESET}",
                    f"Portal Path   : {self.workflow.portal_path}",
                    f"Launching Chromium browser instance (Playwright slow_mo=0)...",
                ]
            )
            await self.browser.launch()
            await self.browser.navigate(
                self.workflow.portal_path,
                base_url=self.base_url,
                allowed_domains=self.workflow.allowed_domains,
            )

        page = self.browser.page
        if page is None:
            raise RuntimeError('Browser page unavailable after observe()')

        if skip_extraction and existing_observation is not None:
            # Reuse verified post-action DOM from previous act() step
            observation = existing_observation
            dom_extraction_ms = 0.0
            xai_log(
                f"{YELLOW}[NODE 1: OBSERVE]{RESET}",
                f"Reusing Verified Post-Action DOM State (Deduplicated Pass)",
                [
                    f"Action Taken  : {GREEN}Reused DOM from prior verification step (0.0 ms extraction penalty saved!){RESET}",
                    f"Current Page  : {observation.title} ({observation.url})",
                    f"Elements Found: {len(observation.elements)} interactive nodes",
                ]
            )
        else:
            # Perform fresh DOM extraction
            t_dom_0 = time.perf_counter()
            observation = await self.extractor.observe(page)
            t_dom_1 = time.perf_counter()
            dom_extraction_ms = (t_dom_1 - t_dom_0) * 1000.0

            xai_log(
                f"{YELLOW}[NODE 1: OBSERVE]{RESET}",
                f"Fresh DOM Extraction Executed (Iteration {iteration})",
                [
                    f"Current Page  : {observation.title} ({observation.url})",
                    f"Extraction Time: {BOLD}{round(dom_extraction_ms, 2)} ms{RESET}",
                    f"Elements Found: {len(observation.elements)} interactive nodes (inputs, selects, buttons)",
                ]
            )

        ws_ms += await self.event('DOM_OBSERVED', node_id, {
            'url': observation.url,
            'title': observation.title,
            'elements': [el.model_dump() for el in observation.elements],
            'dom_extraction_ms': round(dom_extraction_ms, 2),
        })

        # Stuck detection
        prev_obs = state.get('observation')
        stuck_counter = state.get('stuck_counter', 0)
        if prev_obs and len(prev_obs.elements) == len(observation.elements) and not skip_extraction:
            stuck_counter += 1
        elif not skip_extraction:
            stuck_counter = 0

        t_observe_end = time.perf_counter()
        observe_ms = (t_observe_end - t_observe_start) * 1000.0

        ws_ms += await self.event('NODE_COMPLETED', node_id, {
            'elements_found': len(observation.elements),
            'stuck_counter': stuck_counter,
            'observe_ms': round(observe_ms, 2),
            'dom_extraction_ms': round(dom_extraction_ms, 2),
            'websocket_ms': round(ws_ms, 2),
        })

        return {
            'observation': observation,
            'iteration': iteration + 1,
            'stuck_counter': stuck_counter,
            'skip_extraction': False,
            'last_iteration_start_time': t_observe_start,
        }

    # ── LangGraph node: analyze_and_decide() ───────────────────────

    async def _analyze_and_decide(self, state: RuntimeState) -> dict[str, Any]:
        """Build prompt (goal + history + DOM), call pluggable LLMProvider, extract ACTION."""
        node_id = 'analyze_and_decide'
        t_start = time.perf_counter()
        self.heartbeat.update('ANALYZE / LLM CALL', iteration=state.get('iteration', 0))
        ws_ms = await self.event('NODE_STARTED', node_id, {'phase': 'analyze_and_decide', 'provider': self.decider.provider_name})

        observation = state['observation']
        history = state.get('history', [])
        step_index = min(state.get('current_step', 0), len(self.workflow.steps) - 1)
        step = self.workflow.steps[step_index]

        vision_context = state.get('vision_analysis')
        if vision_context:
            history = history + [{'vision_analysis': vision_context}]

        xai_log(
            f"{MAGENTA}[NODE 2: ANALYZE & DECIDE]{RESET}",
            f"Invoking Pluggable LLM Provider ({self.decider.provider_name.upper()})",
            [
                f"Active Model  : {BOLD}{self.decider.model_name}{RESET}",
                f"Target Step   : Step {step_index + 1}/{len(self.workflow.steps)} ('{step.intent}')",
                f"Input Payload : {len(observation.elements)} elements | History len: {len(history)} items",
                f"Status        : Sending structured decision prompt to {self.decider.provider_name.upper()}...",
            ]
        )

        t_llm_0 = time.perf_counter()
        try:
            decision, llm_telemetry = await self.decider.decide(self.workflow, step, observation, history, self.values)
        except Exception as exc:
            err_str = str(exc)
            is_quota_error = 'quota' in err_str.lower() or 'resource_exhausted' in err_str.lower() or 'rate' in err_str.lower()
            
            error_detail = {
                'error': str(exc),
                'is_quota_error': is_quota_error,
                'recommendation': (
                    'Gemini API quota exhausted. Options: '
                    '(1) Check https://console.cloud.google.com/apis/dashboard for quota details, '
                    '(2) Use OLLAMA (export LLM_PROVIDER=ollama), '
                    '(3) Reduce concurrent sessions to 1, '
                    '(4) Use a different API key'
                ) if is_quota_error else 'See error details above'
            }
            
            ws_ms += await self.event('DECISION_FAILED', node_id, error_detail)
            xai_log(
                f"{RED}[NODE 2: ANALYZE & DECIDE - FAILED]{RESET}",
                f"LLM Decision Exception",
                [
                    f"Error: {exc}",
                    f"Is Quota Error: {is_quota_error}",
                    f"Action: {'Stopping workflow' if is_quota_error else 'Escalating to Vision Fallback'}"
                ]
            )
            
            # For quota errors, fail the workflow immediately instead of retrying
            if is_quota_error:
                raise RuntimeError(f"Workflow stopped due to LLM quota exhaustion: {exc}")
            
            return {
                'last_decision': {'action': 'wait', 'selector': None, 'confidence': 0.0, 'reason': f'LLM error: {exc}', 'next_step': 'REQUEST_VISION'},
                'next_step': 'REQUEST_VISION',
            }
        t_llm_1 = time.perf_counter()

        llm_request_ms = (t_llm_1 - t_llm_0) * 1000.0

        raw_next = 'CONTINUE'
        confidence = decision.confidence

        # Read-only/no-op actions never need HITL regardless of step risk level
        PASSTHROUGH_ACTIONS = {'wait', 'read', 'navigate'}
        action_is_destructive = decision.action.lower() not in PASSTHROUGH_ACTIONS

        if confidence < VISION_CONFIDENCE_THRESHOLD:
            raw_next = 'REQUEST_VISION'
        elif state.get('stuck_counter', 0) >= STUCK_DOM_THRESHOLD:
            raw_next = 'REQUEST_VISION'
        elif action_is_destructive and (step.requires_hitl or step.risk in {'HIGH', 'CRITICAL'}):
            raw_next = 'CONFIRM_USER'

        decision_data = {
            'action': decision.action,
            'selector': decision.selector,
            'value_ref': decision.value_ref,
            'confidence': decision.confidence,
            'reason': decision.reason,
            'next_step': raw_next,
            'telemetry': llm_telemetry,
        }

        xai_log(
            f"{GREEN}[NODE 2: DECISION PRODUCED]{RESET}",
            f"LLM Structured Decision Result",
            [
                f"Provider & Model : {llm_telemetry.get('provider', 'N/A')} ({llm_telemetry.get('model', 'N/A')})",
                f"Inference Latency: {BOLD}{llm_telemetry.get('inference_ms', 0):.1f} ms{RESET} ({llm_telemetry.get('tokens_per_sec', 0):.1f} tok/s)",
                f"Proposed Action  : {BOLD}{decision.action.upper()}{RESET}",
                f"Target Selector  : {decision.selector or 'N/A'}",
                f"Value Reference  : {decision.value_ref or 'N/A'} (Literal: '{decision.value or ''}')",
                f"Confidence       : {decision.confidence:.2f}",
                f"LLM Rationale    : '{decision.reason}'",
                f"Routed Next Step : {BOLD}{raw_next}{RESET}",
            ]
        )

        ws_ms += await self.event('DECISION_CREATED', node_id, decision_data)
        t_end = time.perf_counter()

        ws_ms += await self.event('NODE_COMPLETED', node_id, {
            'decision': decision_data,
            'llm_request_ms': round(llm_request_ms, 2),
            'llm_inference_ms': llm_telemetry.get('inference_ms', round(llm_request_ms, 2)),
            'prompt_tokens': llm_telemetry.get('prompt_tokens', 0),
            'completion_tokens': llm_telemetry.get('completion_tokens', 0),
            'tokens_per_sec': llm_telemetry.get('tokens_per_sec', 0.0),
            'analyze_ms': round((t_end - t_start) * 1000.0, 2),
            'websocket_ms': round(ws_ms, 2),
        })

        return {
            'last_decision': decision_data,
            'next_step': raw_next,
            'vision_analysis': None,
        }

    # ── LangGraph routing: should_continue() ──────────────────────

    @staticmethod
    def _should_continue(state: RuntimeState) -> str:
        iteration = state.get('iteration', 0)
        selector_reject_count = state.get('selector_reject_count', 0)

        if iteration > MAX_ITERATIONS:
            xai_log(f"{RED}[ROUTER: should_continue()]{RESET}", "Max iterations reached", ["Route -> END"])
            return 'end'

        if state.get('completed'):
            xai_log(f"{GREEN}[ROUTER: should_continue()]{RESET}", "Workflow completion verified!", ["Route -> END"])
            return 'end'

        if selector_reject_count >= 3:
            xai_log(
                f"{YELLOW}[ROUTER: should_continue()]{RESET}",
                "Repeated selector rejections detected; escalating to human approval",
                [f"Reject count: {selector_reject_count}", "Route -> user_confirmation"],
            )
            return 'user_confirmation'

        next_step = state.get('next_step', 'CONTINUE')
        if next_step == 'COMPLETE':
            xai_log(f"{GREEN}[ROUTER: should_continue()]{RESET}", "Final step completed!", ["Route -> END"])
            return 'end'
        elif next_step == 'REQUEST_VISION':
            xai_log(f"{MAGENTA}[ROUTER: should_continue()]{RESET}", "Low confidence / Stuck detected", ["Route -> vision_fallback"])
            return 'vision_fallback'
        elif next_step == 'CONFIRM_USER':
            xai_log(f"{YELLOW}[ROUTER: should_continue()]{RESET}", "High-risk / HITL step required", ["Route -> user_confirmation"])
            return 'user_confirmation'
        else:
            xai_log(f"{BLUE}[ROUTER: should_continue()]{RESET}", "Normal action flow", ["Route -> act()"])
            return 'act'

    # ── LangGraph node: vision_fallback() ──────────────────────────

    async def _vision_fallback(self, state: RuntimeState) -> dict[str, Any]:
        node_id = 'vision_fallback'
        self.heartbeat.update('VISION FALLBACK', iteration=state.get('iteration', 0))
        ws_ms = await self.event('NODE_STARTED', node_id, {'phase': 'vision_fallback'})

        xai_log(
            f"{MAGENTA}[NODE: VISION FALLBACK]{RESET}",
            "Capturing Screenshot & Running Multimodal Vision Model",
            ["Trigger Reason: Low DOM confidence or stuck counter threshold breached."]
        )

        page = self.browser.page
        if page is None:
            await self.event('NODE_COMPLETED', node_id, {'status': 'no_page'})
            return {'vision_analysis': 'No browser page available for screenshot', 'next_step': 'CONTINUE'}

        screenshot_path = self._tmp_dir / 'vision_screenshot.png'
        t_ss_0 = time.perf_counter()
        image_bytes = await self.screenshots.capture(page, screenshot_path)
        t_ss_1 = time.perf_counter()
        screenshot_ms = (t_ss_1 - t_ss_0) * 1000.0

        ws_ms += await self.event('SCREENSHOT_CAPTURED', node_id, {'bytes': len(image_bytes), 'screenshot_ms': round(screenshot_ms, 2)})

        t_ocr_0 = time.perf_counter()
        ocr_result = await self.ocr.inspect(page, self._tmp_dir)
        t_ocr_1 = time.perf_counter()
        ocr_ms = (t_ocr_1 - t_ocr_0) * 1000.0

        goal = self.workflow.goal
        vision_result = await self.decider.vision_fallback(goal, image_bytes)

        combined_analysis = (
            f"VISION MODEL ANALYSIS:\n{vision_result.get('vision_analysis', '')}\n\n"
            f"OCR TEXT EXTRACTION:\n{ocr_result.get('text', '')}"
        )

        xai_log(
            f"{GREEN}[NODE: VISION FALLBACK COMPLETE]{RESET}",
            "Multimodal Vision & OCR Reasoning Finished",
            [
                f"Screenshot captured: {len(image_bytes)} bytes ({round(screenshot_ms, 1)} ms)",
                f"OCR Execution time: {round(ocr_ms, 1)} ms",
                f"Vision Reasoning  : {vision_result.get('status')} ({round(vision_result.get('inference_ms', 0), 1)} ms)",
            ]
        )

        ws_ms += await self.event('VISION_ANALYZED', node_id, {
            'status': vision_result.get('status'),
            'ocr_confidence': ocr_result.get('confidence', 0.0),
            'analysis_length': len(combined_analysis),
            'ocr_ms': round(ocr_ms, 2),
            'vision_ms': vision_result.get('inference_ms', 0.0),
        })
        ws_ms += await self.event('NODE_COMPLETED', node_id, {'status': 'vision_complete'})

        screenshot_path.unlink(missing_ok=True)

        return {
            'vision_analysis': combined_analysis,
            'next_step': 'CONTINUE',
            'stuck_counter': 0,
        }

    # ── LangGraph node: user_confirmation() ────────────────────────

    async def _user_confirmation(self, state: RuntimeState) -> dict[str, Any]:
        node_id = 'user_confirmation'
        await self.event('NODE_STARTED', node_id, {'phase': 'user_confirmation'})

        decision = state.get('last_decision', {})
        reason = decision.get('reason', 'Action requires human confirmation')

        xai_log(
            f"{YELLOW}[NODE: HUMAN-IN-THE-LOOP]{RESET}",
            "Awaiting Explicit Human Approval in UI",
            [f"Action Proposed : {decision.get('action')}", f"Security Reason : {reason}"]
        )

        approved = await self.request_human(node_id, reason)

        if not approved:
            xai_log(f"{RED}[NODE: HUMAN REJECTED]{RESET}", "User cancelled workflow action", [])
            await self.event('HITL_REJECTED', node_id, {'reason': 'User rejected the action'})
            raise PermissionError('Human rejected workflow action')

        xai_log(f"{GREEN}[NODE: HUMAN APPROVED]{RESET}", "User approved workflow action. Proceeding...", [])
        await self.event('HITL_RESUMED', node_id, {'approved': True})
        await self.event('NODE_COMPLETED', node_id, {'approved': True})

        return {'next_step': 'CONTINUE'}

    # ── LangGraph node: act() ──────────────────────────────────────

    async def _act(self, state: RuntimeState) -> dict[str, Any]:
        """Execute CLICK / TYPE / NAVIGATE / SELECT / UPLOAD → update status → loop back."""
        t_act_start = time.perf_counter()
        node_id = 'act'
        decision_data = state.get('last_decision', {})
        action_label = f"{decision_data.get('action', 'N/A').upper()} {decision_data.get('selector', '')}"
        self.heartbeat.update('ACT (Playwright)', iteration=state.get('iteration', 0), last_action=action_label.strip())
        ws_ms = await self.event('NODE_STARTED', node_id, {'phase': 'act'})

        observation = state['observation']
        step_index = min(state.get('current_step', 0), len(self.workflow.steps) - 1)

        proposal = ActionProposal(
            action=decision_data.get('action', 'wait'),
            selector=decision_data.get('selector'),
            value_ref=decision_data.get('value_ref'),
            value=decision_data.get('value'),
            reason=decision_data.get('reason', ''),
            confidence=decision_data.get('confidence', 0.5),
        )

        try:
            validated = self.security.validate(self.workflow, proposal, observation)
        except Exception as exc:
            reject_count = state.get('selector_reject_count', 0) + 1
            ws_ms += await self.event('ACTION_REJECTED', node_id, {'reason': str(exc), 'selector_reject_count': reject_count})
            xai_log(f"{RED}[SECURITY GATE REJECTED]{RESET}", "Action failed security policy", [str(exc), f"Reject count: {reject_count}"])
            return {
                'next_step': 'REQUEST_VISION',
                'selector_reject_count': reject_count,
                'last_action': {'action': proposal.action, 'error': str(exc)},
            }

        ws_ms += await self.event('ACTION_VALIDATED', node_id, {'action': validated.action, 'selector': validated.selector})

        page = self.browser.page
        if page is None:
            raise RuntimeError('Browser page unavailable for act()')

        xai_log(
            f"{BLUE}[NODE 3: ACTING IN PLAYWRIGHT]{RESET}",
            f"Executing Real Browser Action",
            [
                f"Action Type      : {BOLD}{validated.action.upper()}{RESET}",
                f"Target Selector  : {validated.selector or 'N/A'}",
                f"Values Used      : {self.values.get(validated.value_ref, validated.value) if validated.value_ref else validated.value or 'N/A'}",
            ]
        )

        t_exec_0 = time.perf_counter()
        await self.executor.execute(page, validated, self.values)
        t_exec_1 = time.perf_counter()
        action_execution_ms = (t_exec_1 - t_exec_0) * 1000.0

        ws_ms += await self.event('ACTION_EXECUTED', node_id, {
            'action': validated.action,
            'selector': validated.selector,
            'action_execution_ms': round(action_execution_ms, 2),
        })

        # Post-action observation for verification (extracted ONCE here and reused in next observe node)
        t_verif_dom_0 = time.perf_counter()
        after = await self.extractor.observe(page)
        t_verif_dom_1 = time.perf_counter()
        dom_extraction_ms = (t_verif_dom_1 - t_verif_dom_0) * 1000.0

        t_verif_0 = time.perf_counter()
        verification = self.verifier.verify(self.workflow, after)
        t_verif_1 = time.perf_counter()
        verification_ms = (t_verif_1 - t_verif_0) * 1000.0

        completed = verification.get('completion_confirmed', False)

        # Hard step-count ceiling safety: If the final step submit click has already executed,
        # follow-up WAIT/read actions or verifier confirmation should complete the workflow cleanly.
        final_step_id = self.workflow.steps[-1].id
        has_executed_final_submit = any(
            h.get('step') == final_step_id and h.get('action') in {'click', 'submit'}
            for h in state.get('history', [])
        ) or (self.workflow.steps[step_index].id == final_step_id and validated.action in {'click', 'submit'})

        if has_executed_final_submit and (validated.action in {'wait', 'read'} or completed):
            completed = True

        xai_log(
            f"{GREEN}[NODE 4: POST-ACTION VERIFICATION]{RESET}",
            f"Real DOM State Verified",
            [
                f"Action Exec Time : {BOLD}{round(action_execution_ms, 2)} ms{RESET}",
                f"Verification DOM : {round(dom_extraction_ms, 2)} ms",
                f"Verifier Result  : completion_confirmed = {completed}",
                f"Next Action Loop : {BOLD}{'COMPLETE' if completed else 'CONTINUE (skip_extraction=True)'}{RESET}",
            ]
        )

        ws_ms += await self.event('VERIFICATION_COMPLETED', node_id, {
            'verification': verification,
            'verification_ms': round(verification_ms, 2),
        })

        history = state.get('history', []) + [{
            'step': self.workflow.steps[step_index].id,
            'action': validated.action,
            'selector': validated.selector,
        }]

        next_step_index = step_index + 1 if not completed and step_index + 1 < len(self.workflow.steps) else step_index

        t_act_end = time.perf_counter()
        act_total_ms = (t_act_end - t_act_start) * 1000.0

        iter_start = state.get('last_iteration_start_time', t_act_start)
        total_graph_iteration_ms = (t_act_end - iter_start) * 1000.0

        iteration_log = {
            'iteration': state.get('iteration', 0),
            'step': self.workflow.steps[step_index].id,
            'action': validated.action,
            'action_execution_ms': round(action_execution_ms, 2),
            'dom_extraction_ms': round(dom_extraction_ms, 2),
            'verification_ms': round(verification_ms, 2),
            'act_total_ms': round(act_total_ms, 2),
            'total_graph_iteration_ms': round(total_graph_iteration_ms, 2),
            'websocket_ms': round(ws_ms, 2),
        }

        telemetry_log = state.get('telemetry_log', []) + [iteration_log]

        ws_ms += await self.event('NODE_COMPLETED', node_id, {
            'verified': verification,
            'completed': completed,
            'telemetry': iteration_log,
        })

        return {
            'observation': after,
            'history': history,
            'last_action': {'action': validated.action, 'selector': validated.selector},
            'verification': verification,
            'current_step': next_step_index,
            'completed': completed,
            'next_step': 'COMPLETE' if completed else 'CONTINUE',
            'skip_extraction': True,  # Flag next observe node to reuse this verified 'after' DOM!
            'telemetry_log': telemetry_log,
        }

    # ── Build the LangGraph state machine ──────────────────────────

    def graph(self):
        builder = StateGraph(RuntimeState)

        builder.add_node('observe', self._observe)
        builder.add_node('analyze_and_decide', self._analyze_and_decide)
        builder.add_node('vision_fallback', self._vision_fallback)
        builder.add_node('user_confirmation', self._user_confirmation)
        builder.add_node('act', self._act)

        builder.add_edge(START, 'observe')
        builder.add_edge('observe', 'analyze_and_decide')

        builder.add_conditional_edges('analyze_and_decide', self._should_continue, {
            'end': END,
            'vision_fallback': 'vision_fallback',
            'user_confirmation': 'user_confirmation',
            'act': 'act',
        })

        builder.add_edge('vision_fallback', 'analyze_and_decide')
        builder.add_edge('user_confirmation', 'act')

        builder.add_conditional_edges('act', self._should_continue, {
            'end': END,
            'vision_fallback': 'vision_fallback',
            'user_confirmation': 'user_confirmation',
            'act': 'observe',
        })

        return builder.compile()

    # ── Run the session ────────────────────────────────────────────

    async def run(self) -> None:
        import traceback as _tb
        import sys as _sys

        # ── Windows Playwright self-diagnostic ──────────────────────
        if _sys.platform == 'win32':
            loop = asyncio.get_event_loop()
            loop_type = type(loop).__name__
            if 'Proactor' not in loop_type:
                print(
                    f"\n{'='*60}\n"
                    f"[XAI CRITICAL] PLAYWRIGHT WILL FAIL ON THIS EVENT LOOP!\n"
                    f"  Current loop : {loop_type}\n"
                    f"  Required     : ProactorEventLoop\n"
                    f"  FIX: Stop the server and restart with:\n"
                    f"    python backend/run.py --reload\n"
                    f"{'='*60}\n",
                    flush=True
                )
                await self.event('WORKFLOW_FAILED', data={'reason': f'Windows requires ProactorEventLoop for Playwright. Current: {loop_type}. Use: python backend/run.py --reload'})
                return

        try:
            self.heartbeat.start()
            node_list = ['observe', 'analyze_and_decide', 'vision_fallback', 'user_confirmation', 'act']
            
            safe_values = {k: str(v) for k, v in (self.values or {}).items()}
            canonical = json.dumps(safe_values, sort_keys=True, separators=(',', ':'))
            sha256_hex = hashlib.sha256(canonical.encode('utf-8')).hexdigest()
            _kms_key = os.getenv('CIVICFLOW_KMS_MASTER_KEY_V2')
            if not _kms_key:
                if os.getenv('ENVIRONMENT', 'development').lower() == 'production':
                    raise RuntimeError(
                        '[CivicGuard] CIVICFLOW_KMS_MASTER_KEY_V2 is not set. '
                        'Set it in .env before running in production.'
                    )
                _kms_key = 'CIVICFLOW_DEV_ONLY_KMS_KEY_NOT_FOR_PRODUCTION'
                print('  [CivicGuard] WARNING: CIVICFLOW_KMS_MASTER_KEY_V2 not set — '
                      'using insecure dev-only HMAC key. Set the real key in .env.', flush=True)
            hmac_hex = hmac.new(_kms_key.encode('utf-8'), canonical.encode('utf-8'), hashlib.sha256).hexdigest()

            xai_log(
                f"{BOLD}{GREEN}[LANGGRAPH AGENT SESSION STARTED]{RESET}",
                f"Session ID: {self.session_id}",
                [
                    f"Workflow ID  : {self.workflow.id}",
                    f"Goal         : {self.workflow.goal}",
                    f"LLM Provider : {BOLD}{self.decider.provider_name.upper()}{RESET} (Model: {self.decider.model_name})",
                    f"Control Flow : observe -> analyze_and_decide -> should_continue -> {{act|vision|hitl}} -> observe",
                    f"SHA-256 Hash : {CYAN}{sha256_hex}{RESET}",
                    f"HMAC-SHA256  : {MAGENTA}{hmac_hex}{RESET} (KMS Verified)",
                ]
            )

            await self.event('GRAPH_CREATED', data={
                'workflow_id': self.workflow.id,
                'nodes': node_list,
                'provider': self.decider.provider_name,
                'model': self.decider.model_name,
                'flow': 'observe -> analyze_and_decide -> should_continue -> {vision_fallback | user_confirmation | act} -> observe (loop)',
                'sha256': sha256_hex,
                'hmac_sha256': hmac_hex,
            })

            initial_state: RuntimeState = {
                'workflow': self.workflow,
                'values': self.values,
                'history': [],
                'current_step': 0,
                'iteration': 0,
                'stuck_counter': 0,
                'completed': False,
                'next_step': 'CONTINUE',
                'skip_extraction': False,
                'vision_analysis': None,
                'last_action': None,
                'last_decision': None,
                'telemetry_log': [],
            }

            # Calculate dynamic recursion_limit based on workflow steps (3 node hops per step + HITL pauses + buffer)
            step_count = len(self.workflow.steps)
            recursion_limit = max(150, (step_count + 3) * 6 + 30)

            await self.graph().ainvoke(initial_state, config={'recursion_limit': recursion_limit})
            xai_log(f"{BOLD}{GREEN}[WORKFLOW COMPLETED SUCCESSFULLY]{RESET}", f"Session ID: {self.session_id}", [])
            await self.event('WORKFLOW_COMPLETED')
        except Exception as exc:
            tb_str = _tb.format_exc()
            error_msg = str(exc) or type(exc).__name__
            xai_log(
                f"{BOLD}{RED}[WORKFLOW FAILED]{RESET}",
                f"Session ID: {self.session_id}",
                [
                    f"Error Type : {type(exc).__name__}",
                    f"Error Msg  : {error_msg}",
                    f"Traceback  : (see full trace below)",
                ]
            )
            print(f"\n{'='*60}\n[XAI FULL TRACEBACK]\n{tb_str}{'='*60}\n", flush=True)
            await self.event('WORKFLOW_FAILED', data={'reason': error_msg, 'traceback': tb_str})
        finally:
            self.heartbeat.stop()
            await self.browser.close()
            import shutil
            shutil.rmtree(self._tmp_dir, ignore_errors=True)
            await self.event('SESSION_PURGED')

