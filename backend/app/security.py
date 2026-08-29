from __future__ import annotations
from urllib.parse import urlparse
from .schemas import ActionProposal, BrowserObservation, WorkflowDefinition

class ActionSecurityGate:
    forbidden = ('javascript:', 'eval(', 'exec(', 'subprocess', 'cookie', 'credential', 'file://')

    def validate(self, workflow: WorkflowDefinition, proposal: ActionProposal, observation: BrowserObservation) -> ActionProposal:
        allowed = workflow.constraints.get('allowed_actions', [])
        if proposal.action not in allowed:
            raise PermissionError(f'action not allowed: {proposal.action}')
        if any(token in (proposal.selector or '').lower() for token in self.forbidden):
            raise PermissionError('unsafe selector or execution payload')
        if proposal.action in {'click', 'fill', 'select', 'upload'}:
            selectors = {element.selector for element in observation.elements if element.visible and element.enabled}
            if proposal.selector not in selectors:
                raise PermissionError('target selector was not observed on the current page')
        if proposal.action == 'navigate':
            host = urlparse(proposal.value or '').hostname
            if host not in workflow.allowed_domains:
                raise PermissionError('navigation target is not allowlisted')
        return proposal
