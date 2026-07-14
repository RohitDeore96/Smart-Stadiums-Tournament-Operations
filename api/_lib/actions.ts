/**
 * @file api/_lib/actions.ts
 * @description Suggested action generator based on detected intent.
 *   Uses a discriminated union for type-safe action rendering.
 *   Extracted from chat.ts to keep it under 300 LOC.
 */

export type SuggestedAction =
  | { type: 'show_route'; label: string; payload: Record<string, never> }
  | { type: 'open_map'; label: string; payload: Record<string, never> }
  | { type: 'file_incident'; label: string; payload: { category: string } }
  | { type: 'view_crowd'; label: string; payload: Record<string, never> }
  | { type: 'translate'; label: string; payload: Record<string, never> };

/**
 * Returns suggested UI actions based on detected intent.
 */
export function suggestActions(intent: string): SuggestedAction[] {
  switch (intent) {
    case 'wayfinding':
      return [
        { type: 'show_route', label: 'Show route', payload: {} },
        { type: 'open_map', label: 'Open stadium map', payload: {} },
      ];
    case 'incident_report':
      return [
        {
          type: 'file_incident',
          label: 'File incident report',
          payload: { category: 'medical' },
        },
      ];
    case 'crowd_status':
      return [{ type: 'view_crowd', label: 'View crowd heatmap', payload: {} }];
    case 'translation':
      return [{ type: 'translate', label: 'Translate more', payload: {} }];
    default:
      return [];
  }
}
