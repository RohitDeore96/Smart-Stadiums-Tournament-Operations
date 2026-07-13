/**
 * @file apps/web/src/services/crowdService.ts
 * @description Crowd data service. Uses Firestore if configured, otherwise
 *   falls back to mock data with simulated real-time updates.
 */

import type { CrowdZoneReading } from '@stadiumops/shared';
import { isFirebaseConfigured, getFirestore } from './firebase.js';
import { generateMockCrowdReadings, MOCK_STADIUM, type MockStadium } from './mockData.js';

export interface StadiumInfo {
  id: string;
  name: string;
  city: string;
  country: string;
  capacity: number;
  zones: MockStadium['zones'];
}

/**
 * Returns the current stadium info.
 * Phase 3 hardcodes MetLife for the demo; Phase 4+ adds stadium selection.
 */
export function getCurrentStadium(): StadiumInfo {
  return MOCK_STADIUM;
}

/**
 * Subscribes to live crowd readings.
 * Calls callback immediately with current data, then on every update.
 * Returns an unsubscribe function.
 *
 * - If Firestore configured: listens to crowdZones subcollection
 * - Otherwise: polls mock data every 5 seconds
 */
export function subscribeToCrowdData(callback: (readings: CrowdZoneReading[]) => void): () => void {
  if (isFirebaseConfigured()) {
    // Firestore subscription is async — return a wrapper that handles cleanup
    let unsubscribe: (() => void) | null = null;
    let cancelled = false;

    void subscribeToFirestoreCrowd(callback).then((fn) => {
      if (cancelled) {
        fn();
      } else {
        unsubscribe = fn;
      }
    });

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }
  return subscribeToMockCrowd(callback);
}

function subscribeToMockCrowd(callback: (readings: CrowdZoneReading[]) => void): () => void {
  // Initial reading
  callback(generateMockCrowdReadings());

  // Update every 5 seconds
  const interval = setInterval(() => {
    callback(generateMockCrowdReadings());
  }, 5000);

  return () => {
    clearInterval(interval);
  };
}

async function subscribeToFirestoreCrowd(
  callback: (readings: CrowdZoneReading[]) => void,
): Promise<() => void> {
  const db = getFirestore();
  if (!db) {
    // Fallback to mock if init failed
    return subscribeToMockCrowd(callback);
  }

  // Dynamic import to avoid loading Firestore if not needed
  const { collection, onSnapshot, query, where } = await import('firebase/firestore');
  const stadiumId = MOCK_STADIUM.id;
  const q = query(
    collection(db, `stadiums/${stadiumId}/crowdZones`),
    where('stadiumId', '==', stadiumId),
  );

  const unsubscribe = onSnapshot(
    q,
    (snapshot) => {
      const readings: CrowdZoneReading[] = snapshot.docs.map((doc) => ({
        ...(doc.data() as Omit<CrowdZoneReading, 'zoneId'>),
        zoneId: doc.id,
      }));
      callback(readings);
    },
    (err) => {
      console.error('[crowdService] Firestore subscription failed:', err);
      // Fallback to mock on error
      subscribeToMockCrowd(callback);
    },
  );

  return unsubscribe;
}
