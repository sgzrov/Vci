import { TestSession } from "./session";
import { VapiEvent, SessionState } from "./types";

/**
 * RoomManager — maps Hathora room IDs to live TestSessions.
 * Each voice test runs inside ONE room. In-memory only, no database.
 */
export class RoomManager {
  private rooms: Map<string, TestSession> = new Map();

  /** Create a new test session for a room. Returns the initial state. */
  createRoom(roomId: string): SessionState {
    if (this.rooms.has(roomId)) {
      return this.rooms.get(roomId)!.getState();
    }
    const session = new TestSession(roomId);
    this.rooms.set(roomId, session);
    console.log(`[room-manager] Room created: ${roomId}`);
    return session.getState();
  }

  /** Send an event to a room's session. */
  sendEvent(roomId: string, event: VapiEvent): SessionState {
    const session = this.rooms.get(roomId);
    if (!session) {
      throw new Error(`Room not found: ${roomId}`);
    }
    const state = session.onEvent(event);
    console.log(
      `[room-manager] [${roomId}] event=${event.type} status=${state.status}` +
        (state.failureReason ? ` reason="${state.failureReason}"` : "")
    );
    return state;
  }

  /** Get current state for a room. */
  getState(roomId: string): SessionState | null {
    const session = this.rooms.get(roomId);
    return session ? session.getState() : null;
  }

  /** List all room IDs and their statuses. */
  listRooms(): Array<{ roomId: string; status: string }> {
    const out: Array<{ roomId: string; status: string }> = [];
    this.rooms.forEach((session, roomId) => {
      out.push({ roomId, status: session.getState().status });
    });
    return out;
  }

  /** Remove a completed room (optional cleanup). */
  removeRoom(roomId: string): boolean {
    return this.rooms.delete(roomId);
  }
}
