"use client";

import { io, Socket } from "socket.io-client";
import { tokenStorage } from "../auth/token-storage";

type RealtimeEventEnvelope<TPayload = unknown> = {
  eventId: string;
  emittedAt: string;
  type: string;
  audience: { mode: "user"; userId: string } | { mode: "role"; role: string } | { mode: "broadcast" };
  payload: TPayload;
};

type RealtimeErrorPayload = {
  code: string;
  message: string;
  disconnect?: boolean;
  reason?: string;
};

const REALTIME_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/api\/v1\/?$/, "") ?? "http://localhost:4000";

class RealtimeSocketClient {
  private socket: Socket | null = null;
  private listenersBound = false;
  private unauthorizedHandlerBound = false;
  private subscriberCount = 0;

  connect(reconnect = false) {
    if (this.socket?.connected) return this.socket;

    const token = tokenStorage.getAccessToken();

    this.socket = io(`${REALTIME_URL}/realtime`, {
      transports: ["websocket"],
      autoConnect: true,
      auth: {
        token: token ?? "",
        reconnect
      }
    });

    this.bindLifecycleListeners();
    return this.socket;
  }

  disconnect() {
    if (!this.socket) return;
    this.socket.disconnect();
    this.socket = null;
    this.listenersBound = false;
    this.unauthorizedHandlerBound = false;
  }

  onEvent<TPayload = unknown>(
    eventName: string,
    handler: (event: RealtimeEventEnvelope<TPayload>) => void
  ) {
    const socket = this.connect(this.subscriberCount > 0);
    this.subscriberCount += 1;
    socket.on(eventName, handler);
    return () => {
      socket.off(eventName, handler);
      this.subscriberCount = Math.max(0, this.subscriberCount - 1);
      if (this.subscriberCount === 0) {
        this.disconnect();
      }
    };
  }

  onUnauthorized(handler: (payload: RealtimeErrorPayload) => void) {
    const socket = this.connect(this.subscriberCount > 0);
    this.subscriberCount += 1;
    socket.on("realtime.error", handler);
    return () => {
      socket.off("realtime.error", handler);
      this.subscriberCount = Math.max(0, this.subscriberCount - 1);
      if (this.subscriberCount === 0) {
        this.disconnect();
      }
    };
  }

  ping() {
    const socket = this.connect();
    socket.emit("realtime.ping", { at: new Date().toISOString() });
  }

  private bindLifecycleListeners() {
    if (!this.socket || this.listenersBound) return;

    this.listenersBound = true;

    this.socket.on("connect_error", () => {
      // keep silent; feature hooks handle polling fallback
    });

    this.socket.on("disconnect", () => {
      // noop
    });

    if (!this.unauthorizedHandlerBound) {
      this.unauthorizedHandlerBound = true;
      this.socket.on("realtime.error", (payload: RealtimeErrorPayload) => {
        if (payload?.code === "REALTIME_UNAUTHORIZED" || payload?.code === "REALTIME_STALE_SESSION") {
          tokenStorage.clear();
          this.disconnect();
        }
      });
    }
  }
}

export const realtimeSocketClient = new RealtimeSocketClient();
export type { RealtimeEventEnvelope, RealtimeErrorPayload };
