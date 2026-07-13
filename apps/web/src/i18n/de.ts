/**
 * @file apps/web/src/i18n/de.ts
 * @description DE translations.
 */

import type { Translations } from './types.js';
import en from './en.js';

const de: Translations = {
  ...en,
  'app.tagline': 'Freiwilligen-Copilot für die FIFA WM 2026',
  'nav.dashboard': 'Übersicht',
  'nav.chat': 'Assistent',
  'nav.incidents': 'Vorfälle',
  'nav.language': 'Sprache',
  'nav.skipToMain': 'Zum Hauptinhalt springen',
  'dashboard.title': 'Einsichtsübersicht',
  'chat.placeholder': 'Fragen Sie nach Einrichtungen, Menschenmengen, Übersetzungen...',
  'chat.send': 'Senden',
  'chat.thinking': 'Denke nach...',
  'common.loading': 'Laden...',
  'common.retry': 'Wiederholen',
};

export default de;
