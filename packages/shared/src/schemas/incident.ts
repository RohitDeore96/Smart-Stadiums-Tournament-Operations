/**
 * @file packages/shared/src/schemas/incident.ts
 * @description Zod schema for incident creation. Reused by both the POST /incidents
 *   route and the React incident-report form.
 */

import { z } from 'zod';
import { sanitizeUserText } from './chat.js';

export const IncidentCreateSchema = z.object({
  stadiumId: z.string().min(3).max(64),
  zoneId: z.string().min(3).max(64),
  category: z.enum([
    'medical',
    'security',
    'fire',
    'crowd_flow',
    'lost_child',
    'facilities',
    'other',
  ]),
  title: z
    .string()
    .min(3, 'Title must be at least 3 characters')
    .max(140, 'Title too long')
    .transform(sanitizeUserText),
  description: z
    .string()
    .min(10, 'Please describe what happened (min 10 chars)')
    .max(1000, 'Description too long (max 1000 chars)')
    .transform(sanitizeUserText),
  severity: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
});

export type IncidentCreateInput = z.infer<typeof IncidentCreateSchema>;

export const IncidentUpdateSchema = z.object({
  status: z.enum(['open', 'acknowledged', 'in_progress', 'resolved', 'closed']).optional(),
  assignedResponderUid: z.string().min(8).optional(),
  resolutionNotes: z.string().max(1000).transform(sanitizeUserText).optional(),
});

export type IncidentUpdateInput = z.infer<typeof IncidentUpdateSchema>;
