/**
 * @file apps/web/src/components/Navigation.tsx
 * @description Primary navigation — Dashboard, Assistant, Incidents.
 *   Accessible: aria-current on active link, keyboard navigable.
 */

import { type FC } from 'react';
import { useI18n } from '../context/I18nContext.js';

interface NavigationProps {
  activePath: string;
}

interface NavItem {
  path: string;
  labelKey: 'nav.dashboard' | 'nav.chat' | 'nav.incidents' | 'nav.announcements';
  icon: string;
}

const NAV_ITEMS: NavItem[] = [
  { path: '/', labelKey: 'nav.dashboard', icon: '📊' },
  { path: '/chat', labelKey: 'nav.chat', icon: '💬' },
  { path: '/incidents', labelKey: 'nav.incidents', icon: '⚠️' },
  { path: '/announcements', labelKey: 'nav.announcements', icon: '📢' },
];

export const Navigation: FC<NavigationProps> = ({ activePath }) => {
  const { t } = useI18n();

  return (
    <nav className="app-nav" aria-label="Main navigation">
      <ul className="nav-list" role="list">
        {NAV_ITEMS.map((item) => {
          const isActive = activePath === item.path;
          return (
            <li key={item.path} className="nav-item">
              <a
                href={item.path}
                className={`nav-link ${isActive ? 'nav-link--active' : ''}`}
                aria-current={isActive ? 'page' : undefined}
              >
                <span className="nav-icon" aria-hidden="true">
                  {item.icon}
                </span>
                <span className="nav-label">{t(item.labelKey)}</span>
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};
