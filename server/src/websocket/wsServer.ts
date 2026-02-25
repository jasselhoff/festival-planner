import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { verifyToken } from '../middleware/authMiddleware';
import type { WebSocketMessage } from '@festival-planner/shared';

interface AuthenticatedSocket extends WebSocket {
  userId: number;
  groupRooms: Set<number>;
  isAlive: boolean;
}

// Room management - Map of groupId to Set of connected sockets
const groupRooms = new Map<number, Set<AuthenticatedSocket>>();

let wss: WebSocketServer | null = null;

export function initWebSocket(server: Server) {
  wss = new WebSocketServer({ server, path: '/ws' });

  // Heartbeat interval to detect dead connections
  const heartbeatInterval = setInterval(() => {
    if (!wss) return;
    wss.clients.forEach((ws) => {
      const socket = ws as AuthenticatedSocket;
      if (!socket.isAlive) {
        handleDisconnect(socket);
        return socket.terminate();
      }
      socket.isAlive = false;
      socket.send(JSON.stringify({ type: 'PING', payload: {} }));
    });
  }, 30000);

  wss.on('connection', (ws, req) => {
    const socket = ws as AuthenticatedSocket;

    // Extract and verify JWT from query string
    const url = new URL(req.url || '', 'http://localhost');
    const token = url.searchParams.get('token');

    if (!token) {
      socket.close(4001, 'No token provided');
      return;
    }

    try {
      const decoded = verifyToken(token);
      socket.userId = decoded.userId;
      socket.groupRooms = new Set();
      socket.isAlive = true;
    } catch (error) {
      socket.close(4001, 'Invalid token');
      return;
    }

    socket.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString()) as WebSocketMessage;
        handleMessage(socket, message);
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });

    socket.on('pong', () => {
      socket.isAlive = true;
    });

    socket.on('close', () => {
      handleDisconnect(socket);
    });

    socket.on('error', (error) => {
      console.error('WebSocket error:', error);
      handleDisconnect(socket);
    });
  });

  wss.on('close', () => {
    clearInterval(heartbeatInterval);
  });

  return wss;
}

function handleMessage(socket: AuthenticatedSocket, message: WebSocketMessage) {
  switch (message.type) {
    case 'JOIN_GROUP':
      joinGroupRoom(socket, message.payload.groupId);
      break;

    case 'LEAVE_GROUP':
      leaveGroupRoom(socket, message.payload.groupId);
      break;

    case 'PONG':
      socket.isAlive = true;
      break;

    default:
      console.log('Unknown message type:', message.type);
  }
}

function joinGroupRoom(socket: AuthenticatedSocket, groupId: number) {
  if (!groupRooms.has(groupId)) {
    groupRooms.set(groupId, new Set());
  }
  groupRooms.get(groupId)!.add(socket);
  socket.groupRooms.add(groupId);

  console.log(`User ${socket.userId} joined group room ${groupId}`);
}

function leaveGroupRoom(socket: AuthenticatedSocket, groupId: number) {
  const room = groupRooms.get(groupId);
  if (room) {
    room.delete(socket);
    if (room.size === 0) {
      groupRooms.delete(groupId);
    }
  }
  socket.groupRooms.delete(groupId);

  console.log(`User ${socket.userId} left group room ${groupId}`);
}

function handleDisconnect(socket: AuthenticatedSocket) {
  // Remove from all group rooms
  socket.groupRooms.forEach((groupId) => {
    leaveGroupRoom(socket, groupId);
  });
}

// Broadcast to all members of a group
export function broadcastToGroup(
  groupId: number,
  message: WebSocketMessage,
  excludeUserId?: number
) {
  const room = groupRooms.get(groupId);
  if (!room) return;

  const payload = JSON.stringify(message);
  room.forEach((socket) => {
    if (
      socket.userId !== excludeUserId &&
      socket.readyState === WebSocket.OPEN
    ) {
      socket.send(payload);
    }
  });
}

// Get count of connected users in a group
export function getGroupConnectionCount(groupId: number): number {
  const room = groupRooms.get(groupId);
  return room ? room.size : 0;
}
