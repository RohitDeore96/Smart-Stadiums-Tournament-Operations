/**
 * @file api/_lib/geminiHelpers.ts
 * @description Lightweight Gemini helpers used by the multi-agent layer.
 *   These use the same REST API + multi-model fallback as gemini.ts but
 *   with simpler semantics — non-streaming, structured output, and
 *   shorter max tokens (agents should produce concise JSON).
 */

const MODEL_NAMES = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-flash-latest'];
const API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

class GeminiHelperError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly model: string,
  ) {
    super(message);
    this.name = 'GeminiHelperError';
  }
}

function getApiKey(): string {
  const key = process.env.GEMINI_API_KEY;
  if (!key || key.trim().length === 0) {
    throw new Error('GEMINI_API_KEY not set.');
  }
  return key.trim();
}

interface GeminiResponseBody {
  candidates?: {
    content?: { parts?: { text?: string }[] };
  }[];
  error?: { message?: string };
}

/**
 * Calls Gemini with a system prompt + user prompt and returns the raw text.
 * Used by agents that need structured (JSON) output.
 * Retries with fallback models on failure.
 */
export async function callGeminiForStructuredOutput(
  systemPrompt: string,
  userPrompt: string,
): Promise<string> {
  const apiKey = getApiKey();
  const errors: string[] = [];

  for (const model of MODEL_NAMES) {
    const endpoint = `${API_BASE}/${model}:generateContent`;
    const requestBody = {
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
      generationConfig: {
        temperature: 0.2,
        topP: 0.9,
        maxOutputTokens: 600,
        responseMimeType: 'application/json',
      },
      safetySettings: [
        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
      ],
    };

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify(requestBody),
      });

      if (response.ok) {
        const data = (await response.json()) as GeminiResponseBody;
        if (data.error) {
          errors.push(`${model}: ${data.error.message ?? 'Unknown'}`);
          continue;
        }
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
        if (text) return text;
        errors.push(`${model}: empty response`);
      } else {
        const errorText = await response.text();
        let msg = `HTTP ${String(response.status)}`;
        try {
          const ej = JSON.parse(errorText) as { error?: { message?: string } };
          if (ej.error?.message) msg = ej.error.message;
        } catch {
          if (errorText) msg = errorText.slice(0, 150);
        }
        errors.push(`${model}: ${msg}`);

        if (response.status === 403) {
          throw new GeminiHelperError(403, `Invalid key: ${msg}`, model);
        }
      }
    } catch (err) {
      if (err instanceof GeminiHelperError) throw err;
      const msg = err instanceof Error ? err.message : 'Unknown error';
      errors.push(`${model}: ${msg}`);
    }
  }

  throw new Error(`All models failed in helper: ${errors.join(' | ')}`);
}

/**
 * Calls Gemini for plain text output (no JSON mode).
 * Used by the summary agent's narrative generation.
 */
export async function callGeminiForText(systemPrompt: string, userPrompt: string): Promise<string> {
  const apiKey = getApiKey();
  const errors: string[] = [];

  for (const model of MODEL_NAMES) {
    const endpoint = `${API_BASE}/${model}:generateContent`;
    const requestBody = {
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
      generationConfig: {
        temperature: 0.3,
        topP: 0.9,
        maxOutputTokens: 400,
        responseMimeType: 'text/plain',
      },
      safetySettings: [
        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
      ],
    };

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify(requestBody),
      });

      if (response.ok) {
        const data = (await response.json()) as GeminiResponseBody;
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
        if (text) return text;
      } else {
        const errorText = await response.text();
        errors.push(`${model}: HTTP ${String(response.status)} - ${errorText.slice(0, 100)}`);
      }
    } catch (err) {
      errors.push(`${model}: ${err instanceof Error ? err.message : 'Unknown'}`);
    }
  }

  throw new Error(`All models failed in text helper: ${errors.join(' | ')}`);
}
