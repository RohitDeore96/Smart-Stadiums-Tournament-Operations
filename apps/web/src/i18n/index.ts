/**
 * @file apps/web/src/i18n/index.ts
 * @description Barrel export for the i18n system.
 */

import type { Translations, TranslationKey } from './types.js';
import en from './en.js';
import es from './es.js';
import fr from './fr.js';
import ar from './ar.js';
import de from './de.js';
import pt from './pt.js';
import ja from './ja.js';
import ko from './ko.js';
import zh from './zh.js';

export type { TranslationKey, Translations };

export const translations: Record<string, Translations> = {
  en,
  es,
  fr,
  ar,
  de,
  pt,
  ja,
  ko,
  zh,
};

export const SUPPORTED_LOCALES: { code: string; name: string; nativeName: string; rtl: boolean }[] =
  [
    { code: 'en', name: 'English', nativeName: 'English', rtl: false },
    { code: 'es', name: 'Spanish', nativeName: 'Español', rtl: false },
    { code: 'fr', name: 'French', nativeName: 'Français', rtl: false },
    { code: 'ar', name: 'Arabic', nativeName: 'العربية', rtl: true },
    { code: 'de', name: 'German', nativeName: 'Deutsch', rtl: false },
    { code: 'pt', name: 'Portuguese', nativeName: 'Português', rtl: false },
    { code: 'ja', name: 'Japanese', nativeName: '日本語', rtl: false },
    { code: 'ko', name: 'Korean', nativeName: '한국어', rtl: false },
    { code: 'zh', name: 'Chinese', nativeName: '中文', rtl: false },
  ];
