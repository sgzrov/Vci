import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(__dirname, "../.env") });

import { HathoraClient, RoomConnection } from "./hathora-client";
import { VapiEvent } from "./types";

/**
 * Cloud Test Runner
 *
 * Creates a room on Hathora Cloud, waits for it to go active,
 * then sends mock VapiEvents to the live deployment via HTTP
 * and checks the final result.
 */

const APP_ID = process.env.HATHORA_APP_ID!;
const TOKEN = process.env.HATHORA_TOKEN!;

if (!APP_ID || !TOKEN) {
  console.error("ERROR: Set HATHORA_APP_ID and HATHORA_TOKEN in .env");
  process.exit(1);
}

// ── Send an event to the live server ────────────────────────────
function baseUrl(conn: RoomConnection): string {
  return `http://${conn.host}:${conn.port}`;
}

async function sendEvent(
  conn: RoomConnection,
  roomId: string,
  event: VapiEvent
): Promise<any> {
  const url = `${baseUrl(conn)}/event`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ roomId, event }),
  });
  return res.json();
}

async function createRoom(conn: RoomConnection): Promise<any> {
  const url = `${baseUrl(conn)}/rooms`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ roomId: "cloud-smoke-001" }),
  });
  return res.json();
}

async function getState(conn: RoomConnection, roomId: string): Promise<any> {
  const url = `${baseUrl(conn)}/state?roomId=${roomId}`;
  const res = await fetch(url);
  return res.json();
}

async function getHealth(conn: RoomConnection): Promise<any> {
  const url = `${baseUrl(conn)}/health`;
  const res = await fetch(url);
  return res.json();
}

// ── Build event timeline (PASS scenario) ────────────────────────
function buildPassTimeline(): VapiEvent[] {
  const t0 = Date.now();
  return [
    { type: "call_started", ts: t0 },
    { type: "agent_transcript", text: "Hello, how can I help you today?", ts: t0 + 1500 },
    { type: "user_transcript", text: "I need to check my balance.", ts: t0 + 4000 },
    { type: "latency", ms: 1200 },
    { type: "agent_transcript", text: "Let me verify your account details.", ts: t0 + 6000 },
    { type: "user_transcript", text: "Sure, go ahead.", ts: t0 + 8000 },
    { type: "latency", ms: 800 },
    { type: "agent_transcript", text: "Your balance is $1,240.", ts: t0 + 10000 },
    { type: "barge_in", ts: t0 + 12000 },
    { type: "user_transcript", text: "Wait, which account?", ts: t0 + 12500 },
    { type: "agent_transcript", text: "That's your checking account.", ts: t0 + 14000 },
    { type: "latency", ms: 600 },
    { type: "call_ended", ts: t0 + 20000 },
  ];
}

// ── Build event timeline (FAIL scenario — missing required step) ─
function buildFailTimeline(): VapiEvent[] {
  const t0 = Date.now();
  return [
    { type: "call_started", ts: t0 },
    { type: "agent_transcript", text: "Hello, how can I help you?", ts: t0 + 1500 },
    { type: "user_transcript", text: "I need help.", ts: t0 + 4000 },
    { type: "agent_transcript", text: "Sure, let me look into that.", ts: t0 + 6000 },
    { type: "latency", ms: 900 },
    { type: "agent_transcript", text: "I see your account here.", ts: t0 + 10000 },
    { type: "call_ended", ts: t0 + 20000 },
  ];
}

// ── Main ────────────────────────────────────────────────────────
async function main() {
  console.log("╔═══════════════════════════════════════════════════╗");
  console.log("║  VCI Cloud Test — Live Hathora Deployment        ║");
  console.log("╠═══════════════════════════════════════════════════╣");
  console.log(`║  App: ${APP_ID.padEnd(42)}║`);
  console.log("╚═══════════════════════════════════════════════════╝\n");

  const client = new HathoraClient(APP_ID, TOKEN);

  // 1. Create a room on Hathora Cloud (spins up a process)
  console.log("[1/5] Creating room on Hathora Cloud...");
  const conn = await client.createAndConnect("Seattle");

  // 2. Health check
  console.log("\n[2/5] Health check...");
  const health = await getHealth(conn);
  console.log("  →", JSON.stringify(health));

  // 3. Create a test session inside the room
  console.log("\n[3/5] Creating test session...");
  const room = await createRoom(conn);
  console.log("  → Session created:", room.status);

  const testRoomId = "cloud-smoke-001";

  // 4. Run PASS test
  console.log("\n[4/5] Running PASS test...");
  const passEvents = buildPassTimeline();
  for (const event of passEvents) {
    const state = await sendEvent(conn, testRoomId, event);
    const label = event.type.padEnd(18);
    console.log(
      `  ${label} → status=${state.status}` +
        (state.failureReason ? ` | ${state.failureReason}` : "")
    );
    if (state.status !== "running") break;
  }
  const passState = await getState(conn, testRoomId);
  console.log(`\n  RESULT: ${passState.status.toUpperCase()}` +
    (passState.failureReason ? ` — ${passState.failureReason}` : ""));

  // 5. Run FAIL test (new session)
  console.log("\n[5/5] Running FAIL test (missing required step)...");
  const failRoomId = "cloud-smoke-002";
  // Create the session
  await fetch(`${baseUrl(conn)}/rooms`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ roomId: failRoomId }),
  });

  const failEvents = buildFailTimeline();
  for (const event of failEvents) {
    const state = await sendEvent(conn, failRoomId, event);
    const label = event.type.padEnd(18);
    console.log(
      `  ${label} → status=${state.status}` +
        (state.failureReason ? ` | ${state.failureReason}` : "")
    );
    if (state.status !== "running") break;
  }
  const failState = await getState(conn, failRoomId);
  console.log(`\n  RESULT: ${failState.status.toUpperCase()}` +
    (failState.failureReason ? ` — ${failState.failureReason}` : ""));

  // Summary
  console.log("\n══════════════════════════════════════════════════════");
  console.log("  SUMMARY");
  console.log("──────────────────────────────────────────────────────");
  console.log(`  Test 1 (PASS scenario): ${passState.status.toUpperCase()}`);
  console.log(`  Test 2 (FAIL scenario): ${failState.status.toUpperCase()} — ${failState.failureReason}`);
  console.log("══════════════════════════════════════════════════════\n");

  // Cleanup
  console.log("[cleanup] Destroying room...");
  await client.destroyRoom(conn.roomId);
  console.log("Done.");
}

main().catch((err) => {
  console.error("Cloud test failed:", err);
  process.exit(1);
});
