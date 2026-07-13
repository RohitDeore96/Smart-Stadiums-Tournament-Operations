/**
 * @file apps/api/tests/integration/health.test.ts
 * @description Smoke test for the /api/v1/health route. Proves the testing
 *   pipeline (vitest + supertest pattern via fastify inject) is wired up
 *   correctly in Phase 1. Real route tests arrive in Phase 2.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app.js';

describe('GET /api/v1/health', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp({
      envOverrides: {
        GEMINI_API_KEY: 'test-key-mock-do-not-use',
      },
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns 200 with service status', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/health',
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.data.status).toBe('ok');
    expect(body.data.service).toBe('stadiumops-api');
    expect(body.data.version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(body.data.time).toBeTruthy();
  });

  it('sets content-type to application/json', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/health',
    });

    expect(res.headers['content-type']).toContain('application/json');
  });
});
