/**
 * @file apps/web/tests/App.test.tsx
 * @description Phase 1 smoke test — verifies App renders without crashing.
 *   Real component tests arrive in Phase 3.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { App } from '../src/App';

describe('App', () => {
  it('renders the page title', () => {
    render(<App />);
    const heading = screen.getByRole('heading', { level: 1, name: /stadiumops ai/i });
    expect(heading).toBeInTheDocument();
  });

  it('renders a skip link as the first focusable element', () => {
    render(<App />);
    const skipLink = screen.getByRole('link', { name: /skip to main content/i });
    expect(skipLink).toBeInTheDocument();
  });

  it('uses semantic <main> landmark', () => {
    render(<App />);
    const main = screen.getByRole('main');
    expect(main).toBeInTheDocument();
  });
});
