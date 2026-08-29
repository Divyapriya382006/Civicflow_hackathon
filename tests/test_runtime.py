from __future__ import annotations
import asyncio
from pathlib import Path
from backend.app.browser.dom_extractor import DOMExtractor
from backend.app.browser.manager import BrowserManager
from backend.app.browser.action_executor import ActionExecutor
from backend.app.main import workflows
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
