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

            # Clean markdown code fences if present
            if '```' in text:
                text = re.sub(r'^```[a-zA-Z]*\s*', '', text)
                text = re.sub(r'\s*```$', '', text).strip()

            # Extract outer JSON braces ({ ... })
            start_idx = text.find('{')
            end_idx = text.rfind('}')
            if start_idx != -1 and end_idx != -1 and end_idx > start_idx:
                text = text[start_idx:end_idx + 1]

            # Try direct JSON parse
            try:
                parsed = json.loads(text)
                return ActionProposal.model_validate(parsed)
            except json.JSONDecodeError:
                pass

            # Safe regex repair for single-quoted keys/strings without corrupting inner apostrophes
            try:
                repaired = re.sub(r"(?<=[\{\,\s])'([^'\"]+)'(?=\s*:)", r'"\1"', text)
                repaired = re.sub(r"(?<=:\s*)'([^'\"]+)'(?=[\}\,\s])", r'"\1"', repaired)
                parsed = json.loads(repaired)
                return ActionProposal.model_validate(parsed)
            except Exception:
                pass

            # Fallback directly to Pydantic JSON parser
            return ActionProposal.model_validate_json(text)

        raise ValueError(f"Cannot validate action proposal from raw data type: {type(raw)}")
