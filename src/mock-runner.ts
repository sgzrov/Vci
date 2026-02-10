import { RoomManager } from "./room-manager";
import { VapiEvent } from "./types";

/**
 * Mock Event Runner
 *
 * Simulates a ~20s voice call by emitting timed VapiEvents.
 * Intentionally FAILS one rule: missing required step
 * (agent never says "verify" or "confirm").
 */

const ROOM_ID = "smoke-test-001";

// ── Build a realistic event timeline ────────────────────────────
function buildMockTimeline(): VapiEvent[] {
  const t0 = Date.now();
  return [
    { type: "call_started", ts: t0 },
    { type: "agent_transcript", text: "Hello, thank you for calling. How can I help you today?", ts: t0 + 1500 },
    { type: "user_transcript", text: "Hi, I need help with my account.", ts: t0 + 4000 },
    { type: "latency", ms: 1200 },
    { type: "agent_transcript", text: "Sure, I can help you with that. Let me pull up your details.", ts: t0 + 6500 },
    { type: "user_transcript", text: "I think there's a charge I don't recognize.", ts: t0 + 9000 },
    { type: "latency", ms: 2000 },
    { type: "agent_transcript", text: "I see the charge you're referring to. Let me look into it.", ts: t0 + 12000 },
    { type: "barge_in", ts: t0 + 14000 },
    { type: "user_transcript", text: "Wait, actually it might be from last month.", ts: t0 + 15000 },
    { type: "agent_transcript", text: "No problem, let me check last month's statement for you.", ts: t0 + 17000 },
    { type: "latency", ms: 800 },
    { type: "call_ended", ts: t0 + 20000 },
  ];
}

// ── Run the mock ────────────────────────────────────────────────
export function runMockTest(roomManager: RoomManager): void {
  console.log("\n══════════════════════════════════════════════════════");
  console.log("  MOCK TEST RUNNER — simulating 20s voice call");
  console.log("  Room:", ROOM_ID);
  console.log("  Expected result: FAIL (missing required step)");
  console.log("══════════════════════════════════════════════════════\n");

  roomManager.createRoom(ROOM_ID);
  const events = buildMockTimeline();

  for (const event of events) {
    const state = roomManager.sendEvent(ROOM_ID, event);

    console.log(
      `  [${String(state.events).padStart(2)}] ` +
        `${event.type.padEnd(18)} → ` +
        `status=${state.status}` +
        (state.failureReason ? ` | FAIL: ${state.failureReason}` : "")
    );

    if (state.status === "fail") break;
  }

  const finalState = roomManager.getState(ROOM_ID)!;
  console.log("\n──────────────────────────────────────────────────────");
  console.log("  FINAL STATE:");
  console.log(JSON.stringify(finalState, null, 2));
  console.log("──────────────────────────────────────────────────────\n");
}

// If run directly: `tsx src/mock-runner.ts`
if (require.main === module) {
  const rm = new RoomManager();
  runMockTest(rm);
}
