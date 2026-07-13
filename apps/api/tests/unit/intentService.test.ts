/**
 * @file apps/api/tests/unit/intentService.test.ts
 * @description Unit tests for the rule-based intent classifier.
 */

import { describe, it, expect } from 'vitest';
import { classifyIntent } from '../../src/services/intentService.js';

describe('classifyIntent', () => {
  describe('wayfinding', () => {
    const wayfindingMessages = [
      'where is gate A',
      "where's the nearest restroom",
      'how do I get to section 312',
      'find the first aid station',
      'locate my seat',
      'directions to parking',
    ];

    for (const msg of wayfindingMessages) {
      it(`classifies "${msg}" as wayfinding`, () => {
        const result = classifyIntent(msg);
        expect(result.intent).toBe('wayfinding');
        expect(result.confidence).toBeGreaterThanOrEqual(0.6);
      });
    }
  });

  describe('crowd_status', () => {
    it('classifies "how busy is the stadium" as crowd_status', () => {
      expect(classifyIntent('how busy is the stadium').intent).toBe('crowd_status');
    });

    it('classifies "what is the wait time" as crowd_status', () => {
      expect(classifyIntent('what is the wait time').intent).toBe('crowd_status');
    });

    it('classifies "is the line long" as crowd_status', () => {
      expect(classifyIntent('is the line long at the food stall').intent).toBe('crowd_status');
    });
  });

  describe('incident_report', () => {
    it('classifies "someone is hurt" as incident_report', () => {
      expect(classifyIntent('someone is hurt').intent).toBe('incident_report');
    });

    it('classifies "a fan looks sick" as incident_report', () => {
      expect(classifyIntent('a fan looks sick').intent).toBe('incident_report');
    });

    it('classifies "need a medic" as incident_report', () => {
      expect(classifyIntent('I need a medic').intent).toBe('incident_report');
    });
  });

  describe('facility_info', () => {
    it('classifies "where can I get food" as facility_info', () => {
      expect(classifyIntent('where can I get food').intent).toBe('facility_info');
    });

    it('classifies "is there an ATM" as facility_info', () => {
      expect(classifyIntent('is there an ATM nearby').intent).toBe('facility_info');
    });

    it('classifies "merchandise nearby" as facility_info', () => {
      expect(classifyIntent('merchandise nearby').intent).toBe('facility_info');
    });
  });

  describe('translation', () => {
    it('classifies "how do I say hello in Spanish" as translation', () => {
      expect(classifyIntent('how do I say hello in Spanish').intent).toBe('translation');
    });

    it('classifies "translate thank you" as translation', () => {
      expect(classifyIntent('translate thank you').intent).toBe('translation');
    });
  });

  describe('general_faq', () => {
    it('classifies "what time is kickoff" as general_faq', () => {
      expect(classifyIntent('what time is kickoff').intent).toBe('general_faq');
    });

    it('classifies "when does the match start" as general_faq', () => {
      expect(classifyIntent('when does the match start').intent).toBe('general_faq');
    });

    it('classifies "what is the wifi password" as general_faq', () => {
      expect(classifyIntent('what is the wifi password').intent).toBe('general_faq');
    });
  });

  describe('unknown intent', () => {
    it('returns unknown for messages that do not match any pattern', () => {
      const result = classifyIntent('the weather is nice today');
      expect(result.intent).toBe('unknown');
      expect(result.confidence).toBe(0);
    });

    it('returns unknown for empty string', () => {
      const result = classifyIntent('');
      expect(result.intent).toBe('unknown');
    });
  });

  describe('confidence scoring', () => {
    it('returns 0.6 for single pattern match', () => {
      // "translate" matches translation intent once
      const result = classifyIntent('translate this');
      expect(result.confidence).toBe(0.6);
    });

    it('returns 0.85 for two pattern matches', () => {
      // "where is" + "section 312" both match wayfinding
      const result = classifyIntent('where is section 312');
      expect(result.confidence).toBe(0.85);
    });

    it('returns 0.95 for three or more matches in one intent', () => {
      // "where is" + "nearest" + "find" — all match wayfinding
      const result = classifyIntent('where is the nearest exit, can you find it');
      expect(result.confidence).toBeGreaterThanOrEqual(0.95);
    });
  });

  describe('best match selection', () => {
    it('picks the intent with the most pattern matches', () => {
      // "where is" matches wayfinding, "section 312" matches wayfinding
      // So wayfinding should win with 2 matches
      const result = classifyIntent('where is section 312');
      expect(result.intent).toBe('wayfinding');
      expect(result.confidence).toBe(0.85);
    });
  });
});
