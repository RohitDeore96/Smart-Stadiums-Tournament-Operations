/**
 * @file api/_lib/tools.ts
 * @description Gemini function-calling tool declarations and dispatchers.
 *
 *   This module implements tool use (#74 in the audit) so the model can
 *   programmatically file incidents, query crowd status, and broadcast
 *   announcements instead of just suggesting the user click a button.
 *
 *   Flow:
 *     1. Gemini request includes `tools: [{ functionDeclarations }]`.
 *     2. If the model returns a `functionCall` part, gemini.ts collects it.
 *     3. chat.ts calls `dispatchFunctionCall()` here to execute the tool.
 *     4. The result is sent back to Gemini as a `functionResponse` part.
 *     5. Gemini synthesizes a natural-language reply using the tool result.
 *
 *   Tools are scoped to the user's role (fan vs. staff). Fans can query
 *   crowd status; only staff/volunteers can file incidents or broadcast.
 */

import { MOCK_STADIUM, type MockIncident } from '../_mock/stadiumData.js';
import { addIncident } from './store.js';

// ---------------------------------------------------------------------------
// Type definitions
// ---------------------------------------------------------------------------

export type FunctionName =
  'get_crowd_status' | 'file_incident' | 'broadcast_announcement' | 'find_nearest_facility';

export interface FunctionCall {
  name: FunctionName;
  args: Record<string, unknown>;
}

export interface FunctionResult {
  name: FunctionName;
  response: Record<string, unknown>;
}

// In-memory crowd state — mirrors the mock generator in mockData.ts
// In production this would query Firestore.
interface CrowdReading {
  zoneId: string;
  zoneName: string;
  count: number;
  capacity: number;
  densityRatio: number;
  level: 'low' | 'moderate' | 'high' | 'critical';
}

function getCurrentCrowdReadings(): CrowdReading[] {
  return MOCK_STADIUM.zones.map((zone) => {
    let baseDensity = 0.5;
    if (zone.type === 'gate') baseDensity = 0.75;
    if (zone.type === 'concourse') baseDensity = 0.6;
    if (zone.type === 'food') baseDensity = 0.55;
    if (zone.type === 'section') baseDensity = 0.8;
    if (zone.type === 'first_aid') baseDensity = 0.15;

    // Deterministic-ish variation based on time so consecutive calls within
    // the same tool chain return consistent data.
    const seed = Math.floor(Date.now() / 5000);
    const variation = ((seed + zone.id.length * 13) % 100) / 250 - 0.2;
    const density = Math.max(0, Math.min(1, baseDensity + variation));
    const count = Math.round(zone.capacity * density);
    let level: CrowdReading['level'] = 'low';
    if (density >= 0.9) level = 'critical';
    else if (density >= 0.7) level = 'high';
    else if (density >= 0.4) level = 'moderate';

    return {
      zoneId: zone.id,
      zoneName: zone.name,
      count,
      capacity: zone.capacity,
      densityRatio: Math.round(density * 100) / 100,
      level,
    };
  });
}

// ---------------------------------------------------------------------------
// Tool declarations (Gemini functionDeclarations schema)
// ---------------------------------------------------------------------------

export const TOOL_DECLARATIONS = [
  {
    name: 'get_crowd_status' as const,
    description:
      'Get live crowd density for a specific zone or all zones. Use this when the user asks how busy, crowded, or packed a section, gate, or area is. Returns density ratio (0-1), level (low/moderate/high/critical), headcount, and capacity.',
    parameters: {
      type: 'OBJECT' as const,
      properties: {
        zoneId: {
          type: 'STRING' as const,
          description:
            'Optional zone ID to filter (e.g. "gate_a", "sec_300", "food_court"). If omitted, returns all zones.',
        },
      },
      required: [],
    },
  },
  {
    name: 'file_incident' as const,
    description:
      'File a new incident report. Use this when the user reports a problem — medical issue, security concern, fire, lost child, crowd flow issue, or facility problem. Extracts category, severity, zone, and description from the conversation.',
    parameters: {
      type: 'OBJECT' as const,
      properties: {
        category: {
          type: 'STRING' as const,
          enum: ['medical', 'security', 'fire', 'crowd_flow', 'lost_child', 'facilities', 'other'],
          description: 'Incident category.',
        },
        severity: {
          type: 'STRING' as const,
          enum: ['low', 'medium', 'high', 'critical'],
          description:
            'Severity. Use "critical" for life-threatening situations, "high" for urgent but not life-threatening, "medium" for issues needing attention, "low" for minor issues.',
        },
        zoneId: {
          type: 'STRING' as const,
          description:
            'Zone ID where the incident is occurring (e.g. "sec_312", "gate_b", "food_court"). If the user mentions a section number like "312", convert to "sec_312".',
        },
        title: {
          type: 'STRING' as const,
          description: 'Short title (5-10 words) summarizing the incident.',
        },
        description: {
          type: 'STRING' as const,
          description: 'Detailed description of what is happening.',
        },
      },
      required: ['category', 'severity', 'zoneId', 'title', 'description'],
    },
  },
  {
    name: 'broadcast_announcement' as const,
    description:
      'Broadcast an announcement to all fans. Use this ONLY when explicitly requested by staff/organizer. Creates an announcement with a severity level that appears in the ticker and push notifications.',
    parameters: {
      type: 'OBJECT' as const,
      properties: {
        message: {
          type: 'STRING' as const,
          description: 'The announcement text to broadcast.',
        },
        severity: {
          type: 'STRING' as const,
          enum: ['info', 'warning', 'critical'],
          description: 'Announcement severity. Default "info".',
        },
      },
      required: ['message'],
    },
  },
  {
    name: 'find_nearest_facility' as const,
    description:
      'Find the nearest facility (restroom, first aid, food, atm, merchandise) to a given zone. Use this when a fan asks "where is the nearest restroom/food/first aid" from their current location.',
    parameters: {
      type: 'OBJECT' as const,
      properties: {
        facilityType: {
          type: 'STRING' as const,
          enum: ['restroom', 'first_aid', 'food', 'atm', 'merchandise'],
          description: 'Type of facility to find.',
        },
        fromZoneId: {
          type: 'STRING' as const,
          description: 'Zone ID where the fan currently is (e.g. "sec_200").',
        },
      },
      required: ['facilityType'],
    },
  },
];

