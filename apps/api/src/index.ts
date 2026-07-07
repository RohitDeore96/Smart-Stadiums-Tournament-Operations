/**
 * @file apps/api/src/index.ts
 * @description Cloud Run backend entry point. Wires boot order + graceful
 *   shutdown. All app configuration lives in app.ts so tests can spin up
 *   isolated instances via buildApp().
 */

import { buildApp } from './app.js';
import { loadEnv } from './config/env.js';
import { logger } from './utils/logger.js';

async function bootstrap(): Promise<void> {
  const env = loadEnv();
  const app = await buildApp();

  try {
    await app.listen({
      port: env.PORT,
      host: '0.0.0.0', // Cloud Run requires 0.0.0.0 binding
    });
    logger.info({ port: env.PORT, env: env.NODE_ENV }, '🚀 StadiumOps API listening');
  } catch (err: unknown) {
    logger.error({ err }, 'Failed to start server');
    process.exit(1);
  }

  // Graceful shutdown — Cloud Run sends SIGTERM 10s before killing container.
  const shutdown = async (signal: string) => {
    logger.info({ signal }, 'Shutting down gracefully…');
    try {
      await app.close();
      logger.info('Server closed cleanly');
      process.exit(0);
    } catch (err: unknown) {
      logger.error({ err }, 'Error during shutdown');
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
}

bootstrap().catch((err: unknown) => {
  logger.error({ err }, 'Fatal boot error');
  process.exit(1);
});
