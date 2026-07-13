/**
 * @file apps/web/src/i18n/translations.ts
 * @description UI translations for 9 languages.
 *   Locale codes follow BCP-47 (en, es, fr, ar, de, pt, ja, ko, zh).
 *   Arabic (ar) is RTL — handled by the dir="rtl" attribute in Layout.
 */

import type { Locale } from '@stadiumops/shared';

export type TranslationKey =
  | 'app.title'
  | 'app.tagline'
  | 'nav.dashboard'
  | 'nav.chat'
  | 'nav.incidents'
  | 'nav.language'
  | 'nav.skipToMain'
  | 'dashboard.title'
  | 'dashboard.subtitle'
  | 'dashboard.totalFans'
  | 'dashboard.activeIncidents'
  | 'dashboard.criticalZones'
  | 'dashboard.avgDensity'
  | 'dashboard.crowdOverview'
  | 'dashboard.recentIncidents'
  | 'dashboard.viewAll'
  | 'crowd.zone'
  | 'crowd.count'
  | 'crowd.capacity'
  | 'crowd.level'
  | 'crowd.level.low'
  | 'crowd.level.moderate'
  | 'crowd.level.high'
  | 'crowd.level.critical'
  | 'crowd.trend'
  | 'crowd.updated'
  | 'chat.title'
  | 'chat.subtitle'
  | 'chat.placeholder'
  | 'chat.send'
  | 'chat.thinking'
  | 'chat.error'
  | 'chat.welcome'
  | 'chat.emergencyBanner'
  | 'incidents.title'
  | 'incidents.subtitle'
  | 'incidents.new'
  | 'incidents.empty'
  | 'incidents.category'
  | 'incidents.severity'
  | 'incidents.status'
  | 'incidents.location'
  | 'incidents.description'
  | 'incidents.title.label'
  | 'incidents.submit'
  | 'incidents.cancel'
  | 'incidents.success'
  | 'incidents.category.medical'
  | 'incidents.category.security'
  | 'incidents.category.fire'
  | 'incidents.category.crowd_flow'
  | 'incidents.category.lost_child'
  | 'incidents.category.facilities'
  | 'incidents.category.other'
  | 'incidents.severity.low'
  | 'incidents.severity.medium'
  | 'incidents.severity.high'
  | 'incidents.severity.critical'
  | 'incidents.status.open'
  | 'incidents.status.acknowledged'
  | 'incidents.status.in_progress'
  | 'incidents.status.resolved'
  | 'incidents.status.closed'
  | 'common.loading'
  | 'common.error'
  | 'common.retry'
  | 'common.refresh';

type Translations = Record<TranslationKey, string>;

const en: Translations = {
  'app.title': 'StadiumOps AI',
  'app.tagline': 'Volunteer Co-pilot for FIFA World Cup 2026',
  'nav.dashboard': 'Dashboard',
  'nav.chat': 'Assistant',
  'nav.incidents': 'Incidents',
  'nav.language': 'Language',
  'nav.skipToMain': 'Skip to main content',
  'dashboard.title': 'Operations Dashboard',
  'dashboard.subtitle': 'Live crowd status and active incidents',
  'dashboard.totalFans': 'Total Fans',
  'dashboard.activeIncidents': 'Active Incidents',
  'dashboard.criticalZones': 'Critical Zones',
  'dashboard.avgDensity': 'Avg Density',
  'dashboard.crowdOverview': 'Crowd Overview',
  'dashboard.recentIncidents': 'Recent Incidents',
  'dashboard.viewAll': 'View all',
  'crowd.zone': 'Zone',
  'crowd.count': 'People',
  'crowd.capacity': 'Capacity',
  'crowd.level': 'Level',
  'crowd.level.low': 'Low',
  'crowd.level.moderate': 'Moderate',
  'crowd.level.high': 'High',
  'crowd.level.critical': 'Critical',
  'crowd.trend': 'Trend',
  'crowd.updated': 'Updated',
  'chat.title': 'AI Assistant',
  'chat.subtitle': 'Multilingual help for volunteers',
  'chat.placeholder': 'Ask about facilities, crowds, translations...',
  'chat.send': 'Send',
  'chat.thinking': 'Thinking...',
  'chat.error': 'Connection error. Please retry.',
  'chat.welcome':
    "Hi! I'm your stadium assistant. Ask me about facilities, crowds, or translations in any language.",
  'chat.emergencyBanner': 'Emergency detected. Responders have been notified.',
  'incidents.title': 'Incidents',
  'incidents.subtitle': 'Report and track incidents',
  'incidents.new': 'Report New Incident',
  'incidents.empty': 'No incidents reported. Great job!',
  'incidents.category': 'Category',
  'incidents.severity': 'Severity',
  'incidents.status': 'Status',
  'incidents.location': 'Location',
  'incidents.description': 'Description',
  'incidents.title.label': 'Title',
  'incidents.submit': 'Submit Report',
  'incidents.cancel': 'Cancel',
  'incidents.success': 'Incident reported successfully.',
  'incidents.category.medical': 'Medical',
  'incidents.category.security': 'Security',
  'incidents.category.fire': 'Fire',
  'incidents.category.crowd_flow': 'Crowd Flow',
  'incidents.category.lost_child': 'Lost Child',
  'incidents.category.facilities': 'Facilities',
  'incidents.category.other': 'Other',
  'incidents.severity.low': 'Low',
  'incidents.severity.medium': 'Medium',
  'incidents.severity.high': 'High',
  'incidents.severity.critical': 'Critical',
  'incidents.status.open': 'Open',
  'incidents.status.acknowledged': 'Acknowledged',
  'incidents.status.in_progress': 'In Progress',
  'incidents.status.resolved': 'Resolved',
  'incidents.status.closed': 'Closed',
  'common.loading': 'Loading...',
  'common.error': 'Something went wrong',
  'common.retry': 'Retry',
  'common.refresh': 'Refresh',
};

