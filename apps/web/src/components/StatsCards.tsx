/**
 * @file apps/web/src/components/StatsCards.tsx
 * @description Dashboard stat cards — total fans, active incidents,
 *   critical zones, average density. Accessible: semantic markup, ARIA.
 */

import { type FC } from 'react';
import type { CrowdZoneReading } from '@stadiumops/shared';
import type { Incident } from '../services/incidentService.js';
import { useI18n } from '../context/I18nContext.js';

interface StatsCardsProps {
  readings: CrowdZoneReading[];
  incidents: Incident[];
}

interface StatItem {
  label: string;
  value: string;
  icon: string;
  tone: 'default' | 'warning' | 'critical';
}

export const StatsCards: FC<StatsCardsProps> = ({ readings, incidents }) => {
  const { t } = useI18n();

  const totalFans = readings.reduce((sum, r) => sum + r.count, 0);
  const activeIncidents = incidents.filter(
    (i) => i.status === 'open' || i.status === 'acknowledged' || i.status === 'in_progress',
  ).length;
  const criticalZones = readings.filter((r) => r.level === 'critical').length;
  const avgDensity =
    readings.length > 0
      ? Math.round((readings.reduce((sum, r) => sum + r.densityRatio, 0) / readings.length) * 100)
      : 0;

  const stats: StatItem[] = [
    {
      label: t('dashboard.totalFans'),
      value: totalFans.toLocaleString(),
      icon: '👥',
      tone: 'default',
    },
    {
      label: t('dashboard.activeIncidents'),
      value: String(activeIncidents),
      icon: '⚠️',
      tone: activeIncidents > 0 ? 'warning' : 'default',
    },
    {
      label: t('dashboard.criticalZones'),
      value: String(criticalZones),
      icon: '🚨',
      tone: criticalZones > 0 ? 'critical' : 'default',
    },
    {
      label: t('dashboard.avgDensity'),
      value: `${String(avgDensity)}%`,
      icon: '📈',
      tone: avgDensity >= 80 ? 'critical' : avgDensity >= 60 ? 'warning' : 'default',
    },
  ];

  return (
    <section className="stats-grid" aria-label="Dashboard statistics">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className={`stat-card stat-card--${stat.tone}`}
          role="group"
          aria-label={stat.label}
        >
          <span className="stat-icon" aria-hidden="true">
            {stat.icon}
          </span>
          <div className="stat-content">
            <span className="stat-value">{stat.value}</span>
            <span className="stat-label">{stat.label}</span>
          </div>
        </div>
      ))}
    </section>
  );
};
