/**
 * @file apps/web/src/components/CrowdZoneCard.tsx
 * @description Single crowd zone card with density bar and level badge.
 *   Color-coded by crowd level (green/yellow/orange/red).
 */

import { type FC } from 'react';
import type { CrowdZoneReading } from '@stadiumops/shared';
import { useI18n } from '../context/I18nContext.js';

interface CrowdZoneCardProps {
  reading: CrowdZoneReading;
  zoneName: string;
  zoneCapacity: number;
}

export const CrowdZoneCard: FC<CrowdZoneCardProps> = ({ reading, zoneName, zoneCapacity }) => {
  const { t } = useI18n();

  const densityPercent = Math.round(reading.densityRatio * 100);
  const levelKey = `crowd.level.${reading.level}` as const;
  const updatedAt = new Date(reading.updatedAt);

  return (
    <article
      className={`zone-card zone-card--${reading.level}`}
      aria-label={`${zoneName} — ${String(densityPercent)}% capacity, ${t(levelKey)}`}
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

      <div className="zone-stats">
        <div className="zone-stat">
          <span className="zone-stat-label">{t('crowd.count')}</span>
          <span className="zone-stat-value">{reading.count.toLocaleString()}</span>
        </div>
        <div className="zone-stat">
          <span className="zone-stat-label">{t('crowd.capacity')}</span>
          <span className="zone-stat-value">{zoneCapacity.toLocaleString()}</span>
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

      <p className="zone-updated">
        {t('crowd.updated')}: {updatedAt.toLocaleTimeString()}
      </p>
    </article>
  );
};
