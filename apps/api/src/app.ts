/**
 * @file apps/api/src/app.ts
 * @description Fastify application factory. Wires all plugins, middleware,
 *   and routes. Phase 2 adds the full route table (chat, matches, incidents,
 *   stadiums, announcements) plus auth + validation middleware.
 *
 *   Why a factory function (not a global instance):
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
import { healthRoutes } from './routes/health.js';
import { chatRoutes } from './routes/chat.js';
import { matchRoutes } from './routes/matches.js';
import { stadiumRoutes } from './routes/stadiums.js';
import { incidentRoutes } from './routes/incidents.js';
import { announcementRoutes } from './routes/announcements.js';

export interface BuildAppOptions {
  /** Allow tests to override env without touching process.env. */
  envOverrides?: Partial<ReturnType<typeof loadEnv>>;
  /** Skip route registration (useful for some unit tests). */
  routesOnly?: ('health' | 'chat' | 'matches' | 'stadiums' | 'incidents' | 'announcements')[];
}

/**
 * Builds a configured Fastify instance. Does NOT call .listen() — the caller
 * (index.ts in prod, supertest in tests) is responsible for that.
 */
export async function buildApp(options: BuildAppOptions = {}): Promise<FastifyInstance> {
  const env = { ...loadEnv(), ...options.envOverrides };

  const app = Fastify({
    logger: false,
    trustProxy: true,
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
    credentials: false,
    maxAge: 3600,
  });

  await app.register(rateLimit, {
    max: env.RATE_LIMIT_MAX,
    timeWindow: env.RATE_LIMIT_WINDOW_MS,
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

    logger.error({ err, requestId: req.id }, 'Unhandled error');
    reply.status(500).send({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Something went wrong',
        requestId: req.id,
      },
    });
  });

  // ---- Register routes ----
  const routesToRegister = options.routesOnly ?? [
    'health',
    'chat',
    'matches',
    'stadiums',
    'incidents',
    'announcements',
  ];

  if (routesToRegister.includes('health')) {
    await app.register(healthRoutes);
  }
  if (routesToRegister.includes('chat')) {
    await app.register(chatRoutes);
  }
  if (routesToRegister.includes('matches')) {
    await app.register(matchRoutes);
  }
  if (routesToRegister.includes('stadiums')) {
    await app.register(stadiumRoutes);
  }
  if (routesToRegister.includes('incidents')) {
    await app.register(incidentRoutes);
  }
  if (routesToRegister.includes('announcements')) {
    await app.register(announcementRoutes);
  }

  return app;
}
