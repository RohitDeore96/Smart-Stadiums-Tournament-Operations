/**
 * @file apps/web/tests/setup.ts
 * @description Vitest setup file. Adds jest-dom matchers, auto-cleans DOM
 *   between tests, and mocks browser APIs that jsdom doesn't implement.
 */

import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// Auto-cleanup between tests — without this, render() leaks DOM across tests.
afterEach(() => {
  cleanup();
});

// jsdom doesn't implement matchMedia — required by some libraries
if (!window.matchMedia) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}

// jsdom doesn't implement ResizeObserver
if (!window.ResizeObserver) {
  window.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

// jsdom doesn't implement fetch — mock it so App.tsx's health check doesn't crash
if (!window.fetch) {
  window.fetch = (async () => {
    return new Response(JSON.stringify({ data: { status: 'ok' } }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }) as typeof window.fetch;
}

// jsdom doesn't implement scrollTo
if (!window.scrollTo) {
  window.scrollTo = () => undefined;
}

// jsdom doesn't implement scrollIntoView
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => undefined;
}
