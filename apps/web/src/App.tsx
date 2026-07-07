/**
 * @file apps/web/src/App.tsx
 * @description Phase 1 placeholder app. Proves the Vite + React + TS pipeline
 *   works end-to-end. Phase 3 replaces this with the real router + providers.
 *
 *   Accessibility notes (already enforced):
 *   - <main> landmark wraps page content
 *   - <h1> is the page heading, exactly one per view
 *   - All decorative SVGs are aria-hidden
 *   - Skip link is the first focusable element
 */

import { useEffect, useState } from 'react';

interface HealthResponse {
  data: {
    status: string;
    service: string;
    version: string;
    time: string;
  };
}

export function App(): JSX.Element {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/v1/health')
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<HealthResponse>;
      })
      .then(setHealth)
      .catch((e: Error) => setError(e.message));
  }, []);

  return (
    <>
      <a href="#main" className="skip-link">
        Skip to main content
      </a>
      <main id="main" aria-labelledby="page-title">
        <header className="hero">
          <h1 id="page-title">StadiumOps AI</h1>
          <p className="tagline">
            GenAI-enabled stadium operations &amp; fan experience for FIFA World Cup 2026
          </p>
        </header>

        <section className="status-card" aria-labelledby="status-heading">
          <h2 id="status-heading">Backend status</h2>
          {error && (
            <p role="alert" className="status-error">
              Cannot reach API: {error}
            </p>
          )}
          {!error && !health && <p aria-live="polite">Checking…</p>}
          {health && (
            <dl className="status-grid">
              <dt>Status</dt>
              <dd>{health.data.status}</dd>
              <dt>Service</dt>
              <dd>{health.data.service}</dd>
              <dt>Version</dt>
              <dd>{health.data.version}</dd>
              <dt>Time</dt>
              <dd>
                <time dateTime={health.data.time}>
                  {new Date(health.data.time).toLocaleString()}
                </time>
              </dd>
            </dl>
          )}
        </section>

        <section className="phase-info" aria-labelledby="phase-heading">
          <h2 id="phase-heading">Phase 1 — Architecture complete</h2>
          <ul>
            <li>Monorepo structure (pnpm workspaces)</li>
            <li>Shared types &amp; Zod schemas (DRY keystone)</li>
            <li>Firestore data models + API contracts</li>
            <li>Optimized distroless Dockerfile for Cloud Run</li>
            <li>GitHub Actions CI + deploy pipelines</li>
            <li>Strict Firestore security rules</li>
          </ul>
          <p className="next-phase">
            Phase 2 will deliver the full backend with Gemini integration &amp; tests.
          </p>
        </section>
      </main>
    </>
  );
}
