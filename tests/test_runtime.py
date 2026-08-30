from __future__ import annotations
import asyncio
from pathlib import Path
from backend.app.browser.dom_extractor import DOMExtractor
from backend.app.browser.manager import BrowserManager
from backend.app.browser.action_executor import ActionExecutor
import httpx

from backend.app.llm.groq_provider import GroqProvider
from backend.app.main import workflows
from backend.app.runtime.engine import RuntimeSession
from backend.app.schemas import ActionProposal
from backend.app.security import ActionSecurityGate

ROOT = Path(__file__).resolve().parents[1]


def test_workflows_are_external_and_distinct() -> None:
    assert set(workflows) == {'name_correction', 'license_lookup'}
    assert [step.action for step in workflows['name_correction'].steps] != [step.action for step in workflows['license_lookup'].steps]


def test_playwright_loads_and_extracts_real_portal_dom() -> None:
    async def run() -> None:
        manager = BrowserManager(ROOT / 'portals')
        await manager.launch()
        try:
            page = await manager.navigate('identity/name-correction.html', ['127.0.0.1'], 'http://127.0.0.1:8000/portals')
            observation = await DOMExtractor().observe(page)
            selectors = {element.selector for element in observation.elements}
            assert '#citizen-name' in selectors
            assert '#review-button' in selectors
            assert observation.title == 'Identity Services - Name Correction'
        finally:
            await manager.close()
    asyncio.run(run())


def test_action_gate_rejects_unobserved_and_unsafe_targets() -> None:
    workflow = workflows['name_correction']
    observation = type('Observation', (), {'url': 'http://127.0.0.1:8000/portals/identity/name-correction.html', 'elements': []})()
    unsafe = ActionProposal(action='click', selector='javascript:alert(1)', reason='bad', confidence=1)
    try:
        ActionSecurityGate().validate(workflow, unsafe, observation)
    except PermissionError:
        pass
    else:
        raise AssertionError('unsafe action was accepted')


def test_name_correction_allows_type_actions_for_typing_into_form_fields() -> None:
    workflow = workflows['name_correction']
    assert 'type' in workflow.constraints['allowed_actions']
    assert 'fill' in workflow.constraints['allowed_actions']


def test_runtime_escapes_selector_retry_loop_after_repeated_rejections() -> None:
    state = {
        'iteration': 12,
        'next_step': 'CONTINUE',
        'selector_reject_count': 3,
        'last_decision': {'action': 'click', 'selector': '[data-testid="fake-button"]', 'reason': 'Selector not observed'},
    }
    assert RuntimeSession._should_continue(state) == 'user_confirmation'


def test_groq_request_retries_after_429_rate_limit() -> None:
    async def run() -> None:
        class FakeResponse:
            def __init__(self, status_code: int, payload: dict):
                self.status_code = status_code
                self._payload = payload
                self.text = str(payload)
                self.request = httpx.Request('POST', 'https://example.test')

            def raise_for_status(self) -> None:
                if self.status_code >= 400:
                    raise httpx.HTTPStatusError(
                        f'HTTP {self.status_code}', request=self.request, response=self
                    )

            def json(self):
                return self._payload

        call_state = {'count': 0}

        class FakeClient:
            def __init__(self, *args, **kwargs):
                pass

            async def __aenter__(self):
                return self

            async def __aexit__(self, exc_type, exc, tb):
                return None

            async def post(self, url, headers, json):
                call_state['count'] += 1
                if call_state['count'] == 1:
                    return FakeResponse(429, {'error': {'message': 'Please try again in 1.0s'}})
                return FakeResponse(200, {'choices': [{'message': {'content': '{"ok": true}'}}]})

        calls = []
        original = httpx.AsyncClient
        httpx.AsyncClient = FakeClient
        try:
            provider = GroqProvider(api_key='test-key', model='test-model', base_url='https://example.test')
            result = await provider._request({'model': 'test-model', 'messages': []})
            calls.append(result)
            assert result['choices'][0]['message']['content'] == '{"ok": true}'
            assert len(calls) == 1
            assert call_state['count'] == 2
        finally:
            httpx.AsyncClient = original

    asyncio.run(run())


def test_playwright_action_changes_real_portal_dom() -> None:
    async def run() -> None:
        manager = BrowserManager(ROOT / 'portals')
        await manager.launch()
        try:
            page = await manager.navigate('identity/name-correction.html', ['127.0.0.1'], 'http://127.0.0.1:8000/portals')
            action = ActionProposal(action='fill', selector='#citizen-name', value_ref='full_name', reason='Observed required field', confidence=1)
            await ActionExecutor().execute(page, action, {'full_name': 'Runtime Citizen'})
            assert await page.locator('#citizen-name').input_value() == 'Runtime Citizen'
        finally:
            await manager.close()
    asyncio.run(run())


def test_all_workflow_definitions_step_actions_allowed() -> None:
    import json
    from backend.app.schemas import WorkflowDefinition
    from backend.app.workflow_loader import WorkflowLoader

    for json_path in (ROOT / 'workflows').glob('**/*.json'):
        data = json.loads(json_path.read_text(encoding='utf-8'))
        workflow = WorkflowDefinition.model_validate(data)
        WorkflowLoader.validate_workflow(workflow)
        allowed = set(workflow.constraints.get('allowed_actions', []))
        for step in workflow.steps:
            assert step.action in allowed, f"Workflow {workflow.id} step {step.id} has action {step.action} not in {allowed}"
        # Ensure that if fill is allowed, type is also allowed for robust LLM compatibility
        if 'fill' in allowed:
            assert 'type' in allowed, f"Workflow {workflow.id} allows 'fill' but missing 'type' alias"

