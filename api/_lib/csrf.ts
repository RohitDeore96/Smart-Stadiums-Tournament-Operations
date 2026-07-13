/**
 * @file api/_lib/csrf.ts
 * @description CSRF protection — verifies Origin header matches expected hosts.
 *   Extracted from chat.ts to keep it under 300 LOC.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

const ALLOWED_HOSTS = [
  'smart-stadiums-tournament-operation-nine.vercel.app',
  'localhost',
  '127.0.0.1',
];

/**
 * Verifies the Origin header. Returns true if allowed, false (and sends 403) if not.
 *
 * Usage:
 *   if (!verifyOrigin(req, res)) return;
 */
export function verifyOrigin(req: VercelRequest, res: VercelResponse): boolean {
  const origin = req.headers.origin;
  if (!origin) return true; // No origin header = same-origin (non-browser) request

  try {
    const url = new URL(origin);
    if (ALLOWED_HOSTS.includes(url.hostname)) {
      return true;
    }
  } catch {
    // Invalid origin — reject
  }

  res.status(403).json({
    error: {
      code: 'FORBIDDEN',
      message: 'Cross-origin requests are not allowed.',
    },
  });
  return false;
}
