/**
 * @file api/chat.ts
 * @description Streaming chat endpoint using Server-Sent Events (SSE).
 *
 * Flow:
 *   1. Rate limit check (per-IP, 30 req/min)
 *   2. Validate body (ChatMessageSchema)
 *   3. Check safety (emergency keyword detection)
 *   4. Classify intent
 *   5. Stream Gemini reply as SSE token events (with fallback on failure)
 *   6. Emit metadata + done events
 *
 * Rate limited (30 req/min per IP). Fallback replies when Gemini is down.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { ChatMessageSchema, type ChatStreamEvent } from './_lib/schema.js';
import { checkSafety } from './_lib/safety.js';
import { classifyIntent } from './_lib/intent.js';
import { streamReply } from './_lib/gemini.js';
import { checkRateLimit } from './_lib/rateLimit.js';

export const config = {
  maxDuration: 30, // Vercel hobby plan max
};

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  // Only allow POST
  if (req.method !== 'POST') {
    res.status(405).json({
      error: {
        code: 'METHOD_NOT_ALLOWED',
        message: `Method ${String(req.method)} not allowed. Use POST.`,
      },
    });
    return;
  }

  // Rate limit check (30 requests per minute per IP)
  const clientIp =
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ??
    req.socket?.remoteAddress ??
    'unknown';
  const rateLimit = checkRateLimit(clientIp);
  if (!rateLimit.allowed) {
    res.setHeader('X-RateLimit-Limit', '30');
    res.setHeader('X-RateLimit-Remaining', '0');
    res.setHeader('X-RateLimit-Reset', String(Math.ceil(rateLimit.resetAt / 1000)));
    res.setHeader('Retry-After', String(Math.ceil((rateLimit.resetAt - Date.now()) / 1000)));
    res.status(429).json({
      error: {
        code: 'RATE_LIMITED',
        message: 'Too many requests. Please slow down and try again in a minute.',
      },
    });
    return;
  }

  // Set rate limit headers on successful requests
  res.setHeader('X-RateLimit-Limit', '30');
  res.setHeader('X-RateLimit-Remaining', String(rateLimit.remaining));

  // Validate body
  const parseResult = ChatMessageSchema.safeParse(req.body);
  if (!parseResult.success) {
    const issues = parseResult.error.issues
      .map((i) => `${i.path.join('.') || 'root'}: ${i.message}`)
      .join('; ');
    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request body validation failed',
        details: { issues: parseResult.error.issues, summary: issues },
      },
    });
    return;
  }

  const body = parseResult.data;

  // SSE setup
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  const sendEvent = (event: ChatStreamEvent): void => {
    res.write(`event: ${event.type}\n`);
    res.write(`data: ${JSON.stringify(event)}\n\n`);
  };

  try {
    // Step 1: Safety check (before Gemini)
    const safetyResult = checkSafety(body.message);

    if (safetyResult.isEmergency && safetyResult.cannedReply) {
      console.warn('[chat] Emergency detected — returning canned reply');

      sendEvent({
        type: 'token',
        value: safetyResult.cannedReply,
      });

      sendEvent({
        type: 'metadata',
        intent: safetyResult.intent,
        confidence: 1.0,
        suggestedActions: [
          {
            type: 'file_incident',
            label: 'Report this incident',
            payload: { category: 'medical', severity: 'critical' },
          },
        ],
        emergencyEscalated: true,
      });

      sendEvent({
        type: 'done',
        messageId: `emerg_${String(Date.now())}`,
        tokenUsage: {
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0,
        },
      });

      res.end();
      return;
    }

    // Step 2: Classify intent
    const intentResult = classifyIntent(body.message);

    // Step 3: Stream Gemini reply
    let tokenUsage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };
    let cached = false;
    let geminiSucceeded = false;

    try {
      for await (const chunk of streamReply({
        message: body.message,
        locale: body.locale,
        scope: 'fan_assistant',
        stadiumName: null,
        matchContext: null,
      })) {
        if (chunk.chunk) {
          geminiSucceeded = true;
          sendEvent({ type: 'token', value: chunk.chunk });
        }
        if (chunk.done && chunk.tokenUsage) {
          tokenUsage = chunk.tokenUsage;
          cached = chunk.cached;
        }
      }
    } catch (geminiErr: unknown) {
      // Gemini failed — provide a graceful fallback based on intent
      const errMsg = geminiErr instanceof Error ? geminiErr.message : 'Unknown error';
      console.error('[chat] Gemini failed, using fallback:', errMsg);

      const fallbackReply = getFallbackReply(intentResult.intent, body.locale);
      sendEvent({ type: 'token', value: fallbackReply });
      geminiSucceeded = false;
    }

    // Step 4: Emit metadata
    sendEvent({
      type: 'metadata',
      intent: intentResult.intent,
      confidence: geminiSucceeded ? intentResult.confidence : 0.3,
      suggestedActions: suggestActions(intentResult.intent),
      emergencyEscalated: false,
    });

    // Step 5: Emit done
    sendEvent({
      type: 'done',
      messageId: `msg_${String(Date.now())}`,
      tokenUsage,
    });

    console.log(
      `[chat] intent=${intentResult.intent} cached=${String(cached)} fallback=${String(!geminiSucceeded)} tokens=${String(tokenUsage.totalTokens)}`,
    );

    res.end();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[chat] Handler failed:', message);

    // Detect specific error types for better UX and debugging
    const lowerMsg = message.toLowerCase();
    const isMissingKey = lowerMsg.includes('gemini_api_key') || lowerMsg.includes('api key');
    const isQuotaExceeded =
      lowerMsg.includes('quota') || lowerMsg.includes('rate_limit') || lowerMsg.includes('429');
    const isContentFilter =
      lowerMsg.includes('safety') || lowerMsg.includes('blocked') || lowerMsg.includes('filtered');
    const isModelNotFound =
      lowerMsg.includes('not found') ||
      lowerMsg.includes('404') ||
      lowerMsg.includes('deprecated') ||
      (lowerMsg.includes('model') && lowerMsg.includes('not'));
    const isNetworkError =
      lowerMsg.includes('network') ||
      lowerMsg.includes('timeout') ||
      lowerMsg.includes('econnreset');

    const errorCode = isMissingKey
      ? 'SERVICE_UNAVAILABLE'
      : isQuotaExceeded
        ? 'RATE_LIMITED'
        : isContentFilter
          ? 'CONTENT_FILTERED'
          : isModelNotFound
            ? 'MODEL_ERROR'
            : isNetworkError
              ? 'NETWORK_ERROR'
              : 'INTERNAL_ERROR';

    const errorMessage = isMissingKey
      ? 'AI service is not configured. Please contact support.'
      : isQuotaExceeded
        ? 'AI service is busy. Please try again in a moment.'
        : isContentFilter
          ? 'Your message was filtered by safety controls.'
          : isModelNotFound
            ? 'AI model is temporarily unavailable. Please try again.'
            : isNetworkError
              ? 'Network error. Please check your connection and retry.'
              : 'Failed to generate reply. Please try again.';

    sendEvent({
      type: 'error',
      code: errorCode,
      message: errorMessage,
    });

    res.end();
  }
}

/**
 * Returns suggested UI actions based on detected intent.
 */
