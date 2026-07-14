/**
 * @file apps/web/src/pages/VenueStaffPage.tsx
 * @description Venue Staff persona — escalation workflow.
 *   Volunteers file incidents → Staff acknowledges → Staff assigns → Resolved.
 *   This adds the 4th persona (Venue Staff) the audit flagged as missing.
 *
 *   Challenge area: Operational Intelligence + Real-time Decision Support
 */

import { type FC, useState } from 'react';
import { useI18n } from '../context/I18nContext.js';
import { useIncidents } from '../hooks/useIncidents.js';
import { IncidentCard } from '../components/IncidentCard.js';
import type { Incident } from '../services/incidentService.js';

type EscalationFilter = 'all' | 'pending' | 'acknowledged' | 'assigned' | 'resolved';

export const VenueStaffPage: FC = () => {
  const { t } = useI18n();
  const { incidents, isLoading, update } = useIncidents();
  const [filter, setFilter] = useState<EscalationFilter>('all');

  const filteredIncidents = incidents.filter((inc) => {
    if (filter === 'all') return true;
    if (filter === 'pending') return inc.status === 'open';
    if (filter === 'acknowledged') return inc.status === 'acknowledged';
    if (filter === 'assigned')
      return inc.status === 'in_progress' && inc.assignedResponderUid !== null;
    if (filter === 'resolved') return inc.status === 'resolved' || inc.status === 'closed';
    return true;
  });

  const handleAcknowledge = async (id: string): Promise<void> => {
    await update(id, { status: 'acknowledged' });
  };

  const handleAssign = async (id: string): Promise<void> => {
    await update(id, {
      status: 'in_progress',
      assignedResponderUid: `responder_${String(Date.now())}`,
    });
  };

  const handleResolve = async (id: string): Promise<void> => {
    await update(id, {
      status: 'resolved',
      resolutionNotes: 'Resolved by venue staff.',
    });
  };

  const stats = {
    total: incidents.length,
    pending: incidents.filter((i) => i.status === 'open').length,
    inProgress: incidents.filter((i) => i.status === 'in_progress' || i.status === 'acknowledged')
      .length,
    resolved: incidents.filter((i) => i.status === 'resolved' || i.status === 'closed').length,
  };

  return (
    <>
      <section className="page-header">
        <h2 className="page-title">🏟️ {t('venueStaff.title')}</h2>
        <p className="page-subtitle">{t('venueStaff.subtitle')}</p>
      </section>

      <div className="stats-grid">
        <div className="stat-card">
          <span className="stat-icon" aria-hidden="true">
            📋
          </span>
          <div className="stat-content">
            <span className="stat-value">{String(stats.total)}</span>
            <span className="stat-label">{t('venueStaff.total')}</span>
          </div>
        </div>
        <div className="stat-card stat-card--warning">
          <span className="stat-icon" aria-hidden="true">
            ⏳
          </span>
          <div className="stat-content">
            <span className="stat-value">{String(stats.pending)}</span>
            <span className="stat-label">{t('venueStaff.pending')}</span>
          </div>
        </div>
        <div className="stat-card stat-card--warning">
          <span className="stat-icon" aria-hidden="true">
            🔄
          </span>
          <div className="stat-content">
            <span className="stat-value">{String(stats.inProgress)}</span>
            <span className="stat-label">{t('venueStaff.inProgress')}</span>
          </div>
        </div>
        <div className="stat-card">
          <span className="stat-icon" aria-hidden="true">
            ✅
          </span>
          <div className="stat-content">
            <span className="stat-value">{String(stats.resolved)}</span>
            <span className="stat-label">{t('venueStaff.resolved')}</span>
          </div>
        </div>
      </div>

      <section aria-label="Escalation filters">
        <div className="filter-buttons" role="group" aria-label="Filter incidents by status">
          {(['all', 'pending', 'acknowledged', 'assigned', 'resolved'] as EscalationFilter[]).map(
            (f) => (
              <button
                key={f}
                type="button"
                className={`btn ${filter === f ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => {
                  setFilter(f);
                }}
                aria-pressed={filter === f}
              >
                {f === 'all'
                  ? t('venueStaff.all')
                  : f === 'pending'
                    ? t('venueStaff.pending')
                    : f === 'acknowledged'
                      ? t('venueStaff.acknowledged')
                      : f === 'assigned'
                        ? t('venueStaff.assigned')
                        : t('venueStaff.resolved')}
              </button>
            ),
          )}
        </div>
      </section>

      <section aria-label="Incident list">
        {isLoading ? (
          <p className="loading-state" aria-live="polite">
            {t('common.loading')}
          </p>
        ) : filteredIncidents.length === 0 ? (
          <p className="empty-state">{t('incidents.empty')}</p>
        ) : (
          <div className="incidents-list">
            {filteredIncidents.map((incident: Incident) => (
              <div key={incident.id} className="incident-with-actions">
                <IncidentCard incident={incident} />
                <div className="escalation-actions">
                  {incident.status === 'open' && (
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => void handleAcknowledge(incident.id)}
                    >
                      Acknowledge
                    </button>
                  )}
                  {(incident.status === 'acknowledged' || incident.status === 'open') && (
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => void handleAssign(incident.id)}
                    >
                      Assign Responder
                    </button>
                  )}
                  {incident.status !== 'resolved' && incident.status !== 'closed' && (
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => void handleResolve(incident.id)}
                    >
                      Resolve
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
};