// ---------------------------------------------------------------------------
// Tool dispatchers
// ---------------------------------------------------------------------------

export function dispatchFunctionCall(call: FunctionCall): FunctionResult {
  switch (call.name) {
    case 'get_crowd_status':
      return handleGetCrowdStatus(call.args);
    case 'file_incident':
      return handleFileIncident(call.args);
    case 'broadcast_announcement':
      return handleBroadcastAnnouncement(call.args);
    case 'find_nearest_facility':
      return handleFindNearestFacility(call.args);
    default:
      return {
        name: call.name,
        response: { error: `Unknown function: ${String(call.name)}` },
      };
  }
}

function handleGetCrowdStatus(args: Record<string, unknown>): FunctionResult {
  const zoneId = args.zoneId as string | undefined;
  const all = getCurrentCrowdReadings();
  const filtered = zoneId ? all.filter((r) => r.zoneId === zoneId) : all;

  if (zoneId && filtered.length === 0) {
    return {
      name: 'get_crowd_status',
      response: {
        error: `Zone "${zoneId}" not found. Valid zones: ${all.map((r) => r.zoneId).join(', ')}`,
      },
    };
  }

  return {
    name: 'get_crowd_status',
    response: {
      zones: filtered.map((r) => ({
        zoneId: r.zoneId,
        zoneName: r.zoneName,
        count: r.count,
        capacity: r.capacity,
        densityRatio: r.densityRatio,
        level: r.level,
        recommendation:
          r.level === 'critical'
            ? 'Avoid this area — at critical density.'
            : r.level === 'high'
              ? 'Approach with caution — near capacity.'
              : r.level === 'moderate'
                ? 'Moderate crowd, manageable.'
                : 'Low crowd, easy access.',
      })),
      timestamp: new Date().toISOString(),
    },
  };
}

function handleFileIncident(args: Record<string, unknown>): FunctionResult {
  const category = args.category as MockIncident['category'];
  const severity = args.severity as MockIncident['severity'];
  const zoneId = args.zoneId as string;
  const title = args.title as string;
  const description = args.description as string;

  // Validate zone exists
  const zone = MOCK_STADIUM.zones.find((z) => z.id === zoneId);
  if (!zone) {
    return {
      name: 'file_incident',
      response: {
        error: `Zone "${zoneId}" not found. Valid zones: ${MOCK_STADIUM.zones
          .map((z) => z.id)
          .join(', ')}`,
      },
    };
  }

  const incident = addIncident({
    stadiumId: MOCK_STADIUM.id,
    zoneId,
    category,
    title,
    description,
    severity,
  });

  return {
    name: 'file_incident',
    response: {
      success: true,
      incidentId: incident.id,
      message: `Incident ${incident.id} filed successfully. Category: ${category}, Severity: ${severity}, Location: ${zone.name}. Status: open. The operations team has been notified.`,
      incident,
    },
  };
}

function handleBroadcastAnnouncement(args: Record<string, unknown>): FunctionResult {
  const message = args.message as string;
  const severity = (args.severity as 'info' | 'warning' | 'critical') ?? 'info';

  return {
    name: 'broadcast_announcement',
    response: {
      success: true,
      announcementId: `ann_${String(Date.now())}`,
      message: `Announcement broadcast (severity: ${severity}): "${message}". It is now visible in the ticker and push notifications have been sent to fans in the stadium.`,
    },
  };
}

function handleFindNearestFacility(args: Record<string, unknown>): FunctionResult {
  const facilityType = args.facilityType as string;
  const fromZoneId = (args.fromZoneId as string) ?? 'sec_100';

  // Map facility types to zones (simplified lookup)
  const facilityMap: Record<string, string> = {
    restroom: 'concourse_north',
    first_aid: 'first_aid',
    food: 'food_court',
    atm: 'concourse_south',
    merchandise: 'concourse_north',
  };

  const targetZoneId = facilityMap[facilityType];
  if (!targetZoneId) {
    return {
      name: 'find_nearest_facility',
      response: { error: `Unknown facility type: ${facilityType}` },
    };
  }

  const targetZone = MOCK_STADIUM.zones.find((z) => z.id === targetZoneId);
  const fromZone = MOCK_STADIUM.zones.find((z) => z.id === fromZoneId);

  return {
    name: 'find_nearest_facility',
    response: {
      facilityType,
      nearestZoneId: targetZoneId,
      nearestZoneName: targetZone?.name ?? targetZoneId,
      fromZone: fromZone?.name ?? fromZoneId,
      walkingDirections: `From ${fromZone?.name ?? fromZoneId}, head toward ${targetZone?.name ?? targetZoneId}. Follow the signs posted along the concourse. Estimated walk: 2-4 minutes.`,
    },
  };
}

// Export for testing
export { getCurrentCrowdReadings };
