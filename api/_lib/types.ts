/**
 * @file api/_lib/types.ts
 * @description Shared type definitions for the Vercel API functions.
 *   Self-contained — no workspace dependencies.
 */

export type ChatIntent =
  | 'wayfinding'
  | 'crowd_status'
  | 'incident_report'
  | 'facility_info'
  | 'translation'
  | 'general_faq'
  | 'safety_emergency'
  | 'unknown';
