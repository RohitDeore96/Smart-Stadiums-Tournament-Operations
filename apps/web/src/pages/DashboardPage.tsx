/**
 * @file apps/web/src/pages/DashboardPage.tsx
 * @description Volunteer dashboard — stats, crowd overview, recent incidents.
 */

import { type FC } from 'react';
import { useI18n } from '../context/I18nContext.js';
import { useCrowdData } from '../hooks/useCrowdData.js';
import { useIncidents } from '../hooks/useIncidents.js';
import { getCurrentStadium } from '../services/crowdService.js';
import { StatsCards } from '../components/StatsCards.js';
import { CrowdZoneCard } from '../components/CrowdZoneCard.js';
import { IncidentCard } from '../components/IncidentCard.js';

export const DashboardPage: FC = () => {
  const { t } = useI18n();
  const { readings, isLoading: crowdLoading, lastUpdated } = useCrowdData();
  const { incidents, isLoading: incidentsLoading } = useIncidents();
  const stadium = getCurrentStadium();

  const recentIncidents = incidents.slice(0, 3);

  return (
    <>
      <section className="page-header">
        <h2 className="page-title">{t('dashboard.title')}</h2>
        <p className="page-subtitle">{t('dashboard.subtitle')}</p>
        {lastUpdated && (
          <p className="page-meta">
            {t('crowd.updated')}: {lastUpdated.toLocaleTimeString()}
          </p>
        )}
      </section>

      <StatsCards readings={readings} incidents={incidents} />

      <section className="crowd-section" aria-labelledby="crowd-heading">
        <h3 id="crowd-heading" className="section-title">
          {t('dashboard.crowdOverview')}
        </h3>
        {crowdLoading ? (
          <p className="loading-state" aria-live="polite">
            {t('common.loading')}
          </p>
        ) : (
          <div className="zones-grid">
            {readings
              .sort((a, b) => b.densityRatio - a.densityRatio)
              .map((reading) => {
                const zone = stadium.zones.find((z) => z.id === reading.zoneId);
                if (!zone) return null;
                return (
                  <CrowdZoneCard
                    key={reading.zoneId}
                    reading={reading}
                    zoneName={zone.name}
                    zoneCapacity={zone.capacity}
                  />
                );
              })}
          </div>
        )}
      </section>

      <section className="incidents-section" aria-labelledby="recent-incidents-heading">
        <div className="section-header">
          <h3 id="recent-incidents-heading" className="section-title">
            {t('dashboard.recentIncidents')}
          </h3>
          <a href="/incidents" className="view-all-link">
            {t('dashboard.viewAll')}
          </a>
        </div>
        {incidentsLoading ? (
          <p className="loading-state" aria-live="polite">
            {t('common.loading')}
          </p>
        ) : recentIncidents.length === 0 ? (
          <p className="empty-state">{t('incidents.empty')}</p>
        ) : (
          <div className="incidents-list">
            {recentIncidents.map((incident) => (
              <IncidentCard key={incident.id} incident={incident} />
            ))}
          </div>
        )}
      </section>
    </>
  );
};
