/**
 * @file apps/web/tests/App.test.tsx
 * @description Phase 3 smoke tests — verifies the app renders with router.
 *   App already wraps itself in HashRouter + I18nProvider, so we render it directly.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { render, screen } from '@testing-library/react';
import { App } from '../src/App';

beforeAll(() => {
  // jsdom doesn't have matchMedia by default
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
});

describe('App', () => {
  it('renders the header with app title', () => {
    render(<App />);
    const headings = screen.getAllByRole('heading', { level: 1 });
    expect(headings.length).toBeGreaterThan(0);
  });

  it('renders a skip link', () => {
    render(<App />);
    const skipLink = screen.getByRole('link', { name: /skip to main content/i });
    expect(skipLink).toBeInTheDocument();
  });

  it('renders navigation links', () => {
    render(<App />);
    // Dashboard, Assistant (chat), Incidents
    const links = screen.getAllByRole('link');
    expect(links.length).toBeGreaterThanOrEqual(4); // skip + 3 nav + view all
  });

  it('uses semantic landmarks', () => {
    render(<App />);
    // header, nav, main, footer tags exist (roles may not be implicit in jsdom)
    expect(document.querySelector('header')).toBeInTheDocument();
    expect(document.querySelector('nav')).toBeInTheDocument();
    expect(document.querySelector('main')).toBeInTheDocument();
    expect(document.querySelector('footer')).toBeInTheDocument();
  });
});
