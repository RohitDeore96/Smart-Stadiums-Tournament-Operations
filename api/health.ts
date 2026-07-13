/**
 * @file api/health.ts
 * @description Health check endpoint. No dependencies — instant response.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getCacheStats } from './_lib/gemini.js';

export default function handler(_req: VercelRequest, res: VercelResponse): void {
  const cacheStats = getCacheStats();
  res.status(200).json({
    data: {
      status: 'ok',
      service: 'stadiumops-api',
      version: '0.3.0',
      time: new Date().toISOString(),
      cache: {
        size: cacheStats.size,
        ttlMs: cacheStats.ttl,
      },
    },
  });
}