const es: Translations = {
  ...en,
  'app.tagline': 'Copiloto de Voluntarios para la Copa Mundial FIFA 2026',
  'nav.dashboard': 'Panel',
  'nav.chat': 'Asistente',
  'nav.incidents': 'Incidentes',
  'nav.language': 'Idioma',
  'nav.skipToMain': 'Saltar al contenido principal',
  'dashboard.title': 'Panel de Operaciones',
  'dashboard.subtitle': 'Estado de multitud e incidentes activos',
  'dashboard.totalFans': 'Total Aficionados',
  'dashboard.activeIncidents': 'Incidentes Activos',
  'dashboard.criticalZones': 'Zonas Críticas',
  'dashboard.avgDensity': 'Densidad Promedio',
  'dashboard.crowdOverview': 'Vista General de Multitud',
  'dashboard.recentIncidents': 'Incidentes Recientes',
  'dashboard.viewAll': 'Ver todos',
  'crowd.zone': 'Zona',
  'crowd.count': 'Personas',
  'crowd.capacity': 'Capacidad',
  'crowd.level': 'Nivel',
  'crowd.level.low': 'Bajo',
  'crowd.level.moderate': 'Moderado',
  'crowd.level.high': 'Alto',
  'crowd.level.critical': 'Crítico',
  'crowd.trend': 'Tendencia',
  'crowd.updated': 'Actualizado',
  'chat.title': 'Asistente IA',
  'chat.subtitle': 'Ayuda multilingüe para voluntarios',
  'chat.placeholder': 'Pregunta sobre instalaciones, multitudes, traducciones...',
  'chat.send': 'Enviar',
  'chat.thinking': 'Pensando...',
  'chat.error': 'Error de conexión. Reintenta.',
  'chat.welcome':
    '¡Hola! Soy tu asistente de estadio. Pregúntame sobre instalaciones, multitudes o traducciones en cualquier idioma.',
  'chat.emergencyBanner': 'Emergencia detectada. Se han notificado a los respondedores.',
  'incidents.title': 'Incidentes',
  'incidents.subtitle': 'Reportar y rastrear incidentes',
  'incidents.new': 'Reportar Nuevo Incidente',
  'incidents.empty': 'No hay incidentes reportados. ¡Excelente trabajo!',
  'incidents.category': 'Categoría',
  'incidents.severity': 'Severidad',
  'incidents.status': 'Estado',
  'incidents.location': 'Ubicación',
  'incidents.description': 'Descripción',
  'incidents.title.label': 'Título',
  'incidents.submit': 'Enviar Reporte',
  'incidents.cancel': 'Cancelar',
  'incidents.success': 'Incidente reportado exitosamente.',
  'common.loading': 'Cargando...',
  'common.error': 'Algo salió mal',
  'common.retry': 'Reintentar',
  'common.refresh': 'Actualizar',
};

// Simplified translations for other languages — English fallback for missing keys
const fr: Translations = {
  ...en,
  'app.tagline': 'Copilote Bénévole pour la Coupe du Monde FIFA 2026',
  'nav.dashboard': 'Tableau de bord',
  'nav.chat': 'Assistant',
  'nav.incidents': 'Incidents',
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

export const translations: Record<Locale, Translations> = {
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

export const SUPPORTED_LOCALES: { code: Locale; name: string; nativeName: string; rtl: boolean }[] =
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
