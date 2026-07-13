/**
 * @file api/_lib/gemini.ts
 * @description Gemini client wrapper for Vercel serverless functions.
 *   Lightweight — no firebase-admin, no secret-manager, no pino.
 *   Secrets come from Vercel env vars. Logging via console.
 *
 *   This module is shared across all /api/* functions that need Gemini.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { LRUCache } from 'lru-cache';
import { createHash } from 'node:crypto';
import { buildSystemPrompt, wrapUserMessage, type SystemPromptContext } from './prompt.js';

let client: GoogleGenerativeAI | null = null;

function getClient(): GoogleGenerativeAI {
  if (client) return client;
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY environment variable is not set');
  }
  client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  return client;
}

// Per-function LRU cache (cold start resets, but warms up within an instance)
const cache = new LRUCache<string, { text: string; tokenUsage: TokenUsage }>({
  max: 100,
  ttl: Number(process.env.GEMINI_CACHE_TTL_MS ?? 300_000),
});

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface GeminiRequest {
  message: string;
  locale: SystemPromptContext['locale'];
  scope: SystemPromptContext['scope'];
  stadiumName?: string | null;
  matchContext?: string | null;
}

export interface GeminiReply {
  text: string;
  tokenUsage: TokenUsage;
  cached: boolean;
}

const MODEL_NAME = 'gemini-2.0-flash';

function buildKey(...parts: string[]): string {
  return createHash('sha256').update(parts.join('|')).digest('hex');
}

/**
 * Generates a complete reply (non-streaming). Checks cache first.
 */
export async function generateReply(req: GeminiRequest): Promise<GeminiReply> {
  const systemPrompt = buildSystemPrompt({
    locale: req.locale,
    scope: req.scope,
    stadiumName: req.stadiumName ?? null,
    matchContext: req.matchContext ?? null,
  });
  const wrappedUserMessage = wrapUserMessage(req.message);

  const cacheKey = buildKey(systemPrompt, wrappedUserMessage);
  const cached = cache.get(cacheKey);
  if (cached) {
    return { text: cached.text, tokenUsage: cached.tokenUsage, cached: true };
  }

  const model = getClient().getGenerativeModel({
    model: MODEL_NAME,
    systemInstruction: systemPrompt,
    generationConfig: {
      temperature: 0.3,
      topP: 0.9,
      maxOutputTokens: 500,
    },
  });

  try {
    const result = await model.generateContent(wrappedUserMessage);
    const text = result.response.text();
    if (!text) throw new Error('Gemini returned empty response');

    const tokenUsage: TokenUsage = {
      promptTokens: result.response.usageMetadata?.promptTokenCount ?? 0,
      completionTokens: result.response.usageMetadata?.candidatesTokenCount ?? 0,
      totalTokens: result.response.usageMetadata?.totalTokenCount ?? 0,
    };

    cache.set(cacheKey, { text, tokenUsage });
    return { text, tokenUsage, cached: false };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[gemini] generateReply failed:', message);
    throw new Error(`Gemini call failed: ${message}`);
  }
}

/**
 * Streams a reply as an async generator of text chunks.
 * Cache hits yield a single chunk containing the full text.
 */
export async function* streamReply(req: GeminiRequest): AsyncGenerator<{
  chunk: string;
  done: boolean;
  tokenUsage?: TokenUsage;
  cached: boolean;
}> {
  const systemPrompt = buildSystemPrompt({
    locale: req.locale,
    scope: req.scope,
    stadiumName: req.stadiumName ?? null,
    matchContext: req.matchContext ?? null,
  });
  const wrappedUserMessage = wrapUserMessage(req.message);

  const cacheKey = buildKey(systemPrompt, wrappedUserMessage);
  const cached = cache.get(cacheKey);
  if (cached) {
    yield {
      chunk: cached.text,
      done: true,
      tokenUsage: cached.tokenUsage,
      cached: true,
    };
    return;
  }

  const model = getClient().getGenerativeModel({
    model: MODEL_NAME,
    systemInstruction: systemPrompt,
    generationConfig: {
      temperature: 0.3,
      topP: 0.9,
      maxOutputTokens: 500,
    },
  });

  try {
    const stream = await model.generateContentStream(wrappedUserMessage);
    let fullText = '';
    let tokenUsage: TokenUsage = {
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
    };

    for await (const chunk of stream.stream) {
      const chunkText = chunk.text();
      if (chunkText) {
        fullText += chunkText;
        yield { chunk: chunkText, done: false, cached: false };
      }
    }

    const aggregated = await stream.response;
    tokenUsage = {
      promptTokens: aggregated.usageMetadata?.promptTokenCount ?? 0,
      completionTokens: aggregated.usageMetadata?.candidatesTokenCount ?? 0,
      totalTokens: aggregated.usageMetadata?.totalTokenCount ?? 0,
    };

    cache.set(cacheKey, { text: fullText, tokenUsage });

    yield { chunk: '', done: true, tokenUsage, cached: false };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[gemini] streamReply failed:', message);
    throw new Error(`Gemini stream failed: ${message}`);
  }
}

/** Returns cache stats for the health endpoint. */
export function getCacheStats(): { size: number; ttl: number } {
  return {
    size: cache.size,
    ttl: Number(process.env.GEMINI_CACHE_TTL_MS ?? 300_000),
  };
}
