/**
 * @file apps/api/src/routes/announcements.ts
 * @description Announcement endpoints. All require auth, read-only.
 */

import type { FastifyInstance } from 'fastify';
import { authRequired } from '../middleware/auth.js';
import { queryPaginated, type PaginationOptions } from '../services/firestoreService.js';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

export async function announcementRoutes(app: FastifyInstance): Promise<void> {
  app.register(async (instance) => {
    instance.addHook('preHandler', authRequired);

    // GET /api/v1/announcements?stadiumId=…&active=true
    instance.get<{ Querystring: AnnouncementQuery }>('/api/v1/announcements', async (req) => {
      const limit = Math.min(Number(req.query.limit) || DEFAULT_LIMIT, MAX_LIMIT);
      const cursor = req.query.cursor;

      const filters: { field: string; op: '==' | 'in' | '!='; value: unknown }[] = [];
      if (req.query.stadiumId) {
        filters.push({ field: 'stadiumId', op: '==', value: req.query.stadiumId });
      }
      if (req.query.active === 'true') {
        filters.push({ field: 'active', op: '==', value: true });
      }

      const options: PaginationOptions = { limit };
      if (cursor) options.cursor = cursor;
      const result = await queryPaginated<AnnouncementDoc>(
        'announcements',
        options,
        filters,
        'publishedAt',
        'desc',
      );

      return {
        data: result.items,
        meta: {
          nextCursor: result.nextCursor,
          pageSize: result.items.length,
          hasMore: result.hasMore,
        },
      };
    });
  });
}

interface AnnouncementQuery {
  stadiumId?: string;
  active?: string;
  cursor?: string;
  limit?: number;
}

interface AnnouncementDoc {
  id: string;
  stadiumId: string;
  matchId: string | null;
  severity: string;
  text: Record<string, string>;
  publishedAt: string;
  expiresAt: string | null;
  active: boolean;
}
