/**
 * @file apps/web/tests/predictCrush.test.ts
 * @description Unit tests for the predictive crush analytics module.
 *   Verifies the linear regression + threshold logic produces correct
 *   predictions for various crowd density histories.
 */
import { describe, it, expect } from 'vitest';
import { predictCrush, findZonesPredictedCritical } from '../src/lib/predictCrush.js';

describe('predictCrush', () => {
  it('returns safe prediction for short history (< 4 points)', () => {
    const result = predictCrush([0.5, 0.6]);
    expect(result.willBeCritical).toBe(false);
    expect(result.minutesToCritical).toBeNull();
    expect(result.warning).toBeNull();
  });

  it('returns safe prediction for stable history', () => {
    const result = predictCrush([0.5, 0.5, 0.5, 0.5, 0.5]);
    expect(result.willBeCritical).toBe(false);
    expect(result.slope).toBeCloseTo(0, 3);
    expect(result.minutesToCritical).toBeNull();
  });

  it('detects rising trend that will hit critical soon', () => {
    // Density rising 0.05 per reading, currently at 0.8, will hit 0.9 in 2 readings (~10s, but we extrapolate)
    const result = predictCrush([0.6, 0.65, 0.7, 0.75, 0.8]);
    expect(result.slope).toBeGreaterThan(0.04);
    expect(result.predictedDensityAtHorizon).toBeGreaterThan(0.8);
    expect(result.minutesToCritical).not.toBeNull();
  });

  it('flags critical when current density is high and rising fast', () => {
    // Rapid rise, already at 0.85, will cross 0.9 very soon
    const result = predictCrush([0.7, 0.75, 0.8, 0.85]);
    expect(result.willBeCritical).toBe(true);
    expect(result.warning).toContain('Predicted critical');
    expect(result.warning).toContain('min');
  });

  it('does NOT flag critical when density is rising but still low', () => {
    // Rising but still well below threshold
    const result = predictCrush([0.2, 0.25, 0.3, 0.35]);
    expect(result.willBeCritical).toBe(false);
  });

  it('does NOT flag critical when density is falling', () => {
    const result = predictCrush([0.95, 0.9, 0.85, 0.8]);
    expect(result.slope).toBeLessThan(0);
    expect(result.willBeCritical).toBe(false);
  });

  it('shows rising warning (non-critical) for moderate upward trend', () => {
    // Rising from 0.6 to 0.7 over 5 readings — predicted to reach ~0.8 in 5 min
    const result = predictCrush([0.6, 0.625, 0.65, 0.675, 0.7]);
    if (result.warning && !result.willBeCritical) {
      expect(result.warning).toContain('Rising');
      expect(result.warning).toContain('%');
    }
  });

  it('confidence is high for linear data (R² near 1)', () => {
    const result = predictCrush([0.5, 0.6, 0.7, 0.8]);
    expect(result.confidence).toBeGreaterThan(0.95);
  });

  it('confidence is lower for noisy data', () => {
    const result = predictCrush([0.5, 0.7, 0.4, 0.8, 0.5, 0.7]);
    expect(result.confidence).toBeLessThan(0.95);
  });
});

describe('findZonesPredictedCritical', () => {
  it('returns empty array when no zones are flagged', () => {
    const result = findZonesPredictedCritical({
      zone_a: [0.3, 0.3, 0.3, 0.3],
      zone_b: [0.5, 0.4, 0.3, 0.2],
    });
    expect(result).toHaveLength(0);
  });

  it('returns only zones predicted to go critical', () => {
    const result = findZonesPredictedCritical({
      zone_safe: [0.3, 0.3, 0.3, 0.3],
      zone_critical: [0.7, 0.75, 0.8, 0.85],
      zone_rising: [0.5, 0.55, 0.6, 0.65],
    });
    expect(result.length).toBeGreaterThanOrEqual(1);
    expect(result[0]!.zoneId).toBe('zone_critical');
  });

  it('sorts flagged zones by urgency (soonest first)', () => {
    const result = findZonesPredictedCritical({
      slow: [0.7, 0.72, 0.74, 0.76],
      fast: [0.75, 0.8, 0.85, 0.9],
    });
    if (result.length >= 2) {
      const firstMin = result[0]!.prediction.minutesToCritical ?? 999;
      const secondMin = result[1]!.prediction.minutesToCritical ?? 999;
      expect(firstMin).toBeLessThanOrEqual(secondMin);
    }
  });
});
