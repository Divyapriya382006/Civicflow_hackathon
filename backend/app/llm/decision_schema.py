from __future__ import annotations
import json
import re
from typing import Any
from ..schemas import ActionProposal

class DecisionValidator:
    def validate(self, raw: Any) -> ActionProposal:
        if isinstance(raw, ActionProposal):
            return raw

        if isinstance(raw, dict):
            return ActionProposal.model_validate(raw)

        if isinstance(raw, str):
            text = raw.strip()
            
            # Extract JSON block from markdown fences or text wrapper
            if '```' in text:
                match = re.search(r'```(?:json)?\s*(\{.*?\})\s*```', text, re.DOTALL)
                if match:
                    text = match.group(1)
                else:
                    text = re.sub(r'^```(?:json)?\s*', '', text)
                    text = re.sub(r'\s*```$', '', text).strip()

            if not (text.startswith('{') and text.endswith('}')):
                match = re.search(r'\{.*\}', text, re.DOTALL)
                if match:
                    text = match.group(0)

            try:
                parsed = json.loads(text)
            except json.JSONDecodeError:
                # Fallback clean single quote / formatting
                cleaned = re.sub(r"'([^'\"]*)':", r'"\1":', text)
                parsed = json.loads(cleaned)

            return ActionProposal.model_validate(parsed)

        raise ValueError(f"Cannot validate action proposal from raw data type: {type(raw)}")
