/**
 * @file apps/api/src/routes/health.ts
 * @description Health check endpoint. No auth required.
 */

import type { FastifyInstance } from 'fastify';
import { getGeminiCacheStats } from '../services/geminiService.js';

export async function healthRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/v1/health', () => {
    const cacheStats = getGeminiCacheStats();
    return {
      data: {
        status: 'ok',
        service: 'stadiumops-api',
        version: '0.2.0',
        time: new Date().toISOString(),
        cache: {
          size: cacheStats.size,
          ttlMs: cacheStats.ttl,
        },
      },
    };
  });
}
