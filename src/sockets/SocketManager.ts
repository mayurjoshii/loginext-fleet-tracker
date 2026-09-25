import { env } from "../config/env";

type MessageHandler = (data: unknown) => void;
type ConnectionStatus = "connecting" | "open" | "closed" | "error";
type StatusHandler = (status: ConnectionStatus) => void;

const RECONNECT_BASE_DELAY_MS = 1000;
const RECONNECT_MAX_DELAY_MS = 30000;

/** The server pushes a `vehicle_update` frame roughly every 3 minutes. */
const EXPECTED_PUSH_INTERVAL_MS = 180000;

/**
 * How long a connection may go silent before we stop believing it.
 *
 * A TCP connection can survive the server that was using it: no `close` event
 * ever fires, so the socket sits in `OPEN` forever while nothing arrives, and
 * the UI keeps claiming the data is live. Inbound traffic is the only evidence
 * the peer is really there, so its absence is what we time out on.
 *
 * Two missed pushes plus slack — tight enough to catch a dead peer within a few
 * minutes, loose enough that one late or dropped frame doesn't kill a healthy
 * connection.
 */
export const STALE_TIMEOUT_MS = EXPECTED_PUSH_INTERVAL_MS * 2 + 30000;

class SocketManager {
  private socket: WebSocket | null = null;
  private url: string = env.wsUrl;
  private messageHandlers = new Set<MessageHandler>();
  private statusHandlers = new Set<StatusHandler>();
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private staleTimer: ReturnType<typeof setTimeout> | null = null;
  private shouldReconnect = true;

  connect(url: string = this.url): void {
    this.url = url;
    this.shouldReconnect = true;
    this.openSocket();
  }

  disconnect(): void {
    this.shouldReconnect = false;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.clearStaleTimer();
    this.socket?.close();
    this.socket = null;
  }

  send(data: unknown): void {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(data));
    }
  }

  onMessage(handler: MessageHandler): () => void {
    this.messageHandlers.add(handler);
    return () => this.messageHandlers.delete(handler);
  }

  onStatusChange(handler: StatusHandler): () => void {
    this.statusHandlers.add(handler);
    return () => this.statusHandlers.delete(handler);
  }

  private openSocket(): void {
    if (!this.url) {
      return;
    }
    this.emitStatus("connecting");
    this.socket = new WebSocket(this.url);

    this.socket.onopen = () => {
      this.reconnectAttempts = 0;
      this.armStaleTimer();
      console.error("[SocketManager] socket connected");
      this.emitStatus("open");
    };

    this.socket.onmessage = (event: MessageEvent) => {
      // Any inbound frame is proof the peer is alive, whatever it contains.
      this.armStaleTimer();

      try {
        const parsed = JSON.parse(event.data);
        this.messageHandlers.forEach((handler) => handler(parsed));
      } catch {
        this.messageHandlers.forEach((handler) => handler(event.data));
      }
    };

    this.socket.onerror = () => {
      this.emitStatus("error");
    };

    this.socket.onclose = () => {
      this.clearStaleTimer();
      console.error("[SocketManager] socket disconnected");
      this.emitStatus("closed");
      if (this.shouldReconnect) {
        this.scheduleReconnect();
      }
    };
  }

  private clearStaleTimer(): void {
    if (this.staleTimer) {
      clearTimeout(this.staleTimer);
      this.staleTimer = null;
    }
  }

  /** (Re)starts the silence countdown. Called on open and on every frame. */
  private armStaleTimer(): void {
    this.clearStaleTimer();
    this.staleTimer = setTimeout(() => this.handleStale(), STALE_TIMEOUT_MS);
  }

  /**
   * Gives up on a connection that has gone silent past `STALE_TIMEOUT_MS`.
   *
   * The socket's own handlers are detached before closing it: a half-open
   * socket may fire `close` minutes later or never at all, and a late `close`
   * from this abandoned socket would emit a second `closed` status and schedule
   * a competing reconnect. So this reports the outcome itself rather than
   * waiting for an event that may not come.
   */
  private handleStale(): void {
    this.staleTimer = null;

    const stale = this.socket;
    this.socket = null;
    if (stale) {
      stale.onopen = null;
      stale.onmessage = null;
      stale.onerror = null;
      stale.onclose = null;
      stale.close();
    }

    console.error("[SocketManager] socket disconnected (stale)");
    this.emitStatus("closed");
    if (this.shouldReconnect) {
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect(): void {
    const delay = Math.min(
      RECONNECT_BASE_DELAY_MS * 2 ** this.reconnectAttempts,
      RECONNECT_MAX_DELAY_MS,
    );
    this.reconnectAttempts += 1;
    this.reconnectTimer = setTimeout(() => this.openSocket(), delay);
  }

  private emitStatus(status: ConnectionStatus): void {
    this.statusHandlers.forEach((handler) => handler(status));
  }
}

export const socketManager = new SocketManager();
export type { ConnectionStatus };

// Intentional. Only for debugging in devtools console; For the given case study
(window as any).socketManager = socketManager;
