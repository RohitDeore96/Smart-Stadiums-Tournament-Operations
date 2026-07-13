/**
 * @file apps/api/src/services/geminiService.ts
 * @description Wraps the Google Generative AI SDK with:
 *   - LRU caching for identical repeat queries (Pillar #3 Efficiency)
 *   - SSE streaming for perceived performance (Pillar #3)
 *   - Prompt-injection defense via promptService (Pillar #2 Security)
 *   - Token usage accounting
 *   - Graceful error handling with typed AppError
 *
 *   Two modes:
 *   1. generateReply() — non-streaming, returns full text. Uses cache.
 *   2. streamReply() — async generator yielding token chunks. No cache
 *      (streaming + caching is hard; cache hits return a single chunk).
 */

import {
  GoogleGenerativeAI,
  type GenerateContentResult,
  type EnhancedGenerateContentResponse,
} from '@google/generative-ai';
import { loadEnv } from '../config/env.js';
import { scopedLogger } from '../utils/logger.js';
import { buildSystemPrompt, wrapUserMessage, type SystemPromptContext } from './promptService.js';
import { buildCacheKey, getCached, setCached, getCacheStats } from './cacheService.js';
import { UpstreamUnavailableError, InternalError } from '../utils/errors.js';

const log = scopedLogger('gemini');

let client: GoogleGenerativeAI | null = null;

function getClient(): GoogleGenerativeAI {
  if (client) return client;
  const env = loadEnv();
  client = new GoogleGenerativeAI(env.GEMINI_API_KEY);
  return client;
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
  tokenUsage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  cached: boolean;
}

const MODEL_NAME = 'gemini-flash-latest';

/**
 * Generates a complete reply (non-streaming). Checks cache first.
 * Use this for: intent classification, ops dashboard summaries.
 *
 * Streaming callers should use streamReply() instead.
 */
export async function generateReply(req: GeminiRequest): Promise<GeminiReply> {
  const systemPrompt = buildSystemPrompt({
    locale: req.locale,
    scope: req.scope,
    stadiumName: req.stadiumName ?? null,
    matchContext: req.matchContext ?? null,
  });
  const wrappedUserMessage = wrapUserMessage(req.message);

  // ---- Cache check ----
  const cacheKey = buildCacheKey(systemPrompt, wrappedUserMessage);
  const cached = getCached<GeminiReply>(cacheKey);
  if (cached) {
    log.debug({ cacheKey: cacheKey.slice(0, 8) }, 'Cache hit');
    return { ...cached, cached: true };
  }

  // ---- Call Gemini ----
  const model = getClient().getGenerativeModel({
    model: MODEL_NAME,
    systemInstruction: systemPrompt,
    generationConfig: {
      temperature: 0.3, // low temp for factual stadium info
      topP: 0.9,
      maxOutputTokens: 500,
    },
  });

  try {
    const result = await model.generateContent(wrappedUserMessage);
    const text = extractText(result);
    const tokenUsage = extractTokenUsage(result);

    const reply: GeminiReply = {
      text,
      tokenUsage,
      cached: false,
    };

    setCached(cacheKey, reply);
    log.info({ tokenUsage, cached: false }, 'Gemini reply generated');

    return reply;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    log.error({ err: message }, 'Gemini API call failed');

    // Detect quota / availability errors
    if (message.includes('quota') || message.includes('RATE_LIMIT')) {
      throw UpstreamUnavailableError('Gemini API (rate limited)');
    }
    if (message.includes('safety') || message.includes('blocked')) {
      throw UpstreamUnavailableError('Gemini API (content filter)');
    }

    throw InternalError(`Gemini call failed: ${message}`);
  }
}

/**
 * Streams a reply as an async generator of text chunks.
 * Cache hits yield a single chunk containing the full text.
 *
 * SSE handlers consume this generator and emit `event: token` per chunk.
 */
export async function* streamReply(req: GeminiRequest): AsyncGenerator<{
  chunk: string;
  done: boolean;
  tokenUsage?: GeminiReply['tokenUsage'];
  cached: boolean;
}> {
  const systemPrompt = buildSystemPrompt({
    locale: req.locale,
    scope: req.scope,
    stadiumName: req.stadiumName ?? null,
    matchContext: req.matchContext ?? null,
  });
  const wrappedUserMessage = wrapUserMessage(req.message);

  // ---- Cache check: return as single chunk ----
  const cacheKey = buildCacheKey(systemPrompt, wrappedUserMessage);
  const cached = getCached<GeminiReply>(cacheKey);
  if (cached) {
    log.debug({ cacheKey: cacheKey.slice(0, 8) }, 'Cache hit (stream)');
    yield {
      chunk: cached.text,
      done: true,
      tokenUsage: cached.tokenUsage,
      cached: true,
    };
    return;
  }

  // ---- Stream from Gemini ----
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
    let tokenUsage: GeminiReply['tokenUsage'] = {
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
    };

    for await (const chunk of stream.stream) {
      const chunkText = chunk.text();
      if (chunkText) {
        fullText += chunkText;
        yield {
          chunk: chunkText,
          done: false,
          cached: false,
        };
      }
    }

    // Get final usage metadata from the aggregated response
    const aggregated = await stream.response;
    tokenUsage = extractTokenUsage(aggregated);

    // Cache the complete reply for future cache hits
    const reply: GeminiReply = {
      text: fullText,
      tokenUsage,
      cached: false,
    };
    setCached(cacheKey, reply);

    log.info({ tokenUsage, cached: false }, 'Gemini stream complete');

    yield {
      chunk: '',
      done: true,
      tokenUsage,
      cached: false,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    log.error({ err: message }, 'Gemini stream failed');

    if (message.includes('quota') || message.includes('RATE_LIMIT')) {
      throw UpstreamUnavailableError('Gemini API (rate limited)');
    }
    if (message.includes('safety') || message.includes('blocked')) {
      throw UpstreamUnavailableError('Gemini API (content filter)');
    }

    throw InternalError(`Gemini stream failed: ${message}`);
  }
}

function extractText(result: GenerateContentResult): string {
  const text = result.response.text();
  if (!text) {
    throw InternalError('Gemini returned empty response');
  }
  return text;
}

function extractTokenUsage(
  result: GenerateContentResult | EnhancedGenerateContentResponse,
): GeminiReply['tokenUsage'] {
  // Both types have response.usageMetadata — handle both shapes
  const usage = 'response' in result ? result.response.usageMetadata : result.usageMetadata;
  return {
    promptTokens: usage?.promptTokenCount ?? 0,
    completionTokens: usage?.candidatesTokenCount ?? 0,
    totalTokens: usage?.totalTokenCount ?? 0,
  };
}

/** Returns cache stats for the /health endpoint. */
export function getGeminiCacheStats(): {
  size: number;
  calculatedSize: number;
  ttl: number;
} {
  return getCacheStats();
}
