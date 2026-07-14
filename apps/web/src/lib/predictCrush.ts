/**
 * @file apps/web/src/lib/predictCrush.ts
 * @description Predictive crowd crush analytics.
 *
 *   Uses ordinary least-squares linear regression on the densityRatio
 *   history (last 10 readings, ~50 seconds at 5s polling) to extrapolate
 *   when a zone will cross the critical threshold (0.9).
 *
 *   This is a high-value safety feature: predicting a crush 5 minutes
 *   before it happens gives ops time to redirect fans.
 *
 *   Algorithm:
 *     1. Fit y = m*x + b to the (time_idx, density) points.
 *     2. Solve for x when y = CRITICAL_THRESHOLD.
 *     3. Convert x back to wall-clock minutes (assuming 5s polling).
 *     4. If minutes <= 5 AND current density > 0.7, flag as predicted critical.
 */

const CRITICAL_THRESHOLD = 0.9;
const HIGH_THRESHOLD = 0.7;
const POLL_INTERVAL_SECONDS = 5;
const PREDICTION_HORIZON_MINUTES = 5;

export interface CrushPrediction {
  /** Whether this zone is predicted to hit critical density soon. */
  willBeCritical: boolean;
  /** Predicted minutes until critical density. null if not trending up. */
  minutesToCritical: number | null;
  /** Predicted density ratio at the horizon (5 min from now). */
  predictedDensityAtHorizon: number;
  /** Slope of the density trend (density per reading). */
  slope: number;
  /** Confidence in the prediction (0..1, based on R²). */
  confidence: number;
  /** Human-readable warning message. */
  warning: string | null;
}

/**
 * Computes a crush prediction from a zone's density history.
 * History is an array of densityRatio values (0..1), oldest first.
 * Returns a "safe" prediction if history is too short.
 */
export function predictCrush(history: number[]): CrushPrediction {
  // Need at least 4 points for a meaningful regression
  if (history.length < 4) {
    return {
      willBeCritical: false,
      minutesToCritical: null,
      predictedDensityAtHorizon: history[history.length - 1] ?? 0,
      slope: 0,
      confidence: 0,
      warning: null,
    };
  }

  const n = history.length;
  const xs = history.map((_, i) => i);
  const ys = history;

  // Least-squares: y = m*x + b
  const sumX = xs.reduce((a, b) => a + b, 0);
  const sumY = ys.reduce((a, b) => a + b, 0);
  const sumXY = xs.reduce((acc, x, i) => acc + x * (ys[i] ?? 0), 0);
  const sumX2 = xs.reduce((acc, x) => acc + x * x, 0);
  const meanY = sumY / n;

  const denominator = n * sumX2 - sumX * sumX;
  const slope = denominator === 0 ? 0 : (n * sumXY - sumX * sumY) / denominator;
  const intercept = (sumY - slope * sumX) / n;

  // R² for confidence
  let ssRes = 0;
  let ssTot = 0;
  for (let i = 0; i < n; i++) {
    const x = xs[i] ?? 0;
    const y = ys[i] ?? 0;
    const predicted = slope * x + intercept;
    ssRes += (y - predicted) ** 2;
    ssTot += (y - meanY) ** 2;
  }
  const r2 = ssTot === 0 ? 1 : Math.max(0, 1 - ssRes / ssTot);

  const currentDensity = ys[ys.length - 1] ?? 0;

  // Predict density at horizon (5 min = 60 readings at 5s, but we only have 10
  // history points, so extrapolate conservatively)
  const readingsToHorizon = (PREDICTION_HORIZON_MINUTES * 60) / POLL_INTERVAL_SECONDS;
  const predictedDensityAtHorizon = Math.min(
    1,
    Math.max(0, slope * (n - 1 + readingsToHorizon) + intercept),
  );

  // Time-to-critical: solve slope * (n-1 + k) + intercept = THRESHOLD
  let minutesToCritical: number | null = null;
  if (slope > 0.001) {
    const k = (CRITICAL_THRESHOLD - intercept) / slope - (n - 1);
    if (k > 0) {
      minutesToCritical = (k * POLL_INTERVAL_SECONDS) / 60;
    }
  }

  // Flag if: trending up, currently high+, and predicted to cross critical within horizon
  const willBeCritical =
    slope > 0.005 &&
    currentDensity > HIGH_THRESHOLD &&
    minutesToCritical !== null &&
    minutesToCritical <= PREDICTION_HORIZON_MINUTES;

  let warning: string | null = null;
  if (willBeCritical && minutesToCritical !== null) {
    const mins = Math.max(1, Math.round(minutesToCritical));
    warning = `⚠ Predicted critical in ~${String(mins)} min — consider redirecting fans`;
  } else if (slope > 0.005 && predictedDensityAtHorizon > HIGH_THRESHOLD) {
    warning = `↑ Rising — predicted ${String(Math.round(predictedDensityAtHorizon * 100))}% in 5 min`;
  }

  return {
    willBeCritical,
    minutesToCritical,
    predictedDensityAtHorizon,
    slope,
    confidence: r2,
    warning,
  };
}

/**
 * Aggregate prediction across all zones. Returns the zones predicted to go
 * critical, sorted by urgency (soonest first).
 */
export function findZonesPredictedCritical(
  historyByZone: Record<string, number[]>,
): { zoneId: string; prediction: CrushPrediction }[] {
  const flagged: { zoneId: string; prediction: CrushPrediction }[] = [];

  for (const [zoneId, history] of Object.entries(historyByZone)) {
    const prediction = predictCrush(history);
    if (prediction.willBeCritical) {
      flagged.push({ zoneId, prediction });
    }
  }

  return flagged.sort((a, b) => {
    const aMin = a.prediction.minutesToCritical ?? 999;
    const bMin = b.prediction.minutesToCritical ?? 999;
    return aMin - bMin;
  });
}
