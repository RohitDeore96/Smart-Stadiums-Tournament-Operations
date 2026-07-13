/**
 * @file apps/web/src/pages/DashboardPage.tsx
 * @description Volunteer dashboard — match ticker, announcements, stats,
 *   interactive stadium map with crowd heatmap, crowd zone cards, recent incidents.
 */

import { type FC, useState } from 'react';
import { useI18n } from '../context/I18nContext.js';
import { useCrowdData } from '../hooks/useCrowdData.js';
import { useIncidents } from '../hooks/useIncidents.js';
import { getCurrentStadium } from '../services/crowdService.js';
import { StatsCards } from '../components/StatsCards.js';
import { CrowdZoneCard } from '../components/CrowdZoneCard.js';
import { IncidentCard } from '../components/IncidentCard.js';
import { StadiumMap } from '../components/StadiumMap.js';
import { MatchTicker } from '../components/MatchTicker.js';
import { AnnouncementsTicker } from '../components/AnnouncementsTicker.js';
import { FanSentimentWidget } from '../components/FanSentimentWidget.js';

export const DashboardPage: FC = () => {
  const { t } = useI18n();
  const { readings, isLoading: crowdLoading, lastUpdated, history } = useCrowdData();
  const { incidents, isLoading: incidentsLoading } = useIncidents();
  const stadium = getCurrentStadium();
  const [highlightedZone, setHighlightedZone] = useState<string | null>(null);

  const recentIncidents = incidents.slice(0, 3);

  // Next match (simulated — 4 hours from now)
  const nextKickoff = new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString();

  return (
    <>
      <MatchTicker homeTeam="Mexico" awayTeam="Canada" kickoffTimeUTC={nextKickoff} />

      <AnnouncementsTicker />

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

      {/* Interactive stadium map with crowd heatmap */}
      <section className="crowd-section" aria-labelledby="map-heading">
        <h3 id="map-heading" className="section-title">
          🗺️ {t('dashboard.crowdOverview')}
        </h3>
        {crowdLoading ? (
          <p className="loading-state" aria-live="polite">
            {t('common.loading')}
          </p>
        ) : (
          <StadiumMap
            readings={readings}
            highlightedZoneId={highlightedZone}
            onZoneClick={(zoneId) => {
              setHighlightedZone(zoneId);
            }}
          />
        )}
      </section>

      {/* Zone cards with sparklines */}
      <section className="crowd-section" aria-labelledby="zones-heading">
        <h3 id="zones-heading" className="section-title">
          📊 {t('dashboard.crowdOverview')}
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
                    history={history[reading.zoneId]}
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
          <a href="#/incidents" className="view-all-link">
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

      <div className="dashboard-widgets">
        <FanSentimentWidget />
      </div>
    </>
  );
};
