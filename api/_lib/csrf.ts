/**
 * @file api/_lib/csrf.ts
 * @description CSRF protection — verifies Origin header matches expected hosts.
 *   Allowed hosts are configurable via ALLOWED_HOSTS env var (comma-separated).
 *   Falls back to the Vercel deployment URL + localhost for dev.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

/** Default allowed hosts if ALLOWED_HOSTS env var is not set. */
const DEFAULT_HOSTS = [
  'smart-stadiums-tournament-operation-nine.vercel.app',
  'localhost',
  '127.0.0.1',
];

/** Returns the allowed hosts list from env or defaults. */
function getAllowedHosts(): string[] {
  const envHosts = process.env.ALLOWED_HOSTS;
  if (envHosts) {
    return [...envHosts.split(',').map((h) => h.trim()), 'localhost', '127.0.0.1'];
  }
  return DEFAULT_HOSTS;
}

/**
 * Verifies the Origin header. Returns true if allowed, false (and sends 403) if not.
 *
 * Usage:
 *   if (!verifyOrigin(req, res)) return;
 */
export function verifyOrigin(req: VercelRequest, res: VercelResponse): boolean {
  const origin = req.headers.origin;
  if (!origin) return true;

  try {
    const url = new URL(origin);
    if (getAllowedHosts().includes(url.hostname)) {
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
