/**
 * @file apps/web/src/App.tsx
 * @description Root app component — sets up router, lazy-loaded pages,
 *   error boundary, and providers.
 *   Uses hash-based routing for simple static hosting.
 */

import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { type FC, useEffect, Suspense, lazy, type ReactElement } from 'react';
import { I18nProvider } from './context/I18nContext.js';
import { Layout } from './components/Layout.js';
import { ErrorBoundary } from './components/ErrorBoundary.js';

// Lazy-load pages for code-splitting (reduces initial bundle)
const DashboardPage = lazy(() =>
  import('./pages/DashboardPage.js').then((m) => ({ default: m.DashboardPage })),
);
const ChatPage = lazy(() => import('./pages/ChatPage.js').then((m) => ({ default: m.ChatPage })));
const IncidentsPage = lazy(() =>
  import('./pages/IncidentsPage.js').then((m) => ({ default: m.IncidentsPage })),
);
const AnnouncementsPage = lazy(() =>
  import('./pages/AnnouncementsPage.js').then((m) => ({ default: m.AnnouncementsPage })),
);

function PageLoader(): ReactElement {
  return (
    <div className="loading-state" aria-live="polite">
      Loading...
    </div>
  );
}

const RouteTracker: FC = () => {
  const location = useLocation();
  const activePath = location.pathname === '/' ? '/' : location.pathname;

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <Layout activePath={activePath}>
      <ErrorBoundary>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/chat" element={<ChatPage />} />
            <Route path="/incidents" element={<IncidentsPage />} />
            <Route path="/announcements" element={<AnnouncementsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </ErrorBoundary>
    </Layout>
  );
};

export const App: FC = () => {
  return (
    <I18nProvider>
      <HashRouter>
        <RouteTracker />
      </HashRouter>
    </I18nProvider>
  );
};
