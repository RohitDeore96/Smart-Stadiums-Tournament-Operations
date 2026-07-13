/**
 * @file apps/api/src/services/cacheService.ts
 * @description Thin wrapper around lru-cache providing a typed key/value
 *   cache. Used by geminiService to skip duplicate identical queries.
 *
 *   Design notes:
 *   - Singleton — one cache per process.
 *   - Keys are SHA-256 hashes of (systemPrompt + message + locale) so we
 *     never accidentally log user content as part of a cache key.
 *   - TTL comes from env (GEMINI_CACHE_TTL_MS, default 5 min).
 */

import { LRUCache } from 'lru-cache';
import { createHash } from 'node:crypto';
import { loadEnv } from '../config/env.js';

export interface CacheEntry<T> {
  value: T;
  cachedAt: number;
}

let cache: LRUCache<string, CacheEntry<unknown>> | null = null;

function getCache(): LRUCache<string, CacheEntry<unknown>> {
  if (cache) return cache;

  const env = loadEnv();
  cache = new LRUCache<string, CacheEntry<unknown>>({
    max: 500,
    ttl: env.GEMINI_CACHE_TTL_MS,
    ttlAutopurge: true,
  });

  return cache;
}

/**
 * Builds a stable cache key from the inputs that determine a unique response.
 * Returns a SHA-256 hash so user content never appears in logs as a "key".
 */
export function buildCacheKey(...parts: string[]): string {
  const joined = parts.join('|');
  return createHash('sha256').update(joined).digest('hex');
}

/** Reads a cached value if present and not stale. */
export function getCached<T>(key: string): T | null {
  const entry = getCache().get(key);
  if (!entry) return null;
  return entry.value as T;
}

/** Stores a value in the cache with the configured TTL. */
export function setCached<T>(key: string, value: T): void {
  getCache().set(key, {
    value: value as unknown,
    cachedAt: Date.now(),
  });
}

/** Returns cache stats for observability endpoints. */
export function getCacheStats(): {
  size: number;
  calculatedSize: number;
  ttl: number;
} {
  const c = getCache();
  const env = loadEnv();
  return {
    size: c.size,
    calculatedSize: c.calculatedSize,
    ttl: env.GEMINI_CACHE_TTL_MS,
  };
}

/** Test-only: clears the cache between tests. */
export function __resetCacheForTests(): void {
  if (cache) {
    cache.clear();
  }
  cache = null;
}
