/**
 * @file apps/web/src/i18n/pt.ts
 * @description PT translations.
 */

import type { Translations } from './types.js';
import en from './en.js';

const pt: Translations = {
  ...en,
  'app.tagline': 'Copiloto de Voluntários para a Copa do Mundo FIFA 2026',
  'nav.dashboard': 'Painel',
  'nav.chat': 'Assistente',
  'nav.incidents': 'Incidentes',
  'nav.language': 'Idioma',
  'nav.skipToMain': 'Pular para o conteúdo principal',
  'dashboard.title': 'Painel de Operações',
  'chat.placeholder': 'Pergunte sobre instalações, multidões, traduções...',
  'chat.send': 'Enviar',
  'chat.thinking': 'Pensando...',
  'common.loading': 'Carregando...',
  'common.retry': 'Tentar novamente',
};

export default pt;
