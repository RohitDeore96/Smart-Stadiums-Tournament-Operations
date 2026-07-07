/**
 * @file packages/shared/src/types/stadium.ts
 * Re-export stadium types from match.ts so callers can import from a single
 * `stadium` namespace. Keeps import paths predictable.
 */

export type {
  Stadium,
  StadiumZone,
  StadiumZoneType,
  GeoPoint,
  CrowdZoneReading,
  CrowdLevel,
} from './match.js';
