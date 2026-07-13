/**
 * @file api/diagnostics.ts
 * @description Diagnostics endpoint — checks Gemini API key, validates format,
 *   and tests it with a real API call. Shows the actual error message.
 *   Accepts both AIzaSy (legacy) and AQ. (newer AI Studio) key formats.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(_req: VercelRequest, res: VercelResponse): Promise<void> {
  const apiKey = process.env.GEMINI_API_KEY;
  const hasKey = Boolean(apiKey);
  const keyLength = apiKey?.length ?? 0;
  const keyPrefix = apiKey ? `${apiKey.slice(0, 6)}...` : 'none';

  // Accept both key formats
  const isLegacyFormat = Boolean(apiKey && apiKey.startsWith('AIzaSy') && apiKey.length >= 35);
  const isNewerFormat = Boolean(apiKey?.startsWith('AQ.'));
  const isValidFormat = isLegacyFormat || isNewerFormat;

  let keyType = 'Unknown';
  let recommendation = '';

  if (!hasKey) {
    keyType = 'Not set ❌';
    recommendation =
      'Set GEMINI_API_KEY in Vercel env vars. Get a FREE key at https://aistudio.google.com/app/apikey (no billing required)';
  } else if (isLegacyFormat) {
    keyType = 'AI Studio legacy (AIzaSy...) ✅';
    recommendation = 'Key format valid. Testing API call below...';
  } else if (isNewerFormat) {
    keyType = 'AI Studio newer (AQ....) ✅';
    recommendation = 'Key format valid. Testing API call below...';
  } else {
    keyType = `Unknown format (${keyPrefix}) ⚠️`;
    recommendation =
      'Key format not recognized. AI Studio keys start with "AIzaSy" or "AQ.". Get a FREE key at https://aistudio.google.com/app/apikey';
  }

  // Test the key with a real API call
  let apiTestResult = null;
  if (isValidFormat && apiKey) {
    const models = ['gemini-2.0-flash', 'gemini-2.0-flash-lite', 'gemini-flash-latest'];
    const errors: string[] = [];

    for (const model of models) {
      try {
        const testResponse = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey ?? ''}`,
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
            workingModel: model,
            httpStatus: testResponse.status,
            responsePreview: responseText.slice(0, 50),
            message: 'Gemini API is working! The chat endpoint should function correctly.',
          };
          break;
        } else {
          const errorText = await testResponse.text();
          let errorMsg = errorText.slice(0, 300);
          try {
            const errorJson = JSON.parse(errorText) as { error?: { message?: string } };
            errorMsg = errorJson.error?.message ?? errorMsg;
          } catch {
            // Keep raw
          }

          errors.push(`${model}: HTTP ${String(testResponse.status)} - ${errorMsg.slice(0, 100)}`);

          // If location error, stop — all models will fail
          if (errorMsg.includes('location is not supported')) {
            apiTestResult = {
              status: 'failed ❌',
              error: 'User location is not supported for the API use',
              httpStatus: testResponse.status,
              testedModels: errors,
              message:
                'Gemini API is geo-restricted in your region. Create a new API key while connected to a VPN in a supported region (US, UK, etc.). See: https://ai.google.dev/gemini-api/docs/regions',
            };
            break;
          }
        }
      } catch (err) {
        errors.push(`${model}: ${err instanceof Error ? err.message : 'network error'}`);
      }
    }

    apiTestResult ??= {
      status: 'failed ❌',
      testedModels: errors,
      message:
        'All models failed. This is likely a regional restriction. Try creating a new key from a supported region.',
    };
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
        models: ['gemini-2.0-flash', 'gemini-2.0-flash-lite', 'gemini-flash-latest'],
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
