/**
 * @file api/_lib/auth.ts
 * @description Lightweight authentication middleware for Vercel serverless.
 *   Verifies a Bearer token against a shared secret stored in env var.
 *   This is a pragmatic auth layer for a hackathon — not JWT/Firebase Admin,
 *   but prevents anonymous abuse of the Gemini API.
 *
 *   In production, replace with Firebase Admin token verification.
 *   For the demo: the frontend sends a static demo token that proves
 *   the request came from the app (not a direct API call).
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

/** The demo auth token — set in Vercel env vars as AUTH_TOKEN. */
const DEMO_TOKEN = 'stadiumops-demo-2026';

/**
 * Verifies the Authorization header contains a valid Bearer token.
 * Returns true if authorized, false otherwise.
 *
 * Accepts:
 * - The demo token (for the public hackathon demo)
 * - A custom token set via AUTH_TOKEN env var (for production)
 */
export function verifyAuth(req: VercelRequest): boolean {
  const authHeader = req.headers.authorization;
  if (!authHeader) return false;

  const match = /^Bearer\s+(.+)$/i.exec(authHeader);
  if (!match?.[1]) return false;

  const token = match[1];
  const envToken = process.env.AUTH_TOKEN;

  // Accept either the demo token or the env-configured token
  return token === DEMO_TOKEN || (envToken !== undefined && token === envToken);
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
