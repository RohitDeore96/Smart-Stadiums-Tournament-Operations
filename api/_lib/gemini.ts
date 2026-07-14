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
import {
  TOOL_DECLARATIONS,
  dispatchFunctionCall,
  type FunctionCall,
  type FunctionResult,
} from './tools.js';

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
  /** Previous conversation turns for multi-turn context (last N messages). */
  history?: { role: 'user' | 'model'; text: string }[] | undefined;
}

export interface GeminiReply {
  text: string;
  tokenUsage: TokenUsage;
  cached: boolean;
}

// Models ordered by free-tier availability (2026):
// gemini-flash-latest resolves to the newest flash model (currently 3.5-flash)
// gemini-2.0-flash has limit:0 in India but works elsewhere
// gemini-2.5-flash-preview is the fallback for regions where latest is unavailable
const MODEL_NAMES = ['gemini-flash-latest', 'gemini-2.5-flash-preview', 'gemini-2.0-flash'];
const API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 500;

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
    content?: {
      parts?: {
        text?: string;
        functionCall?: { name: string; args?: Record<string, unknown> };
      }[];
    };
    finishReason?: string;
  }[];
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    totalTokenCount?: number;
  };
  error?: { message?: string };
}

interface GeminiContentPart {
  text?: string;
  functionCall?: { name: string; args?: Record<string, unknown> };
  functionResponse?: { name: string; response?: Record<string, unknown> };
}

