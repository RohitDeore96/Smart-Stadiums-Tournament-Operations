/**
 * @file apps/api/src/routes/matches.ts
 * @description Match endpoints. All require auth.
 */

import type { FastifyInstance } from 'fastify';
import { authRequired } from '../middleware/auth.js';
import { queryPaginated, getDoc, type PaginationOptions } from '../services/firestoreService.js';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

export async function matchRoutes(app: FastifyInstance): Promise<void> {
  app.register(async (instance) => {
    instance.addHook('preHandler', authRequired);

    // GET /api/v1/matches?stadiumId=…&status=…&cursor=…&limit=20
    instance.get<{ Querystring: MatchQuery }>('/api/v1/matches', async (req) => {
      const limit = Math.min(Number(req.query.limit) || DEFAULT_LIMIT, MAX_LIMIT);
      const cursor = req.query.cursor;

      const filters: { field: string; op: '==' | 'in' | '!='; value: unknown }[] = [];
      if (req.query.stadiumId) {
        filters.push({ field: 'stadiumId', op: '==', value: req.query.stadiumId });
      }
      if (req.query.status) {
        filters.push({ field: 'status', op: '==', value: req.query.status });
      }

      const options: PaginationOptions = { limit };
      if (cursor) options.cursor = cursor;
      const result = await queryPaginated<MatchDoc>(
        'matches',
        options,
        filters,
        'kickoffTimeUTC',
        'asc',
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

    // GET /api/v1/matches/:matchId
    instance.get<{ Params: { matchId: string } }>('/api/v1/matches/:matchId', async (req) => {
      const match = await getDoc<MatchDoc>('matches', req.params.matchId);
      return { data: match };
    });
  });
}

interface MatchQuery {
  stadiumId?: string;
  status?: string;
  cursor?: string;
  limit?: number;
}

interface MatchDoc {
  id: string;
  matchNumber: string;
  homeTeam: string;
  awayTeam: string;
  stadiumId: string;
  kickoffTimeUTC: string;
  score: { home: number; away: number } | null;
  status: string;
  stage: string;
}
