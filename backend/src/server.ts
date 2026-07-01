import http from 'http';
import app from './app';
import { env } from './config/env';
import { connectDB, disconnectDB } from './config/db';
import { logger } from './config/logger';
import { startJobs } from './jobs';
import { initSocket } from './socket';

let server: http.Server;

async function bootstrap(): Promise<void> {
  await connectDB();

  server = http.createServer(app);

  // Attach the real-time chat layer to the same HTTP server
  initSocket(server);

  server.listen(env.port, () => {
    logger.info(`InternBridge API running on port ${env.port} [${env.nodeEnv}]`);
    logger.info(`Base URL: http://localhost:${env.port}${env.apiPrefix}`);
    logger.info(`WebSocket (chat) ready on the same port`);
  });

  startJobs();
}

async function shutdown(signal: string): Promise<void> {
  logger.warn(`${signal} received. Shutting down gracefully...`);
  if (server) {
    server.close(async () => {
      await disconnectDB();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10000).unref();
  } else {
    await disconnectDB();
    process.exit(0);
  }
}

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Rejection', reason);
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', error);
  process.exit(1);
});

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));

bootstrap().catch((error) => {
  logger.error('Failed to start server', error);
  process.exit(1);
});
