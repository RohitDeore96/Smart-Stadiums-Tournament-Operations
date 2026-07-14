/**
 * @file api/health.ts
 * @description Health check endpoint with ETag support for conditional requests.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createHash } from 'node:crypto';
import { getCacheStats } from './_lib/gemini.js';

export default function handler(req: VercelRequest, res: VercelResponse): void {
  const cacheStats = getCacheStats();
  const body = JSON.stringify({
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

  // Compute ETag for conditional requests (saves bandwidth on repeated health checks)
  const etag = `"${createHash('sha256').update(body).digest('hex').slice(0, 16)}"`;
  res.setHeader('ETag', etag);
  res.setHeader('Cache-Control', 'no-cache');

  // Return 304 if client's If-None-Match matches
  if (req.headers['if-none-match'] === etag) {
    res.status(304).end();
    return;
  }

  res.status(200).setHeader('Content-Type', 'application/json');
  res.send(body);
}
