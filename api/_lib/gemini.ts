/**
 * @file api/_lib/gemini.ts
 * @description Gemini client using direct REST API calls.
 *   Accepts both AIzaSy (legacy) and AQ. (newer AI Studio) key formats.
 *   Tries multiple models as fallback in case some are unavailable.
 *
 *   FREE TIER: Google AI Studio provides free Gemini API access
 *   (15 RPM, 1500 req/day) with NO billing account required.
 *   Get a key at: https://aistudio.google.com/app/apikey
 *
 *   NOTE: Gemini API is geo-restricted. If you get "User location is not
 *   supported", create the key while connected to a VPN in a supported region.
 */

import { LRUCache } from 'lru-cache';
import { createHash } from 'node:crypto';
import { buildSystemPrompt, wrapUserMessage, type SystemPromptContext } from './prompt.js';

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

// Try these models in order — some may be unavailable in certain regions
const MODEL_NAMES = ['gemini-2.0-flash', 'gemini-2.0-flash-lite', 'gemini-flash-latest'];
const API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

function buildKey(...parts: string[]): string {
  return createHash('sha256').update(parts.join('|')).digest('hex');
}

function getApiKey(): string {
  const key = process.env.GEMINI_API_KEY;
  if (!key || key.trim().length === 0) {
    throw new Error(
      'GEMINI_API_KEY environment variable is not set. Get a FREE key at https://aistudio.google.com/app/apikey',
    );
  }
  return key.trim();
}

/**
 * Checks if the API key looks like a valid AI Studio key.
 * Accepts both formats:
 * - AIzaSy... (legacy, ~39 chars)
 * - AQ.... (newer AI Studio format)
 */
function isValidAiStudioKey(key: string): boolean {
  return (key.startsWith('AIzaSy') && key.length >= 35) || key.startsWith('AQ.');
}

interface GeminiResponseBody {
  candidates?: {
    content?: {
      parts?: { text?: string }[];
    };
    finishReason?: string;
  }[];
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    totalTokenCount?: number;
  };
  error?: {
    code?: number;
    message?: string;
    status?: string;
  };
}

/**
 * Calls the Gemini REST API with a specific model.
 * Returns the response or throws with a descriptive error.
 */
async function callGeminiModel(
  model: string,
  systemPrompt: string,
  userMessage: string,
): Promise<{ text: string; tokenUsage: TokenUsage }> {
  const apiKey = getApiKey();

  if (!isValidAiStudioKey(apiKey)) {
    throw new Error(
      `GEMINI_API_KEY format not recognized. AI Studio keys start with "AIzaSy" or "AQ.". ` +
        `Get a FREE key at https://aistudio.google.com/app/apikey`,
    );
  }

  const endpoint = `${API_BASE}/${model}:generateContent?key=${apiKey}`;

  const requestBody = {
    system_instruction: {
      parts: [{ text: systemPrompt }],
    },
    contents: [
      {
        parts: [{ text: userMessage }],
      },
    ],
    generationConfig: {
      temperature: 0.3,
      topP: 0.9,
      maxOutputTokens: 500,
    },
    safetySettings: [
      { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
      { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
    ],
  };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorMsg = `HTTP ${String(response.status)}`;

    try {
      const errorJson = JSON.parse(errorText) as { error?: { message?: string; status?: string } };
      if (errorJson.error?.message) {
        errorMsg = errorJson.error.message;
      }
    } catch {
      if (errorText) {
        errorMsg = errorText.slice(0, 200);
      }
    }

    // Don't throw yet — return the error so the caller can try the next model
    throw new GeminiModelError(response.status, errorMsg, model);
  }

  const data = (await response.json()) as GeminiResponseBody;

  if (data.error) {
    throw new GeminiModelError(500, data.error.message ?? 'Unknown error', model);
  }

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  if (!text) {
    throw new GeminiModelError(500, 'Empty response (possibly blocked by safety filter)', model);
  }

  const tokenUsage: TokenUsage = {
    promptTokens: data.usageMetadata?.promptTokenCount ?? 0,
    completionTokens: data.usageMetadata?.candidatesTokenCount ?? 0,
    totalTokens: data.usageMetadata?.totalTokenCount ?? 0,
  };

  return { text, tokenUsage };
}

/**
 * Custom error class that includes the HTTP status and model name.
 * Used to determine whether to try the next model.
 */
class GeminiModelError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly model: string,
  ) {
    super(message);
    this.name = 'GeminiModelError';
  }
}

