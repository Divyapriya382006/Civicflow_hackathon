from __future__ import annotations

import asyncio
import time
from datetime import datetime, timezone
from typing import Any, Awaitable, Callable

from ..schemas import RuntimeEvent

Emit = Callable[[RuntimeEvent], Awaitable[None]]


async def emit_event(
    emit: Emit,
    session_id: str,
    event_type: str,
    node_id: str | None = None,
    data: dict[str, Any] | None = None,
) -> float:
    t0 = time.perf_counter()
    await emit(RuntimeEvent(
        type=event_type,
        session_id=session_id,
        timestamp=datetime.now(timezone.utc).isoformat(),
        node_id=node_id,
        data=data or {},
    ))
    t1 = time.perf_counter()
    return (t1 - t0) * 1000.0


async def request_human_confirmation(
    emit: Emit,
    session_id: str,
    node_id: str,
    reason: str,
    data: dict[str, Any] | None = None,
) -> asyncio.Future[bool]:
    future = asyncio.get_running_loop().create_future()
    await emit(RuntimeEvent(
        type='HITL_REQUIRED',
        session_id=session_id,
        timestamp=datetime.now(timezone.utc).isoformat(),
        node_id=node_id,
        data={'reason': reason, **(data or {})},
    ))
    return future
