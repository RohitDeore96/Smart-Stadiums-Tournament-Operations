/**
 * @file apps/web/src/context/I18nContext.tsx
 * @description React context for locale management.
 *   Persists choice in localStorage, sets document.lang + dir attributes.
 */

import { createContext, useContext, useEffect, useState, type ReactNode, type FC } from 'react';
import type { Locale } from '@stadiumops/shared';
import { translations, SUPPORTED_LOCALES, type TranslationKey } from '../i18n/index.js';

interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: TranslationKey) => string;
  isRTL: boolean;
  supportedLocales: typeof SUPPORTED_LOCALES;
}

const I18nContext = createContext<I18nContextValue | null>(null);

const STORAGE_KEY = 'stadiumops-locale';

function detectInitialLocale(): Locale {
  if (typeof window === 'undefined') return 'en';

  // 1. Check localStorage
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored && isValidLocale(stored)) return stored;

  // 2. Check browser language
  const browserLang = navigator.language.slice(0, 2);
  if (isValidLocale(browserLang)) return browserLang;

  return 'en';
}

function isValidLocale(value: string): value is Locale {
  return ['en', 'es', 'fr', 'ar', 'de', 'pt', 'ja', 'ko', 'zh'].includes(value);
}

interface I18nProviderProps {
  children: ReactNode;
}

export const I18nProvider: FC<I18nProviderProps> = ({ children }) => {
  const [locale, setLocaleState] = useState<Locale>(detectInitialLocale);

  const setLocale = (newLocale: Locale): void => {
    setLocaleState(newLocale);
    localStorage.setItem(STORAGE_KEY, newLocale);
  };

  // Update document attributes when locale changes + announce to screen readers
  useEffect(() => {
    document.documentElement.lang = locale;
    const isRTL = locale === 'ar';
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';

    // Announce language change to screen readers
    const announcement = document.getElementById('language-announcement');
    if (announcement) {
      const localeName = SUPPORTED_LOCALES.find((l) => l.code === locale)?.nativeName ?? locale;
      announcement.textContent = `Language changed to ${localeName}`;
    }
  }, [locale]);

  const t = (key: TranslationKey): string => {
    const localeTranslations = translations[locale];
    const enTranslations = translations.en;
    return localeTranslations?.[key] ?? enTranslations?.[key] ?? key;
  };

  const isRTL = locale === 'ar';

  const value: I18nContextValue = {
    locale,
    setLocale,
    t,
    isRTL,
    supportedLocales: SUPPORTED_LOCALES,
  };

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};

/**
 * Hook to access i18n context.
 * Throws if used outside of I18nProvider.
 */
export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return ctx;
}
