from __future__ import annotations
from ..schemas import BrowserObservation, WorkflowDefinition

class ActionVerifier:
    def verify(self, workflow: WorkflowDefinition, observation: BrowserObservation) -> dict:
        conditions: list[str] = []
        failed: list[str] = []

        if workflow.completion_conditions:
            for condition in workflow.completion_conditions:
                kind = condition.get('type')
                expected = str(condition.get('text', ''))
                if kind in {'success_message', 'text_present'}:
                    (conditions if expected and expected.lower() in (observation.text or '').lower() else failed).append(expected or kind)
                elif kind == 'url':
                    (conditions if observation.url == expected else failed).append(expected or kind)

        # Universal fallback heuristic across all portal HTML pages
        obs_text_lower = (observation.text or '').lower()
        
        has_confirmation_element = any(
            'confirmation-panel' in (elem.selector or '') or 'confirmation-id' in (elem.selector or '')
            for elem in (observation.elements or [])
        )

        COMMON_SUCCESS_PHRASES = [
            'application registered',
            'application received',
            'application submitted',
            'request received',
            'application reference',
            'reference number',
            'submission successful',
            'application complete',
            'download confirmation',
            'certificate application received',
            'registration received',
        ]

        has_success_phrase = any(phrase in obs_text_lower for phrase in COMMON_SUCCESS_PHRASES)
        universal_completion = has_confirmation_element or has_success_phrase

        if workflow.completion_conditions:
            completion_confirmed = (bool(conditions) and not failed) or universal_completion
        else:
            completion_confirmed = universal_completion

        if universal_completion and not conditions:
            conditions.append('universal_portal_confirmation')

        return {
            'verified_conditions': conditions,
            'failed_conditions': failed,
            'current_phase': 'complete' if completion_confirmed else 'in_progress',
            'next_required_action': None if completion_confirmed else 'continue',
            'confidence': 1.0 if completion_confirmed else 0.5,
            'completion_confirmed': completion_confirmed,
        }
