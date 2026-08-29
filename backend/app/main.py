from __future__ import annotations
import asyncio
import uuid
from pathlib import Path
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from .api.events import EventHub
from .runtime.engine import RuntimeSession
from .schemas import ApprovalRequest, RuntimeEvent, StartRequest
from .workflow_loader import WorkflowLoader

ROOT = Path(__file__).resolve().parents[2]
loader = WorkflowLoader(ROOT / 'workflows')
workflows = loader.load_all()
hub = EventHub()
sessions: dict[str, RuntimeSession] = {}

app = FastAPI(title='CivicFlow Runtime Agent')
app.add_middleware(CORSMiddleware, allow_origins=['http://localhost:3000', 'http://localhost:3002'], allow_methods=['*'], allow_headers=['*'])
app.mount('/portals', StaticFiles(directory=ROOT / 'portals'), name='portals')

@app.get('/')
async def root() -> dict:
    return {
        'service': 'CivicFlow Runtime Agent',
        'health': '/health',
        'workflows': '/workflows',
        'docs': '/docs',
    }

@app.get('/health')
async def health() -> dict:
    return {'status': 'ok', 'runtime': 'fastapi-langgraph-playwright', 'workflows': list(workflows)}

@app.get('/workflows')
async def list_workflows() -> list[dict]:
    return [workflow.model_dump(exclude={'steps'}) for workflow in workflows.values()]

@app.post('/sessions')
async def start_session(request: StartRequest) -> dict:
    workflow = workflows.get(request.workflow_id)
    if workflow is None:
        raise HTTPException(status_code=404, detail='workflow not found')
    session_id = uuid.uuid4().hex
    async def emit(event: RuntimeEvent) -> None:
        await hub.publish(event)
    session = RuntimeSession(session_id, workflow, request.values, emit, ROOT / 'portals', 'http://127.0.0.1:8000/portals')
    sessions[session_id] = session
    asyncio.create_task(session.run())
    return {'session_id': session_id, 'workflow_id': workflow.id}

@app.post('/sessions/{session_id}/approval')
async def approval(session_id: str, request: ApprovalRequest) -> dict:
    session = sessions.get(session_id)
    if session is None:
        raise HTTPException(status_code=404, detail='session not found')
    await session.approve(request.approved)
    return {'accepted': True}

@app.websocket('/sessions/{session_id}/events')
async def events(session_id: str, websocket: WebSocket) -> None:
    if session_id not in sessions:
        await websocket.close(code=4404)
        return
    await hub.connect(session_id, websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        hub.disconnect(session_id, websocket)
