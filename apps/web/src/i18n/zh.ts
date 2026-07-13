/**
 * @file apps/web/src/i18n/zh.ts
 * @description ZH translations.
 */

import type { Translations } from './types.js';
import en from './en.js';

const zh: Translations = {
  ...en,
  'app.tagline': '2026 FIFA世界杯志愿者助手',
  'nav.dashboard': '仪表板',
  'nav.chat': '助手',
  'nav.incidents': '事件',
  'nav.language': '语言',
  'nav.skipToMain': '跳到主要内容',
  'dashboard.title': '运营仪表板',
  'chat.placeholder': '询问设施、人群、翻译...',
  'chat.send': '发送',
  'chat.thinking': '思考中...',
  'common.loading': '加载中...',
};

export default zh;
