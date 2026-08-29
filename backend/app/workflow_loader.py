from __future__ import annotations
import json
from pathlib import Path
from .schemas import WorkflowDefinition

class WorkflowLoader:
    def __init__(self, root: Path):
        self.root = root

    def load_all(self) -> dict[str, WorkflowDefinition]:
        workflows: dict[str, WorkflowDefinition] = {}
        for path in self.root.glob('**/*.json'):
            if path.parent.name not in {'identity', 'transport'}:
                continue
            workflow = WorkflowDefinition.model_validate(json.loads(path.read_text(encoding='utf-8')))
            if workflow.id in workflows:
                raise ValueError(f'duplicate workflow id: {workflow.id}')
            workflows[workflow.id] = workflow
        return workflows
