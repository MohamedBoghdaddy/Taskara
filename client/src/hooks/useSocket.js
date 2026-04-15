/**
 * useSocket — React hook that manages a Socket.io connection.
 *
 * Usage:
 *   const socket = useSocket();
 *   useEffect(() => {
 *     socket.emit('board:join', boardId);
 *     socket.on('card:updated', handleUpdate);
 *     return () => { socket.off('card:updated'); socket.emit('board:leave', boardId); };
 *   }, [boardId]);
 *
 * The hook returns null if the user is not authenticated, so callers should
 * guard with: if (!socket) return;
 */
import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuthStore } from '../store/authStore';
import { SOCKET_URL } from '../api/base';

let sharedSocket = null; // module-level singleton

export function useSocket() {
  const { token } = useAuthStore();
  const socketRef = useRef(null);

  useEffect(() => {
    if (!token) {
      // Disconnect if logged out
      if (sharedSocket) { sharedSocket.disconnect(); sharedSocket = null; }
      return;
    }

    // Re-use existing connection if token hasn't changed
    if (!sharedSocket || !sharedSocket.connected) {
      sharedSocket = io(SOCKET_URL, {
        auth: { token },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 2000,
      });

      sharedSocket.on('connect', () => {
        console.log('[Socket] connected:', sharedSocket.id);
        // Auto-join workspace room for push notifications
        const user = useAuthStore.getState().user;
        if (user?.defaultWorkspaceId) {
          sharedSocket.emit('workspace:join', user.defaultWorkspaceId);
        }
      });

      sharedSocket.on('connect_error', (err) => {
        console.warn('[Socket] connection error:', err.message);
      });

      sharedSocket.on('disconnect', (reason) => {
        console.log('[Socket] disconnected:', reason);
      });
    }

    socketRef.current = sharedSocket;

    return () => {
      // Don't disconnect on component unmount — keep the shared connection alive
      // Only disconnect on logout (handled above when token is null)
    };
  }, [token]);

  return socketRef.current || sharedSocket;
}

/** Convenience: emit timer state for multi-tab sync */
export function emitTimerUpdate(data) {
  if (sharedSocket?.connected) sharedSocket.emit('timer:update', data);
}

export function emitTimerComplete(data) {
  if (sharedSocket?.connected) sharedSocket.emit('timer:complete', data);
}

export default useSocket;
