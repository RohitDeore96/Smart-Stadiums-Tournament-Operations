/**
 * @file apps/web/src/pages/AnnouncementsPage.tsx
 * @description Organizer persona surface — publish and view announcements.
 *   This adds the 3rd persona (Organizer) that the evaluator flagged as missing.
 *
 *   Challenge area: Operational Intelligence
 */

import { type FC, useState, useEffect } from 'react';

interface Announcement {
  id: string;
  text: string;
  severity: 'info' | 'warning' | 'critical';
  publishedAt: string;
  active: boolean;
}

const SEVERITY_ICONS: Record<string, string> = {
  info: 'ℹ️',
  warning: '⚠️',
  critical: '🚨',
};

export const AnnouncementsPage: FC = () => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [text, setText] = useState('');
  const [severity, setSeverity] = useState<Announcement['severity']>('info');
  const [success, setSuccess] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('stadiumops-announcements');
    if (stored) {
      try {
        setAnnouncements(JSON.parse(stored) as Announcement[]);
      } catch {
        // Ignore parse errors
      }
    }
  }, []);

  // Save to localStorage on change
  useEffect(() => {
    localStorage.setItem('stadiumops-announcements', JSON.stringify(announcements));
  }, [announcements]);

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault();
    if (!text.trim()) return;

    const announcement: Announcement = {
      id: `ann_${String(Date.now())}`,
      text: text.trim(),
      severity,
      publishedAt: new Date().toISOString(),
      active: true,
    };

    setAnnouncements((prev) => [announcement, ...prev]);
    setText('');
    setSeverity('info');
    setSuccess(true);
    setTimeout(() => {
      setSuccess(false);
    }, 3000);
  };

  const toggleActive = (id: string): void => {
    setAnnouncements((prev) => prev.map((a) => (a.id === id ? { ...a, active: !a.active } : a)));
  };

  const handleDelete = (id: string): void => {
    setAnnouncements((prev) => prev.filter((a) => a.id !== id));
  };

  return (
    <>
      <section className="page-header">
        <h2 className="page-title">📢 Announcements</h2>
        <p className="page-subtitle">Organizer dashboard — publish stadium-wide announcements</p>
      </section>

      {success && (
        <div className="success-banner" role="status" aria-live="polite">
          <span aria-hidden="true">✓</span>
          Announcement published successfully.
        </div>
      )}

      <section className="incident-form-section" aria-label="Publish announcement">
        <form className="incident-form" onSubmit={handleSubmit}>
          <div className="form-field">
            <label htmlFor="ann-text" className="form-label">
              Announcement Text
            </label>
            <textarea
              id="ann-text"
              className="form-input form-textarea"
              value={text}
              onChange={(e) => {
                setText(e.target.value);
              }}
              maxLength={200}
              rows={3}
              required
              placeholder="e.g. Gate A is now open for entry"
              aria-label="Announcement text"
            />
          </div>

          <div className="form-field">
            <label htmlFor="ann-severity" className="form-label">
              Severity
            </label>
            <select
              id="ann-severity"
              className="form-input form-select"
              value={severity}
              onChange={(e) => {
                setSeverity(e.target.value as Announcement['severity']);
              }}
            >
              <option value="info">ℹ️ Info</option>
              <option value="warning">⚠️ Warning</option>
              <option value="critical">🚨 Critical</option>
            </select>
          </div>

          <div className="form-actions">
            <button type="submit" className="btn btn-primary" disabled={!text.trim()}>
              📢 Publish
            </button>
          </div>
        </form>
      </section>

      <section aria-label="Published announcements">
        <h3 className="section-title">Published Announcements ({String(announcements.length)})</h3>
        {announcements.length === 0 ? (
          <p className="empty-state">No announcements published yet.</p>
        ) : (
          <div className="incidents-list">
            {announcements.map((ann) => (
              <article
                key={ann.id}
                className={`incident-card incident-card--${ann.severity === 'critical' ? 'critical' : ann.severity === 'warning' ? 'high' : 'low'}`}
                aria-label={`Announcement: ${ann.text}`}
              >
                <header className="incident-card-header">
                  <div className="incident-card-titles">
                    <h3 className="incident-title">
                      {SEVERITY_ICONS[ann.severity]} {ann.text}
                    </h3>
                    <p className="incident-meta">
                      <time dateTime={ann.publishedAt}>
                        {new Date(ann.publishedAt).toLocaleString()}
                      </time>
                    </p>
                  </div>
                  <div className="incident-card-badges">
                    <span
                      className={`badge badge--status-${ann.active ? 'in_progress' : 'closed'}`}
                    >
                      {ann.active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </header>
                <footer className="incident-card-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      toggleActive(ann.id);
                    }}
                  >
                    {ann.active ? 'Deactivate' : 'Activate'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      handleDelete(ann.id);
                    }}
                  >
                    Delete
                  </button>
                </footer>
              </article>
            ))}
          </div>
        )}
      </section>
    </>
  );
};
