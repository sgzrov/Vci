import { HathoraCloud } from "@hathora/cloud-sdk-typescript";

/**
 * Hathora Cloud Client
 *
 * Wraps the Hathora Cloud SDK to:
 *   1. Create rooms (each room = one voice test session)
 *   2. Poll for connection info (host:port)
 *   3. Manage room lifecycle
 */

export interface RoomConnection {
  roomId: string;
  host: string;
  port: number;
  status: string;
}

export class HathoraClient {
  private client: HathoraCloud;
  private appId: string;

  constructor(appId: string, token: string) {
    this.appId = appId;
    this.client = new HathoraCloud({
      hathoraDevToken: token,
      appId: appId,
    });
  }

  /** Create a new room in a given region. Returns the roomId. */
  async createRoom(region: string = "Seattle"): Promise<string> {
    const res = await this.client.roomsV2.createRoom({
      region: region as any,
    });

    const roomId = res.roomId;
    console.log(`[hathora] Room created: ${roomId} in ${region}`);
    return roomId;
  }

  /** Poll until the room's process is active and connection info is available. */
  async waitForConnection(
    roomId: string,
    maxWaitMs: number = 30000,
    pollIntervalMs: number = 2000
  ): Promise<RoomConnection> {
    const start = Date.now();
    console.log(`[hathora] Waiting for room ${roomId} to become active...`);

    while (Date.now() - start < maxWaitMs) {
      try {
        const info = await this.client.roomsV2.getConnectionInfo(roomId);

        if (info.status === "active" && info.exposedPort) {
          const conn: RoomConnection = {
            roomId,
            host: info.exposedPort.host,
            port: info.exposedPort.port,
            status: "active",
          };
          console.log(`[hathora] Room active: http://${conn.host}:${conn.port}`);
          return conn;
        }
      } catch (_e) {
        // Room not ready yet
      }

      await sleep(pollIntervalMs);
    }

    throw new Error(`Room ${roomId} did not become active within ${maxWaitMs}ms`);
  }

  /** Create a room and wait for it to be connectable. */
  async createAndConnect(region: string = "Seattle"): Promise<RoomConnection> {
    const roomId = await this.createRoom(region);
    return this.waitForConnection(roomId);
  }

  /** Destroy a room. */
  async destroyRoom(roomId: string): Promise<void> {
    try {
      await this.client.roomsV2.destroyRoom(roomId);
      console.log(`[hathora] Room destroyed: ${roomId}`);
    } catch (e: any) {
      console.warn(`[hathora] Failed to destroy room ${roomId}: ${e.message}`);
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
