from __future__ import annotations
from pathlib import Path
from playwright.async_api import Page

class ScreenshotCapture:
    async def capture(self, page: Page, destination: Path) -> bytes:
        image = await page.screenshot(path=str(destination), type='png')
        return image
