import json
from ..schemas import WorkflowDefinition, BrowserObservation, WorkflowStep

SYSTEM_PROMPT = '''You are a fast, deterministic browser automation decision engine. Your task: generate exactly ONE browser action as JSON in <1 second.

CRITICAL RULES:
1. Use the step_roadmap and current_step guidance — these define what action to take
2. If available_values are provided, use them immediately (no LLM reasoning needed)
3. Only propose selectors that exist in the dom_observation (never make up selectors)
4. For action=navigate, check if already at that URL; if yes, skip
5. For action=click, find selector matching step target_selector or target text
6. For action=type, use step fieldKey as value_ref (simulates human typing with 50ms keystroke delay)
7. For action=fill, ONLY use for special cases where type won't work (rare)
8. For action=select, match observable option values to workflow values
9. Never propose code, JavaScript, shells, filesystem access, or arbitrary URLs

OUTPUT: Return ONLY valid JSON with fields:
  action (navigate|click|type|fill|select|upload|wait|read)
  selector (CSS or data-testid, null only for navigate/wait)
  value_ref (workflow value key for type/fill/select)
  value (literal value if not using value_ref)
  reason (1 sentence why)
  confidence (0.0-1.0)
  next_step (CONTINUE|COMPLETE|REQUEST_VISION|CONFIRM_USER)

SPEED OPTIMIZATION:
- Use quick_decision_tree to make fast decisions
- Do NOT overthink — follow the step intent directly
- If you have field values in available_values, use them immediately
- Minimize reasoning text; maximize action clarity
- PREFER action=type over fill for text inputs (simulates human typing)
'''

VISION_PROMPT = '''You are analyzing a screenshot of a government-style test portal.
Goal: {goal}

Answer ALL questions below with precise detail:

1. PAGE IDENTITY: Which service page are you on (NCS Registration / e-Shram /
   Welfare Claim / Skill Certification)? What is the visible page heading?

2. FORM STATE:
   - Which fields are visibly filled, and with what values?
   - Which fields are empty or show a placeholder only?
   - Is there a visible red/orange error message near any field? What does it say?

3. MULTI-STEP STATE (if applicable):
   - Is this a "Step 1" or "Step 2" view? Is there a Next/Back button?
   - Is the Next button visually enabled or greyed out/disabled?

4. DYNAMIC CONTENT (Skill Certification only):
   - What course is selected in the dropdown?
   - What fee and duration text is currently displayed?

5. SUBMIT READINESS:
   - Is the submit button visibly enabled or disabled?
   - Is there an unchecked required checkbox (e.g. declaration) nearby?
   - Is a loading spinner currently visible?

6. CONFIRMATION STATE:
   - Is a confirmation panel visible? If yes, what ID/reference number and
     status text does it show?

7. ERRORS: Any red error banners or alerts visible anywhere on the page?

8. RECOMMENDED ACTION: Based on what you see, return a JSON object with:
   {"action": "<click|type|fill|select|navigate|wait>", "selector": "<best CSS selector or data-testid>", "value": "<value if fill/select/type>", "reason": "<explanation>", "confidence": <0.0-1.0>}
   Prefer action="type" for text input fields (simulates human typing).
'''


def decision_prompt(workflow: WorkflowDefinition, step: WorkflowStep, observation: BrowserObservation, history: list[dict], allowed_actions: list[str], workflow_values: dict[str, str] | None = None) -> str:
    """Generate a service-optimized decision prompt with contextual guidance.
    
    Includes:
    - Workflow-specific field mappings and expected selectors
    - Current step details and expected outcomes
    - Value references with actual values for auto-complete
    - Quick decision tree for common scenarios
    """
    
    # Build service-specific field guide
    field_guide = {}
    if hasattr(workflow, 'required_information'):
        for info in workflow.required_information:
            field_guide[info.lower().replace(' ', '_')] = info
    
    # Build step-by-step guidance
    step_guide = []
    for i, s in enumerate(workflow.steps, 1):
        step_guide.append({
            'step': i,
            'intent': s.intent,
            'expected_action': s.action,
            'target_selector': getattr(s, 'targetSelector', None) or getattr(s, 'target_selector', None),
            'expected_element': getattr(s, 'targetElementLabel', None),
            'field_key': getattr(s, 'fieldKey', None),
        })
    
    # Value context for auto-completion
    value_context = {}
    if workflow_values:
        value_context = {k: v for k, v in workflow_values.items() if v}
    
    return json.dumps({
        'workflow_id': workflow.id,
        'workflow_goal': workflow.goal,
        
        'current_step': {
            'step_number': workflow.steps.index(step) + 1 if step in workflow.steps else 'unknown',
            'total_steps': len(workflow.steps),
            'intent': step.intent,
            'expected_action': step.action,
            'target_selector': getattr(step, 'targetSelector', None) or getattr(step, 'target_selector', None),
            'target_element_label': getattr(step, 'targetElementLabel', None),
            'field_key': getattr(step, 'fieldKey', None),
        },
        
        'decision_guidance': {
            'for_navigate': 'Match the observation.url with the expected portal. If already there, skip navigate.',
            'for_click': f'Find and click on elements matching "{getattr(step, "target_text", "")}" or selector "{getattr(step, "targetSelector", "")}".',
            'for_type': f'Use selector from observation. Simulate human typing with 50ms keystroke delay. Set value_ref="{getattr(step, "fieldKey", "")}" to get value from available_values.',
            'for_fill': 'ONLY for special cases where type won\'t work. Use sparingly.',
            'for_select': 'Choose the option matching the workflow value_ref.',
        },
        
        'quick_decision_tree': [
            'If step action=NAVIGATE and URL matches: return action="navigate", selector=null, next_step="CONTINUE"',
            'If step action=CLICK: find element with matching selector and text, return action="click", next_step="CONTINUE"',
            'If step action=TYPE/FILL/INPUT: find input, return action="type", value_ref=<fieldKey>, next_step="CONTINUE" (PREFER type over fill — simulates human typing)',
            'If step action=SELECT: find select element, return action="select", value_ref=<fieldKey>, next_step="CONTINUE"',
        ],
        
        'step_roadmap': step_guide,
        'available_values': value_context,
        'output_contract': 'Return JSON with: action, selector (null only for navigate/wait), value_ref, value, reason, confidence (0.0-1.0), next_step. Selector MUST match an observed element exactly.',
        'current_url': observation.url,
        'dom_observation': observation.model_dump(exclude={'text'}),
        'page_text_untrusted': observation.text,
        'previous_actions': history[-5:],  # Reduced from -10 to speed up token processing
        'allowed_actions': allowed_actions,
        'security_constraints': ['Only observed selectors', 'No arbitrary code', 'No external navigation'],
    })
