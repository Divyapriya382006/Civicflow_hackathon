"""
LangGraph Runtime Engine — Agentic Workflow State Machine

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
from .ocr_fallback import OCRFallback

Emit = Callable[[RuntimeEvent], Awaitable[None]]

MAX_ITERATIONS = 40
VISION_CONFIDENCE_THRESHOLD = 0.6
STUCK_DOM_THRESHOLD = 3


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
    completed: bool
    failed: str
    next_step: str
    skip_extraction: bool
    telemetry_log: list[dict[str, Any]]
    last_iteration_start_time: float


class RuntimeSession:
    """Manages a single agentic workflow execution session using the LangGraph state machine."""

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

    # ── Event helpers ──────────────────────────────────────────────

    async def event(self, event_type: str, node_id: str | None = None, data: dict[str, Any] | None = None) -> float:
        t0 = time.perf_counter()
        await self.emit(RuntimeEvent(
            type=event_type,
            session_id=self.session_id,
            timestamp=datetime.now(timezone.utc).isoformat(),
            node_id=node_id,
            data=data or {},
        ))
        t1 = time.perf_counter()
        return (t1 - t0) * 1000.0

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
        ws_ms = await self.event('NODE_STARTED', node_id, {'phase': 'observe'})

        iteration = state.get('iteration', 0)
        skip_extraction = state.get('skip_extraction', False)
        existing_observation = state.get('observation')

        dom_extraction_ms = 0.0

        if iteration == 0:
            await self.browser.launch()
            await self.browser.navigate(
                self.workflow.portal_path,
                self.workflow.allowed_domains,
                self.base_url,
            )

        page = self.browser.page
        if page is None:
            raise RuntimeError('Browser page unavailable after observe()')

        if skip_extraction and existing_observation is not None:
            # Reuse verified post-action DOM from previous act() step
            observation = existing_observation
            dom_extraction_ms = 0.0
        else:
            # Perform fresh DOM extraction
            t_dom_0 = time.perf_counter()
            observation = await self.extractor.observe(page)
            t_dom_1 = time.perf_counter()
            dom_extraction_ms = (t_dom_1 - t_dom_0) * 1000.0

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
        ws_ms = await self.event('NODE_STARTED', node_id, {'phase': 'analyze_and_decide', 'provider': self.decider.provider_name})

        observation = state['observation']
        history = state.get('history', [])
        step_index = min(state.get('current_step', 0), len(self.workflow.steps) - 1)
        step = self.workflow.steps[step_index]

        vision_context = state.get('vision_analysis')
        if vision_context:
            history = history + [{'vision_analysis': vision_context}]

        t_llm_0 = time.perf_counter()
        try:
            decision, llm_telemetry = await self.decider.decide(self.workflow, step, observation, history)
        except Exception as exc:
            ws_ms += await self.event('DECISION_FAILED', node_id, {'error': str(exc)})
            return {
                'last_decision': {'action': 'wait', 'selector': None, 'confidence': 0.0, 'reason': f'LLM error: {exc}', 'next_step': 'REQUEST_VISION'},
                'next_step': 'REQUEST_VISION',
            }
        t_llm_1 = time.perf_counter()

        llm_request_ms = (t_llm_1 - t_llm_0) * 1000.0

        raw_next = 'CONTINUE'
        confidence = decision.confidence

        if confidence < VISION_CONFIDENCE_THRESHOLD:
            raw_next = 'REQUEST_VISION'
        elif state.get('stuck_counter', 0) >= STUCK_DOM_THRESHOLD:
            raw_next = 'REQUEST_VISION'
        elif step.requires_hitl or step.risk in {'HIGH', 'CRITICAL'}:
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
        if iteration > MAX_ITERATIONS:
            return 'end'

        if state.get('completed'):
            return 'end'

        next_step = state.get('next_step', 'CONTINUE')
        if next_step == 'COMPLETE':
            return 'end'
        elif next_step == 'REQUEST_VISION':
            return 'vision_fallback'
        elif next_step == 'CONFIRM_USER':
            return 'user_confirmation'
        else:
            return 'act'

    # ── LangGraph node: vision_fallback() ──────────────────────────

    async def _vision_fallback(self, state: RuntimeState) -> dict[str, Any]:
        node_id = 'vision_fallback'
        ws_ms = await self.event('NODE_STARTED', node_id, {'phase': 'vision_fallback'})

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

        approved = await self.request_human(node_id, reason)

        if not approved:
            await self.event('HITL_REJECTED', node_id, {'reason': 'User rejected the action'})
            raise PermissionError('Human rejected workflow action')

        await self.event('HITL_RESUMED', node_id, {'approved': True})
        await self.event('NODE_COMPLETED', node_id, {'approved': True})

        return {'next_step': 'CONTINUE'}

    # ── LangGraph node: act() ──────────────────────────────────────

    async def _act(self, state: RuntimeState) -> dict[str, Any]:
        """Execute CLICK / TYPE / NAVIGATE / SELECT / UPLOAD → update status → loop back."""
        t_act_start = time.perf_counter()
        node_id = 'act'
        ws_ms = await self.event('NODE_STARTED', node_id, {'phase': 'act'})

        decision_data = state.get('last_decision', {})
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
            ws_ms += await self.event('ACTION_REJECTED', node_id, {'reason': str(exc)})
            return {'next_step': 'REQUEST_VISION', 'last_action': {'action': proposal.action, 'error': str(exc)}}

        ws_ms += await self.event('ACTION_VALIDATED', node_id, {'action': validated.action, 'selector': validated.selector})

        page = self.browser.page
        if page is None:
            raise RuntimeError('Browser page unavailable for act()')

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

        ws_ms += await self.event('VERIFICATION_COMPLETED', node_id, {
            'verification': verification,
            'verification_ms': round(verification_ms, 2),
        })

        history = state.get('history', []) + [{
            'step': self.workflow.steps[step_index].id,
            'action': validated.action,
            'selector': validated.selector,
        }]

        completed = verification.get('completion_confirmed', False)
        next_step_index = step_index + 1 if not completed and step_index + 1 < len(self.workflow.steps) else step_index

        t_act_end = time.perf_counter()
        act_total_ms = (t_act_end - t_act_start) * 1000.0

        # Measure total iteration cycle time if last_iteration_start_time exists
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
        try:
            node_list = ['observe', 'analyze_and_decide', 'vision_fallback', 'user_confirmation', 'act']
            await self.event('GRAPH_CREATED', data={
                'workflow_id': self.workflow.id,
                'nodes': node_list,
                'provider': self.decider.provider_name,
                'model': self.decider.model_name,
                'flow': 'observe → analyze_and_decide → should_continue → {vision_fallback | user_confirmation | act} → observe (loop)',
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

            await self.graph().ainvoke(initial_state)
            await self.event('WORKFLOW_COMPLETED')
        except Exception as exc:
            await self.event('WORKFLOW_FAILED', data={'reason': str(exc)})
        finally:
            await self.browser.close()
            import shutil
            shutil.rmtree(self._tmp_dir, ignore_errors=True)
            await self.event('SESSION_PURGED')
