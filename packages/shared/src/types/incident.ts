/**
 * @file packages/shared/src/types/incident.ts
 * @description Fan-reported or sensor-detected incidents (medical, security, lost child, etc.).
 */

import type { ISODateString } from './api.js';

export interface Incident {
  id: string;
  stadiumId: string;
  zoneId: string;
  /** Reporter's UID (null if reported anonymously via a kiosk). */
  reporterUid: string | null;
  category: IncidentCategory;
  /** Short headline shown in ops dashboards. */
  title: string;
  /** Longer description, max 1000 chars. */
  description: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
  createdAt: ISODateString;
  updatedAt: ISODateString;
  /** Assigned responder UID, null until dispatched. */
  assignedResponderUid: string | null;
  /** Free-form resolution notes added on close. */
  resolutionNotes: string | null;
}

export type IncidentCategory =
  'medical' | 'security' | 'fire' | 'crowd_flow' | 'lost_child' | 'facilities' | 'other';

export type IncidentSeverity = 'low' | 'medium' | 'high' | 'critical';

export type IncidentStatus = 'open' | 'acknowledged' | 'in_progress' | 'resolved' | 'closed';
