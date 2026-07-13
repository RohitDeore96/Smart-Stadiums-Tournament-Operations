/**
 * @file apps/web/src/components/Header.tsx
 * @description App header with title, tagline, and language switcher.
 */

import { type FC } from 'react';
import { useI18n } from '../context/I18nContext.js';
import { LanguageSwitcher } from './LanguageSwitcher.js';

export const Header: FC = () => {
  const { t } = useI18n();

  return (
    <header className="app-header" role="banner">
      <div className="header-content">
        <div className="header-brand">
          <span className="header-logo" aria-hidden="true">
            ⚽
          </span>
          <div>
            <h1 className="header-title">{t('app.title')}</h1>
            <p className="header-tagline">{t('app.tagline')}</p>
          </div>
        </div>
        <LanguageSwitcher />
      </div>
    </header>
  );
};
