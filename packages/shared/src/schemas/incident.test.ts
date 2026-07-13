/**
 * @file packages/shared/src/schemas/incident.test.ts
 * @description Unit tests for IncidentCreateSchema and IncidentUpdateSchema.
 */

import { describe, it, expect } from 'vitest';
import { IncidentCreateSchema, IncidentUpdateSchema } from './incident.js';

describe('IncidentCreateSchema', () => {
  const validInput = {
    stadiumId: 'st_metlife',
    zoneId: 'zone_sec_312',
    category: 'medical' as const,
    title: 'Fan feeling faint',
    description: 'Older gentleman in row 12 appears dehydrated, conscious.',
    severity: 'medium' as const,
  };

  it('parses a valid incident', () => {
    const result = IncidentCreateSchema.parse(validInput);
    expect(result.stadiumId).toBe('st_metlife');
    expect(result.category).toBe('medical');
    expect(result.severity).toBe('medium');
  });

  it('defaults severity to medium when omitted', () => {
    const { severity: _omit, ...withoutSeverity } = validInput;
    const result = IncidentCreateSchema.parse(withoutSeverity);
    expect(result.severity).toBe('medium');
  });

  it('rejects titles shorter than 3 characters', () => {
    expect(() => IncidentCreateSchema.parse({ ...validInput, title: 'ab' })).toThrow();
  });

  it('rejects titles longer than 140 characters', () => {
    expect(() => IncidentCreateSchema.parse({ ...validInput, title: 'a'.repeat(141) })).toThrow();
  });

  it('rejects descriptions shorter than 10 characters', () => {
    expect(() => IncidentCreateSchema.parse({ ...validInput, description: 'too short' })).toThrow();
  });

  it('sanitizes title and description', () => {
    const result = IncidentCreateSchema.parse({
      ...validInput,
      title: 'Fan\u200Bfainted',
      description: 'desc\u0000ription here with enough chars',
    });
    expect(result.title).toBe('Fanfainted');
    expect(result.description).toBe('description here with enough chars');
  });

  it('accepts all incident categories', () => {
    for (const category of [
      'medical',
      'security',
      'fire',
      'crowd_flow',
      'lost_child',
      'facilities',
      'other',
    ]) {
      const result = IncidentCreateSchema.parse({ ...validInput, category });
      expect(result.category).toBe(category);
    }
  });

  it('rejects unknown categories', () => {
    expect(() => IncidentCreateSchema.parse({ ...validInput, category: 'earthquake' })).toThrow();
  });
});

describe('IncidentUpdateSchema', () => {
  it('parses a status-only update', () => {
    const result = IncidentUpdateSchema.parse({ status: 'in_progress' });
    expect(result.status).toBe('in_progress');
  });

  it('parses an assignee update', () => {
    const result = IncidentUpdateSchema.parse({
      assignedResponderUid: 'uid_resp_01',
    });
    expect(result.assignedResponderUid).toBe('uid_resp_01');
  });

  it('sanitizes resolution notes', () => {
    const result = IncidentUpdateSchema.parse({
      resolutionNotes: 'resolved\u200Bby\u0000medic',
    });
    expect(result.resolutionNotes).toBe('resolvedbymedic');
  });

  it('rejects unknown status values', () => {
    expect(() => IncidentUpdateSchema.parse({ status: 'cancelled' })).toThrow();
  });

  it('accepts an empty object (no-op update)', () => {
    const result = IncidentUpdateSchema.parse({});
    expect(result.status).toBeUndefined();
    expect(result.assignedResponderUid).toBeUndefined();
    expect(result.resolutionNotes).toBeUndefined();
  });
});
