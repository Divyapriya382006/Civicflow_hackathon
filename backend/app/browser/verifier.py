from __future__ import annotations
from ..schemas import BrowserObservation, WorkflowDefinition

class ActionVerifier:
    def verify(self, workflow: WorkflowDefinition, observation: BrowserObservation) -> dict:
        conditions: list[str] = []
        failed: list[str] = []
        for condition in workflow.completion_conditions:
            kind = condition.get('type')
            expected = str(condition.get('text', ''))
            if kind in {'success_message', 'text_present'}:
                (conditions if expected and expected in observation.text else failed).append(expected or kind)
            elif kind == 'url':
                (conditions if observation.url == expected else failed).append(expected or kind)
        return {
            'verified_conditions': conditions,
            'failed_conditions': failed,
            'current_phase': 'complete' if not failed and conditions else 'in_progress',
            'next_required_action': None if not failed and conditions else 'continue',
            'confidence': 1.0 if not failed and conditions else 0.5,
            'completion_confirmed': bool(conditions) and not failed,
        }
