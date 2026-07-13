/**
 * @file api/chat.ts
 * @description Streaming chat endpoint using Server-Sent Events (SSE).
 *
 * Flow:
 *   1. Validate body (ChatMessageSchema from @stadiumops/shared)
 *   2. Check safety (emergency keyword detection)
 *   3. Classify intent
 *   4. Stream Gemini reply as SSE token events
 *   5. Emit metadata + done events
 *
 * No auth (public demo). No Firestore persistence (stateless chat).
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { ChatMessageSchema, type ChatStreamEvent } from './_lib/schema.js';
import { checkSafety } from './_lib/safety.js';
import { classifyIntent } from './_lib/intent.js';
import { streamReply } from './_lib/gemini.js';

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

    for await (const chunk of streamReply({
      message: body.message,
      locale: body.locale,
      scope: 'fan_assistant',
      stadiumName: null,
      matchContext: null,
    })) {
      if (chunk.chunk) {
        sendEvent({ type: 'token', value: chunk.chunk });
      }
      if (chunk.done && chunk.tokenUsage) {
        tokenUsage = chunk.tokenUsage;
        cached = chunk.cached;
      }
    }

    // Step 4: Emit metadata
    sendEvent({
      type: 'metadata',
      intent: intentResult.intent,
      confidence: intentResult.confidence,
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
      `[chat] intent=${intentResult.intent} cached=${String(cached)} tokens=${String(tokenUsage.totalTokens)}`,
    );

    res.end();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[chat] Streaming failed:', message);

    // Detect specific error types for better UX
    const isMissingKey = message.includes('GEMINI_API_KEY');
    const isQuotaExceeded = message.includes('quota') || message.includes('RATE_LIMIT');
    const isContentFilter = message.includes('safety') || message.includes('blocked');

    const errorCode = isMissingKey
      ? 'SERVICE_UNAVAILABLE'
      : isQuotaExceeded
        ? 'RATE_LIMITED'
        : isContentFilter
          ? 'CONTENT_FILTERED'
          : 'INTERNAL_ERROR';

    const errorMessage = isMissingKey
      ? 'AI service is not configured. Please contact support.'
      : isQuotaExceeded
        ? 'AI service is busy. Please try again in a moment.'
        : isContentFilter
          ? 'Your message was filtered by safety controls.'
          : 'Failed to generate reply';

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
