/**
 * @file apps/web/src/components/CrowdZoneCard.tsx
 * @description Single crowd zone card with density bar, level badge,
 *   clickable expansion, and trend sparkline.
 *
 *   Challenge area: Crowd Management + Real-time Decision Support
 */

import { type FC, useState, memo } from 'react';
import type { CrowdZoneReading } from '@stadiumops/shared';
import { useI18n } from '../context/I18nContext.js';
import { predictCrush } from '../lib/predictCrush.js';

interface CrowdZoneCardProps {
  reading: CrowdZoneReading;
  zoneName: string;
  zoneCapacity: number;
  /** History of densityRatio values (last 10) for sparkline. */
  history?: number[] | undefined;
}

export const CrowdZoneCard: FC<CrowdZoneCardProps> = memo(
  ({ reading, zoneName, zoneCapacity, history = [] }) => {
    const { t } = useI18n();
    const [expanded, setExpanded] = useState(false);

    const densityPercent = Math.round(reading.densityRatio * 100);
    const levelKey = `crowd.level.${reading.level}` as const;
    const updatedAt = new Date(reading.updatedAt);

    // Compute trend from last 3 readings
    const trend = computeTrend(history);
    const trendIcon = trend === 'rising' ? '↑' : trend === 'falling' ? '↓' : '→';
    const trendLabel = trend === 'rising' ? 'Rising' : trend === 'falling' ? 'Falling' : 'Stable';

    // Predictive crush analytics — extrapolate from history
    const crushPrediction = predictCrush(history);

    // Build sparkline SVG points
    const sparklinePoints =
      history.length > 1
        ? history
            .map((v, i) => `${String((i / (history.length - 1)) * 100)},${String(20 - v * 18)}`)
            .join(' ')
        : '';

    return (
      <article
        className={`zone-card zone-card--${reading.level} ${expanded ? 'zone-card--expanded' : ''}`}
        aria-label={`${zoneName} — ${String(densityPercent)}% capacity, ${t(levelKey)}`}
        role="button"
        tabIndex={0}
        onClick={() => {
          setExpanded(!expanded);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setExpanded(!expanded);
          }
        }}
      >
        <header className="zone-card-header">
          <h3 className="zone-name">{zoneName}</h3>
          <span
            className={`zone-badge zone-badge--${reading.level}`}
            role="status"
            aria-live="polite"
          >
            {t(levelKey)}
          </span>
        </header>

        {crushPrediction.warning && (
          <div
            className={`zone-prediction ${crushPrediction.willBeCritical ? 'zone-prediction--critical' : 'zone-prediction--warning'}`}
            role="alert"
            aria-live="assertive"
          >
            <span className="zone-prediction-text">{crushPrediction.warning}</span>
            {crushPrediction.willBeCritical && crushPrediction.minutesToCritical !== null && (
              <span className="zone-prediction-confidence">
                (conf: {String(Math.round(crushPrediction.confidence * 100))}%)
              </span>
            )}
          </div>
        )}

        <div className="zone-stats">
          <div className="zone-stat">
            <span className="zone-stat-label">{t('crowd.count')}</span>
            <span className="zone-stat-value">{reading.count.toLocaleString()}</span>
          </div>
          <div className="zone-stat">
            <span className="zone-stat-label">{t('crowd.capacity')}</span>
            <span className="zone-stat-value">{zoneCapacity.toLocaleString()}</span>
          </div>
          <div className="zone-stat">
            <span className="zone-stat-label">{t('crowd.trend')}</span>
            <span className="zone-stat-value" aria-label={trendLabel}>
              {trendIcon}
            </span>
          </div>
        </div>

        <div
          className="zone-density-bar"
          role="progressbar"
          aria-valuenow={densityPercent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${zoneName} density`}
        >
          <div
            className={`zone-density-fill zone-density-fill--${reading.level}`}
            style={{ width: `${String(densityPercent)}%` }}
          />
        </div>

        {expanded && history.length > 1 && (
          <div className="zone-sparkline" aria-label="Density trend (last 10 readings)">
            <svg width="100" height="24" viewBox="0 0 100 24" className="sparkline-svg">
              <polyline
                points={sparklinePoints}
                fill="none"
                stroke={getTrendColor(trend)}
                strokeWidth="2"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            </svg>
            <span className="sparkline-label">Last {String(history.length)} readings</span>
            {crushPrediction.slope !== 0 && (
              <span className="sparkline-prediction">
                5-min forecast:{' '}
                {String(Math.round(crushPrediction.predictedDensityAtHorizon * 100))}%
                {crushPrediction.minutesToCritical !== null &&
                  ` · critical in ~${String(Math.round(crushPrediction.minutesToCritical))}min`}
              </span>
            )}
          </div>
        )}

        <p className="zone-updated">
          {t('crowd.updated')}: {updatedAt.toLocaleTimeString()}
        </p>
      </article>
    );
  },
);

function computeTrend(history: number[]): 'rising' | 'falling' | 'stable' {
  if (history.length < 3) return 'stable';
  const recent = history.slice(-3);
  const first = recent[0] ?? 0;
  const last = recent[2] ?? 0;
  const delta = last - first;
  if (delta > 0.05) return 'rising';
  if (delta < -0.05) return 'falling';
  return 'stable';
}

function getTrendColor(trend: string): string {
  switch (trend) {
    case 'rising':
      return '#ef4444';
    case 'falling':
      return '#4ade80';
    default:
      return '#fbbf24';
  }
}
