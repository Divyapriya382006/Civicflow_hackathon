from __future__ import annotations
from typing import Any, Literal
from pydantic import BaseModel, Field, ConfigDict

ActionName = Literal['navigate', 'click', 'fill', 'select', 'upload', 'wait', 'read']

class WorkflowStep(BaseModel):
    id: str
    intent: str
    action: ActionName
    value_ref: str | None = None
    target_text: str | None = None
    risk: Literal['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] = 'LOW'
    requires_hitl: bool = False

class WorkflowDefinition(BaseModel):
    model_config = ConfigDict(extra='forbid')
    id: str
    portal_id: str
    description: str
    goal: str
    portal_path: str
    allowed_domains: list[str]
    required_information: list[str] = []
    required_documents: list[str] = []
    instructions: list[str] = []
    steps: list[WorkflowStep] = Field(min_length=1)
    constraints: dict[str, Any] = {}
    risk_rules: dict[str, Any] = {}
    verification_rules: list[dict[str, Any]] = []
    completion_conditions: list[dict[str, Any]] = []

class ActionProposal(BaseModel):
    action: ActionName
    selector: str | None = None
    value_ref: str | None = None
    value: str | None = None
    reason: str
    confidence: float = Field(ge=0, le=1)

class ObservationElement(BaseModel):
    tag: str
    role: str | None = None
    label: str | None = None
    selector: str
    required: bool = False
    visible: bool
    enabled: bool
    bounding_box: dict[str, float] | None = None

class BrowserObservation(BaseModel):
    url: str
    title: str
    elements: list[ObservationElement]
    text: str = ''

class RuntimeEvent(BaseModel):
    type: str
    session_id: str
    timestamp: str
    node_id: str | None = None
    data: dict[str, Any] = {}

class StartRequest(BaseModel):
    workflow_id: str
    values: dict[str, str] = {}

class ApprovalRequest(BaseModel):
    approved: bool
    notes: str = ''
