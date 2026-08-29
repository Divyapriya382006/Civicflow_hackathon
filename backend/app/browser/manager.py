from __future__ import annotations
import os
from pathlib import Path
from playwright.async_api import async_playwright, Browser, BrowserContext, Page

class BrowserManager:
    def __init__(self, portal_root: Path, headed: bool | None = None, slow_mo: int | None = None):
        self.portal_root = portal_root
        self.headed = headed if headed is not None else os.getenv('BROWSER_HEADED', 'true').lower() == 'true'
        self.slow_mo = slow_mo if slow_mo is not None else int(os.getenv('BROWSER_SLOW_MO', '0'))
        self._playwright = None
        self.browser: Browser | None = None
        self.context: BrowserContext | None = None
        self.page: Page | None = None

    async def launch(self) -> None:
        self._playwright = await async_playwright().start()
        self.browser = await self._playwright.chromium.launch(
            headless=not self.headed,
            slow_mo=self.slow_mo,
        )
        self.context = await self.browser.new_context(viewport={'width': 1280, 'height': 720})
        self.page = await self.context.new_page()

    async def navigate(self, portal_path: str, allowed_domains: list[str], base_url: str) -> Page:
        if self.page is None:
            raise RuntimeError('browser is not started')

        clean_path = portal_path.lstrip('/')
        if clean_path.startswith('portals/'):
            clean_path = clean_path[len('portals/'):]

        url = f'{base_url.rstrip("/")}/{clean_path}'
        if url.startswith('http') and not any(domain in ('localhost', '127.0.0.1') for domain in allowed_domains):
            raise PermissionError('portal domain is not allowlisted')

        try:
            await self.page.goto(url)
            return self.page
        except Exception:
            file_subpath = clean_path.split('#')[0]
            local_path = (self.portal_root / file_subpath).resolve()
            if local_path.exists():
                fragment = f"#{clean_path.split('#')[1]}" if '#' in clean_path else ''
                await self.page.goto(f"{local_path.as_uri()}{fragment}")
                return self.page
            raise

    async def close(self) -> None:
        if self.context:
            await self.context.close()
        if self.browser:
            await self.browser.close()
        if self._playwright:
            await self._playwright.stop()
        self.page = None
        self.context = None
        self.browser = None
        self._playwright = None
