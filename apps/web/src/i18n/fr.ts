/**
 * @file apps/web/src/i18n/fr.ts
 * @description FR translations.
 */

import type { Translations } from './types.js';
import en from './en.js';

const fr: Translations = {
  ...en,
  'app.tagline': 'Copilote Bénévole pour la Coupe du Monde FIFA 2026',
  'nav.dashboard': 'Tableau de bord',
  'nav.chat': 'Assistant',
  'nav.incidents': 'Incidents',
  'nav.announcements': 'Announcements',
  'nav.language': 'Langue',
  'nav.skipToMain': 'Aller au contenu principal',
  'dashboard.title': 'Tableau de bord des opérations',
  'dashboard.subtitle': 'Statut de foule en direct et incidents actifs',
  'chat.title': 'Assistant IA',
  'chat.placeholder': 'Demandez about installations, foules, traductions...',
  'chat.send': 'Envoyer',
  'chat.thinking': 'Réflexion...',
  'common.loading': 'Chargement...',
  'common.retry': 'Réessayer',
};

export default fr;
