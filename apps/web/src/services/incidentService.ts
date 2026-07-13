/**
 * @file apps/web/src/services/incidentService.ts
 * @description Incident CRUD service. Uses Firestore if configured,
 *   otherwise uses in-memory mock data.
 */

import type { IncidentCreateInput, IncidentUpdateInput } from '@stadiumops/shared';
import { isFirebaseConfigured, getFirestore } from './firebase.js';
import { MOCK_INCIDENTS, type MockIncident } from './mockData.js';

export type Incident = MockIncident;

// In-memory store for mock mode (resets on page reload)
let mockIncidents: Incident[] = [...MOCK_INCIDENTS];

/**
 * Returns all incidents, most recent first.
 */
export async function getIncidents(): Promise<Incident[]> {
  if (isFirebaseConfigured()) {
    return getIncidentsFromFirestore();
  }
  return [...mockIncidents].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

async function getIncidentsFromFirestore(): Promise<Incident[]> {
  const db = getFirestore();
  if (!db) return getMockIncidents(); // FIX: fall back to mock directly, not getIncidents()

  try {
    const { collection, getDocs, orderBy, query } = await import('firebase/firestore');
    const q = query(collection(db, 'incidents'), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...(doc.data() as Omit<Incident, 'id'>),
    }));
  } catch (err) {
    console.error('[incidentService] Firestore read failed:', err);
    return getMockIncidents(); // FIX: fall back to mock directly
  }
}

/** Returns mock incidents sorted by most recent first. */
function getMockIncidents(): Incident[] {
  return [...mockIncidents].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/**
 * Creates a new incident. Returns the created incident.
 */
export async function createIncident(input: IncidentCreateInput): Promise<Incident> {
  const now = new Date().toISOString();
  const incident: Incident = {
    id: `inc_${String(Date.now())}`,
    stadiumId: input.stadiumId,
    zoneId: input.zoneId,
    reporterUid: null,
    category: input.category,
    title: input.title,
    description: input.description,
    severity: input.severity,
    status: 'open',
    createdAt: now,
    updatedAt: now,
    assignedResponderUid: null,
    resolutionNotes: null,
  };

  if (isFirebaseConfigured()) {
    await createIncidentInFirestore(incident);
  } else {
    mockIncidents = [incident, ...mockIncidents];
  }

  return incident;
}

async function createIncidentInFirestore(incident: Incident): Promise<void> {
  const db = getFirestore();
  if (!db) {
    mockIncidents = [incident, ...mockIncidents];
    return;
  }

  try {
    const { collection, addDoc } = await import('firebase/firestore');
    const { id: _id, ...data } = incident;
    await addDoc(collection(db, 'incidents'), data);
  } catch (err) {
    console.error('[incidentService] Firestore create failed:', err);
    mockIncidents = [incident, ...mockIncidents];
  }
}

/**
 * Updates an incident (responder/admin only in Phase 4).
 * In mock mode, updates the in-memory store.
 */
export async function updateIncident(
  id: string,
  input: IncidentUpdateInput,
): Promise<Incident | null> {
  if (isFirebaseConfigured()) {
    return updateIncidentInFirestore(id, input);
  }

  const idx = mockIncidents.findIndex((i) => i.id === id);
  if (idx === -1) return null;

  const existing = mockIncidents[idx];
  if (!existing) return null;

  // Spread order: existing first, then updates (which override), then updatedAt
  // Cast to Incident because Partial<IncidentUpdateInput> makes fields optional
  const updated: Incident = {
    ...existing,
    ...(input as Partial<Incident>),
    updatedAt: new Date().toISOString(),
  };
  mockIncidents[idx] = updated;
  return updated;
}

async function updateIncidentInFirestore(
  id: string,
  input: IncidentUpdateInput,
): Promise<Incident | null> {
  const db = getFirestore();
  if (!db) return updateIncidentMock(id, input); // FIX: don't re-enter public function

  try {
    const { doc, updateDoc, getDoc } = await import('firebase/firestore');
    const ref = doc(db, 'incidents', id);
    await updateDoc(ref, {
      ...input,
      updatedAt: new Date().toISOString(),
    });
    const snapshot = await getDoc(ref);
    if (!snapshot.exists()) return null;
    return { id: snapshot.id, ...(snapshot.data() as Omit<Incident, 'id'>) };
  } catch (err) {
    console.error('[incidentService] Firestore update failed:', err);
    return updateIncidentMock(id, input); // FIX: fall back to mock directly
  }
}

/** Updates a mock incident in memory. */
function updateIncidentMock(id: string, input: IncidentUpdateInput): Incident | null {
  const idx = mockIncidents.findIndex((i) => i.id === id);
  if (idx === -1) return null;

  const existing = mockIncidents[idx];
  if (!existing) return null;

  mockIncidents[idx] = {
    ...existing,
    ...(input as Partial<Incident>),
    updatedAt: new Date().toISOString(),
  };
  return mockIncidents[idx] ?? null;
}
