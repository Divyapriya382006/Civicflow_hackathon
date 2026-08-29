import asyncio
import time
import statistics
from app.schemas import WorkflowDefinition, WorkflowStep, BrowserObservation, ObservationElement
from app.llm.ollama_client import OllamaDecisionClient

async def main():
    print("=" * 60, flush=True)
    print("STARTING OLLAMA 20-CYCLE RUNTIME BENCHMARK", flush=True)
    print("=" * 60, flush=True)

    client = OllamaDecisionClient()
    print(f"Provider: {client.provider_name} | Model: {client.model_name} | Base URL: {client.base_url}", flush=True)

    workflow = WorkflowDefinition(
        id="birth_certificate",
        portal_id="civil_registration",
        description="Birth Certificate Registration Test",
        goal="Submit formal registration request for digital birth certificate issuance.",
        portal_path="/portals/site5_parivahan_vital.html#/birth",
        allowed_domains=["127.0.0.1", "localhost"],
        steps=[
            WorkflowStep(id="child_name", intent="Enter child name", action="fill", value_ref="child_name", risk="LOW"),
            WorkflowStep(id="dob", intent="Enter date of birth", action="fill", value_ref="dob", risk="LOW"),
            WorkflowStep(id="submit", intent="Submit birth registration", action="click", target_text="Submit", risk="CRITICAL", requires_hitl=True),
        ],
        constraints={"allowed_actions": ["navigate", "click", "fill", "select", "upload", "wait"]}
    )

    observation = BrowserObservation(
        url="http://127.0.0.1:8000/portals/site5_parivahan_vital.html#/birth",
        title="Transport & Civil Vital Portal (Test Clone)",
        elements=[
            ObservationElement(tag="input", role="textbox", label="Child Full Name", selector='[data-testid="birth-childname-input"]', required=True, visible=True, enabled=True),
            ObservationElement(tag="input", role="textbox", label="Date of Birth", selector='[data-testid="birth-dob-input"]', required=True, visible=True, enabled=True),
            ObservationElement(tag="input", role="textbox", label="Mother Full Name", selector='[data-testid="birth-mothername-input"]', required=True, visible=True, enabled=True),
            ObservationElement(tag="input", role="textbox", label="Father Full Name", selector='[data-testid="birth-fathername-input"]', required=True, visible=True, enabled=True),
            ObservationElement(tag="input", role="textbox", label="Hospital / Place of Birth", selector='[data-testid="birth-hospital-input"]', required=True, visible=True, enabled=True),
            ObservationElement(tag="button", role="button", label="Submit Birth Registration", selector='[data-testid="birth-submit-btn"]', required=False, visible=True, enabled=True),
        ],
        text="Birth Certificate Registration Apply for official civil birth registration certificate."
    )

    history = []
    latencies = []
    prompt_tokens_list = []
    completion_tokens_list = []
    tokens_per_sec_list = []

    print("\nExecuting 20 decision cycles...\n", flush=True)

    for i in range(1, 21):
        step_idx = (i - 1) % len(workflow.steps)
        step = workflow.steps[step_idx]
        
        t0 = time.perf_counter()
        proposal, meta = await client.decide(workflow, step, observation, history)
        t1 = time.perf_counter()

        elapsed_ms = (t1 - t0) * 1000.0
        latencies.append(elapsed_ms)
        prompt_tokens_list.append(meta['prompt_tokens'])
        completion_tokens_list.append(meta['completion_tokens'])
        tokens_per_sec_list.append(meta['tokens_per_sec'])

        print(f"Cycle {i:02d} | Step: {step.id:<10} | Action: {proposal.action:<6} | Confidence: {proposal.confidence:.2f} | Time: {elapsed_ms:6.1f} ms | Tokens/s: {meta['tokens_per_sec']:5.1f}", flush=True)
        
        history.append({
            'step': step.id,
            'action': proposal.action,
            'selector': proposal.selector
        })

    print("\n" + "=" * 60, flush=True)
    print("BENCHMARK RESULTS REPORT", flush=True)
    print("=" * 60, flush=True)

    cold_start_ms = latencies[0]
    warm_latencies = latencies[1:]
    
    sorted_latencies = sorted(latencies)
    avg_latency_ms = statistics.mean(latencies)
    p50_latency_ms = statistics.median(latencies)
    p95_index = int(0.95 * len(sorted_latencies)) - 1
    p95_latency_ms = sorted_latencies[p95_index]
    warm_avg_ms = statistics.mean(warm_latencies)

    avg_tokens_per_sec = statistics.mean(tokens_per_sec_list)
    avg_prompt_tokens = statistics.mean(prompt_tokens_list)
    avg_completion_tokens = statistics.mean(completion_tokens_list)

    print(f"Cold-Start Latency (Cycle 1) : {cold_start_ms:.2f} ms", flush=True)
    print(f"Warm Inference Latency (Avg) : {warm_avg_ms:.2f} ms", flush=True)
    print(f"Average Latency (Overall)   : {avg_latency_ms:.2f} ms", flush=True)
    print(f"p50 Latency                 : {p50_latency_ms:.2f} ms", flush=True)
    print(f"p95 Latency                 : {p95_latency_ms:.2f} ms", flush=True)
    print(f"Average Tokens / Sec        : {avg_tokens_per_sec:.2f} tok/s", flush=True)
    print(f"Average Prompt Tokens       : {avg_prompt_tokens:.1f} tokens", flush=True)
    print(f"Average Output Tokens       : {avg_completion_tokens:.1f} tokens", flush=True)
    print("=" * 60, flush=True)

if __name__ == "__main__":
    asyncio.run(main())
