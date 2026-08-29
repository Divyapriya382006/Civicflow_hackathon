from __future__ import annotations
from playwright.async_api import Page
from ..schemas import BrowserObservation, ObservationElement

class DOMExtractor:
    async def observe(self, page: Page) -> BrowserObservation:
        # Fast async DOM extraction with data-testid priority
        elements = await page.locator('[data-testid],input,select,textarea,button,a,[role]').evaluate_all('''els => els.map(el => {
          const testId = el.getAttribute('data-testid');
          const selector = testId ? `[data-testid="${testId}"]` : (el.id ? `#${CSS.escape(el.id)}` : `${el.tagName.toLowerCase()}[name="${el.getAttribute('name') || ''}"]`);
          const label = el.labels?.[0]?.innerText || el.getAttribute('aria-label') || el.innerText || el.getAttribute('name') || null;
          const rect = el.getBoundingClientRect();
          return {
            tag: el.tagName.toLowerCase(),
            role: el.getAttribute('role'),
            label: label ? label.trim().substring(0, 60) : null,
            selector: selector,
            required: Boolean(el.required),
            visible: rect.width > 0 && rect.height > 0,
            enabled: !el.disabled,
            bounding_box: { x: Math.round(rect.x), y: Math.round(rect.y), width: Math.round(rect.width), height: Math.round(rect.height) }
          };
        })''')
        title = await page.title()
        text = (await page.locator('body').inner_text())[:2000]
        return BrowserObservation(url=page.url, title=title, elements=[ObservationElement.model_validate(item) for item in elements], text=text)

