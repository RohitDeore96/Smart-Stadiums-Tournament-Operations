/**
 * @file api/_lib/gemini.ts
 * @description Gemini client using direct REST API calls (no SDK dependency).
 *   Smaller bundle, better error messages, works with AI Studio free tier.
 *
 *   Authentication:
 *   - AI Studio keys (AIzaSy...): passed as ?key= query parameter
 *   - The REST endpoint is: generativelanguage.googleapis.com/v1beta/models/
 *
 *   FREE TIER: Google AI Studio provides free Gemini API access
 *   (15 RPM, 1500 req/day) with NO billing account required.
 *   Get a key at: https://aistudio.google.com/app/apikey
 */

import { LRUCache } from 'lru-cache';
import { createHash } from 'node:crypto';
import { buildSystemPrompt, wrapUserMessage, type SystemPromptContext } from './prompt.js';

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

const MODEL_NAME = 'gemini-flash-latest';
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
 * AI Studio keys start with "AIzaSy" and are ~39 characters.
 */
function isValidAiStudioKey(key: string): boolean {
  return key.startsWith('AIzaSy') && key.length >= 35;
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
 * Calls the Gemini REST API directly.
 * Uses the key as a query parameter (AI Studio authentication).
 */
async function callGeminiREST(
  systemPrompt: string,
  userMessage: string,
  stream: boolean,
): Promise<{ text: string; tokenUsage: TokenUsage }> {
  const apiKey = getApiKey();

  // Validate key type and give helpful error
  if (!isValidAiStudioKey(apiKey)) {
    const prefix = apiKey.slice(0, 6);
    throw new Error(
      `GEMINI_API_KEY has wrong format (prefix: ${prefix}, length: ${String(apiKey.length)}). ` +
        `AI Studio keys start with "AIzaSy" and are ~39 chars. ` +
        `Get a FREE key at https://aistudio.google.com/app/apikey`,
    );
  }

  const endpoint = stream
    ? `${API_BASE}/${MODEL_NAME}:streamGenerateContent?key=${apiKey}`
    : `${API_BASE}/${MODEL_NAME}:generateContent?key=${apiKey}`;

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
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorMsg = `Gemini API error: HTTP ${String(response.status)}`;

    try {
      const errorJson = JSON.parse(errorText) as { error?: { message?: string } };
      if (errorJson.error?.message) {
        errorMsg = `Gemini API: ${errorJson.error.message}`;
      }
    } catch {
      if (errorText) {
        errorMsg = `Gemini API: ${errorText.slice(0, 200)}`;
      }
    }

    // Add helpful context for common errors
    if (response.status === 400) {
      errorMsg += ' (This usually means the key is invalid or the request format is wrong.)';
    } else if (response.status === 403) {
      errorMsg += ' (This usually means the key is invalid, expired, or the API is not enabled.)';
    } else if (response.status === 429) {
      errorMsg += ' (Rate limit exceeded — free tier allows 15 requests per minute.)';
    } else if (response.status === 404) {
      errorMsg += ` (Model "${MODEL_NAME}" not found — it may be deprecated.)`;
    }

    throw new Error(errorMsg);
  }

  if (stream) {
    // Streaming response is a stream of JSON objects
    return parseStreamingResponse(response.body);
  }

  const data = (await response.json()) as GeminiResponseBody;

  if (data.error) {
    throw new Error(`Gemini API: ${data.error.message ?? 'Unknown error'}`);
  }

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  if (!text) {
    throw new Error('Gemini returned empty response (possibly blocked by safety filter)');
  }

  const tokenUsage: TokenUsage = {
    promptTokens: data.usageMetadata?.promptTokenCount ?? 0,
    completionTokens: data.usageMetadata?.candidatesTokenCount ?? 0,
    totalTokens: data.usageMetadata?.totalTokenCount ?? 0,
  };

  return { text, tokenUsage };
}

/**
 * Parses a streaming response from Gemini (sequence of JSON objects).
 */
async function parseStreamingResponse(
  body: ReadableStream<Uint8Array> | null,
): Promise<{ text: string; tokenUsage: TokenUsage }> {
  if (!body) {
    throw new Error('No response body for streaming');
  }

  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let fullText = '';
  let tokenUsage: TokenUsage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };

  let done = false;
  while (!done) {
    const result = await reader.read();
    done = result.done;
    if (done) break;
    const value = result.value;

    buffer += decoder.decode(value, { stream: true });

    // Streaming responses are arrays of JSON objects, potentially split across chunks
    // Try to parse complete JSON objects
    while (buffer.length > 0) {
      const trimmed = buffer.trimStart();
      if (!trimmed.startsWith('[') && !trimmed.startsWith('{')) {
        buffer = trimmed;
        break;
      }

      try {
        // Try parsing as a JSON array (Gemini returns arrays in streaming)
        const dataArray = JSON.parse(trimmed) as GeminiResponseBody[];
        for (const data of dataArray) {
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) fullText += text;
          if (data.usageMetadata) {
            tokenUsage = {
              promptTokens: data.usageMetadata.promptTokenCount ?? 0,
              completionTokens: data.usageMetadata.candidatesTokenCount ?? 0,
              totalTokens: data.usageMetadata.totalTokenCount ?? 0,
            };
          }
        }
        buffer = '';
        break;
      } catch {
        // JSON not complete yet, wait for more data
        break;
      }
    }
  }

  return { text: fullText, tokenUsage };
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

  const { text, tokenUsage } = await callGeminiREST(systemPrompt, wrappedUserMessage, false);

  cache.set(cacheKey, { text, tokenUsage });
  return { text, tokenUsage, cached: false };
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

  // For now, use non-streaming and yield the full text as a single chunk
  // (True streaming would require parsing the streamGenerateContent endpoint)
  const { text, tokenUsage } = await callGeminiREST(systemPrompt, wrappedUserMessage, true);

  cache.set(cacheKey, { text, tokenUsage });

  // Yield in chunks for perceived streaming
  const words = text.split(' ');
  const chunkSize = 3; // 3 words per chunk
  for (let i = 0; i < words.length; i += chunkSize) {
    const chunk =
      words.slice(i, i + chunkSize).join(' ') + (i + chunkSize < words.length ? ' ' : '');
    yield { chunk, done: false, cached: false };
  }

  yield { chunk: '', done: true, tokenUsage, cached: false };
}

/** Returns cache stats for the health endpoint. */
export function getCacheStats(): { size: number; ttl: number } {
  return {
    size: cache.size,
    ttl: Number(process.env.GEMINI_CACHE_TTL_MS ?? 300_000),
  };
}
