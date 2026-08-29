from __future__ import annotations
import asyncio
from fastapi import WebSocket
from ..schemas import RuntimeEvent

class EventHub:
    def __init__(self):
        self.clients: dict[str, set[WebSocket]] = {}
        self.history: dict[str, list[RuntimeEvent]] = {}

    async def connect(self, session_id: str, websocket: WebSocket) -> None:
        await websocket.accept()
        self.clients.setdefault(session_id, set()).add(websocket)
        for event in self.history.get(session_id, []):
            await websocket.send_json(event.model_dump(mode='json'))

    def disconnect(self, session_id: str, websocket: WebSocket) -> None:
        self.clients.get(session_id, set()).discard(websocket)

    async def publish(self, event: RuntimeEvent) -> None:
        self.history.setdefault(event.session_id, []).append(event)
        clients = list(self.clients.get(event.session_id, set()))
        if not clients:
            return
        payload = event.model_dump(mode='json')
        results = await asyncio.gather(*(client.send_json(payload) for client in clients), return_exceptions=True)
        for client, result in zip(clients, results):
            if isinstance(result, Exception):
                self.disconnect(event.session_id, client)
