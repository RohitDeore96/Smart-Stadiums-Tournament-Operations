/**
 * @file api/_lib/schema.ts
 * @description Self-contained Zod schema for the Vercel /api/chat endpoint.
 *
 *   WHY THIS EXISTS (Critical deployment fix):
 *   The original api/chat.ts imported from "@stadiumops/shared" — a pnpm
 *   workspace package that points to packages/shared/src/index.ts (raw TS).
 *   Vercel's @vercel/node bundler could not resolve the workspace symlink +
 *   TypeScript source at runtime, causing HTTP 500 FUNCTION_INVOCATION_FAILED
 *   on EVERY request to /api/chat.
 *
 *   Fix: inline the schema + types directly in the api/ directory so the
 *   Vercel function has zero workspace dependencies. The shared package is
 *   still used by apps/web (Vite bundles it correctly).
 */

import { z } from 'zod';
import type { SuggestedAction } from './actions.js';

const LOCALES = ['en', 'es', 'fr', 'ar', 'de', 'pt', 'ja', 'ko', 'zh'] as const;

export type Locale = (typeof LOCALES)[number];

/**
 * Strips control characters and Unicode tricks (zero-width, RTL override, etc.)
 * that could be used to bypass content filters or confuse the model.
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
  /** Previous conversation turns for multi-turn context (max 10, last 5 used). */
  history: z
    .array(
      z.object({
        role: z.enum(['user', 'model']),
        text: z.string().max(2000),
      }),
    )
    .max(10)
    .optional(),
});

export type ChatMessageInput = z.infer<typeof ChatMessageSchema>;

/** SSE event types sent from server to client. */
export type ChatStreamEvent =
  | { type: 'token'; value: string }
  | {
      type: 'metadata';
      intent: string;
      confidence: number;
      suggestedActions: SuggestedAction[];
      emergencyEscalated: boolean;
    }
  | {
      type: 'done';
      messageId: string;
      tokenUsage: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
      };
    }
  | { type: 'error'; code: string; message: string };
