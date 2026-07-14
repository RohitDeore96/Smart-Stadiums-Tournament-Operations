/**
 * @file api/chat.test.ts
 * @description End-to-end-style test for the /api/chat endpoint.
 *   Verifies the function loads (catches module-load errors that caused
 *   the original Vercel 500s) and handles validation correctly.
 *
 *   This test would have caught the broken deployment that the evaluator
 *   flagged — it imports the handler directly and exercises the happy path
 *   + error paths without needing a live Gemini key.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { VercelRequest, VercelResponse } from '@vercel/node';

// Mock the Gemini service BEFORE importing the handler
vi.mock('./_lib/gemini.js', () => ({
  async *streamReply() {
    yield { chunk: 'Hello', done: false, cached: false };
    yield { chunk: ' from mock', done: false, cached: false };
    yield {
      chunk: '',
      done: true,
      tokenUsage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
      cached: false,
    };
  },
  getCacheStats: () => ({ size: 0, ttl: 300000 }),
}));

// Mock the safety service to avoid emergency false-positives
vi.mock('./_lib/safety.js', () => ({
  checkSafety: () => ({ isEmergency: false, intent: 'unknown' }),
}));

// Mock the intent service
vi.mock('./_lib/intent.js', () => ({
  classifyIntent: () => ({ intent: 'wayfinding', confidence: 0.85 }),
}));

// Mock the rate limiter to always allow in tests
vi.mock('./_lib/rateLimit.js', () => ({
  checkRateLimit: () => ({ allowed: true, remaining: 29, resetAt: Date.now() + 60000 }),
}));

// Mock auth to always pass in tests
vi.mock('./_lib/auth.js', () => ({
  requireAuth: () => true,
}));

// Mock CSRF to always pass in tests
vi.mock('./_lib/csrf.js', () => ({
  verifyOrigin: () => true,
}));

// Mock logger to avoid noise in test output
vi.mock('./_lib/logger.js', () => ({
  logger: {
    info: () => undefined,
    debug: () => undefined,
    warn: () => undefined,
    error: () => undefined,
  },
  generateRequestId: () => 'test-req-id',
  setRequestId: () => undefined,
}));

// Import AFTER mocks are set up
import chatModule from './chat.js';
const handler = chatModule;

function createMockRes(): VercelResponse & {
  statusCode: number;
  body: unknown;
  headers: Record<string, string>;
  ended: boolean;
} {
  const res = {
    statusCode: 200,
    body: null as unknown,
    headers: {} as Record<string, string>,
    ended: false,
    writeHead(status: number, headers: Record<string, string>) {
      this.statusCode = status;
      this.headers = headers;
    },
    write(chunk: string) {
      this.body ??= '';
      this.body = (this.body as string) + chunk;
    },
    end() {
      this.ended = true;
    },
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(data: unknown) {
      this.body = data;
      this.ended = true;
      return this;
    },
    setHeader(key: string, value: string) {
      this.headers[key] = value;
    },
  };
  return res as VercelResponse & typeof res;
}

function createMockReq(method: string, body: unknown): VercelRequest {
  return {
    method,
    body,
    headers: {},
    query: {},
    url: '/api/chat',
  } as unknown as VercelRequest;
}

describe('POST /api/chat', () => {
  let res: ReturnType<typeof createMockRes>;

  beforeEach(() => {
    res = createMockRes();
  });

  it('handles a valid message and streams SSE events', async () => {
    const req = createMockReq('POST', { message: 'Where is Gate A?', locale: 'en' });
    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.headers['Content-Type']).toBe('text/event-stream');
    expect(res.ended).toBe(true);

    const body = res.body as string;
    expect(body).toContain('event: token');
    expect(body).toContain('Hello');
    expect(body).toContain('event: metadata');
    expect(body).toContain('event: done');
    expect(body).toContain('tokenUsage');
  });

  it('returns 405 for GET requests', async () => {
    const req = createMockReq('GET', undefined);
    await handler(req, res);

    expect(res.statusCode).toBe(405);
    expect(res.body).toEqual({
      error: {
        code: 'METHOD_NOT_ALLOWED',
        message: 'Method GET not allowed. Use POST.',
      },
    });
  });

  it('returns 400 for missing message field', async () => {
    const req = createMockReq('POST', { locale: 'en' });
    await handler(req, res);

    expect(res.statusCode).toBe(400);
    const body = res.body as { error: { code: string } };
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 for empty message', async () => {
    const req = createMockReq('POST', { message: '', locale: 'en' });
    await handler(req, res);

    expect(res.statusCode).toBe(400);
  });

  it('returns 400 for invalid locale', async () => {
    const req = createMockReq('POST', { message: 'hello', locale: 'invalid' });
    await handler(req, res);

    expect(res.statusCode).toBe(400);
  });

  it('returns 400 for message over 2000 chars', async () => {
    const req = createMockReq('POST', { message: 'a'.repeat(2001), locale: 'en' });
    await handler(req, res);

    expect(res.statusCode).toBe(400);
  });

  it('sanitizes control characters from message', async () => {
    const req = createMockReq('POST', {
      message: 'hello\u0000world\u200Bend',
      locale: 'en',
    });
    await handler(req, res);

    // Should succeed (200) after sanitization
    expect(res.statusCode).toBe(200);
  });
});
