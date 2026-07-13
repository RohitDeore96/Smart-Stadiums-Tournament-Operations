/**
 * @file api/_lib/fallback.ts
 * @description Graceful fallback replies when Gemini is unavailable.
 *   Intent-aware, multilingual (en/es/fr/ar).
 *   Extracted from chat.ts to keep it under 300 LOC.
 */

const FALLBACKS: Record<string, { en: string; es: string; fr: string; ar: string }> = {
  wayfinding: {
    en: "I'm having trouble connecting to the AI service right now. For wayfinding, please look for the nearest stadium volunteer in a blue vest, or follow the signs to your section. Gates are labeled A through D. You can also check the stadium map on the dashboard.",
    es: 'Tengo problemas para conectarme al servicio de IA en este momento. Para navegar, busque al voluntario más cercano con chaleco azul o siga las señales hacia su sección. Las puertas están etiquetadas de la A a la D.',
    fr: "J'ai des difficultés à me connecter au service IA. Pour vous orienter, cherchez un bénévole en gilet bleu ou suivez les panneaux vers votre section. Les portes sont marquées de A à D.",
    ar: 'أواجه صعوبة في الاتصال بخدمة الذكاء الاصطناعي حاليًا. للبحث عن الطريق، ابحث عن أقرب متطوع بسترة زرقاء أو اتبع اللافتات نحو قسمك. الأبواب مميزة من A إلى D.',
  },
  facility_info: {
    en: "I'm having trouble connecting to the AI service. Restrooms are located throughout the concourse — look for the restroom signs. First aid stations are near each gate. Food courts are on the north and south concourses.",
    es: 'Tengo problemas para conectarme. Los baños están en todo el concurrido. Las estaciones de primeros auxilios están cerca de cada puerta.',
    fr: 'Problème de connexion IA. Les toilettes sont dans tout le couloir. Les secours sont près de chaque porte.',
    ar: 'أواجه مشكلة في الاتصال. دورات المياه منتشرة في الممر. محطات الإسعاف قريبة من كل باب.',
  },
  crowd_status: {
    en: "I can't reach the AI service right now. Please check the live crowd dashboard for real-time zone density. Critical zones are highlighted in red. Avoid gates showing 'high' or 'critical' density.",
    es: "No puedo acceder al servicio de IA. Revise el panel de multitud para densidad en tiempo real. Evite puertas con densidad 'alta' o 'crítica'.",
    fr: "Service IA indisponible. Consultez le tableau de bord pour la densité en temps réel. Évitez les portes 'haute' ou 'critique'.",
    ar: "لا يمكنني الوصول إلى خدمة الذكاء الاصطناعي. تحقق من لوحة الحشود للكثافة في الوقت الفعلي. تجنب الأبواب ذات الكثافة 'عالية' أو 'حرجة'.",
  },
  incident_report: {
    en: "I can't connect to the AI service. If this is an emergency (fire, medical, security), please call stadium security immediately. For non-emergencies, you can file an incident report from the Incidents page.",
    es: 'No puedo conectar al servicio de IA. Si es una emergencia, llame a seguridad. Para no emergencias, puede reportar desde la página de Incidentes.',
    fr: "Service IA indisponible. En cas d'urgence, appelez la sécurité. Pour non-urgences, signalez depuis la page Incidents.",
    ar: 'لا يمكنني الاتصال بخدمة الذكاء الاصطناعي. في حالة الطوارئ، اتصل بالأمن. للحوادث غير العاجلة، أبلغ من صفحة الحوادث.',
  },
  translation: {
    en: "I'm having trouble with the AI translation service. Please find a volunteer who speaks your language — look for multilingual volunteers at information desks near each gate.",
    es: 'Problemas con el servicio de traducción. Busque un voluntario multilingüe en los mostradores de información.',
    fr: "Service de traduction indisponible. Cherchez un bénévole multilingue aux comptoirs d'information.",
    ar: 'خدمة الترجمة غير متاحة. ابحث عن متطوع متعدد اللغات في مكاتب المعلومات.',
  },
  general_faq: {
    en: "I'm having trouble connecting to the AI service. For match information, please check the stadium screens or ask a volunteer. Kickoff times and scores are displayed on all concourse monitors.",
    es: 'Problemas de conexión. Para información del partido, revise las pantallas o pregunte a un voluntario.',
    fr: 'Problème de connexion. Pour les matchs, consultez les écrans ou demandez à un bénévole.',
    ar: 'مشكلة في الاتصال. لمعلومات المباراة، تحقق من الشاشات أو اسأل متطوعًا.',
  },
  unknown: {
    en: "I'm having trouble connecting to the AI service right now. Please try again in a moment, or ask a stadium volunteer for assistance. For emergencies, the AI safety system is still active.",
    es: 'Problemas de conexión con IA. Intente de nuevo o pregunte a un voluntario. Para emergencias, el sistema sigue activo.',
    fr: 'Problème de connexion IA. Réessayez ou demandez à un bénévole. Pour urgences, le système reste actif.',
    ar: 'مشكلة في الاتصال بالذكاء الاصطناعي. حاول مرة أخرى أو اسأل متطوعًا. لحالات الطوارئ، النظام لا يزال نشطًا.',
  },
};

/**
 * Returns a helpful fallback reply when Gemini is unavailable.
 * Based on detected intent so the response is contextually relevant.
 */
export function getFallbackReply(intent: string, locale: string): string {
  const intentKey = intent in FALLBACKS ? intent : 'unknown';
  const langKey = locale === 'es' ? 'es' : locale === 'fr' ? 'fr' : locale === 'ar' ? 'ar' : 'en';
  const fallbackEntry = FALLBACKS[intentKey] ?? FALLBACKS.unknown;
  return (
    fallbackEntry?.[langKey] ??
    FALLBACKS.unknown?.en ??
    'AI service temporarily unavailable. Please try again.'
  );
}
