/* ── Backend API Client ── */

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000";

export type VapiEvent =
  | { type: "call_started"; ts: number }
  | { type: "user_transcript"; text: string; ts: number }
  | { type: "agent_transcript"; text: string; ts: number }
  | { type: "latency"; ms: number }
  | { type: "barge_in"; ts: number }
  | { type: "call_ended"; ts: number };

export type SessionStatus = "running" | "pass" | "fail";

export interface SessionState {
  roomId: string;
  startedAt: number | null;
  firstResponseMs: number | null;
  deadAirDetected: boolean;
  requiredStepSeen: boolean;
  interruptionCount: number;
  ended: boolean;
  status: SessionStatus;
  failureReason: string | null;
  events: number;
}

export class VCIClient {
  /** Create a new test session room */
  static async createRoom(roomId?: string): Promise<SessionState> {
    const res = await fetch(`${API_BASE}/rooms`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomId }),
    });
    if (!res.ok) throw new Error(`Failed to create room: ${res.statusText}`);
    return res.json();
  }

  /** Send a Vapi event to a room */
  static async sendEvent(roomId: string, event: VapiEvent): Promise<SessionState> {
    const res = await fetch(`${API_BASE}/event`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomId, event }),
    });
    if (!res.ok) throw new Error(`Failed to send event: ${res.statusText}`);
    return res.json();
  }

  /** Get current session state */
  static async getState(roomId: string): Promise<SessionState> {
    const res = await fetch(`${API_BASE}/state?roomId=${encodeURIComponent(roomId)}`);
    if (!res.ok) throw new Error(`Failed to get state: ${res.statusText}`);
    return res.json();
  }

  /** List all rooms */
  static async listRooms(): Promise<Array<{ roomId: string; status: string }>> {
    const res = await fetch(`${API_BASE}/rooms`);
    if (!res.ok) throw new Error(`Failed to list rooms: ${res.statusText}`);
    return res.json();
  }

  /** Health check */
  static async health(): Promise<{ ok: boolean; processId: string }> {
    const res = await fetch(`${API_BASE}/health`);
    if (!res.ok) throw new Error(`Health check failed: ${res.statusText}`);
    return res.json();
  }
}
