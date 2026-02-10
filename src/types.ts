// ─── Vapi Event Contract (fixed) ────────────────────────────────────
export type VapiEvent =
  | { type: "call_started"; ts: number }
  | { type: "user_transcript"; text: string; ts: number }
  | { type: "agent_transcript"; text: string; ts: number }
  | { type: "latency"; ms: number }
  | { type: "barge_in"; ts: number }
  | { type: "call_ended"; ts: number };

// ─── Session State (per Hathora room) ───────────────────────────────
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
  events: number; // total events consumed
}
