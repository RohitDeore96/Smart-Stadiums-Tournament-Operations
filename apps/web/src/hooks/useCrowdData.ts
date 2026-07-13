/**
 * @file apps/web/src/hooks/useCrowdData.ts
 * @description React hook for subscribing to live crowd data.
 *   Tracks history (last 10 readings per zone) for trend sparklines.
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
  const [history, setHistory] = useState<Record<string, number[]>>({});

  useEffect(() => {
    let mounted = true;

    const unsubscribe = subscribeToCrowdData((newReadings) => {
      if (!mounted) return;
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

    return () => {
      mounted = false;
      unsubscribe();
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
