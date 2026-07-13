/**
 * @file apps/web/src/hooks/useIncidents.ts
 * @description React hook for fetching + creating incidents.
 *   Auto-refreshes every 30 seconds.
 */

import { useState, useEffect, useCallback } from 'react';
import type { IncidentCreateInput } from '@stadiumops/shared';
import { getIncidents, createIncident, type Incident } from '../services/incidentService.js';

interface UseIncidentsReturn {
  incidents: Incident[];
  isLoading: boolean;
  error: string | null;
  create: (input: IncidentCreateInput) => Promise<Incident>;
  refresh: () => Promise<void>;
}

export function useIncidents(): UseIncidentsReturn {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setError(null);
      const data = await getIncidents();
      setIncidents(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load incidents';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const create = useCallback(async (input: IncidentCreateInput): Promise<Incident> => {
    const incident = await createIncident(input);
    setIncidents((prev) => [incident, ...prev]);
    return incident;
  }, []);

  useEffect(() => {
    void refresh();

    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      void refresh();
    }, 30_000);

    return () => {
      clearInterval(interval);
    };
  }, [refresh]);

  return {
    incidents,
    isLoading,
    error,
    create,
    refresh,
  };
}
