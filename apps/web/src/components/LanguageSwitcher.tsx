/**
 * @file apps/web/src/components/LanguageSwitcher.tsx
 * @description Dropdown for switching the UI locale.
 *   Accessible: label, keyboard operable, aria-expanded.
 */

import { type FC, useState, useRef, useEffect } from 'react';
import { useI18n } from '../context/I18nContext.js';
import type { Locale } from '@stadiumops/shared';

export const LanguageSwitcher: FC = () => {
  const { locale, setLocale, supportedLocales, t } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const currentLocale = supportedLocales.find((l) => l.code === locale);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent): void => {
      if (
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node) &&
        listRef.current &&
        !listRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === 'Escape') {
      setIsOpen(false);
      buttonRef.current?.focus();
    }
    if (e.key === 'ArrowDown' && !isOpen) {
      e.preventDefault();
      setIsOpen(true);
    }
  };

  const handleSelect = (code: Locale): void => {
    setLocale(code);
    setIsOpen(false);
    buttonRef.current?.focus();
  };

  return (
    <div className="lang-switcher">
      <button
        ref={buttonRef}
        type="button"
        className="lang-button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={t('nav.language')}
        onClick={() => {
          setIsOpen(!isOpen);
        }}
        onKeyDown={handleKeyDown}
      >
        <span aria-hidden="true">🌐</span>
        <span className="lang-current">{currentLocale?.nativeName ?? 'English'}</span>
        <span className="lang-arrow" aria-hidden="true">
          {isOpen ? '▲' : '▼'}
        </span>
      </button>
      {isOpen && (
        <ul ref={listRef} className="lang-list" role="listbox" aria-label={t('nav.language')}>
          {supportedLocales.map((l) => (
            <li key={l.code} role="option" aria-selected={l.code === locale}>
              <button
                type="button"
                className={`lang-option ${l.code === locale ? 'lang-option--selected' : ''}`}
                onClick={() => {
                  handleSelect(l.code as Locale);
                }}
              >
                <span className="lang-option-native">{l.nativeName}</span>
                <span className="lang-option-name">{l.name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
