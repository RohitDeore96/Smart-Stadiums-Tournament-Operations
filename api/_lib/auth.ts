/**
 * @file api/_lib/auth.ts
 * @description Lightweight authentication middleware for Vercel serverless.
 *   Verifies a Bearer token against the AUTH_TOKEN env var.
 *
 *   No hardcoded tokens — the demo token is read from env var AUTH_TOKEN.
 *   If AUTH_TOKEN is not set, auth is bypassed in development only.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

/** Max length for Authorization header to prevent abuse (DoS via oversized headers). */
const MAX_AUTH_HEADER_LENGTH = 1024;

/**
 * Verifies the Authorization header contains a valid Bearer token.
 * Returns true if authorized, false otherwise.
 *
 * Token source: AUTH_TOKEN env var (set in Vercel → Settings → Environment Variables).
 * In development (NODE_ENV !== 'production'), auth is optional if AUTH_TOKEN is unset.
 */
export function verifyAuth(req: VercelRequest): boolean {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    // In development, allow requests without auth if AUTH_TOKEN is not set
    return process.env.NODE_ENV !== 'production' && !process.env.AUTH_TOKEN;
  }

  // Prevent DoS via oversized Authorization headers
  if (authHeader.length > MAX_AUTH_HEADER_LENGTH) return false;

  const match = /^Bearer\s+(.+)$/i.exec(authHeader);
  if (!match?.[1]) return false;

  const token = match[1];
  const envToken = process.env.AUTH_TOKEN;

  if (!envToken) {
    // In development without AUTH_TOKEN configured, accept any Bearer token
    return process.env.NODE_ENV !== 'production';
  }

  // Constant-time comparison to prevent timing attacks
  return timingSafeEqual(token, envToken);
}

/** Constant-time string comparison to prevent timing attacks. */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

/**
 * Returns a 401 response if the request is not authenticated.
 * Call this at the top of any handler that requires auth.
 *
 * Usage:
 *   if (!requireAuth(req, res)) return;
 */
export function requireAuth(req: VercelRequest, res: VercelResponse): boolean {
  if (!verifyAuth(req)) {
    res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required. Include Authorization: Bearer <token> header.',
      },
    });
    return false;
  }
  return true;
}