/**
 * Calls Gemini, trying multiple models in order until one works.
 * This handles regional availability differences.
 */
async function callGeminiREST(
  systemPrompt: string,
  userMessage: string,
): Promise<{ text: string; tokenUsage: TokenUsage }> {
  const errors: string[] = [];

  for (const model of MODEL_NAMES) {
    try {
      console.log(`[gemini] Trying model: ${model}`);
      const result = await callGeminiModel(model, systemPrompt, userMessage);
      console.log(
        `[gemini] Success with model: ${model}, tokens: ${String(result.tokenUsage.totalTokens)}`,
      );
      return result;
    } catch (err: unknown) {
      if (err instanceof GeminiModelError) {
        const errMsg = `${model}: ${err.message} (HTTP ${String(err.statusCode)})`;
        errors.push(errMsg);
        console.error(`[gemini] ${errMsg}`);

        // If it's a location error, don't try other models — they'll all fail
        if (err.message.includes('location is not supported')) {
          throw new Error(
            'Gemini API is not available in your region. ' +
              'Create a new API key while connected to a VPN in a supported region (US, UK, etc.). ' +
              'See: https://ai.google.dev/gemini-api/docs/regions',
          );
        }

        // If it's a quota error with limit: 0, this model has no free tier in this region
        // Try the next model
        if (err.statusCode === 429) {
          continue;
        }

        // For 400 errors (bad request), try the next model
        if (err.statusCode === 400) {
          continue;
        }

        // For 403 (invalid key), don't try other models
        if (err.statusCode === 403) {
          throw new Error(
            `Gemini API key is invalid or expired. Get a new FREE key at https://aistudio.google.com/app/apikey. ` +
              `Original error: ${err.message}`,
          );
        }

        // For 404 (model not found), try the next model
        if (err.statusCode === 404) {
          continue;
        }
      }
      throw err;
    }
  }

  // All models failed
  throw new Error(
    `All Gemini models failed. Errors: ${errors.join(' | ')}. ` +
      `This may be due to regional restrictions. Try creating a new key from a supported region.`,
  );
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

  const { text, tokenUsage } = await callGeminiREST(systemPrompt, wrappedUserMessage);

  cache.set(cacheKey, { text, tokenUsage });
  return { text, tokenUsage, cached: false };
}

/**
 * Streams a reply as an async generator of text chunks.
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
    yield { chunk: cached.text, done: true, tokenUsage: cached.tokenUsage, cached: true };
    return;
  }

  const { text, tokenUsage } = await callGeminiREST(systemPrompt, wrappedUserMessage);

  cache.set(cacheKey, { text, tokenUsage });

  // Yield in chunks for perceived streaming
  const words = text.split(' ');
  const chunkSize = 3;
  for (let i = 0; i < words.length; i += chunkSize) {
    const chunk =
      words.slice(i, i + chunkSize).join(' ') + (i + chunkSize < words.length ? ' ' : '');
    yield { chunk, done: false, cached: false };
  }

  yield { chunk: '', done: true, tokenUsage, cached: false };
}

/** Returns cache stats for the health endpoint. */
export function getCacheStats(): { size: number; ttl: number } {
  return { size: cache.size, ttl: Number(process.env.GEMINI_CACHE_TTL_MS ?? 300_000) };
}
