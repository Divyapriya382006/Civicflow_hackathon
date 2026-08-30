from __future__ import annotations
import json
from pathlib import Path
from .schemas import WorkflowDefinition

class WorkflowLoader:
    _allowed_workflows = {'name_correction', 'license_lookup'}

    def __init__(self, root: Path):
        self.root = root

    @staticmethod
    def validate_workflow(workflow: WorkflowDefinition) -> None:
        allowed = set(workflow.constraints.get('allowed_actions', []))
        for step in workflow.steps:
            if step.action not in allowed:
                raise ValueError(
                    f"Workflow contract mismatch in '{workflow.id}': step '{step.id}' "
                    f"requires action '{step.action}', but '{step.action}' is not in "
                    f"constraints.allowed_actions: {sorted(allowed)}"
                )

    def load_all(self) -> dict[str, WorkflowDefinition]:
        workflows: dict[str, WorkflowDefinition] = {}
        for path in self.root.glob('**/*.json'):
            try:
                workflow = WorkflowDefinition.model_validate(json.loads(path.read_text(encoding='utf-8')))
                self.validate_workflow(workflow)
                if workflow.id not in self._allowed_workflows:
                    continue
                if workflow.id not in workflows:
                    workflows[workflow.id] = workflow
            except Exception as exc:
                print(f"[WorkflowLoader] Error loading {path}: {exc}")
                raise
        return workflows
