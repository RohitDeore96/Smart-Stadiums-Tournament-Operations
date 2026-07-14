/**
 * @file api/tools.test.ts
 * @description Unit tests for the function-calling tool dispatchers.
 *   Tests the pure-logic dispatch functions (no Gemini calls).
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { dispatchFunctionCall, TOOL_DECLARATIONS, getCurrentCrowdReadings } from './_lib/tools.js';
import { incidentStore } from './_lib/store.js';

describe('TOOL_DECLARATIONS', () => {
  it('defines 4 tools', () => {
    expect(TOOL_DECLARATIONS).toHaveLength(4);
  });

  it('each tool has a name, description, and parameters schema', () => {
    for (const tool of TOOL_DECLARATIONS) {
      expect(tool.name).toBeTruthy();
      expect(tool.description.length).toBeGreaterThan(20);
      expect(tool.parameters).toBeDefined();
      expect(tool.parameters.type).toBe('OBJECT');
    }
  });

  it('includes get_crowd_status, file_incident, broadcast_announcement, find_nearest_facility', () => {
    const names = TOOL_DECLARATIONS.map((t) => t.name);
    expect(names).toContain('get_crowd_status');
    expect(names).toContain('file_incident');
    expect(names).toContain('broadcast_announcement');
    expect(names).toContain('find_nearest_facility');
  });
});

describe('dispatchFunctionCall — get_crowd_status', () => {
  it('returns all zones when no zoneId given', () => {
    const result = dispatchFunctionCall({ name: 'get_crowd_status', args: {} });
    expect(result.name).toBe('get_crowd_status');
    expect(Array.isArray(result.response.zones)).toBe(true);
    const zones = result.response.zones as unknown[];
    expect(zones.length).toBeGreaterThan(0);
  });

  it('returns specific zone when zoneId given', () => {
    const result = dispatchFunctionCall({
      name: 'get_crowd_status',
      args: { zoneId: 'gate_a' },
    });
    expect(result.response.zones).toHaveLength(1);
    const zones = result.response.zones as { zoneId: string }[];
    expect(zones[0]?.zoneId).toBe('gate_a');
  });

  it('returns error for invalid zoneId', () => {
    const result = dispatchFunctionCall({
      name: 'get_crowd_status',
      args: { zoneId: 'nonexistent_zone' },
    });
    expect(result.response.error).toContain('not found');
  });

  it('includes recommendation field per zone', () => {
    const result = dispatchFunctionCall({ name: 'get_crowd_status', args: {} });
    const zones = result.response.zones as { recommendation?: string }[];
    expect(zones[0]?.recommendation).toBeTruthy();
  });
});

describe('dispatchFunctionCall — file_incident', () => {
  beforeEach(() => {
    // Reset store to a known state by removing any test-added incidents
    const initialLength = incidentStore.length;
    for (let i = 0; i < initialLength - 3; i++) {
      incidentStore.pop();
    }
  });

  it('creates an incident with valid args', () => {
    const initialCount = incidentStore.length;
    const result = dispatchFunctionCall({
      name: 'file_incident',
      args: {
        category: 'medical',
        severity: 'high',
        zoneId: 'sec_300',
        title: 'Test medical incident',
        description: 'Someone fainted in section 300',
      },
    });
    expect(result.response.success).toBe(true);
    expect(result.response.incidentId).toMatch(/^inc_\d{3}$/);
    expect(incidentStore.length).toBe(initialCount + 1);
  });

  it('rejects invalid zoneId', () => {
    const result = dispatchFunctionCall({
      name: 'file_incident',
      args: {
        category: 'medical',
        severity: 'low',
        zoneId: 'invalid_zone',
        title: 'Test',
        description: 'Test',
      },
    });
    expect(result.response.error).toContain('not found');
  });
});

describe('dispatchFunctionCall — broadcast_announcement', () => {
  it('broadcasts an announcement', () => {
    const result = dispatchFunctionCall({
      name: 'broadcast_announcement',
      args: {
        message: 'Gate A is now open',
        severity: 'info',
      },
    });
    expect(result.response.success).toBe(true);
    expect(result.response.announcementId).toMatch(/^ann_\d+$/);
    expect(result.response.message).toContain('Gate A is now open');
  });

  it('defaults to info severity', () => {
    const result = dispatchFunctionCall({
      name: 'broadcast_announcement',
      args: { message: 'Test announcement' },
    });
    expect(result.response.message).toContain('info');
  });
});

describe('dispatchFunctionCall — find_nearest_facility', () => {
  it('finds nearest restroom', () => {
    const result = dispatchFunctionCall({
      name: 'find_nearest_facility',
      args: { facilityType: 'restroom', fromZoneId: 'sec_100' },
    });
    expect(result.response.facilityType).toBe('restroom');
    expect(result.response.nearestZoneId).toBeTruthy();
    expect(result.response.walkingDirections).toContain('head toward');
  });

  it('finds first aid from any zone', () => {
    const result = dispatchFunctionCall({
      name: 'find_nearest_facility',
      args: { facilityType: 'first_aid' },
    });
    expect(result.response.nearestZoneId).toBe('first_aid');
  });

  it('rejects unknown facility type', () => {
    const result = dispatchFunctionCall({
      name: 'find_nearest_facility',
      args: { facilityType: 'unknown_type' },
    });
    expect(result.response.error).toContain('Unknown facility type');
  });
});

describe('getCurrentCrowdReadings', () => {
  it('returns 12 readings (one per zone)', () => {
    const readings = getCurrentCrowdReadings();
    expect(readings).toHaveLength(12);
  });

  it('each reading has valid fields', () => {
    const readings = getCurrentCrowdReadings();
    for (const r of readings) {
      expect(r.zoneId).toBeTruthy();
      expect(r.zoneName).toBeTruthy();
      expect(r.count).toBeGreaterThanOrEqual(0);
      expect(r.capacity).toBeGreaterThan(0);
      expect(r.densityRatio).toBeGreaterThanOrEqual(0);
      expect(r.densityRatio).toBeLessThanOrEqual(1);
      expect(['low', 'moderate', 'high', 'critical']).toContain(r.level);
    }
  });
});

describe('dispatchFunctionCall — unknown function', () => {
  it('returns error for unknown function name', () => {
    const result = dispatchFunctionCall({
      name: 'nonexistent_function' as never,
      args: {},
    });
    expect(result.response.error).toContain('Unknown function');
  });
});
