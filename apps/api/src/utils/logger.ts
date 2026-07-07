/**
 * @file apps/api/src/utils/logger.ts
 * @description Pino logger with pretty-printing in dev, JSON in prod.
 *   Every module imports `logger` from here — never call console.* directly.
 */

import pino from 'pino';
import { loadEnv } from '../config/env.js';

const env = loadEnv();

export const logger = pino({
  level: env.LOG_LEVEL,
  base: { service: 'stadiumops-api' },
  redact: {
    paths: [
      'GEMINI_API_KEY',
      'FIREBASE_PRIVATE_KEY',
      'req.headers.authorization',
      'req.headers.cookie',
      '*.GEMINI_API_KEY',
      '*.FIREBASE_PRIVATE_KEY',
    ],
    censor: '[REDACTED]',
  },
  ...(env.NODE_ENV === 'development'
    ? {
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:HH:MM:ss.l',
            ignore: 'pid,hostname,service',
          },
        },
      }
    : {}),
});

/** Returns a child logger scoped to a module name — use everywhere. */
export function scopedLogger(scope: string): pino.Logger {
  return logger.child({ scope });
}
