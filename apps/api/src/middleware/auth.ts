/**
 * @file apps/api/src/middleware/auth.ts
 * @description Fastify preHandler hook that verifies Firebase ID tokens
 *   from the Authorization header. Attaches the decoded user to request.user.
 *
 *   Routes that don't require auth (health, etc.) simply don't register
 *   this middleware.
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import type admin from 'firebase-admin';
import { verifyIdToken } from '../config/firebase.js';
import { UnauthorizedError } from '../utils/errors.js';

type DecodedIdToken = admin.auth.DecodedIdToken;

// Augment Fastify's request type to include our user
declare module 'fastify' {
  interface FastifyRequest {
    user?: DecodedIdToken;
  }
}

/**
 * Extracts the Bearer token from the Authorization header.
 * Returns null if header is missing or malformed.
 */
function extractBearerToken(req: FastifyRequest): string | null {
  const header = req.headers.authorization;
  if (!header) return null;

  const match = /^Bearer\s+(.+)$/i.exec(header);
  if (!match?.[1]) return null;

  return match[1];
}

/**
 * Fastify preHandler hook. Verifies the Firebase ID token and attaches
 * the decoded user to `request.user`.
 *
 * Usage:
 *   app.register(async (instance) => {
 *     instance.addHook('preHandler', authRequired);
 *     instance.get('/protected', handler);
 *   });
 */
export async function authRequired(req: FastifyRequest, _reply: FastifyReply): Promise<void> {
  const token = extractBearerToken(req);
  if (!token) {
    throw UnauthorizedError('Missing or malformed Authorization header. Expected: Bearer <token>');
  }

  req.user = await verifyIdToken(token);
}

/**
 * Optional auth — attaches user if token present, but doesn't require it.
 * Useful for endpoints that behave differently for authed vs anonymous users.
 */
export async function authOptional(req: FastifyRequest, _reply: FastifyReply): Promise<void> {
  const token = extractBearerToken(req);
  if (!token) return;

  try {
    req.user = await verifyIdToken(token);
  } catch {
    // Ignore invalid tokens for optional auth
  }
}
