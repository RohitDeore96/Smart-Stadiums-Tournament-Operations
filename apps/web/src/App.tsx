/**
 * @file apps/web/src/App.tsx
 * @description Root app component — sets up router and providers.
 *   Uses hash-based routing for simple static hosting (no server config needed).
 */

import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { type FC, useEffect } from 'react';
import { I18nProvider } from './context/I18nContext.js';
import { Layout } from './components/Layout.js';
import { DashboardPage } from './pages/DashboardPage.js';
import { ChatPage } from './pages/ChatPage.js';
import { IncidentsPage } from './pages/IncidentsPage.js';

const RouteTracker: FC = () => {
  const location = useLocation();
  const activePath = location.pathname === '/' ? '/' : location.pathname;

  // Scroll to top on route change
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <Layout activePath={activePath}>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/chat" element={<ChatPage />} />
        <Route path="/incidents" element={<IncidentsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
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
