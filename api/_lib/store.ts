/**
 * @file api/_lib/store.ts
 * @description In-memory incident store shared across tools and agents.
 *
 *   In production, this would be Firestore. For the demo, we keep an
 *   in-memory array seeded with the mock incidents. The store is shared
 *   so tool dispatchers (file_incident) and agents (summary, triage)
 *   operate on the same data within a single Vercel function instance.
 *
 *   NOTE: Vercel serverless functions may have multiple instances, so
 *   incidents filed via tool calls may not be visible to other instances.
 *   This is acceptable for the demo — production uses Firestore.
 */

import { MOCK_INCIDENTS, type MockIncident } from '../_mock/stadiumData.js';

export const incidentStore: MockIncident[] = [...MOCK_INCIDENTS];

let incidentCounter = 100;

export function addIncident(
  incident: Omit<
    MockIncident,
    | 'id'
    | 'createdAt'
    | 'updatedAt'
    | 'status'
    | 'reporterUid'
    | 'assignedResponderUid'
    | 'resolutionNotes'
  >,
): MockIncident {
  incidentCounter += 1;
  const now = new Date().toISOString();
  const newIncident: MockIncident = {
    ...incident,
    id: `inc_${String(incidentCounter).padStart(3, '0')}`,
    status: 'open',
    reporterUid: null,
    assignedResponderUid: null,
    resolutionNotes: null,
    createdAt: now,
    updatedAt: now,
  };
  incidentStore.unshift(newIncident);
  return newIncident;
}
