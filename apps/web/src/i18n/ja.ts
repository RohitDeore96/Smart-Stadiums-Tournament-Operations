/**
 * @file apps/web/src/i18n/ja.ts
 * @description JA translations.
 */

import type { Translations } from './types.js';
import en from './en.js';

const ja: Translations = {
  ...en,
  'app.tagline': 'FIFAワールドカップ2026ボランティアコパイロット',
  'nav.dashboard': 'ダッシュボード',
  'nav.chat': 'アシスタント',
  'nav.incidents': 'インシデント',
  'nav.language': '言語',
  'nav.skipToMain': 'メインコンテンツへスキップ',
  'dashboard.title': '運営ダッシュボード',
  'chat.placeholder': '設備、群衆、翻訳について質問...',
  'chat.send': '送信',
  'chat.thinking': '考え中...',
  'common.loading': '読み込み中...',
};

export default ja;
