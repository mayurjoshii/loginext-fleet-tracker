import type { ConnectionStatus } from './SocketManager';

/**
 * Minimal stand-in for the browser's WebSocket. Nothing connects; each test
 * drives `open`/`message`/`close` by hand.
 */
class FakeWebSocket {
  static instances: FakeWebSocket[] = [];
  static readonly OPEN = 1;

  readyState = 0;
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onerror: (() => void) | null = null;
  onclose: (() => void) | null = null;
  close = jest.fn(() => {
    this.readyState = 3;
  });
  send = jest.fn();

  constructor(public url: string) {
    FakeWebSocket.instances.push(this);
  }

  static get latest(): FakeWebSocket {
    return FakeWebSocket.instances[FakeWebSocket.instances.length - 1];
  }

  simulateOpen(): void {
    this.readyState = FakeWebSocket.OPEN;
    this.onopen?.();
  }

  simulateMessage(payload: unknown): void {
    this.onmessage?.({ data: JSON.stringify(payload) });
  }
}

/**
 * A fresh singleton per test — the module exports one shared instance on
 * purpose, so tests re-import rather than constructing their own.
 */
function freshManager() {
  let mod!: typeof import('./SocketManager');
  jest.isolateModules(() => {
    mod = require('./SocketManager');
  });
  return { socketManager: mod.socketManager, STALE_TIMEOUT_MS: mod.STALE_TIMEOUT_MS };
}

beforeEach(() => {
  jest.useFakeTimers();
  FakeWebSocket.instances = [];
  (global as unknown as { WebSocket: unknown }).WebSocket = FakeWebSocket;
});

afterEach(() => {
  jest.useRealTimers();
});

describe('SocketManager staleness watchdog', () => {
  it('gives up on a connection that goes silent, and reconnects', () => {
    const { socketManager, STALE_TIMEOUT_MS } = freshManager();
    const statuses: ConnectionStatus[] = [];
    socketManager.onStatusChange((status) => statuses.push(status));

    socketManager.connect('ws://test');
    FakeWebSocket.latest.simulateOpen();
    expect(statuses).toEqual(['connecting', 'open']);

    // The peer stops pushing but never closes the socket.
    jest.advanceTimersByTime(STALE_TIMEOUT_MS);

    // The dead socket is reported as closed rather than left claiming "open".
    expect(statuses).toEqual(['connecting', 'open', 'closed']);
    expect(FakeWebSocket.instances[0].close).toHaveBeenCalled();

    // ...and the backoff loop takes over from there.
    jest.advanceTimersByTime(1000);
    expect(FakeWebSocket.instances).toHaveLength(2);
    expect(statuses).toEqual(['connecting', 'open', 'closed', 'connecting']);

    socketManager.disconnect();
  });

  it('keeps a connection alive as long as frames keep arriving', () => {
    const { socketManager, STALE_TIMEOUT_MS } = freshManager();
    const statuses: ConnectionStatus[] = [];
    socketManager.onStatusChange((status) => statuses.push(status));

    socketManager.connect('ws://test');
    FakeWebSocket.latest.simulateOpen();

    // Three pushes at a healthy cadence, each just inside the timeout.
    for (let i = 0; i < 3; i += 1) {
      jest.advanceTimersByTime(STALE_TIMEOUT_MS - 1000);
      FakeWebSocket.latest.simulateMessage({ type: 'vehicle_update', data: [] });
    }

    // Total elapsed time is well past the timeout, but it never went silent.
    expect(statuses).toEqual(['connecting', 'open']);
    expect(FakeWebSocket.instances).toHaveLength(1);

    socketManager.disconnect();
  });

  it('any inbound frame resets the countdown, not just vehicle_update', () => {
    const { socketManager, STALE_TIMEOUT_MS } = freshManager();
    const statuses: ConnectionStatus[] = [];
    socketManager.onStatusChange((status) => statuses.push(status));

    socketManager.connect('ws://test');
    FakeWebSocket.latest.simulateOpen();

    jest.advanceTimersByTime(STALE_TIMEOUT_MS - 1000);
    FakeWebSocket.latest.simulateMessage({ type: 'initial_data', data: [] });
    jest.advanceTimersByTime(STALE_TIMEOUT_MS - 1000);

    expect(statuses).toEqual(['connecting', 'open']);

    socketManager.disconnect();
  });

  it('ignores a late close from a socket it already gave up on', () => {
    const { socketManager, STALE_TIMEOUT_MS } = freshManager();
    const statuses: ConnectionStatus[] = [];
    socketManager.onStatusChange((status) => statuses.push(status));

    socketManager.connect('ws://test');
    const abandoned = FakeWebSocket.latest;
    abandoned.simulateOpen();
    jest.advanceTimersByTime(STALE_TIMEOUT_MS);

    // The half-open socket finally notices it's dead, long after we moved on.
    abandoned.onclose?.();

    // Exactly one 'closed' and one pending reconnect — not two of each.
    expect(statuses).toEqual(['connecting', 'open', 'closed']);
    jest.advanceTimersByTime(1000);
    expect(FakeWebSocket.instances).toHaveLength(2);

    socketManager.disconnect();
  });

  it('stops watching once disconnected', () => {
    const { socketManager, STALE_TIMEOUT_MS } = freshManager();
    const statuses: ConnectionStatus[] = [];
    socketManager.onStatusChange((status) => statuses.push(status));

    socketManager.connect('ws://test');
    FakeWebSocket.latest.simulateOpen();
    socketManager.disconnect();

    jest.advanceTimersByTime(STALE_TIMEOUT_MS * 2);

    // No stale-kill, no reconnect after an intentional teardown.
    expect(statuses).toEqual(['connecting', 'open']);
    expect(FakeWebSocket.instances).toHaveLength(1);
  });

  it('a normal close still reconnects with backoff', () => {
    const { socketManager } = freshManager();
    const statuses: ConnectionStatus[] = [];
    socketManager.onStatusChange((status) => statuses.push(status));

    socketManager.connect('ws://test');
    FakeWebSocket.latest.simulateOpen();
    FakeWebSocket.latest.onclose?.();

    expect(statuses).toEqual(['connecting', 'open', 'closed']);
    jest.advanceTimersByTime(1000);
    expect(FakeWebSocket.instances).toHaveLength(2);

    socketManager.disconnect();
  });
});