interface GeminiContent {
  role: string;
  parts: GeminiContentPart[];
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
  history?: { role: 'user' | 'model'; text: string }[],
): Promise<{ text: string; tokenUsage: TokenUsage }> {
  const apiKey = getApiKey();

  if (!isValidAiStudioKey(apiKey)) {
    throw new GeminiModelError(400, 'Invalid key format. Use AIzaSy or AQ. prefix', model);
  }

  // Build contents array with conversation history for multi-turn context
  const contents: { role: string; parts: { text: string }[] }[] = [];

  // Add last 5 conversation turns as context (capped to fit token budget)
  if (history && history.length > 0) {
    const recentHistory = history.slice(-5);
    for (const turn of recentHistory) {
      contents.push({
        role: turn.role,
        parts: [{ text: turn.text }],
      });
    }
  }

  // Add current message
  contents.push({
    role: 'user',
    parts: [{ text: userMessage }],
  });

  const endpoint = `${API_BASE}/${model}:generateContent`;
  const requestBody = {
    system_instruction: { parts: [{ text: systemPrompt }] },
    contents,
    generationConfig: {
      temperature: 0.3,
      topP: 0.9,
      maxOutputTokens: 500,
      responseMimeType: 'text/plain',
    },
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
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
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

/**
 * Calls the Gemini REST API with streaming (streamGenerateContent endpoint).
 * Returns an async generator that yields text chunks as they arrive.
 */
async function* callGeminiModelStream(
  model: string,
  systemPrompt: string,
  userMessage: string,
  history?: { role: 'user' | 'model'; text: string }[],
): AsyncGenerator<{ chunk: string; tokenUsage?: TokenUsage }> {
  const apiKey = getApiKey();

  if (!isValidAiStudioKey(apiKey)) {
    throw new GeminiModelError(400, 'Invalid key format', model);
  }

  // Build contents array with conversation history (same as non-streaming path)
  const contents: { role: string; parts: { text: string }[] }[] = [];
  if (history && history.length > 0) {
    for (const turn of history.slice(-5)) {
      contents.push({ role: turn.role, parts: [{ text: turn.text }] });
    }
  }
  contents.push({ role: 'user', parts: [{ text: userMessage }] });

  const endpoint = `${API_BASE}/${model}:streamGenerateContent?alt=sse`;
  const requestBody = {
    system_instruction: { parts: [{ text: systemPrompt }] },
    contents,
    generationConfig: {
      temperature: 0.3,
      topP: 0.9,
      maxOutputTokens: 500,
      responseMimeType: 'text/plain',
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
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorMsg = `HTTP ${String(response.status)}`;
    try {
      const errorJson = JSON.parse(errorText) as { error?: { message?: string } };
      if (errorJson.error?.message) errorMsg = errorJson.error.message;
    } catch {
      if (errorText) errorMsg = errorText.slice(0, 200);
    }
    throw new GeminiModelError(response.status, errorMsg, model);
  }

  if (!response.body) {
    throw new GeminiModelError(500, 'No response body for streaming', model);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let tokenUsage: TokenUsage | undefined;

  let readDone = false;
  while (!readDone) {
    const result: { done: boolean; value?: Uint8Array } = await reader.read();
    readDone = result.done;
    if (readDone) break;

    const value = result.value;
    if (!value) continue;

    buffer += decoder.decode(value, { stream: true });

    // SSE format: lines starting with "data: " followed by JSON
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('data: ')) continue;

      const jsonStr = trimmed.slice(6);
      try {
        const data = JSON.parse(jsonStr) as GeminiResponseBody;

        if (data.error) {
          throw new GeminiModelError(500, data.error.message ?? 'Unknown error', model);
        }

        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          yield { chunk: text };
        }

        if (data.usageMetadata) {
          tokenUsage = {
            promptTokens: data.usageMetadata.promptTokenCount ?? 0,
            completionTokens: data.usageMetadata.candidatesTokenCount ?? 0,
            totalTokens: data.usageMetadata.totalTokenCount ?? 0,
          };
        }
      } catch (parseErr) {
        // If it's our GeminiModelError, rethrow
        if (parseErr instanceof GeminiModelError) throw parseErr;
        // Otherwise skip malformed JSON (partial chunk)
      }
    }
  }

  if (tokenUsage) {
    yield { chunk: '', tokenUsage };
  }
}

async function callGeminiREST(
  systemPrompt: string,
  userMessage: string,
  history?: { role: 'user' | 'model'; text: string }[],
): Promise<{ text: string; tokenUsage: TokenUsage }> {
  const errors: string[] = [];

  for (const model of MODEL_NAMES) {
    try {
      console.log(`[gemini] Trying model: ${model}`);
      const result = await callGeminiModel(model, systemPrompt, userMessage, history);
      console.log(
        `[gemini] Success with ${model}, tokens: ${String(result.tokenUsage.totalTokens)}`,
      );
      return result;
    } catch (err: unknown) {
      if (err instanceof GeminiModelError) {
        const errMsg = `${model}: ${err.message} (HTTP ${String(err.statusCode)})`;
        errors.push(errMsg);
        console.error(`[gemini] ${errMsg}`);

        // ACCESS_TOKEN_TYPE_UNSUPPORTED — AQ. key can't access newer models
        if (
          err.message.includes('ACCESS_TOKEN_TYPE_UNSUPPORTED') ||
          err.message.includes('invalid authentication credentials')
        ) {
          // Try next model — older models might work with AQ. keys
          continue;
        }

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

  // Check if the key is AQ. format — it can't access free-tier models in India
  const apiKey = getApiKey();
  if (apiKey.startsWith('AQ.')) {
    throw new Error(
      'Your AQ. format API key cannot access the free-tier Gemini models (2.5+, 3.x). ' +
        'The older 2.0 models have zero free quota in India. ' +
        'Solution: Get a traditional AIzaSy... format key from https://aistudio.google.com/app/apikey ' +
        '(click "Create API key" — if it shows AQ. format, try creating it in a new Google Cloud project).',
    );
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

  const { text, tokenUsage } = await callGeminiREST(systemPrompt, wrappedUserMessage, req.history);
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

  // Try real streaming first — yields tokens as they arrive from Gemini
  for (const model of MODEL_NAMES) {
    try {
      console.log(`[gemini] Streaming with model: ${model}`);
      let fullText = '';
      let finalTokenUsage: TokenUsage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };
      let gotAnyChunk = false;

      for await (const result of callGeminiModelStream(
        model,
        systemPrompt,
        wrappedUserMessage,
        req.history,
      )) {
        if (result.chunk) {
          fullText += result.chunk;
          gotAnyChunk = true;
          yield { chunk: result.chunk, done: false, cached: false };
        }
        if (result.tokenUsage) {
          finalTokenUsage = result.tokenUsage;
        }
      }

      if (gotAnyChunk && fullText) {
        cache.set(cacheKey, { text: fullText, tokenUsage: finalTokenUsage });
        console.log(
          `[gemini] Stream success with ${model}, tokens: ${String(finalTokenUsage.totalTokens)}`,
        );
        yield { chunk: '', done: true, tokenUsage: finalTokenUsage, cached: false };
        return;
      }
    } catch (err: unknown) {
      if (err instanceof GeminiModelError) {
        console.error(
          `[gemini] Stream failed with ${model}: ${err.message} (HTTP ${String(err.statusCode)})`,
        );
        // Try next model
        continue;
      }
      throw err;
    }
  }

  // All streaming attempts failed — fall back to non-streaming
  console.log('[gemini] All streaming failed, falling back to non-streaming');
  const { text, tokenUsage } = await callGeminiREST(systemPrompt, wrappedUserMessage, req.history);
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

// ===========================================================================
// FUNCTION CALLING SUPPORT
// ===========================================================================

const MAX_TOOL_ITERATIONS = 3;

/**
 * Calls Gemini with function declarations. Returns either text or a list of
 * function calls the model wants to execute. Used to implement tool use.
 */
async function callGeminiWithTools(
  model: string,
  systemPrompt: string,
  contents: GeminiContent[],
): Promise<{
  text: string;
  functionCalls: FunctionCall[];
  tokenUsage: TokenUsage;
}> {
  const apiKey = getApiKey();
  const endpoint = `${API_BASE}/${model}:generateContent`;
  const requestBody = {
    system_instruction: { parts: [{ text: systemPrompt }] },
    contents,
    tools: [{ functionDeclarations: TOOL_DECLARATIONS }],
    generationConfig: {
      temperature: 0.3,
      topP: 0.9,
      maxOutputTokens: 800,
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
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorMsg = `HTTP ${String(response.status)}`;
    try {
      const errorJson = JSON.parse(errorText) as { error?: { message?: string } };
      if (errorJson.error?.message) errorMsg = errorJson.error.message;
    } catch {
      if (errorText) errorMsg = errorText.slice(0, 200);
    }
    throw new GeminiModelError(response.status, errorMsg, model);
  }

  const data = (await response.json()) as GeminiResponseBody;
  if (data.error) {
    throw new GeminiModelError(500, data.error.message ?? 'Unknown error', model);
  }

  const parts = data.candidates?.[0]?.content?.parts ?? [];
  let text = '';
  const functionCalls: FunctionCall[] = [];

  for (const part of parts) {
    if (part.text) text += part.text;
    if (part.functionCall) {
      functionCalls.push({
        name: part.functionCall.name as FunctionCall['name'],
        args: part.functionCall.args ?? {},
      });
    }
  }

  return {
    text,
    functionCalls,
    tokenUsage: {
      promptTokens: data.usageMetadata?.promptTokenCount ?? 0,
      completionTokens: data.usageMetadata?.candidatesTokenCount ?? 0,
      totalTokens: data.usageMetadata?.totalTokenCount ?? 0,
    },
  };
}

/**
 * Executes the function-calling loop:
 *   1. Send user message + tool declarations to Gemini.
 *   2. If Gemini returns functionCalls, dispatch them, append functionResponse
 *      parts to contents, and call Gemini again.
 *   3. Repeat until Gemini returns only text (no function calls) or we hit
 *      MAX_TOOL_ITERATIONS.
 *   4. Returns the final text + a tool trace for the client UI.
 */
export async function callGeminiWithToolLoop(
  systemPrompt: string,
  userMessage: string,
  history?: { role: 'user' | 'model'; text: string }[],
): Promise<{
  text: string;
  tokenUsage: TokenUsage;
  toolCalls: FunctionResult[];
}> {
  // Build initial contents
  const contents: GeminiContent[] = [];
  if (history && history.length > 0) {
    for (const turn of history.slice(-5)) {
      contents.push({ role: turn.role, parts: [{ text: turn.text }] });
    }
  }
  contents.push({ role: 'user', parts: [{ text: userMessage }] });

  const toolCalls: FunctionResult[] = [];
  let totalTokenUsage: TokenUsage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };
  let lastText = '';

  for (const model of MODEL_NAMES) {
    try {
      console.log(`[gemini-tools] Trying model: ${model}`);
      for (let iter = 0; iter < MAX_TOOL_ITERATIONS; iter++) {
        const result = await callGeminiWithTools(model, systemPrompt, contents);
        totalTokenUsage = {
          promptTokens: totalTokenUsage.promptTokens + result.tokenUsage.promptTokens,
          completionTokens: totalTokenUsage.completionTokens + result.tokenUsage.completionTokens,
          totalTokens: totalTokenUsage.totalTokens + result.tokenUsage.totalTokens,
        };
        lastText = result.text;

        if (result.functionCalls.length === 0) {
          // No more tool calls — done
          console.log(
            `[gemini-tools] ${model} completed after ${String(iter)} tool iterations, tokens: ${String(totalTokenUsage.totalTokens)}`,
          );
          return { text: lastText, tokenUsage: totalTokenUsage, toolCalls };
        }

        // Append the model's function call as a model turn
        contents.push({
          role: 'model',
          parts: result.functionCalls.map((fc) => ({
            functionCall: { name: fc.name, args: fc.args },
          })),
        });

        // Dispatch each function call and collect responses
        for (const fc of result.functionCalls) {
          console.log(`[gemini-tools] Dispatching: ${fc.name}`, fc.args);
          const toolResult = dispatchFunctionCall(fc);
          toolCalls.push(toolResult);
          contents.push({
            role: 'user', // function responses go in a user turn
            parts: [
              {
                functionResponse: {
                  name: toolResult.name,
                  response: toolResult.response,
                },
              },
            ],
          });
        }
      }

      // Hit iteration limit — return what we have
      console.log(`[gemini-tools] ${model} hit iteration limit, returning last text`);
      return { text: lastText, tokenUsage: totalTokenUsage, toolCalls };
    } catch (err: unknown) {
      if (err instanceof GeminiModelError) {
        console.error(`[gemini-tools] ${model} failed: ${err.message}`);
        continue;
      }
      throw err;
    }
  }

  throw new Error('All Gemini models failed in tool loop');
}

/**
 * Streaming variant that first runs the tool loop (non-streaming), then
 * streams the final text to the client. Yields progress events for each
 * tool call so the UI can show "Looking up crowd status..." etc.
 */
export async function* streamReplyWithTools(req: GeminiRequest): AsyncGenerator<{
  chunk: string;
  done: boolean;
  tokenUsage?: TokenUsage;
  cached: boolean;
  toolCall?: { name: string; args: Record<string, unknown>; result: Record<string, unknown> };
}> {
  const systemPrompt = buildSystemPrompt({
    locale: req.locale,
    scope: req.scope,
    stadiumName: req.stadiumName ?? null,
    matchContext: req.matchContext ?? null,
  });
  const wrappedUserMessage = wrapUserMessage(req.message);

  try {
    const { text, tokenUsage, toolCalls } = await callGeminiWithToolLoop(
      systemPrompt,
      wrappedUserMessage,
      req.history,
    );

    // Emit each tool call as a metadata chunk (UI can show "Looking up...")
    for (const tc of toolCalls) {
      yield {
        chunk: '',
        done: false,
        cached: false,
        toolCall: { name: tc.name, args: {}, result: tc.response },
      };
    }

    // Stream the final text in word chunks (since the tool loop is non-streaming)
    const words = text.split(' ');
    for (let i = 0; i < words.length; i += 3) {
      const chunk = words.slice(i, i + 3).join(' ') + (i + 3 < words.length ? ' ' : '');
      yield { chunk, done: false, cached: false };
    }
    yield { chunk: '', done: true, tokenUsage, cached: false };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[gemini-tools] Tool loop failed:', message);
    throw err;
  }
}
