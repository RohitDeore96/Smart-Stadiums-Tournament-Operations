/**
 * @file apps/api/tests/unit/env.test.ts
 * @description Verifies the env config validator fails fast on bad input.
 *   A small test that proves the test pipeline works in Phase 1.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { loadEnv, __resetEnvForTests } from '../../src/config/env.js';

describe('loadEnv', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    __resetEnvForTests();
    // Minimal valid env
    process.env = {
      ...originalEnv,
      NODE_ENV: 'test',
      PORT: '8080',
      LOG_LEVEL: 'info',
      GEMINI_API_KEY: 'test-key-mock-do-not-use',
      FIREBASE_PROJECT_ID: 'stadiumops-test',
      ALLOWED_ORIGINS: 'http://localhost:5173',
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('parses a valid env successfully', () => {
    const env = loadEnv();
    expect(env.NODE_ENV).toBe('test');
    expect(env.PORT).toBe(8080);
    expect(env.ALLOWED_ORIGINS).toEqual(['http://localhost:5173']);
  });

  it('uses defaults when optional vars are missing', () => {
    delete process.env.RATE_LIMIT_WINDOW_MS;
    delete process.env.RATE_LIMIT_MAX;
    delete process.env.GEMINI_CACHE_TTL_MS;

    const env = loadEnv();
    expect(env.RATE_LIMIT_WINDOW_MS).toBe(60_000);
    expect(env.RATE_LIMIT_MAX).toBe(60);
    expect(env.GEMINI_CACHE_TTL_MS).toBe(300_000);
  });

  it('exits the process when GEMINI_API_KEY is missing', () => {
    delete process.env.GEMINI_API_KEY;
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {
      throw new Error('process.exit called');
    }) as never);
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => loadEnv()).toThrow('process.exit called');

    expect(exitSpy).toHaveBeenCalledWith(1);
    exitSpy.mockRestore();
    errSpy.mockRestore();
  });
});
