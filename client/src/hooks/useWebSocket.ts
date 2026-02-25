import { useEffect, useRef, useCallback, useState } from 'react';
import type { WebSocketMessage } from '../types';

interface UseWebSocketOptions {
  groupId: number;
  onMessage: (message: WebSocketMessage) => void;
  enabled?: boolean;
}

export function useWebSocket({ groupId, onMessage, enabled = true }: UseWebSocketOptions) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttempts = useRef(0);
  const [isConnected, setIsConnected] = useState(false);
  const onMessageRef = useRef(onMessage);

  // Keep callback reference updated
  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  const connect = useCallback(() => {
    if (!enabled || !groupId) return;

    const accessToken = localStorage.getItem('accessToken');
    if (!accessToken) return;

    // Use relative WebSocket URL for Vite proxy
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws?token=${accessToken}`;

    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      setIsConnected(true);
      reconnectAttempts.current = 0;
      // Subscribe to group room
      ws.send(JSON.stringify({ type: 'JOIN_GROUP', payload: { groupId } }));
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data) as WebSocketMessage;
        if (message.type === 'PING') {
          ws.send(JSON.stringify({ type: 'PONG', payload: {} }));
          return;
        }
        onMessageRef.current(message);
      } catch (error) {
        console.error('WebSocket message parse error:', error);
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
      wsRef.current = null;

      // Exponential backoff reconnection
      if (enabled) {
        const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
        reconnectAttempts.current++;
        setTimeout(connect, delay);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    wsRef.current = ws;
  }, [enabled, groupId]);

  useEffect(() => {
    connect();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [connect]);

  const sendMessage = useCallback((message: WebSocketMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  }, []);

  return { isConnected, sendMessage };
}
