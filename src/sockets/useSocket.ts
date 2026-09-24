import { useEffect, useState } from 'react';
import { socketManager, ConnectionStatus } from './SocketManager';

export function useSocket(onMessage?: (data: unknown) => void) {
  const [status, setStatus] = useState<ConnectionStatus>('closed');

  useEffect(() => {
    const unsubscribeStatus = socketManager.onStatusChange(setStatus);
    const unsubscribeMessage = onMessage
      ? socketManager.onMessage(onMessage)
      : undefined;

    return () => {
      unsubscribeStatus();
      unsubscribeMessage?.();
    };
  }, [onMessage]);

  return { status, send: socketManager.send.bind(socketManager) };
}
