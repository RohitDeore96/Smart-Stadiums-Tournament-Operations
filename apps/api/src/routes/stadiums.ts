/**
 * @file apps/api/src/routes/stadiums.ts
 * @description Stadium endpoints. GET list + GET single + GET crowd zones.
 */

import type { FastifyInstance } from 'fastify';
import { authRequired } from '../middleware/auth.js';
import { queryPaginated, getDoc, type PaginationOptions } from '../services/firestoreService.js';

export async function stadiumRoutes(app: FastifyInstance): Promise<void> {
  app.register(async (instance) => {
    instance.addHook('preHandler', authRequired);

    // GET /api/v1/stadiums
    instance.get('/api/v1/stadiums', async () => {
      // Small dataset — no pagination needed
      const result = await queryPaginated<StadiumDoc>('stadiums', { limit: 50 });
      return { data: result.items };
    });

    // GET /api/v1/stadiums/:stadiumId
    instance.get<{ Params: { stadiumId: string } }>('/api/v1/stadiums/:stadiumId', async (req) => {
      const stadium = await getDoc<StadiumDoc>('stadiums', req.params.stadiumId);
      return { data: stadium };
    });

    // GET /api/v1/stadiums/:stadiumId/crowd
    instance.get<{ Params: { stadiumId: string } }>(
      '/api/v1/stadiums/:stadiumId/crowd',
      async (req) => {
        const options: PaginationOptions = { limit: 50 };
        const result = await queryPaginated<CrowdZoneDoc>(
          `stadiums/${req.params.stadiumId}/crowdZones`,
          options,
          [{ field: 'stadiumId', op: '==', value: req.params.stadiumId }],
        );
        return { data: result.items };
      },
    );
  });
}

interface StadiumDoc {
  id: string;
  name: string;
  city: string;
  country: string;
  capacity: number;
  location: { latitude: number; longitude: number };
  zones: unknown[];
  primaryLocales: string[];
}

interface CrowdZoneDoc {
  zoneId: string;
  stadiumId: string;
  count: number;
  densityRatio: number;
  level: string;
  updatedAt: string;
  trend: string;
}
