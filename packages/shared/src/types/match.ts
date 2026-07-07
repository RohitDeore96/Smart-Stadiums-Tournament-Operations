/**
 * @file packages/shared/src/types/match.ts
 * @description Match + stadium scheduling domain types.
 */

import type { ISODateString, Locale } from './api.js';

export interface Stadium {
  id: string;
  name: string;
  city: string;
  country: string;
  /** Total seated capacity. */
  capacity: number;
  /** Geo point for maps / routing. */
  location: GeoPoint;
  /** Number of named zones (entrances, concourses, stands). */
  zones: StadiumZone[];
  /** Languages commonly spoken by home fans — used by GenAI to pick reply locale. */
  primaryLocales: Locale[];
}

export interface GeoPoint {
  latitude: number;
  longitude: number;
}

export interface StadiumZone {
  id: string;
  /** e.g. "Gate A", "Section 312", "Concourse North". */
  name: string;
  /** "gate" | "section" | "concourse" | "first_aid" | "restroom" | "food". */
  type: StadiumZoneType;
  /** Maximum people the zone can hold before triggering crowd-density alerts. */
  capacity: number;
}

export type StadiumZoneType =
  'gate' | 'section' | 'concourse' | 'first_aid' | 'restroom' | 'food' | 'merchandise';

export interface Match {
  id: string;
  /** FIFA match number, e.g. "M03". */
  matchNumber: string;
  homeTeam: string;
  awayTeam: string;
  stadiumId: string;
  /** Kickoff time in UTC. */
  kickoffTimeUTC: ISODateString;
  /** Final score, null while match is upcoming or in progress. */
  score: { home: number; away: number } | null;
  status: MatchStatus;
  /** Tournament stage, e.g. "Group A", "Round of 16", "Final". */
  stage: string;
}

export type MatchStatus = 'scheduled' | 'live' | 'halftime' | 'completed' | 'cancelled';

/**
 * Real-time crowd density per zone. Stored as a subcollection under
 * `stadiums/{stadiumId}/crowdZones/{zoneId}` and updated every 30s by
 * ingest workers (mock in dev, real sensor feed in prod).
 */
export interface CrowdZoneReading {
  zoneId: string;
  stadiumId: string;
  /** Estimated people currently in zone. */
  count: number;
  /** 0..1 fraction of capacity in use. */
  densityRatio: number;
  /** "low" | "moderate" | "high" | "critical". */
  level: CrowdLevel;
  updatedAt: ISODateString;
}

export type CrowdLevel = 'low' | 'moderate' | 'high' | 'critical';
