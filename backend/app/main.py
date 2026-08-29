from __future__ import annotations
import asyncio
import os
import sys
import time
import uuid
from pathlib import Path
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from .api.events import EventHub
from .runtime.engine import BOLD, CYAN, RED, RESET, RuntimeSession, xai_log
from .schemas import ApprovalRequest, RuntimeEvent, StartRequest, WorkflowDefinition, WorkflowStep
from .voice_routes import router as voice_router
from .workflow_loader import WorkflowLoader

# ── Windows Playwright Fix ──────────────────────────────────────────────────────
# Playwright needs ProactorEventLoop on Windows to spawn the Chromium subprocess.
# Uvicorn's default asyncio_setup forces WindowsSelectorEventLoopPolicy on Windows when use_subprocess=True.
if sys.platform == 'win32':
    try:
        asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())
        import uvicorn.config
        import uvicorn.loops.asyncio
        def custom_asyncio_setup(use_subprocess: bool = False) -> None:
            asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())
        uvicorn.loops.asyncio.asyncio_setup = custom_asyncio_setup
        uvicorn.config.LOOP_SETUPS['asyncio'] = custom_asyncio_setup
        uvicorn.config.LOOP_SETUPS['auto'] = custom_asyncio_setup
        print("[CivicFlow] Windows ProactorEventLoop policy applied — Playwright subprocess support enabled.", flush=True)
    except Exception as _e:
        print(f"[CivicFlow] Warning: Could not set ProactorEventLoop: {_e}", flush=True)



ROOT = Path(__file__).resolve().parents[2]
loader = WorkflowLoader(ROOT / 'workflows')
workflows = loader.load_all()
hub = EventHub()
sessions: dict[str, RuntimeSession] = {}

app = FastAPI(title='CivicFlow Runtime Agent')
app.add_middleware(
    CORSMiddleware,
    allow_origins=['*'],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)
app.include_router(voice_router)
app.mount('/portals', StaticFiles(directory=ROOT / 'portals'), name='portals')


def create_fallback_workflow(workflow_id: str) -> WorkflowDefinition:
    mapping = {
        'name_correction': ('/portals/identity/name-correction.html', 'Correct the citizen name and submit it for officer review.'),
        'birth_certificate': ('/portals/site5_parivahan_vital.html#/birth', 'Submit formal registration request for digital birth certificate issuance.'),
        'death_certificate': ('/portals/site5_parivahan_vital.html#/death', 'Submit official death certificate registration request.'),
        'dl_renewal': ('/portals/site5_parivahan_vital.html#/dl-renewal', 'Apply for Driving License renewal and status verification.'),
        'license_lookup': ('/portals/site5_parivahan_vital.html#/dl-renewal', 'Search and verify driving license details.'),
        'ncs_registration': ('/portals/site1_ncs.html#/ncs-registration', 'Register worker profile on National Career Service portal.'),
        'eshram_worker_card': ('/portals/site1_ncs.html#/eshram', 'Issue unorganized worker digital identity e-Shram card.'),
        'labour_welfare_claim': ('/portals/site2_welfare.html#/welfare-claim', 'Submit Labour Welfare Benefit Claim request.'),
        'nsap_old_age_pension': ('/portals/site2_welfare.html#/nsap-pension', 'Apply for NSAP Old Age Social Pension Scheme benefits.'),
        'skill_certification': ('/portals/site2_welfare.html#/skill-cert', 'Enroll and certify in National Skill Development course.'),
        'uidai_address_update': ('/portals/site3_aadhaar.html#/aadhaar-address-update', 'Update residential address in UIDAI Aadhaar SSUP portal.'),
        'digilocker_document_retrieval': ('/portals/site4_digilocker_passport.html#/digilocker', 'Retrieve digital credentials from DigiLocker repository.'),
        'passport_seva_application': ('/portals/site4_digilocker_passport.html#/passport', 'Submit fresh passport application via Passport Seva Kendra.'),
        'marriage_registration': ('/portals/site6_revenue_certificates.html#/marriage-registration', 'Submit official civil marriage certificate registration.'),
        'income_residence_certificate': ('/portals/site6_revenue_certificates.html#/income-residence', 'Apply for official Revenue Income and Residence certificate.'),
    }
    portal_path, goal = mapping.get(workflow_id, ('/portals/site2_welfare.html#/welfare-claim', f'Complete government workflow for {workflow_id}.'))

    step_values = {
        'birth_certificate': ['child_name', 'dob', 'mother_name', 'father_name', 'hospital'],
        'death_certificate': ['deceased_name', 'dod', 'applicant_name', 'place_of_death'],
        'dl_renewal': ['license_number', 'dob'],
        'eshram_worker_card': ['full_name', 'aadhaar_number', 'dob'],
        'labour_welfare_claim': ['worker_id', 'claim_type', 'claim_amount', 'bank_account_number', 'ifsc_code'],
        'uidai_address_update': ['aadhaar_number', 'new_address', 'pincode'],
        'default': ['full_name', 'new_address'],
    }
    values = step_values.get(workflow_id, step_values['default'])

    steps = [
        WorkflowStep(id='step1', intent='Locate and access target service registration form', action='click', risk='LOW'),
        *[
            WorkflowStep(id=f'step{i+2}', intent=f'Fill required field {value_ref}', action='fill', value_ref=value_ref, risk='LOW')
            for i, value_ref in enumerate(values)
        ],
        WorkflowStep(id='step_final', intent='Submit official application request', action='click', target_text='Submit', risk='CRITICAL', requires_hitl=True),
    ]

    return WorkflowDefinition(
        id=workflow_id,
        portal_id='government_portal',
        description=f'Dynamic government workflow for {workflow_id}',
        goal=goal,
        portal_path=portal_path,
        allowed_domains=['127.0.0.1', 'localhost'],
        steps=steps,
        constraints={'allowed_actions': ['navigate', 'click', 'fill', 'select', 'upload', 'wait']}
    )


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

