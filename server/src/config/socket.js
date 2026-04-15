/**
 * Socket.io configuration.
 * Handles real-time events for:
 *   - Pomodoro timer sync across tabs/devices
 *   - Board card drag-drop updates
 *   - Live presence (who is viewing a board/note)
 *   - Inbox notification push
 */
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const { createCorsOriginHandler } = require('./origins');

let io;

function initSocket(httpServer) {
  const corsOrigin = createCorsOriginHandler();

  io = new Server(httpServer, {
    cors: {
      origin: corsOrigin,
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  // Auth middleware — require valid JWT on handshake
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    if (!token) return next(new Error('Authentication required'));
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId     = decoded.userId || decoded.id || decoded._id;
      socket.workspaceId = decoded.defaultWorkspaceId;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const uid = socket.userId;
    console.log(`[Socket] connected: ${uid}`);

    // ── Room join/leave ─────────────────────────────────────────────────────

    // Join a board room to receive live card updates
    socket.on('board:join', (boardId) => {
      socket.join(`board:${boardId}`);
      socket.to(`board:${boardId}`).emit('presence:join', { userId: uid, boardId });
    });

    socket.on('board:leave', (boardId) => {
      socket.leave(`board:${boardId}`);
      socket.to(`board:${boardId}`).emit('presence:leave', { userId: uid, boardId });
    });

    // Join a note room for collaborative editing awareness
    socket.on('note:join', (noteId) => {
      socket.join(`note:${noteId}`);
      socket.to(`note:${noteId}`).emit('note:user_joined', { userId: uid });
    });

    socket.on('note:leave', (noteId) => {
      socket.leave(`note:${noteId}`);
      socket.to(`note:${noteId}`).emit('note:user_left', { userId: uid });
    });

    // Join workspace room for inbox/notification delivery
    socket.on('workspace:join', (workspaceId) => {
      socket.join(`workspace:${workspaceId}`);
    });

    // ── Pomodoro timer sync ─────────────────────────────────────────────────

    // Broadcast timer state to all of the user's own sockets (multi-tab sync)
    socket.on('timer:update', (data) => {
      // data: { sessionId, timeLeft, running, mode }
      socket.broadcast.to(`user:${uid}`).emit('timer:sync', data);
    });

    socket.on('timer:complete', (data) => {
      socket.broadcast.to(`user:${uid}`).emit('timer:done', data);
    });

    // Auto-join personal room for timer sync
    socket.join(`user:${uid}`);

    // ── Board card live updates ─────────────────────────────────────────────

    // Client can emit card moves for optimistic UI in other tabs
    socket.on('card:move', (data) => {
      // data: { boardId, cardId, columnId }
      socket.to(`board:${data.boardId}`).emit('card:moved', data);
    });

    // ── Note collaborative cursor ───────────────────────────────────────────
    socket.on('note:cursor', (data) => {
      // data: { noteId, position }
      socket.to(`note:${data.noteId}`).emit('note:cursor', { userId: uid, ...data });
    });

    // ── Disconnect ──────────────────────────────────────────────────────────
    socket.on('disconnect', (reason) => {
      console.log(`[Socket] disconnected: ${uid} (${reason})`);
    });
  });

  return io;
}

function getIO() {
  if (!io) throw new Error('Socket.io not initialized');
  return io;
}

/** Push a notification to a specific workspace room */
function notifyWorkspace(workspaceId, event, data) {
  if (io) io.to(`workspace:${workspaceId}`).emit(event, data);
}

/** Push to a specific user (all their sockets) */
function notifyUser(userId, event, data) {
  if (io) io.to(`user:${userId}`).emit(event, data);
}

module.exports = { initSocket, getIO, notifyWorkspace, notifyUser };
