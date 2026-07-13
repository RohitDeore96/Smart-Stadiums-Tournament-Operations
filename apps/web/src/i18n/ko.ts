/**
 * @file apps/web/src/i18n/ko.ts
 * @description KO translations.
 */

import type { Translations } from './types.js';
import en from './en.js';

const ko: Translations = {
  ...en,
  'app.tagline': 'FIFA 월드컵 2026 자원봉사자 코파일럿',
  'nav.dashboard': '대시보드',
  'nav.chat': '어시스턴트',
  'nav.incidents': '사건',
  'nav.language': '언어',
  'nav.skipToMain': '주요 내용으로 건너뛰기',
  'dashboard.title': '운영 대시보드',
  'chat.placeholder': '시설, 군중, 번역에 대해 질문...',
  'chat.send': '전송',
  'chat.thinking': '생각 중...',
  'common.loading': '로딩 중...',
};

export default ko;
