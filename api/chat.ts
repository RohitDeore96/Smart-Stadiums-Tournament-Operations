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
import { suggestActions } from './_lib/actions.js';
import { getFallbackReply } from './_lib/fallback.js';

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

  // CSRF protection: verify Origin header matches expected origins
  const origin = req.headers.origin;
  const allowedOrigins = ['smart-stadiums-tournament-operation-nine.vercel.app'];
  if (origin) {
    try {
      const url = new URL(origin);
      if (!allowedOrigins.includes(url.hostname) && url.hostname !== 'localhost') {
        res.status(403).json({
          error: {
            code: 'FORBIDDEN',
            message: 'Cross-origin requests are not allowed.',
          },
        });
        return;
      }
    } catch {
      // Invalid origin header — reject
      res.status(403).json({
        error: { code: 'FORBIDDEN', message: 'Invalid origin.' },
      });
      return;
    }
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
        history: body.history ?? undefined,
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
