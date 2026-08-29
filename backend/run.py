"""
CivicFlow Backend Server Launcher
===================================
Fixes Windows uvicorn --reload Playwright compatibility.

Root Cause Discovered:
  Uvicorn's builtin `uvicorn.loops.asyncio.asyncio_setup(use_subprocess=True)`
  explicitly executes:
      asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
  whenever `--reload` is enabled on Windows.
  SelectorEventLoop cannot spawn subprocesses (asyncio.create_subprocess_exec),
  causing Playwright chromium launch to fail with NotImplementedError.

Fix:
  We patch uvicorn.loops.asyncio.asyncio_setup to FORCE
  asyncio.WindowsProactorEventLoopPolicy() on Windows.

Usage (run from project root: Civicflow_hackathon\):
  python backend/run.py
  python backend/run.py --reload
  python backend/run.py --no-browser
"""
from __future__ import annotations
import asyncio
import os
import subprocess
import sys
from pathlib import Path

# ── 1. Add project root to sys.path so 'backend.app.main' is importable ─────
PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))
os.environ['PYTHONPATH'] = str(PROJECT_ROOT)

# ── 2. Patch Uvicorn's Windows Event Loop Policy ─────────────────────────────
if sys.platform == 'win32':
    asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())
    
    import uvicorn.config
    import uvicorn.loops.asyncio

    def custom_asyncio_setup(use_subprocess: bool = False) -> None:
        """Override uvicorn's default which forces WindowsSelectorEventLoopPolicy when use_subprocess=True."""
        asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())

    uvicorn.loops.asyncio.asyncio_setup = custom_asyncio_setup
    uvicorn.config.LOOP_SETUPS['asyncio'] = custom_asyncio_setup
    uvicorn.config.LOOP_SETUPS['auto'] = custom_asyncio_setup
    print("[CivicFlow] Uvicorn WindowsProactorEventLoopPolicy patch applied successfully.", flush=True)

import argparse
import uvicorn


def _kill_stale_processes_on_port(port: int) -> None:
    """Windows-safe cleanup for stale uvicorn / Playwright processes left behind by reloads or failed startups."""
    if sys.platform != 'win32':
        return

    try:
        result = subprocess.run(
            [
                'powershell', '-NoProfile', '-Command',
                f"Get-NetTCPConnection -LocalPort {port} -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique | ForEach-Object {{ Stop-Process -Id $_ -Force; Write-Host \"Killed PID $_ on port {port}\" }}"
            ],
            capture_output=True,
            text=True,
            check=False,
        )
        if result.stdout.strip():
            print(result.stdout.strip(), flush=True)
    except Exception as exc:
        print(f"[CivicFlow] Could not clean stale port {port}: {exc}", flush=True)


def main() -> None:
    parser = argparse.ArgumentParser(description='CivicFlow Backend Launcher')
    parser.add_argument('--host', default='127.0.0.1')
    parser.add_argument('--port', type=int, default=8000)
    parser.add_argument('--reload', action='store_true', help='Auto-reload on file changes')
    parser.add_argument('--no-browser', action='store_true', help='Run Chromium in headless mode')
    args = parser.parse_args()

    if args.reload:
        print("[CivicFlow] WARNING: '--reload' will interrupt the active Playwright browser session. For automation, the server is forced to run without reload.", flush=True)
        args.reload = False

    if args.no_browser:
        os.environ['BROWSER_HEADED'] = 'false'
        print("[CivicFlow] Headless browser mode enabled.", flush=True)
    else:
        os.environ['BROWSER_HEADED'] = 'true'
        print("[CivicFlow] Headed browser mode enabled for live automation.", flush=True)

    print(f"[CivicFlow] Project root : {PROJECT_ROOT}", flush=True)
    _kill_stale_processes_on_port(args.port)
    print(f"[CivicFlow] Starting server on http://{args.host}:{args.port} (reload={args.reload})", flush=True)

    uvicorn.run(
        'backend.app.main:app',
        host=args.host,
        port=args.port,
        reload=args.reload,
        loop='asyncio',
    )


if __name__ == '__main__':
    main()
