import { env } from '../config/env';

type MessageHandler = (data: unknown) => void;
type ConnectionStatus = 'connecting' | 'open' | 'closed' | 'error';
type StatusHandler = (status: ConnectionStatus) => void;

const RECONNECT_BASE_DELAY_MS = 1000;
const RECONNECT_MAX_DELAY_MS = 30000;

class SocketManager {
  private socket: WebSocket | null = null;
  private url: string = env.wsUrl;
  private messageHandlers = new Set<MessageHandler>();
  private statusHandlers = new Set<StatusHandler>();
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
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
    this.emitStatus('connecting');
    this.socket = new WebSocket(this.url);

    this.socket.onopen = () => {
      this.reconnectAttempts = 0;
      this.emitStatus('open');
    };

    this.socket.onmessage = (event: MessageEvent) => {
      try {
        const parsed = JSON.parse(event.data);
        this.messageHandlers.forEach((handler) => handler(parsed));
      } catch {
        this.messageHandlers.forEach((handler) => handler(event.data));
      }
    };

    this.socket.onerror = () => {
      this.emitStatus('error');
    };

    this.socket.onclose = () => {
      this.emitStatus('closed');
      if (this.shouldReconnect) {
        this.scheduleReconnect();
      }
    };
  }

  private scheduleReconnect(): void {
    const delay = Math.min(
      RECONNECT_BASE_DELAY_MS * 2 ** this.reconnectAttempts,
      RECONNECT_MAX_DELAY_MS
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
