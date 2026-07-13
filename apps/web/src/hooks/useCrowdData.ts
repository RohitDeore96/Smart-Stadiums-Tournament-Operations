/**
 * @file apps/web/src/hooks/useCrowdData.ts
 * @description React hook for subscribing to live crowd data.
 *   Auto-cleans up subscription on unmount.
 */

import { useState, useEffect } from 'react';
import type { CrowdZoneReading } from '@stadiumops/shared';
import { subscribeToCrowdData } from '../services/crowdService.js';

interface UseCrowdDataReturn {
  readings: CrowdZoneReading[];
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
}

export function useCrowdData(): UseCrowdDataReturn {
  const [readings, setReadings] = useState<CrowdZoneReading[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    let mounted = true;

    const unsubscribe = subscribeToCrowdData((newReadings) => {
      if (!mounted) return;
      setReadings(newReadings);
      setIsLoading(false);
      setError(null);
      setLastUpdated(new Date());
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
  };
}
