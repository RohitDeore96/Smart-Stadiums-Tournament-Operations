/**
 * @file apps/web/src/pages/IncidentsPage.tsx
 * @description Incidents page — list + report form toggle.
 *   Shows QR code on successful incident creation.
 */

import { type FC, useState } from 'react';
import type { IncidentCreateInput } from '@stadiumops/shared';
import { useI18n } from '../context/I18nContext.js';
import { useIncidents } from '../hooks/useIncidents.js';
import { IncidentCard } from '../components/IncidentCard.js';
import { IncidentForm } from '../components/IncidentForm.js';
import { QRCodeDisplay } from '../components/QRCodeDisplay.js';

export const IncidentsPage: FC = () => {
  const { t } = useI18n();
  const { incidents, isLoading, error, create, refresh } = useIncidents();
  const [showForm, setShowForm] = useState(false);
  const [successMessage, setSuccessMessage] = useState(false);
  const [createdIncidentId, setCreatedIncidentId] = useState<string | null>(null);

  const handleSubmit = async (input: IncidentCreateInput): Promise<void> => {
    const incident = await create(input);
    setShowForm(false);
    setSuccessMessage(true);
    setCreatedIncidentId(incident.id);
    setTimeout(() => {
      setSuccessMessage(false);
      setCreatedIncidentId(null);
    }, 15000);
  };

  return (
    <>
      <section className="page-header">
        <div className="page-header-row">
          <div>
            <h2 className="page-title">{t('incidents.title')}</h2>
            <p className="page-subtitle">{t('incidents.subtitle')}</p>
          </div>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              setShowForm(!showForm);
            }}
            aria-expanded={showForm}
            aria-controls="incident-form-section"
          >
            <span aria-hidden="true">+</span>
            {t('incidents.new')}
          </button>
        </div>
      </section>

      {successMessage && (
        <div className="success-banner" role="status" aria-live="polite">
          <span aria-hidden="true">✓</span>
          {t('incidents.success')}
        </div>
      )}

      {/* QR code for the most recently created incident */}
      {successMessage && createdIncidentId && (
        <div className="incident-qr-section">
          <QRCodeDisplay
            value={`https://smart-stadiums-tournament-operation-nine.vercel.app/#/incidents?id=${createdIncidentId}`}
            size={180}
            label="Scan to view this incident"
          />
        </div>
      )}

      {showForm && (
        <section
          id="incident-form-section"
          className="incident-form-section"
          aria-label={t('incidents.new')}
        >
          <IncidentForm
            onSubmit={handleSubmit}
            onCancel={() => {
              setShowForm(false);
            }}
          />
        </section>
      )}

      {error && (
        <div className="error-banner" role="alert">
          <span aria-hidden="true">⚠️</span>
          <span>{error}</span>
          <button type="button" className="btn btn-secondary" onClick={() => void refresh()}>
            {t('common.retry')}
          </button>
        </div>
      )}

      <section className="incidents-list-section" aria-label="Incident list">
        {isLoading ? (
          <p className="loading-state" aria-live="polite">
            {t('common.loading')}
          </p>
        ) : incidents.length === 0 ? (
          <p className="empty-state">{t('incidents.empty')}</p>
        ) : (
          <div className="incidents-list">
            {incidents.map((incident) => (
              <IncidentCard key={incident.id} incident={incident} />
            ))}
          </div>
        )}
      </section>
    </>
  );
};