function suggestActions(intent: string): {
  type: string;
  label: string;
  payload: Record<string, unknown>;
}[] {
  switch (intent) {
    case 'wayfinding':
      return [
        { type: 'show_route', label: 'Show route', payload: {} },
        { type: 'open_map', label: 'Open stadium map', payload: {} },
      ];
    case 'incident_report':
      return [
        {
          type: 'file_incident',
          label: 'File incident report',
          payload: { category: 'medical' },
        },
      ];
    case 'crowd_status':
      return [{ type: 'view_crowd', label: 'View crowd heatmap', payload: {} }];
    case 'translation':
      return [{ type: 'translate', label: 'Translate more', payload: {} }];
    default:
      return [];
  }
}

/**
 * Returns a helpful fallback reply when Gemini is unavailable.
 * Based on detected intent so the response is contextually relevant.
 * This ensures the app remains useful even when the AI service is down.
 */
function getFallbackReply(intent: string, locale: string): string {
  const isSpanish = locale === 'es';
  const isFrench = locale === 'fr';
  const isArabic = locale === 'ar';

  const fallbacks: Record<string, { en: string; es: string; fr: string; ar: string }> = {
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

  const intentKey = intent in fallbacks ? intent : 'unknown';
  const langKey = isSpanish ? 'es' : isFrench ? 'fr' : isArabic ? 'ar' : 'en';
  const fallbackEntry = fallbacks[intentKey] ?? fallbacks['unknown'];
  // Fallback to English unknown if any key is missing
  return (
    fallbackEntry?.[langKey] ??
    fallbacks['unknown']?.en ??
    'AI service temporarily unavailable. Please try again.'
  );
}
