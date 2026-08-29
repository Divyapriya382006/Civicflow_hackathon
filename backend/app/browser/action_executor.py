from __future__ import annotations
from playwright.async_api import Page
from ..schemas import ActionProposal

class ActionExecutor:
    def _value(self, reference: str, values: dict[str, str]) -> str:
        if reference in values:
            return values[reference]
        normalized_reference = reference.lower().replace('-', '_')
        matches = [value for key, value in values.items() if normalized_reference.endswith(key.lower().replace('-', '_')) or key.lower().replace('-', '_').endswith(normalized_reference)]
        if len(matches) == 1:
            return matches[0]
        raise KeyError(reference)

    async def execute(self, page: Page, action: ActionProposal, values: dict[str, str]) -> None:
        if action.action == 'fill':
            if not action.selector or not action.value_ref:
                raise ValueError('fill requires selector and value_ref')
            await page.locator(action.selector).fill(self._value(action.value_ref, values))
        elif action.action == 'click':
            if not action.selector:
                raise ValueError('click requires selector')
            await page.locator(action.selector).click()
        elif action.action == 'select':
            if not action.selector or (action.value is None and not action.value_ref):
                raise ValueError('select requires selector and value or value_ref')
            value = self._value(action.value_ref, values) if action.value_ref else action.value
            await page.locator(action.selector).select_option(value)
        elif action.action == 'upload':
            if not action.selector or not action.value_ref:
                raise ValueError('upload requires selector and value_ref')
            await page.locator(action.selector).set_input_files(values[action.value_ref])
        elif action.action == 'wait':
            await page.wait_for_load_state('domcontentloaded')
        elif action.action == 'read':
            return
        else:
            raise ValueError(f'unsupported action: {action.action}')
