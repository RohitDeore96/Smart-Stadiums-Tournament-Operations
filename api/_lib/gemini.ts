/**
 * @file api/_lib/gemini.ts
 * @description Gemini client using direct REST API calls.
 *   Accepts both AIzaSy (legacy) and AQ. (newer AI Studio) key formats.
 *   Tries multiple models with retry logic for 503/429 errors.
 *
 *   FREE TIER: Google AI Studio provides free Gemini API access
 *   Get a key at: https://aistudio.google.com/app/apikey
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

const MODEL_NAMES = [
  'gemini-flash-latest',
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
  'gemini-1.5-pro',
  'gemini-1.5-flash',
];
const API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

function buildKey(...parts: string[]): string {
  return createHash('sha256').update(parts.join('|')).digest('hex');
}

function getApiKey(): string {
  const key = process.env.GEMINI_API_KEY;
  if (!key || key.trim().length === 0) {
    throw new Error(
      'GEMINI_API_KEY not set. Get a FREE key at https://aistudio.google.com/app/apikey',
    );
  }
  return key.trim();
}

function isValidAiStudioKey(key: string): boolean {
  return (key.startsWith('AIzaSy') && key.length >= 35) || key.startsWith('AQ.');
}

interface GeminiResponseBody {
  candidates?: {
    content?: { parts?: { text?: string }[] };
  }[];
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    totalTokenCount?: number;
  };
  error?: { message?: string };
}

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

async function callGeminiModel(
  model: string,
  systemPrompt: string,
  userMessage: string,
): Promise<{ text: string; tokenUsage: TokenUsage }> {
  const apiKey = getApiKey();

  if (!isValidAiStudioKey(apiKey)) {
    throw new GeminiModelError(400, 'Invalid key format. Use AIzaSy or AQ. prefix', model);
  }

  const endpoint = `${API_BASE}/${model}:generateContent?key=${apiKey}`;
  const requestBody = {
    system_instruction: { parts: [{ text: systemPrompt }] },
    contents: [{ parts: [{ text: userMessage }] }],
    generationConfig: { temperature: 0.3, topP: 0.9, maxOutputTokens: 500 },
    safetySettings: [
      { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
      { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
    ],
  };

  let lastError: GeminiModelError | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    if (response.ok) {
      const data = (await response.json()) as GeminiResponseBody;
      if (data.error) {
        throw new GeminiModelError(500, data.error.message ?? 'Unknown error', model);
      }
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
      if (!text) {
        throw new GeminiModelError(500, 'Empty response (safety filter?)', model);
      }
      return {
        text,
        tokenUsage: {
          promptTokens: data.usageMetadata?.promptTokenCount ?? 0,
          completionTokens: data.usageMetadata?.candidatesTokenCount ?? 0,
          totalTokens: data.usageMetadata?.totalTokenCount ?? 0,
        },
      };
    }

    // Parse error
    const errorText = await response.text();
    let errorMsg = `HTTP ${String(response.status)}`;
    try {
      const errorJson = JSON.parse(errorText) as { error?: { message?: string } };
      if (errorJson.error?.message) errorMsg = errorJson.error.message;
    } catch {
      if (errorText) errorMsg = errorText.slice(0, 200);
    }

    lastError = new GeminiModelError(response.status, errorMsg, model);

    // Retry on 503 (overloaded) or 429 (rate limit, but not limit:0)
    const shouldRetry =
      response.status === 503 ||
      (response.status === 429 &&
        !errorMsg.includes('limit: 0') &&
        !errorMsg.includes('location is not supported'));

    if (shouldRetry && attempt < MAX_RETRIES - 1) {
      console.log(
        `[gemini] ${model} returned ${String(response.status)}, retry ${String(attempt + 1)}/${String(MAX_RETRIES)}...`,
      );
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS * (attempt + 1)));
      continue;
    }
    break;
  }

  throw lastError ?? new GeminiModelError(500, 'Unknown error', model);
}

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
        `[gemini] Success with ${model}, tokens: ${String(result.tokenUsage.totalTokens)}`,
      );
      return result;
    } catch (err: unknown) {
      if (err instanceof GeminiModelError) {
        const errMsg = `${model}: ${err.message} (HTTP ${String(err.statusCode)})`;
        errors.push(errMsg);
        console.error(`[gemini] ${errMsg}`);

        // Location error — stop trying, all models will fail
        if (err.message.includes('location is not supported')) {
          throw new Error(
            'Gemini API is not available in your region. Create a new API key while connected to a VPN. See: https://ai.google.dev/gemini-api/docs/regions',
          );
        }
        // Invalid key — stop trying
        if (err.statusCode === 403) {
          throw new Error(
            'Gemini API key is invalid or expired. Get a new FREE key at https://aistudio.google.com/app/apikey',
          );
        }
        // Try next model for 404, 400, 429 with limit:0
      } else {
        throw err;
      }
    }
  }

  throw new Error(`All Gemini models failed: ${errors.join(' | ')}`);
}

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
  if (cached) return { text: cached.text, tokenUsage: cached.tokenUsage, cached: true };

  const { text, tokenUsage } = await callGeminiREST(systemPrompt, wrappedUserMessage);
  cache.set(cacheKey, { text, tokenUsage });
  return { text, tokenUsage, cached: false };
}

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

  const words = text.split(' ');
  for (let i = 0; i < words.length; i += 3) {
    const chunk = words.slice(i, i + 3).join(' ') + (i + 3 < words.length ? ' ' : '');
    yield { chunk, done: false, cached: false };
  }
  yield { chunk: '', done: true, tokenUsage, cached: false };
}

export function getCacheStats(): { size: number; ttl: number } {
  return { size: cache.size, ttl: Number(process.env.GEMINI_CACHE_TTL_MS ?? 300_000) };
}
