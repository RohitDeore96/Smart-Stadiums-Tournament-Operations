/**
 * @file api/diagnostics.ts
 * @description Diagnostics endpoint — checks if the Gemini API key is set,
 *   validates its format, and actually TESTS it by making a real API call.
 *   Does NOT expose the key itself.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(_req: VercelRequest, res: VercelResponse): Promise<void> {
  const apiKey = process.env.GEMINI_API_KEY;
  const hasKey = Boolean(apiKey);
  const keyLength = apiKey?.length ?? 0;
  const keyPrefix = apiKey ? `${apiKey.slice(0, 6)}...` : 'none';
  const isValidFormat = Boolean(apiKey && apiKey.startsWith('AIzaSy') && apiKey.length >= 35);

  // Detect key type
  const isAiStudioKey = Boolean(apiKey?.startsWith('AIzaSy'));
  const isVertexKey = Boolean(apiKey?.startsWith('AQ.'));
  const isOAuthToken = Boolean(apiKey?.startsWith('ya29.'));

  let keyType = 'Unknown format';
  let recommendation = '';

  if (!hasKey) {
    keyType = 'Not set';
    recommendation =
      'Set GEMINI_API_KEY in Vercel env vars. Get a FREE key at https://aistudio.google.com/app/apikey (no billing required!)';
  } else if (isAiStudioKey) {
    keyType = 'AI Studio (AIzaSy...) ✅';
    recommendation = 'Key format looks valid. Testing API call...';
  } else if (isVertexKey) {
    keyType = 'Vertex AI service account ⚠️ WRONG TYPE';
    recommendation =
      'This is a Vertex AI key, which requires a billing account and uses a different API. The @google/generative-ai SDK and the generativelanguage.googleapis.com endpoint only work with AI Studio keys. Get a FREE AI Studio key at https://aistudio.google.com/app/apikey (no billing required!)';
  } else if (isOAuthToken) {
    keyType = 'OAuth token ⚠️ WRONG TYPE';
    recommendation =
      'This is an OAuth2 access token, not an API key. Get a FREE AI Studio API key at https://aistudio.google.com/app/apikey';
  } else {
    keyType = `Unknown format (prefix: ${keyPrefix}) ⚠️`;
    recommendation =
      'This does not look like a valid Google AI Studio API key. AI Studio keys start with "AIzaSy" and are ~39 characters. Get a FREE key at https://aistudio.google.com/app/apikey (no billing required!)';
  }

  // If key looks valid, test it with a real API call
  let apiTestResult = null;
  if (isValidFormat) {
    try {
      const testResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${String(apiKey)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: 'Say "OK" in one word.' }] }],
          }),
        },
      );

      if (testResponse.ok) {
        const data = (await testResponse.json()) as {
          candidates?: { content?: { parts?: { text?: string }[] } }[];
        };
        const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text ?? 'empty';
        apiTestResult = {
          status: 'success ✅',
          httpStatus: testResponse.status,
          responsePreview: responseText.slice(0, 50),
          message: 'Gemini API is working! The chat endpoint should function correctly.',
        };
      } else {
        const errorText = await testResponse.text();
        let errorMsg = errorText.slice(0, 200);
        try {
          const errorJson = JSON.parse(errorText) as { error?: { message?: string } };
          errorMsg = errorJson.error?.message ?? errorMsg;
        } catch {
          // Keep raw error text
        }
        apiTestResult = {
          status: 'failed ❌',
          httpStatus: testResponse.status,
          error: errorMsg,
          message:
            testResponse.status === 403
              ? 'Key is invalid or API is not enabled. Make sure you got the key from https://aistudio.google.com/app/apikey'
              : testResponse.status === 429
                ? 'Rate limit exceeded. Free tier allows 15 requests per minute.'
                : `API returned HTTP ${String(testResponse.status)}`,
        };
      }
    } catch (err) {
      apiTestResult = {
        status: 'error ❌',
        error: err instanceof Error ? err.message : 'Unknown error',
        message: 'Network error when calling Gemini API.',
      };
    }
  }

  res.status(200).json({
    data: {
      service: 'stadiumops-api',
      time: new Date().toISOString(),
      gemini: {
        keySet: hasKey,
        keyLength,
        keyPrefix,
        isValidFormat,
        keyType,
        model: 'gemini-flash-latest',
        apiEndpoint: 'generativelanguage.googleapis.com/v1beta',
        freeTierInfo: {
          rpm: 15,
          dailyLimit: 1500,
          billingRequired: false,
          getKeyUrl: 'https://aistudio.google.com/app/apikey',
        },
        apiTest: apiTestResult,
        recommendation,
      },
      environment: process.env.NODE_ENV ?? 'unknown',
    },
  });
}