from .runtime.fasttrack import FastTrackExecutor

last_created_sessions: dict[str, tuple[str, float]] = {}

@app.post('/sessions')
async def start_session(request: StartRequest) -> dict:
    now = time.time()
    if request.workflow_id in last_created_sessions:
        existing_sid, created_time = last_created_sessions[request.workflow_id]
        if now - created_time < 2.0 and existing_sid in sessions:
            return {'session_id': existing_sid, 'workflow_id': request.workflow_id}

    workflow = workflows.get(request.workflow_id)
    if workflow is None:
        workflow = create_fallback_workflow(request.workflow_id)
    
    session_id = uuid.uuid4().hex
    last_created_sessions[request.workflow_id] = (session_id, now)

    async def emit(event: RuntimeEvent) -> None:
        await hub.publish(event)

    mode = os.getenv('EXECUTION_MODE', 'fasttrack').lower()
    if mode in {'fasttrack', 'auto'}:
        session = FastTrackExecutor(session_id, workflow, request.values, emit, ROOT / 'portals', 'http://127.0.0.1:8000/portals')
    else:
        session = RuntimeSession(session_id, workflow, request.values, emit, ROOT / 'portals', 'http://127.0.0.1:8000/portals')

    try:
        xai_log(
            "[FASTAPI HTTP ROUTE]",
            f"POST /sessions -- Agent Session Created ({mode.upper()} MODE)",
            [
                f"Session ID  : {session_id}",
                f"Workflow ID : {workflow.id}",
                f"Target URL  : {workflow.portal_path}",
                f"Execution   : {BOLD}{CYAN}FAST-TRACK PLAYWRIGHT DIRECT (Zero LLM Latency){RESET}" if mode in {'fasttrack', 'auto'} else f"LLM State Machine ({session.decider.provider_name.upper()})",
                f"Action      : Spawning asynchronous task...",
            ]
        )
    except Exception:
        sessions.pop(session_id, None)
        raise

    sessions[session_id] = session
    asyncio.create_task(session.run())
    return {'session_id': session_id, 'workflow_id': workflow.id}

@app.post('/sessions/{session_id}/approval')
async def approval(session_id: str, request: ApprovalRequest) -> dict:
    session = sessions.get(session_id)
    if session is None:
        raise HTTPException(status_code=404, detail='session not found')
    await session.approve(request.approved)
    xai_log(
        "[FASTAPI HITL ROUTE]",
        f"POST /sessions/{session_id}/approval -- User HITL Response Received",
        [f"Approved Status: {request.approved}"]
    )
    return {'accepted': True}

@app.websocket('/sessions/{session_id}/events')
async def events(session_id: str, websocket: WebSocket) -> None:
    if session_id not in sessions:
        # Session not found — accept then close cleanly so frontend gets a proper close frame
        try:
            await websocket.accept()
            await websocket.close(code=4404)
        except Exception:
            pass
        return
    await hub.connect(session_id, websocket)
    # hub.connect() may exit early if the client disconnected during history replay.
    # Check the websocket is still actually in the hub before entering the receive loop.
    if websocket not in hub.clients.get(session_id, set()):
        # Already disconnected during history replay — nothing left to do
        return
    xai_log(
        "[WEBSOCKET ROUTE]",
        f"WebSocket Connected: /sessions/{session_id}/events",
        [f"Streaming live event telemetry to frontend UI..."]
    )
    try:
        while True:
            await websocket.receive_text()
    except (WebSocketDisconnect, RuntimeError):
        # RuntimeError fires when receive_text() is called on an already-closed socket
        hub.disconnect(session_id, websocket)
