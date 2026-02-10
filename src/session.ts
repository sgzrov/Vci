import { VapiEvent, SessionState, SessionStatus } from "./types";

// ─── Smoke Test Thresholds ──────────────────────────────────────────
const MAX_FIRST_RESPONSE_MS = 3000;
const MAX_DEAD_AIR_MS = 4000;
const MAX_INTERRUPTIONS = 1;

/**
 * TestSession — one per Hathora room.
 * Consumes VapiEvents, evaluates rules incrementally,
 * and finalizes PASS/FAIL on call_ended.
 */
export class TestSession {
  private state: SessionState;
  private lastAgentText: string = "";

  constructor(roomId: string) {
    this.state = {
      roomId,
      startedAt: null,
      firstResponseMs: null,
      deadAirDetected: false,
      requiredStepSeen: false,
      interruptionCount: 0,
      ended: false,
      status: "running",
      failureReason: null,
      events: 0,
    };
  }

  // ── public api ──────────────────────────────────────────────────

  /** Feed a single Vapi event into the session. */
  onEvent(event: VapiEvent): SessionState {
    if (this.state.status !== "running") return this.state;

    this.state.events++;

    switch (event.type) {
      case "call_started":
        this.handleCallStarted(event.ts);
        break;
      case "agent_transcript":
        this.handleAgentTranscript(event.text, event.ts);
        break;
      case "user_transcript":
        // tracked for context; no rules attached
        break;
      case "latency":
        this.handleLatency(event.ms);
        break;
      case "barge_in":
        this.handleBargeIn();
        break;
      case "call_ended":
        this.handleCallEnded(event.ts);
        break;
    }

    return this.state;
  }

  /** Called on call_ended — runs final rule checks and sets PASS/FAIL. */
  finalize(): SessionState {
    if (this.state.status !== "running") return this.state;

    // Rule 1: call must have started AND ended
    if (this.state.startedAt === null) {
      return this.fail("Call never started");
    }
    if (!this.state.ended) {
      return this.fail("Call never ended");
    }

    // Rule 2: first agent response ≤ 3000ms
    if (this.state.firstResponseMs === null) {
      return this.fail("Agent never responded");
    }
    if (this.state.firstResponseMs > MAX_FIRST_RESPONSE_MS) {
      return this.fail(
        `First response too slow: ${this.state.firstResponseMs}ms > ${MAX_FIRST_RESPONSE_MS}ms`
      );
    }

    // Rule 3: dead air already caught incrementally, but double-check
    if (this.state.deadAirDetected) {
      return this.fail("Dead air detected (latency > 4000ms without 'hold')");
    }

    // Rule 4: required step — agent must say "verify" or "confirm"
    if (!this.state.requiredStepSeen) {
      return this.fail(
        'Required step missing: agent never said "verify" or "confirm"'
      );
    }

    // Rule 5: at most one interruption
    if (this.state.interruptionCount > MAX_INTERRUPTIONS) {
      return this.fail(
        `Too many interruptions: ${this.state.interruptionCount} > ${MAX_INTERRUPTIONS}`
      );
    }

    // All rules passed
    this.state.status = "pass";
    return this.state;
  }

  /** Return a snapshot of the current state. */
  getState(): SessionState {
    return { ...this.state };
  }

  // ── private handlers ────────────────────────────────────────────

  private handleCallStarted(ts: number): void {
    this.state.startedAt = ts;
  }

  private handleAgentTranscript(text: string, ts: number): void {
    // Rule 2: track first response time
    if (this.state.firstResponseMs === null && this.state.startedAt !== null) {
      this.state.firstResponseMs = ts - this.state.startedAt;
      if (this.state.firstResponseMs > MAX_FIRST_RESPONSE_MS) {
        this.fail(
          `First response too slow: ${this.state.firstResponseMs}ms > ${MAX_FIRST_RESPONSE_MS}ms`
        );
        return;
      }
    }

    // Rule 4: required step — check for "verify" or "confirm"
    const lower = text.toLowerCase();
    if (lower.includes("verify") || lower.includes("confirm")) {
      this.state.requiredStepSeen = true;
    }

    this.lastAgentText = text;
  }

  private handleLatency(ms: number): void {
    // Rule 3: dead air > 4000ms unless last agent text contains "hold"
    if (ms > MAX_DEAD_AIR_MS) {
      const holdExempt = this.lastAgentText.toLowerCase().includes("hold");
      if (!holdExempt) {
        this.state.deadAirDetected = true;
        this.fail(`Dead air: ${ms}ms latency without agent saying "hold"`);
      }
    }
  }

  private handleBargeIn(): void {
    this.state.interruptionCount++;
    // Rule 5: at most one barge_in — fail immediately if exceeded
    if (this.state.interruptionCount > MAX_INTERRUPTIONS) {
      this.fail(
        `Too many interruptions: ${this.state.interruptionCount} > ${MAX_INTERRUPTIONS}`
      );
    }
  }

  private handleCallEnded(_ts: number): void {
    this.state.ended = true;
    this.finalize();
  }

  private fail(reason: string): SessionState {
    this.state.status = "fail";
    this.state.failureReason = reason;
    return this.state;
  }
}
