/**
 * @file api/diagnostics.ts
 * @description Diagnostics endpoint — checks if the Gemini API key is set
 *   and whether it's valid format. Does NOT expose the key itself.
 *   Helps debug deployment issues without exposing secrets.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(_req: VercelRequest, res: VercelResponse): void {
  const apiKey = process.env.GEMINI_API_KEY;
  const hasKey = Boolean(apiKey);
  const keyLength = apiKey?.length ?? 0;
  const keyPrefix = apiKey ? apiKey.slice(0, 6) : 'none';
  const isValidFormat = Boolean(apiKey && apiKey.startsWith('AIzaSy') && apiKey.length >= 35);

  // Check if the key looks like a Google AI Studio key
  // Valid keys start with "AIzaSy" and are ~39 chars
  // The "AQ.Ab8..." format is NOT a valid AI Studio key
  const isAiStudioKey = Boolean(apiKey?.startsWith('AIzaSy'));
  const isVertexKey = Boolean(apiKey?.startsWith('AQ.'));
  const isOAuthToken = Boolean(apiKey?.startsWith('ya29.'));

  res.status(200).json({
    data: {
      service: 'stadiumops-api',
      time: new Date().toISOString(),
      gemini: {
        keySet: hasKey,
        keyLength,
        keyPrefix,
        isValidFormat,
        keyType: isAiStudioKey
          ? 'AI Studio (AIzaSy...) ✅'
          : isVertexKey
            ? 'Vertex AI service account ⚠️ (wrong format for @google/generative-ai SDK)'
            : isOAuthToken
              ? 'OAuth token ⚠️ (wrong format for @google/generative-ai SDK)'
              : 'Unknown format ❌',
        model: 'gemini-flash-latest',
        recommendation: !hasKey
          ? 'Set GEMINI_API_KEY in Vercel env vars with a valid AI Studio key from https://aistudio.google.com/app/apikey'
          : !isValidFormat
            ? 'The GEMINI_API_KEY does not look like a valid Google AI Studio key. AI Studio keys start with "AIzaSy" and are ~39 characters. Get a fresh one from https://aistudio.google.com/app/apikey'
            : 'Key format looks valid. If AI still fails, check Vercel function logs for the exact error.',
      },
      environment: process.env.NODE_ENV ?? 'unknown',
    },
  });
}
