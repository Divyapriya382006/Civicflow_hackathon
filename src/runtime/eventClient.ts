export interface RuntimeEvent {
  type: string;
  session_id: string;
  timestamp: string;
  node_id?: string | null;
  data: Record<string, unknown>;
}

export interface RuntimeSessionStart {
  session_id: string;
  workflow_id: string;
}

const RUNTIME_URL = 'http://127.0.0.1:8000';

export async function startRuntimeSession(workflowId: string, values: Record<string, string>): Promise<RuntimeSessionStart> {
  const response = await fetch(`${RUNTIME_URL}/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ workflow_id: workflowId, values }),
  });
  if (!response.ok) throw new Error(`Runtime session failed: ${response.status}`);
  return response.json() as Promise<RuntimeSessionStart>;
}

export function subscribeToRuntime(sessionId: string, onEvent: (event: RuntimeEvent) => void, onError: (error: Event) => void): () => void {
  const socket = new WebSocket(`${RUNTIME_URL.replace(/^http/, 'ws')}/sessions/${sessionId}/events`);
  socket.onmessage = (message) => onEvent(JSON.parse(message.data) as RuntimeEvent);
  socket.onerror = onError;
  return () => socket.close();
}

export async function respondToApproval(sessionId: string, approved: boolean, notes: string): Promise<void> {
  await fetch(`${RUNTIME_URL}/sessions/${sessionId}/approval`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ approved, notes }),
  });
}
