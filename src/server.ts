import express, { Request, Response } from "express";
import { RoomManager } from "./room-manager";
import { VapiEvent } from "./types";

/**
 * Creates the Express HTTP server.
 * This is what runs inside a Hathora container.
 *
 * Hathora injects:
 *   HATHORA_DEFAULT_PORT  — port to listen on
 *   HATHORA_PROCESS_ID    — unique process ID
 *   HATHORA_INITIAL_ROOM_ID — first room assigned
 *   HATHORA_APP_ID        — your Hathora app ID
 */
export function createApp(roomManager: RoomManager) {
  const app = express();
  app.use(express.json());

  // ── Health check ──────────────────────────────────────────────
  app.get("/health", (_req: Request, res: Response) => {
    res.json({ ok: true, processId: process.env.HATHORA_PROCESS_ID ?? "local" });
  });

  // ── POST /rooms — create a new test session ──────────────────
  app.post("/rooms", (req: Request, res: Response) => {
    const roomId: string =
      req.body.roomId ?? `room-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const state = roomManager.createRoom(roomId);
    res.status(201).json(state);
  });

  // ── GET /rooms — list all rooms ──────────────────────────────
  app.get("/rooms", (_req: Request, res: Response) => {
    res.json(roomManager.listRooms());
  });

  // ── POST /event — send a VapiEvent to a room ────────────────
  app.post("/event", (req: Request, res: Response) => {
    const { roomId, event } = req.body as { roomId: string; event: VapiEvent };
    if (!roomId || !event) {
      res.status(400).json({ error: "Missing roomId or event" });
      return;
    }
    try {
      const state = roomManager.sendEvent(roomId, event);
      res.json(state);
    } catch (err: any) {
      res.status(404).json({ error: err.message });
    }
  });

  // ── GET /state?roomId=xxx — get current session state ────────
  app.get("/state", (req: Request, res: Response) => {
    const roomId = req.query.roomId as string;
    if (!roomId) {
      res.status(400).json({ error: "Missing roomId query param" });
      return;
    }
    const state = roomManager.getState(roomId);
    if (!state) {
      res.status(404).json({ error: `Room not found: ${roomId}` });
      return;
    }
    res.json(state);
  });

  return app;
}
