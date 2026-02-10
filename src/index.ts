import { createApp } from "./server";
import { RoomManager } from "./room-manager";
import { runMockTest } from "./mock-runner";

/**
 * VCI Hathora Engine — Entry Point
 *
 * When deployed on Hathora Cloud, the platform injects:
 *   HATHORA_DEFAULT_PORT   — port to bind to
 *   HATHORA_PROCESS_ID     — unique process identifier
 *   HATHORA_INITIAL_ROOM_ID — first room for this process
 *   HATHORA_APP_ID         — your application ID
 *   HATHORA_REGION         — deployment region
 *
 * Locally, defaults to port 4000.
 */
async function main() {
  // Hathora routes external traffic to containerPort (4000).
  // HATHORA_DEFAULT_PORT is also available but containerPort takes priority.
  const PORT = parseInt(process.env.PORT || "4000", 10);
  const PROCESS_ID = process.env.HATHORA_PROCESS_ID ?? "local";
  const REGION = process.env.HATHORA_REGION ?? "local";

  console.log("╔═══════════════════════════════════════════════════╗");
  console.log("║     VCI — Voice Agent CI Engine (Hathora)        ║");
  console.log("╠═══════════════════════════════════════════════════╣");
  console.log(`║  Process:  ${PROCESS_ID.padEnd(38)}║`);
  console.log(`║  Region:   ${REGION.padEnd(38)}║`);
  console.log(`║  Port:     ${String(PORT).padEnd(38)}║`);
  console.log("╚═══════════════════════════════════════════════════╝");

  const roomManager = new RoomManager();
  const app = createApp(roomManager);

  // If Hathora assigned an initial room, create it automatically
  const initialRoomId = process.env.HATHORA_INITIAL_ROOM_ID;
  if (initialRoomId) {
    console.log(`\n[init] Auto-creating Hathora-assigned room: ${initialRoomId}`);
    roomManager.createRoom(initialRoomId);
  }

  app.listen(PORT, () => {
    console.log(`\n[server] Listening on port ${PORT}`);
    console.log("[server] Endpoints:");
    console.log("  POST /rooms        — create a test session");
    console.log("  GET  /rooms        — list all rooms");
    console.log("  POST /event        — send VapiEvent to a room");
    console.log("  GET  /state?roomId — get session state");
    console.log("  GET  /health       — health check\n");
  });

  // Run the mock test automatically on startup (for demo)
  // Set SKIP_MOCK=true to disable
  if (!process.env.HATHORA_PROCESS_ID && process.env.SKIP_MOCK !== "true") {
    console.log("[init] Running mock test (local dev mode)...\n");
    runMockTest(roomManager);
  }
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
