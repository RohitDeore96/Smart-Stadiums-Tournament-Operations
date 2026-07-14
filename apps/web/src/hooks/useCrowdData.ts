/**
 * @file apps/web/src/hooks/useCrowdData.ts
 * @description React hook for subscribing to live crowd data.
 *   Tracks history (last 10 readings per zone) for trend sparklines.
 *   Uses Page Visibility API to pause polling when tab is not focused
 *   (saves battery + bandwidth on mobile).
 *   Auto-cleans up subscription on unmount.
 */

import { useState, useEffect, useRef } from 'react';
import type { CrowdZoneReading } from '@stadiumops/shared';
import { subscribeToCrowdData } from '../services/crowdService.js';

interface UseCrowdDataReturn {
  readings: CrowdZoneReading[];
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  /** History of densityRatio values per zone (last 10 readings). */
  history: Record<string, number[]>;
}

export function useCrowdData(): UseCrowdDataReturn {
  const [readings, setReadings] = useState<CrowdZoneReading[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const historyRef = useRef<Record<string, number[]>>({});
  const readingsRef = useRef<CrowdZoneReading[]>([]);
  const [history, setHistory] = useState<Record<string, number[]>>({});

  useEffect(() => {
    let mounted = true;
    let unsubscribe: (() => void) | null = null;
    let isPaused = false;

    const startSubscription = (): void => {
      if (unsubscribe) return; // already subscribed
      unsubscribe = subscribeToCrowdData((newReadings) => {
        if (!mounted || isPaused) return;

        // Shallow equality check — skip setState if readings haven't changed
        const prevReadings = readingsRef.current;
        if (
          prevReadings.length === newReadings.length &&
          prevReadings.every((prev, i) => {
            const next = newReadings[i] ?? null;
            return (
              next !== null &&
              prev.zoneId === next.zoneId &&
              prev.densityRatio === next.densityRatio
            );
          })
        ) {
          return; // No meaningful change — skip re-render
        }

        readingsRef.current = newReadings;
        setReadings(newReadings);
        setIsLoading(false);
        setError(null);
        setLastUpdated(new Date());

        // Update history (keep last 10 readings per zone)
        const updatedHistory = { ...historyRef.current };
        for (const reading of newReadings) {
          const existing = updatedHistory[reading.zoneId] ?? [];
          updatedHistory[reading.zoneId] = [...existing, reading.densityRatio].slice(-10);
        }
        historyRef.current = updatedHistory;
        setHistory(updatedHistory);
      });
    };

    const stopSubscription = (): void => {
      if (unsubscribe) {
        unsubscribe();
        unsubscribe = null;
      }
    };

    // Page Visibility API — pause polling when tab is hidden
    const handleVisibilityChange = (): void => {
      if (document.hidden) {
        isPaused = true;
        stopSubscription();
      } else {
        isPaused = false;
        startSubscription();
      }
    };

    // Start initial subscription
    startSubscription();

    // Listen for visibility changes
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      mounted = false;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      stopSubscription();
    };
  }, []);

  return {
    readings,
    isLoading,
    error,
    lastUpdated,
    history,
  };
}
