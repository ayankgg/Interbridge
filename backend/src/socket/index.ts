import { Server as HttpServer } from 'http';
import { Server as IOServer, Socket } from 'socket.io';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { verifyAccessToken } from '../utils/jwt';
import { User } from '../models/User';
import { UserStatus } from '../types';

let io: IOServer | null = null;

/**
 * Initializes the Socket.IO server for real-time chat.
 * Rooms are keyed by userId so a message can be pushed to a specific user
 * across all their connected devices/tabs.
 *
 * For multi-instance deployments, attach the Redis adapter here
 * (`io.adapter(createAdapter(pub, sub))`) so emits fan out across pods.
 */
export function initSocket(httpServer: HttpServer): IOServer {
  io = new IOServer(httpServer, {
    cors: {
      origin: env.clientUrl.split(',').map((o) => o.trim()),
      credentials: true,
    },
  });

  // JWT handshake — reject unauthenticated, banned/suspended, or revoked tokens
  io.use(async (socket: Socket, next) => {
    try {
      const token =
        (socket.handshake.auth?.token as string | undefined) ||
        socket.handshake.headers.authorization?.replace('Bearer ', '');
      if (!token) return next(new Error('UNAUTHENTICATED'));

      const payload = verifyAccessToken(token);
      const user = await User.findById(payload.sub).select('+tokenVersion status role');
      if (!user || user.status !== UserStatus.ACTIVE) {
        return next(new Error('UNAUTHENTICATED'));
      }
      if (typeof payload.tokenVersion === 'number' && payload.tokenVersion !== user.tokenVersion) {
        return next(new Error('UNAUTHENTICATED')); // token revoked
      }

      socket.data.userId = user._id.toString();
      socket.data.role = user.role;
      next();
    } catch {
      next(new Error('UNAUTHENTICATED'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const userId = socket.data.userId as string;
    socket.join(`user:${userId}`);
    logger.debug(`Socket connected: user ${userId}`);

    // Relay typing indicators within a conversation room
    socket.on('typing', (payload: { conversationId: string; to: string }) => {
      if (payload?.to) {
        io?.to(`user:${payload.to}`).emit('typing', {
          conversationId: payload.conversationId,
          from: userId,
        });
      }
    });

    socket.on('disconnect', () => {
      logger.debug(`Socket disconnected: user ${userId}`);
    });
  });

  logger.info('Socket.IO initialized');
  return io;
}

/** Pushes an event to all of a user's connected sockets. No-op if not connected. */
export function emitToUser(userId: string, event: string, payload: unknown): void {
  io?.to(`user:${userId}`).emit(event, payload);
}

export function getIo(): IOServer | null {
  return io;
}
