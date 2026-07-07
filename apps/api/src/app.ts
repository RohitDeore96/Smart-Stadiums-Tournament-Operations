/**
 * @file apps/api/src/app.ts
 * @description Fastify application factory.
 *
 * Phase 1 scope: bootable skeleton with health route + security plugins.
 * Phase 2 will register the full route table (chat, matches, incidents, etc.).
 *
 * Why a factory function (not a global instance):
 *   - Enables integration tests to spin up isolated app instances.
 *   - Avoids side-effect ordering bugs across hot reloads.
 */

import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import sensible from '@fastify/sensible';

import { loadEnv } from './config/env.js';
import { logger } from './utils/logger.js';
import { AppError } from './utils/errors.js';

export interface BuildAppOptions {
  /** Allow tests to override env without touching process.env. */
  envOverrides?: Partial<ReturnType<typeof loadEnv>>;
}

/**
 * Builds a configured Fastify instance. Does NOT call .listen() — the caller
 * (index.ts in prod, supertest in tests) is responsible for that.
 */
export async function buildApp(options: BuildAppOptions = {}): Promise<FastifyInstance> {
  const env = { ...loadEnv(), ...options.envOverrides };

  const app = Fastify({
    logger: false, // we use our own pino instance for redaction control
    trustProxy: true, // Cloud Run sits behind a Google LB
    disableRequestLogging: false,
    requestIdHeader: 'x-request-id',
    requestIdLogLabel: 'requestId',
  });

  // ---- Security plugins ----
  await app.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'none'"],
        frameAncestors: ["'none'"],
      },
    },
    hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
    noSniff: true,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  });

  await app.register(cors, {
    origin: env.ALLOWED_ORIGINS,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Authorization', 'Content-Type', 'Accept-Language'],
    credentials: false, // we use Bearer tokens, not cookies
    maxAge: 3600,
  });

  await app.register(rateLimit, {
    max: env.RATE_LIMIT_MAX,
    timeWindow: env.RATE_LIMIT_WINDOW_MS,
    // Per-IP key generator — auth-based override happens in Phase 2
    keyGenerator: (req) => req.ip,
    errorResponseBuilder: (_req, context) => ({
      error: {
        code: 'RATE_LIMITED',
        message: `Rate limit exceeded. Try again in ${String(Math.ceil(context.ttl / 1000))}s.`,
        requestId: _req.id,
      },
    }),
  });

  await app.register(sensible);

  // ---- Global error handler — converts AppError → standard envelope ----
  app.setErrorHandler((err, req, reply) => {
    if (err instanceof AppError) {
      reply.status(err.statusCode).send({
        error: {
          code: err.code,
          message: err.message,
          details: err.details,
          requestId: req.id,
        },
      });
      return;
    }

    // Fastify validation errors (from schema validation)
    if (err.validation) {
      reply.status(400).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: err.message,
          details: err.validation,
          requestId: req.id,
        },
      });
      return;
    }

    // Unknown error — never leak internals
    logger.error({ err, requestId: req.id }, 'Unhandled error');
    reply.status(500).send({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Something went wrong',
        requestId: req.id,
      },
    });
  });

  // ---- Health route (Phase 1 only — full routes arrive in Phase 2) ----
  app.get('/api/v1/health', () => {
    return {
      data: {
        status: 'ok',
        service: 'stadiumops-api',
        version: '0.1.0',
        time: new Date().toISOString(),
      },
    };
  });

  return app;
}
