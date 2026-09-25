import type { ConnectionStatus } from '../SocketManager';

type MessageHandler = (data: unknown) => void;
type StatusHandler = (status: ConnectionStatus) => void;

const messageHandlers = new Set<MessageHandler>();
const statusHandlers = new Set<StatusHandler>();

/**
 * Manual mock for the socket singleton: no real WebSocket, but real
 * subscribe/unsubscribe bookkeeping, so tests can push frames at the app the
 * same way the server would and unmounting still tears subscriptions down.
 */
export const socketManager = {
  connect: jest.fn(),
  disconnect: jest.fn(),
  send: jest.fn(),
  // Plain functions, not `jest.fn()`: CRA's Jest config sets `resetMocks`, which
  // would strip these implementations and leave the provider without an
  // unsubscribe function to call on unmount.
  onMessage(handler: MessageHandler) {
    messageHandlers.add(handler);
    return () => messageHandlers.delete(handler);
  },
  onStatusChange(handler: StatusHandler) {
    statusHandlers.add(handler);
    return () => statusHandlers.delete(handler);
  },

  /** Delivers a frame to every subscriber, as `SocketManager.onmessage` would. */
  __emitMessage(data: unknown) {
    messageHandlers.forEach((handler) => handler(data));
  },

  __emitStatus(status: ConnectionStatus) {
    statusHandlers.forEach((handler) => handler(status));
  },
};
