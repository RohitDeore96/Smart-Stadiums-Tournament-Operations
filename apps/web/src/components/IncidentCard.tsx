/**
 * @file apps/web/src/components/IncidentCard.tsx
 * @description Single incident card — shows category, severity, status, location.
 *   Color-coded by severity.
 */

import { type FC } from 'react';
import type { Incident } from '../services/incidentService.js';
import { useI18n } from '../context/I18nContext.js';
import { getCurrentStadium } from '../services/crowdService.js';

interface IncidentCardProps {
  incident: Incident;
}

export const IncidentCard: FC<IncidentCardProps> = ({ incident }) => {
  const { t } = useI18n();
  const stadium = getCurrentStadium();
  const zone = stadium.zones.find((z) => z.id === incident.zoneId);
  const createdAt = new Date(incident.createdAt);
  const updatedAt = new Date(incident.updatedAt);

  return (
    <article
      className={`incident-card incident-card--${incident.severity}`}
      aria-label={`Incident: ${incident.title}`}
    >
      <header className="incident-card-header">
        <div className="incident-card-titles">
          <h3 className="incident-title">{incident.title}</h3>
          <p className="incident-meta">
            <span className="incident-zone">{zone?.name ?? incident.zoneId}</span>
            <span className="incident-time" aria-hidden="true">
              •
            </span>
            <time dateTime={incident.createdAt}>{createdAt.toLocaleTimeString()}</time>
          </p>
        </div>
        <div className="incident-card-badges">
          <span className={`badge badge--severity-${incident.severity}`}>
            {t(`incidents.severity.${incident.severity}`)}
          </span>
          <span className={`badge badge--status-${incident.status}`}>
            {t(`incidents.status.${incident.status}`)}
          </span>
        </div>
      </header>

      <p className="incident-description">{incident.description}</p>

      <footer className="incident-card-footer">
        <span className="incident-category">
          <span aria-hidden="true">{getCategoryIcon(incident.category)}</span>
          {t(`incidents.category.${incident.category}`)}
        </span>
        {incident.assignedResponderUid && (
          <span className="incident-assignee">
            <span aria-hidden="true">👤</span>
            {t('incidents.status.in_progress')}
          </span>
        )}
        <time
          className="incident-updated"
          dateTime={incident.updatedAt}
          title={`Updated: ${updatedAt.toLocaleString()}`}
        >
          {updatedAt.toLocaleTimeString()}
        </time>
      </footer>
    </article>
  );
};

function getCategoryIcon(category: string): string {
  switch (category) {
    case 'medical':
      return '🏥';
    case 'security':
      return '🔒';
    case 'fire':
      return '🔥';
    case 'crowd_flow':
      return '👥';
    case 'lost_child':
      return '👶';
    case 'facilities':
      return '🔧';
    default:
      return '📋';
  }
}
