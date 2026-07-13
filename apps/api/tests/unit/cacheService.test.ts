/**
 * @file apps/api/tests/unit/cacheService.test.ts
 * @description Unit tests for the LRU cache wrapper.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  buildCacheKey,
  getCached,
  setCached,
  getCacheStats,
  __resetCacheForTests,
} from '../../src/services/cacheService.js';

describe('cacheService', () => {
  beforeEach(() => {
    __resetCacheForTests();
  });

  describe('buildCacheKey', () => {
    it('returns a stable hash for the same inputs', () => {
      const key1 = buildCacheKey('a', 'b', 'c');
      const key2 = buildCacheKey('a', 'b', 'c');
      expect(key1).toBe(key2);
    });

    it('returns different hashes for different inputs', () => {
      const key1 = buildCacheKey('a', 'b');
      const key2 = buildCacheKey('a', 'c');
      expect(key1).not.toBe(key2);
    });

    it('returns a hex string (SHA-256)', () => {
      const key = buildCacheKey('test');
      expect(key).toMatch(/^[a-f0-9]{64}$/);
    });

    it('uses | as separator', () => {
      // Verify that "a|b" produces a different hash than "ab"
      const key1 = buildCacheKey('a', 'b');
      const key2 = buildCacheKey('ab');
      expect(key1).not.toBe(key2);
    });

    it('does not leak user content in the key (it is hashed)', () => {
      const sensitiveMessage = 'my secret query';
      const key = buildCacheKey(sensitiveMessage);
      expect(key).not.toContain(sensitiveMessage);
      expect(key).not.toContain('secret');
      expect(key).not.toContain('query');
    });
  });

  describe('getCached / setCached', () => {
    it('returns null for cache miss', () => {
      expect(getCached('nonexistent')).toBeNull();
    });

    it('returns the value after setCached', () => {
      const key = buildCacheKey('test');
      setCached(key, { reply: 'hello' });
      expect(getCached(key)).toEqual({ reply: 'hello' });
    });

    it('preserves typed values', () => {
      interface TestData {
        text: string;
        count: number;
      }
      const key = buildCacheKey('typed-test');
      setCached<TestData>(key, { text: 'hi', count: 42 });
      const result = getCached<TestData>(key);
      expect(result?.text).toBe('hi');
      expect(result?.count).toBe(42);
    });

    it('overwrites previous values on subsequent setCached', () => {
      const key = buildCacheKey('overwrite');
      setCached(key, 'first');
      setCached(key, 'second');
      expect(getCached(key)).toBe('second');
    });
  });

  describe('getCacheStats', () => {
    it('returns size 0 on empty cache', () => {
      const stats = getCacheStats();
      expect(stats.size).toBe(0);
    });

    it('returns correct size after inserts', () => {
      setCached(buildCacheKey('a'), 'value-a');
      setCached(buildCacheKey('b'), 'value-b');
      setCached(buildCacheKey('c'), 'value-c');
      const stats = getCacheStats();
      expect(stats.size).toBe(3);
    });

    it('returns TTL from env config', () => {
      const stats = getCacheStats();
      expect(stats.ttl).toBe(300_000); // default 5 min from test env
    });
  });
});
