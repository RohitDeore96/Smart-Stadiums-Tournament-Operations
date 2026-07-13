/**
 * @file packages/shared/src/schemas/chat.ts
 * @description Zod schemas for the GenAI chat endpoints.
 *
 * SECURITY: These schemas are the first line of defense against prompt injection.
 * - `message` is capped at 2000 chars to prevent context-stuffing.
 * - `message` is stripped of control characters by `sanitizeUserText`.
 * - `systemContext` fields are NEVER taken from user input — only server-side.
 */

import { z } from 'zod';

const LOCALES = ['en', 'es', 'fr', 'ar', 'de', 'pt', 'ja', 'ko', 'zh'] as const;

/**
 * Strips control characters and Unicode tricks (zero-width, RTL override, etc.)
 * that could be used to bypass content filters or confuse the model.
 * Applied to every free-text field that originated from a user.
 */
export const sanitizeUserText = (raw: string): string =>
  raw
    // Remove control chars except \n, \r, \t.
    // eslint-disable-next-line no-control-regex -- intentional: stripping control chars is the purpose of this regex
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    // Remove zero-width and bidi-override characters
    .replace(/[\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/g, '')
    // Collapse runs of whitespace (defeats token-padding attacks)
    .replace(/\s+/g, ' ')
    .trim();

export const ChatMessageSchema = z.object({
  message: z
    .string()
    .min(1, 'Message cannot be empty')
    .max(2000, 'Message too long (max 2000 chars)')
    .transform(sanitizeUserText),
  sessionId: z.string().min(8).max(64).optional(),
  locale: z.enum(LOCALES).default('en'),
  stadiumId: z.string().min(3).max(64).optional(),
  matchId: z.string().min(3).max(64).optional(),
});

export type ChatMessageInput = z.infer<typeof ChatMessageSchema>;

/** Server-to-client streaming event shapes (SSE). */
export const ChatStreamEventSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('token'),
    /** Incremental text chunk to append to the assistant bubble. */
    value: z.string(),
  }),
  z.object({
    type: z.literal('metadata'),
    intent: z.string(),
    confidence: z.number().min(0).max(1),
    suggestedActions: z.array(
      z.object({
        type: z.string(),
        label: z.string(),
        payload: z.record(z.unknown()),
      }),
    ),
    emergencyEscalated: z.boolean(),
  }),
  z.object({
    type: z.literal('done'),
    messageId: z.string(),
    tokenUsage: z.object({
      promptTokens: z.number(),
      completionTokens: z.number(),
      totalTokens: z.number(),
    }),
  }),
  z.object({
    type: z.literal('error'),
    code: z.string(),
    message: z.string(),
  }),
]);

export type ChatStreamEvent = z.infer<typeof ChatStreamEventSchema>;
