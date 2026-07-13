/**
 * @file apps/api/src/index.ts
 * @description Cloud Run backend entry point. Boot order:
 *   1. Load secrets from Secret Manager (prod only)
 *   2. Build Fastify app (validates env, registers routes)
 *   3. Listen on PORT
 *   4. Wire graceful shutdown (SIGTERM/SIGINT)
 */

import { buildApp } from './app.js';
import { loadEnv } from './config/env.js';
import { loadSecrets } from './config/secrets.js';
import { logger } from './utils/logger.js';

async function bootstrap(): Promise<void> {
  // Step 1: Load secrets (no-op in dev/test)
  await loadSecrets();

  // Step 2: Build app
  const env = loadEnv();
  const app = await buildApp();

  // Step 3: Listen
  try {
    await app.listen({
      port: env.PORT,
      host: '0.0.0.0',
    });
    logger.info({ port: env.PORT, env: env.NODE_ENV }, '🚀 StadiumOps API listening');
  } catch (err: unknown) {
    logger.error({ err }, 'Failed to start server');
    process.exit(1);
  }

  // Step 4: Graceful shutdown
  const shutdown = async (signal: string): Promise<void> => {
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
