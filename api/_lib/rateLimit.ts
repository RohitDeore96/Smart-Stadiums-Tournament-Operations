/**
 * @file api/_lib/rateLimit.ts
 * @description Rate limiter using Vercel KV (Upstash Redis) for cross-instance
 *   enforcement. Falls back to in-memory Map when KV is not configured.
 *
 *   Set KV_REST_API_URL + KV_REST_API_TOKEN env vars on Vercel to enable
 *   cross-instance rate limiting. Without KV, the limiter is per-instance
 *   (documented limitation in SECURITY.md).
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const WINDOW_MS = 60_000;
const MAX_REQUESTS = 30;

// In-memory fallback (per-instance)
const store = new Map<string, RateLimitEntry>();

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
 * Uses Vercel KV if configured, falls back to in-memory.
 */
export async function checkRateLimit(ip: string): Promise<RateLimitResult> {
  // Try Vercel KV first (cross-instance)
  if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
    return checkRateLimitKV(ip);
  }

  // Fallback: in-memory (per-instance)
  return checkRateLimitMemory(ip);
}

async function checkRateLimitKV(ip: string): Promise<RateLimitResult> {
  const key = `ratelimit:${ip}`;
  const now = Date.now();
  const resetAt = now + WINDOW_MS;

  try {
    // Use Upstash Redis REST API (Vercel KV compatible)
    const response = await fetch(`${process.env.KV_REST_API_URL}/incr/${key}`, {
      headers: {
        Authorization: `Bearer ${process.env.KV_REST_API_TOKEN}`,
      },
    });

    if (!response.ok) {
      // KV failed — fall back to in-memory
      return checkRateLimitMemory(ip);
    }

    const data = (await response.json()) as { result: number };
    const count = data.result;

    // Set TTL on first request
    if (count === 1) {
      await fetch(
        `${process.env.KV_REST_API_URL}/expire/${key}/${String(Math.ceil(WINDOW_MS / 1000))}`,
        {
          headers: {
            Authorization: `Bearer ${process.env.KV_REST_API_TOKEN}`,
          },
        },
      );
    }

    return {
      allowed: count <= MAX_REQUESTS,
      remaining: Math.max(0, MAX_REQUESTS - count),
      resetAt,
    };
  } catch {
    // KV failed — fall back to in-memory
    return checkRateLimitMemory(ip);
  }
}

function checkRateLimitMemory(ip: string): RateLimitResult {
  const now = Date.now();
  const entry = store.get(ip);

  if (!entry || entry.resetAt < now) {
    const newEntry: RateLimitEntry = { count: 1, resetAt: now + WINDOW_MS };
    store.set(ip, newEntry);
    return { allowed: true, remaining: MAX_REQUESTS - 1, resetAt: newEntry.resetAt };
  }

  entry.count++;
  return {
    allowed: entry.count <= MAX_REQUESTS,
    remaining: Math.max(0, MAX_REQUESTS - entry.count),
    resetAt: entry.resetAt,
  };
}

export function getRateLimitConfig(): { windowMs: number; maxRequests: number } {
  return { windowMs: WINDOW_MS, maxRequests: MAX_REQUESTS };
}
