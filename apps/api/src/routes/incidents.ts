/**
 * @file apps/api/src/routes/incidents.ts
 * @description Incident endpoints.
 *   - POST   /api/v1/incidents         (any authed user)
 *   - GET    /api/v1/incidents         (responder/admin for non-own)
 *   - GET    /api/v1/incidents/:id     (any authed user)
 *   - PATCH  /api/v1/incidents/:id     (responder/admin only)
 */

import type { FastifyInstance } from 'fastify';
import { IncidentCreateSchema, IncidentUpdateSchema } from '@stadiumops/shared';
import { authRequired } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  queryPaginated,
  getDoc,
  createDoc,
  updateDoc,
  type PaginationOptions,
} from '../services/firestoreService.js';
import { ForbiddenError } from '../utils/errors.js';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

const RESPONDER_ROLES = new Set(['admin', 'responder']);

export async function incidentRoutes(app: FastifyInstance): Promise<void> {
  app.register(async (instance) => {
    instance.addHook('preHandler', authRequired);

    // POST /api/v1/incidents
    instance.post<{ Body: unknown }>(
      '/api/v1/incidents',
      { preHandler: validate(IncidentCreateSchema) },
      async (req) => {
        const body = req.body as ReturnType<typeof IncidentCreateSchema.parse>;
        const reporterUid = req.user?.uid;
        if (!reporterUid) {
          throw new Error('User UID missing from verified token');
        }

        const incident = await createDoc('incidents', {
          ...body,
          reporterUid,
          status: 'open',
          assignedResponderUid: null,
          resolutionNotes: null,
        });

        return { data: incident };
      },
    );

    // GET /api/v1/incidents?stadiumId=…&status=…&cursor=…&limit=20
    instance.get<{ Querystring: IncidentQuery }>('/api/v1/incidents', async (req) => {
      const limit = Math.min(Number(req.query.limit) || DEFAULT_LIMIT, MAX_LIMIT);
      const cursor = req.query.cursor;

      const filters: { field: string; op: '==' | 'in' | '!='; value: unknown }[] = [];
      if (req.query.stadiumId) {
        filters.push({ field: 'stadiumId', op: '==', value: req.query.stadiumId });
      }
      if (req.query.status) {
        filters.push({ field: 'status', op: '==', value: req.query.status });
      }

      // Non-responders only see their own incidents
      const userRole = (req.user?.role as string) ?? 'fan';
      if (!RESPONDER_ROLES.has(userRole)) {
        filters.push({ field: 'reporterUid', op: '==', value: req.user?.uid });
      }

      const options: PaginationOptions = { limit };
      if (cursor) options.cursor = cursor;
      const result = await queryPaginated<IncidentDoc>(
        'incidents',
        options,
        filters,
        'createdAt',
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

    // GET /api/v1/incidents/:incidentId
    instance.get<{ Params: { incidentId: string } }>(
      '/api/v1/incidents/:incidentId',
      async (req) => {
        const incident = await getDoc<IncidentDoc>('incidents', req.params.incidentId);

        // Non-responders can only read their own
        const userRole = (req.user?.role as string) ?? 'fan';
        if (!RESPONDER_ROLES.has(userRole) && incident.reporterUid !== req.user?.uid) {
          throw ForbiddenError('You can only view incidents you reported');
        }

        return { data: incident };
      },
    );

    // PATCH /api/v1/incidents/:incidentId
    instance.patch<{ Params: { incidentId: string }; Body: unknown }>(
      '/api/v1/incidents/:incidentId',
      { preHandler: validate(IncidentUpdateSchema) },
      async (req) => {
        const userRole = (req.user?.role as string) ?? 'fan';
        if (!RESPONDER_ROLES.has(userRole)) {
          throw ForbiddenError('Only responders and admins can update incidents');
        }

        const body = req.body as ReturnType<typeof IncidentUpdateSchema.parse>;
        const updated = await updateDoc('incidents', req.params.incidentId, body);
        return { data: updated };
      },
    );
  });
}

interface IncidentQuery {
  stadiumId?: string;
  status?: string;
  cursor?: string;
  limit?: number;
}

interface IncidentDoc {
  id: string;
  stadiumId: string;
  zoneId: string;
  reporterUid: string | null;
  category: string;
  title: string;
  description: string;
  severity: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  assignedResponderUid: string | null;
  resolutionNotes: string | null;
}
