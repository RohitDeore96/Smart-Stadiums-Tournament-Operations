/**
 * @file api/chat.ts
 * @description Streaming chat endpoint using Server-Sent Events (SSE).
 *
 * Flow:
 *   1. Auth check (Bearer token)
 *   2. CSRF check (Origin header)
 *   3. Rate limit check (per-IP, 30 req/min)
 *   4. Validate body (ChatMessageSchema)
 *   5. Check safety (emergency keyword detection)
 *   6. Classify intent
 *   7. Stream Gemini reply as SSE (with fallback on failure)
 *   8. Emit metadata + done events
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { ChatMessageSchema, type ChatStreamEvent } from './_lib/schema.js';
import { checkSafety } from './_lib/safety.js';
import { classifyIntent } from './_lib/intent.js';
import { streamReply } from './_lib/gemini.js';
import { checkRateLimit } from './_lib/rateLimit.js';
import { suggestActions } from './_lib/actions.js';
import { getFallbackReply } from './_lib/fallback.js';
import { requireAuth } from './_lib/auth.js';
import { verifyOrigin } from './_lib/csrf.js';
import { logger, generateRequestId, setRequestId } from './_lib/logger.js';

export const config = {
  maxDuration: 30,
};

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  // Generate request ID for tracing
  const requestId = generateRequestId();
  setRequestId(requestId);
  logger.info('Chat request received', { method: req.method });

  // Method check
  if (req.method !== 'POST') {
    res.status(405).json({
      error: {
        code: 'METHOD_NOT_ALLOWED',
        message: `Method ${String(req.method)} not allowed. Use POST.`,
      },
    });
    return;
  }

  // Auth + CSRF
  if (!requireAuth(req, res)) return;
  if (!verifyOrigin(req, res)) return;

  // Rate limit
  const clientIp =
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ??
    req.socket?.remoteAddress ??
    'unknown';
  const rateLimit = await checkRateLimit(clientIp);
  if (!rateLimit.allowed) {
    res.setHeader('Retry-After', String(Math.ceil((rateLimit.resetAt - Date.now()) / 1000)));
    res
      .status(429)
      .json({ error: { code: 'RATE_LIMITED', message: 'Too many requests. Please slow down.' } });
    return;
  }
  res.setHeader('X-RateLimit-Remaining', String(rateLimit.remaining));

  // Validate body
  const parseResult = ChatMessageSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request body validation failed',
        details: { issues: parseResult.error.issues },
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
    // Safety check
    const safetyResult = checkSafety(body.message);
    if (safetyResult.isEmergency && safetyResult.cannedReply) {
      sendEvent({ type: 'token', value: safetyResult.cannedReply });
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
        tokenUsage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      });
      res.end();
      return;
    }

    // Intent + Gemini
    const intentResult = classifyIntent(body.message);
    let tokenUsage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };
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
        }
      }
    } catch (geminiErr: unknown) {
      logger.error('Gemini failed, using fallback', {
        error: geminiErr instanceof Error ? geminiErr.message : 'Unknown',
        intent: intentResult.intent,
      });
      sendEvent({ type: 'token', value: getFallbackReply(intentResult.intent, body.locale) });
    }

    sendEvent({
      type: 'metadata',
      intent: intentResult.intent,
      confidence: geminiSucceeded ? intentResult.confidence : 0.3,
      suggestedActions: suggestActions(intentResult.intent),
      emergencyEscalated: false,
    });
    sendEvent({
      type: 'done',
      messageId: `msg_${String(Date.now())}`,
      tokenUsage,
      requestId,
    } as ChatStreamEvent & { requestId: string });
    res.end();
  } catch (err: unknown) {
    logger.error('Handler failed', { error: err instanceof Error ? err.message : 'Unknown' });
    sendEvent({ type: 'error', code: 'INTERNAL_ERROR', message: 'Failed to generate reply.' });
    res.end();
  }
}
