/**
 * @file apps/api/src/routes/chat.ts
 * @description Streaming chat endpoint. Returns SSE events.
 *
 *   Flow:
 *   1. Validate body (ChatMessageSchema)
 *   2. Verify Firebase ID token
 *   3. Check safety (emergency keyword detection)
 *   4. Classify intent
 *   5. Stream Gemini reply as SSE token events
 *   6. Emit metadata + done events
 *   7. Persist session + messages to Firestore
 */

import type { FastifyInstance } from 'fastify';
import { ChatMessageSchema, type ChatStreamEvent } from '@stadiumops/shared';
import { authRequired } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { checkSafety } from '../services/safetyService.js';
import { classifyIntent } from '../services/intentService.js';
import { streamReply } from '../services/geminiService.js';
import { scopedLogger } from '../utils/logger.js';

const log = scopedLogger('chat-route');

export async function chatRoutes(app: FastifyInstance): Promise<void> {
  app.post<{
    Body: unknown;
  }>(
    '/api/v1/chat',
    {
      preHandler: [authRequired, validate(ChatMessageSchema)],
    },
    async (req, reply) => {
      const body = req.body as ReturnType<typeof ChatMessageSchema.parse>;

      // SSE setup
      reply.raw.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no', // disable Nginx buffering (Cloud Run)
      });

      const sendEvent = (event: ChatStreamEvent): void => {
        reply.raw.write(`event: ${event.type}\n`);
        reply.raw.write(`data: ${JSON.stringify(event)}\n\n`);
      };

      try {
        // Step 1: Safety check (before Gemini)
        const safetyResult = checkSafety(body.message);

        if (safetyResult.isEmergency && safetyResult.cannedReply) {
          log.warn({ userId: req.user?.uid }, 'Emergency detected — returning canned reply');

          // Emit the canned reply as a single token chunk
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

          reply.raw.end();
          return;
        }

        // Step 2: Classify intent
        const intentResult = classifyIntent(body.message);

        // Step 3: Stream Gemini reply
        // fullText collected for potential logging/debugging (prefix _ to satisfy lint)
        let _fullText = '';
        let tokenUsage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };
        let cached = false;

        for await (const chunk of streamReply({
          message: body.message,
          locale: body.locale,
          scope: 'fan_assistant',
          stadiumName: null, // TODO: fetch from Firestore by stadiumId
          matchContext: null,
        })) {
          if (chunk.chunk) {
            _fullText += chunk.chunk;
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

        log.info(
          { userId: req.user?.uid, intent: intentResult.intent, cached, tokenUsage },
          'Chat reply streamed',
        );

        reply.raw.end();
      } catch (err: unknown) {
        log.error({ err }, 'Chat streaming failed');

        sendEvent({
          type: 'error',
          code: 'INTERNAL_ERROR',
          message: 'Failed to generate reply',
        });

        reply.raw.end();
      }
    },
  );
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
