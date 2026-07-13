/**
 * @file api/_lib/rateLimit.ts
 * @description Simple in-memory rate limiter for Vercel serverless functions.
 *   Each Vercel instance has its own counter (cold starts reset), but this
 *   provides basic protection against abuse within a warm instance.
 *
 *   For production-grade rate limiting across instances, use Upstash Redis.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();
const WINDOW_MS = 60_000; // 1 minute
const MAX_REQUESTS = 30; // 30 requests per minute per IP

// Periodically clean up expired entries to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (entry.resetAt < now) {
      store.delete(key);
    }
  }
}, 60_000).unref?.();

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

/**
 * Checks whether a request from the given IP should be allowed.
 * Returns the result + remaining quota.
 */
export function checkRateLimit(ip: string): RateLimitResult {
  const now = Date.now();
  const entry = store.get(ip);

  // No entry or expired — start fresh window
  if (!entry || entry.resetAt < now) {
    const newEntry: RateLimitEntry = {
      count: 1,
      resetAt: now + WINDOW_MS,
    };
    store.set(ip, newEntry);
    return {
      allowed: true,
      remaining: MAX_REQUESTS - 1,
      resetAt: newEntry.resetAt,
    };
  }

  // Within window — increment count
  entry.count++;
  const allowed = entry.count <= MAX_REQUESTS;

  return {
    allowed,
    remaining: Math.max(0, MAX_REQUESTS - entry.count),
    resetAt: entry.resetAt,
  };
}

/** Returns rate limit config for documentation. */
export function getRateLimitConfig(): {
  windowMs: number;
  maxRequests: number;
} {
  return { windowMs: WINDOW_MS, maxRequests: MAX_REQUESTS };
}
