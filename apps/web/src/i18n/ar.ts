/**
 * @file apps/web/src/i18n/ar.ts
 * @description AR translations.
 */

import type { Translations } from './types.js';
import en from './en.js';

const ar: Translations = {
  ...en,
  'app.tagline': 'مساعد المتطوعين لكأس العالم FIFA 2026',
  'nav.dashboard': 'لوحة التحكم',
  'nav.chat': 'المساعد',
  'nav.incidents': 'الحوادث',
  'nav.language': 'اللغة',
  'nav.skipToMain': 'تخطي إلى المحتوى الرئيسي',
  'dashboard.title': 'لوحة عمليات',
  'dashboard.subtitle': 'حالة الحشود المباشرة والحوداث النشطة',
  'dashboard.totalFans': 'إجمالي المشجعين',
  'dashboard.activeIncidents': 'الحوداث النشطة',
  'dashboard.criticalZones': 'المناطق الحرجة',
  'dashboard.avgDensity': 'متوسط الكثافة',
  'dashboard.crowdOverview': 'نظرة عامة على الحشود',
  'dashboard.recentIncidents': 'الحوداث الأخيرة',
  'dashboard.viewAll': 'عرض الكل',
  'crowd.zone': 'المنطقة',
  'crowd.count': 'الأشخاص',
  'crowd.capacity': 'السعة',
  'crowd.level': 'المستوى',
  'crowd.level.low': 'منخفض',
  'crowd.level.moderate': 'معتدل',
  'crowd.level.high': 'عالي',
  'crowd.level.critical': 'حرج',
  'crowd.trend': 'الاتجاه',
  'crowd.updated': 'تم التحديث',
  'chat.title': 'المساعد الذكي',
  'chat.subtitle': 'مساعدة متعددة اللغات للمتطوعين',
  'chat.placeholder': 'اسأل عن المرافق، الحشود، الترجمات...',
  'chat.send': 'إرسال',
  'chat.thinking': 'يفكر...',
  'chat.error': 'خطأ في الاتصال. حاول مرة أخرى.',
  'chat.welcome': 'مرحبا! أنا مساعدك في الملعب. اسألني عن المرافق أو الحشود أو الترجمات بأي لغة.',
  'chat.emergencyBanner': 'تم اكتشاف طارئ. تم إخطار فرق الاستجابة.',
  'incidents.title': 'الحوداث',
  'incidents.subtitle': 'الإبلاغ عن الحوداث وتتبعها',
  'incidents.new': 'الإبلاغ عن حادث جديد',
  'incidents.empty': 'لا توجد حوداث مبلغ عنها. عمل رائع!',
  'incidents.category': 'الفئة',
  'incidents.severity': 'الخطورة',
  'incidents.status': 'الحالة',
  'incidents.location': 'الموقع',
  'incidents.description': 'الوصف',
  'incidents.title.label': 'العنوان',
  'incidents.submit': 'إرسال البلاغ',
  'incidents.cancel': 'إلغاء',
  'incidents.success': 'تم الإبلاغ عن الحادث بنجاح.',
  'common.loading': 'جاري التحميل...',
  'common.error': 'حدث خطأ ما',
  'common.retry': 'إعادة المحاولة',
  'common.refresh': 'تحديث',
};

export default ar;
