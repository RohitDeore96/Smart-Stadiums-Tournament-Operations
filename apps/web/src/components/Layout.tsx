/**
 * @file apps/web/src/components/Layout.tsx
 * @description App shell — skip link, header, nav, main, footer.
 *   WCAG 2.1 AA: semantic landmarks, skip link, focus management.
 */

import { type ReactNode, type FC } from 'react';
import { Header } from './Header.js';
import { Navigation } from './Navigation.js';

interface LayoutProps {
  children: ReactNode;
  /** Active nav item for aria-current */
  activePath: string;
}

export const Layout: FC<LayoutProps> = ({ children, activePath }) => {
  return (
    <>
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      <Header />
      <Navigation activePath={activePath} />
      <main id="main-content" tabIndex={-1} className="main-content">
        {children}
      </main>
      <footer className="app-footer" role="contentinfo">
        <p>StadiumOps AI — FIFA World Cup 2026 Volunteer Co-pilot</p>
      </footer>
    </>
  );
};
