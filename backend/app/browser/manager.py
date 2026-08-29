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

    async def launch(self, headed: bool | None = None) -> None:
        if headed is not None:
            self.headed = headed
        self._playwright = await async_playwright().start()
        self.browser = await self._playwright.chromium.launch(
            headless=not self.headed,
            slow_mo=self.slow_mo,
        )
        self.context = await self.browser.new_context(viewport={'width': 1280, 'height': 720})
        self.page = await self.context.new_page()

    async def navigate(self, portal_path: str, base_url: str | list[str] = 'http://127.0.0.1:8000/portals', allowed_domains: list[str] | str | None = None) -> Page:
        if self.page is None:
            raise RuntimeError('browser is not started')

        # Support both legacy call patterns: navigate(path, [allowed_domains], base_url)
        # and navigate(path, base_url, allowed_domains).
        if isinstance(base_url, (list, tuple, set)) and isinstance(allowed_domains, str):
            base_url, allowed_domains = allowed_domains, list(base_url)
        elif isinstance(base_url, (list, tuple, set)):
            allowed_domains = list(base_url)
            base_url = 'http://127.0.0.1:8000/portals'
        elif isinstance(allowed_domains, str):
            allowed_domains = [allowed_domains]

        if not isinstance(base_url, str) or not base_url:
            base_url = 'http://127.0.0.1:8000/portals'

        clean_path = portal_path.lstrip('/')
        if clean_path.startswith('portals/'):
            clean_path = clean_path[len('portals/'):]

        url = f'{base_url.rstrip("/")}/{clean_path}'

        try:
            await self.page.goto(url)
            return self.page
        except Exception:
            file_subpath = clean_path.split('#')[0]
            local_path = (self.portal_root / file_subpath).resolve()
            if local_path.exists():
                try:
                    if self.context is not None:
                        self.page = await self.context.new_page()
                    else:
                        await self.page.goto('about:blank')
                except Exception:
                    pass
                html = local_path.read_text(encoding='utf-8')
                await self.page.set_content(html)
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
