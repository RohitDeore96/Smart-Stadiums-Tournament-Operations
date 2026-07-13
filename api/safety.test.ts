/**
 * @file apps/api/tests/unit/safetyService.test.ts
 * @description Unit tests for the emergency keyword detection.
 *   Critical: false negatives here could let emergencies go unescalated.
 */

import { describe, it, expect } from 'vitest';
import { checkSafety } from './_lib/safety.js';

describe('checkSafety', () => {
  describe('emergency detection (positive cases)', () => {
    const emergencyMessages = [
      'there is a fire near section 312',
      'I smell smoke',
      'someone fainted in row 12',
      'I think he is having a heart attack',
      'a fan is having a seizure',
      'this person is not breathing',
      'the man is unconscious',
      'there is blood everywhere',
      'someone was stabbed',
      'I heard a shot',
      'he has a weapon',
      'I see a knife',
      'there is a gun in the crowd',
      'I found a bomb',
      'suspicious package at gate A',
      'I lost my child',
      'missing child in section 200',
      'my child is lost',
      'the crowd is crushing us',
      'there is a stampede',
      'people are panicking',
      'we need to evacuate',
      'someone overdosed',
      'a man is choking',
      'she is having a stroke',
      'possible concussion',
      'severe bleeding in concourse',
      'severe burn at food court',
    ];

    for (const msg of emergencyMessages) {
      it(`detects: "${msg}"`, () => {
        const result = checkSafety(msg);
        expect(result.isEmergency).toBe(true);
        expect(result.intent).toBe('safety_emergency');
        expect(result.cannedReply).toBeTruthy();
        expect(result.cannedReply).toContain('emergency');
      });
    }
  });

  describe('non-emergency messages (negative cases)', () => {
    const safeMessages = [
      'where is the nearest restroom',
      'what time does kickoff start',
      'how do I say hello in Spanish',
      'where is gate A',
      'how busy is section 312',
      'is there food nearby',
      'where is my seat',
      'what is the wifi password',
      'translate this for me',
      'thank you for the help',
    ];

    for (const msg of safeMessages) {
      it(`does NOT flag: "${msg}"`, () => {
        const result = checkSafety(msg);
        expect(result.isEmergency).toBe(false);
        expect(result.intent).toBe('unknown');
        expect(result.cannedReply).toBeUndefined();
      });
    }
  });

  it('is case-insensitive', () => {
    expect(checkSafety('FIRE!').isEmergency).toBe(true);
    expect(checkSafety('Fire').isEmergency).toBe(true);
    expect(checkSafety('fire').isEmergency).toBe(true);
  });

  it('returns the matched pattern for observability', () => {
    const result = checkSafety('there is a fire');
    expect(result.matchedPattern).toBe('fire');
  });

  it('canned reply mentions responders and asks for location', () => {
    const result = checkSafety('I see smoke');
    expect(result.cannedReply).toContain('stay calm');
    expect(result.cannedReply).toContain('location');
    expect(result.cannedReply).toContain('notified');
  });
});
