/**
 * @file apps/web/src/main.tsx
 * @description React app entry point. Mounts <App /> into #root.
 *   Phase 3 will replace App with the real router + providers.
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import './styles/global.css';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element #root not found in index.html');
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
