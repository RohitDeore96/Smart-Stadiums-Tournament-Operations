/**
 * @file api/diagnostics.ts
 * @description Diagnostics endpoint — checks Gemini API key, validates format,
 *   tests multiple models, and shows which ones are accessible.
 *   Provides actionable recommendations based on the key type and model availability.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth } from './_lib/auth.js';

const MODELS_TO_TEST = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-flash-latest'];

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  // Require auth — diagnostics exposes sensitive deployment info
  if (!requireAuth(req, res)) return;
  const apiKey = process.env.GEMINI_API_KEY;
  const hasKey = Boolean(apiKey);

  // Do NOT expose key prefix or length — that's an information leak.
  // Only report the key type (format family) for debugging.
  const isLegacyFormat = Boolean(apiKey && apiKey.startsWith('AIzaSy') && apiKey.length >= 35);
  const isNewerFormat = Boolean(apiKey?.startsWith('AQ.'));
  const isValidFormat = isLegacyFormat || isNewerFormat;

  let keyType = 'Unknown';
  let recommendation = '';

  if (!hasKey) {
    keyType = 'Not set ❌';
    recommendation =
      'Set GEMINI_API_KEY in Vercel env vars. Get a FREE key at https://aistudio.google.com/app/apikey';
  } else if (isLegacyFormat) {
    keyType = 'AI Studio legacy (AIzaSy...) ✅ — works with all models';
    recommendation = 'Key format is optimal. Testing models below...';
  } else if (isNewerFormat) {
    keyType = 'AI Studio newer (AQ....) ⚠️ — may not work with 2.5+/3.x models';
    recommendation =
      'AQ. keys cannot access newer free-tier models in India. Get an AIzaSy... key from https://aistudio.google.com/app/apikey for full model access.';
  } else {
    keyType = 'Unknown format ❌';
    recommendation = 'Get a valid AI Studio key from https://aistudio.google.com/app/apikey';
  }

  // Test each model
  const modelResults: {
    model: string;
    status: 'success' | 'failed';
    httpStatus?: number;
    error?: string;
    responsePreview?: string;
  }[] = [];

  let workingModel: string | null = null;

  if (isValidFormat && apiKey) {
    for (const model of MODELS_TO_TEST) {
      try {
        const testResponse = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey ?? '' },
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
          modelResults.push({
            model,
            status: 'success',
            httpStatus: testResponse.status,
            responsePreview: responseText.slice(0, 50),
          });
          workingModel ??= model;
        } else {
          const errorText = await testResponse.text();
          let errorMsg = errorText.slice(0, 200);
          try {
            const errorJson = JSON.parse(errorText) as { error?: { message?: string } };
            errorMsg = errorJson.error?.message ?? errorMsg;
          } catch {
            // Keep raw
          }
          modelResults.push({
            model,
            status: 'failed',
            httpStatus: testResponse.status,
            error: errorMsg.slice(0, 150),
          });
        }
      } catch (err) {
        modelResults.push({
          model,
          status: 'failed',
          error: err instanceof Error ? err.message : 'network error',
        });
      }
    }
  }

  // Generate recommendation based on results
  let apiTestResult = null;
  if (workingModel) {
    apiTestResult = {
      status: 'success ✅',
      workingModel,
      message: `Gemini API is working with model: ${workingModel}! The chat endpoint should function correctly.`,
      modelResults,
    };
  } else if (modelResults.length > 0) {
    const hasLocationError = modelResults.some((r) =>
      r.error?.includes('location is not supported'),
    );
    const hasAuthError = modelResults.some((r) =>
      r.error?.includes('ACCESS_TOKEN_TYPE_UNSUPPORTED'),
    );
    const hasQuotaError = modelResults.every(
      (r) => r.error?.includes('limit: 0') ?? r.error?.includes('quota'),
    );

    if (hasLocationError) {
      apiTestResult = {
        status: 'failed ❌',
        message:
          'Gemini API is geo-restricted in your region. Create a new key while connected to a VPN (US/UK).',
        modelResults,
      };
    } else if (hasAuthError && isNewerFormat) {
      apiTestResult = {
        status: 'failed ❌',
        message:
          'Your AQ. key cannot access the free-tier models (2.5+, 3.x). You need an AIzaSy... format key. Go to https://aistudio.google.com/app/apikey and create a key — if it shows AQ. format, try creating it in a new Google Cloud project.',
        modelResults,
      };
    } else if (hasQuotaError) {
      apiTestResult = {
        status: 'failed ❌',
        message:
          'All models have zero free-tier quota. The free tier resets at 12:30 PM IST. If this persists, the models may not be available in your region. Try getting an AIzaSy... key.',
        modelResults,
      };
    } else {
      apiTestResult = {
        status: 'failed ❌',
        message: 'All models failed. See model results below for details.',
        modelResults,
      };
    }
  }

  res.status(200).json({
    data: {
      service: 'stadiumops-api',
      time: new Date().toISOString(),
      gemini: {
        keySet: hasKey,
        isValidFormat,
        keyType,
        models: MODELS_TO_TEST,
        apiEndpoint: 'generativelanguage.googleapis.com/v1beta',
        freeTierInfo: {
          indiaDailyReset: '12:30 PM IST (DST) / 1:30 PM IST (standard)',
          models: {
            'gemini-2.0-flash': 'limit: 0 (NOT free in India)',
          },
          billingRequired: false,
          getKeyUrl: 'https://aistudio.google.com/app/apikey',
          keyFormatNote:
            'AIzaSy... keys work with ALL models. AQ.... keys only work with older 2.0 models.',
        },
        apiTest: apiTestResult,
        recommendation,
      },
      environment: process.env.NODE_ENV ?? 'unknown',
    },
  });
}
