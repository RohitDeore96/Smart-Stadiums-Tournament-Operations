/**
 * @file api/vision.ts
 * @description Gemini Vision endpoint for photo-based incident severity classification.
 *
 *   A volunteer takes a photo of an incident (medical, fire, crowd, security)
 *   and the model pre-fills the severity field based on visual analysis.
 *   This is a novel AI use case beyond text chat.
 *
 *   Flow:
 *     1. Receive base64-encoded image + optional text context
 *     2. Send to Gemini with inlineData + a vision-specific prompt
 *     3. Return structured JSON: { category, severity, description, confidence }
 *
 *   The model used is gemini-flash-latest (resolves to newest flash model with vision support).
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { requireAuth } from './_lib/auth.js';
import { verifyOrigin } from './_lib/csrf.js';
import { logger, generateRequestId, setRequestId } from './_lib/logger.js';

export const config = { maxDuration: 30 };

const MODEL_NAMES = ['gemini-flash-latest', 'gemini-2.5-flash-preview', 'gemini-2.0-flash'];
const API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const MAX_IMAGE_BYTES = 4_000_000; // 4MB cap

const VisionInputSchema = z.object({
  imageBase64: z
    .string()
    .min(100, 'Image data too short')
    .max(MAX_IMAGE_BYTES * 1.4, 'Image too large (max 4MB)'),
  mimeType: z.enum(['image/jpeg', 'image/png', 'image/webp', 'image/gif']).default('image/jpeg'),
  context: z.string().max(500).optional(),
});

const VISION_SYSTEM_PROMPT = `You are a stadium incident severity classifier. You will be shown a photo taken by a volunteer at MetLife Stadium during FIFA World Cup 2026.

Analyze the photo and classify the incident. You MUST respond with valid JSON only — no markdown, no explanation:

{
  "category": "medical" | "security" | "fire" | "crowd_flow" | "lost_child" | "facilities" | "other",
  "severity": "low" | "medium" | "high" | "critical",
  "description": "<one-sentence description of what you see>",
  "visualCues": ["<cue 1>", "<cue 2>"],
  "confidence": <number 0-1>,
  "safetyConcerns": "<any immediate safety concerns, or 'none'>"
}

Severity guidelines (based on visual cues):
- critical: visible injury with blood, unconscious person, fire, dense crowd crush, child alone and crying
- high: person sitting/lying on ground, agitated crowd, smoke, visible distress
- medium: long queue, minor spill, person appearing unwell but standing
- low: empty area, normal crowd flow, minor facility issue

Category guidelines:
- medical: person appears injured, ill, or unconscious
- fire: visible smoke, flames, or fire alarm
- crowd_flow: dense crowd, long queue, congestion
- security: altercation, suspicious package, person climbing barriers
- lost_child: child without adult
- facilities: damaged property, spill, broken equipment
- other: anything not classified above

If you cannot determine the incident from the photo, return category "other", severity "low", confidence 0.1.`;

interface VisionResponseBody {
  candidates?: {
    content?: { parts?: { text?: string }[] };
  }[];
  error?: { message?: string };
}

export interface VisionResult {
  category: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  visualCues: string[];
  confidence: number;
  safetyConcerns: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  const requestId = generateRequestId();
  setRequestId(requestId);

  if (req.method !== 'POST') {
    res.status(405).json({ error: { code: 'METHOD_NOT_ALLOWED', message: 'Use POST.' } });
    return;
  }

  if (!requireAuth(req, res)) return;
  if (!verifyOrigin(req, res)) return;

  const parse = VisionInputSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({
      error: { code: 'VALIDATION_ERROR', details: parse.error.issues },
    });
    return;
  }

  const { imageBase64, mimeType, context } = parse.data;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: { code: 'NO_API_KEY', message: 'GEMINI_API_KEY not set.' } });
    return;
  }

  logger.info('Vision request', { mimeType, hasContext: Boolean(context) });

  const userPrompt = context
    ? `Analyze this incident photo. Volunteer context: "${context}"`
    : 'Analyze this incident photo.';

  const requestBody = {
    system_instruction: { parts: [{ text: VISION_SYSTEM_PROMPT }] },
    contents: [
      {
        role: 'user',
        parts: [{ text: userPrompt }, { inlineData: { mimeType, data: imageBase64 } }],
      },
    ],
    generationConfig: {
      temperature: 0.2,
      topP: 0.9,
      maxOutputTokens: 400,
      responseMimeType: 'application/json',
    },
    safetySettings: [
      { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
      { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
    ],
  };

  const errors: string[] = [];
  for (const model of MODEL_NAMES) {
    try {
      const endpoint = `${API_BASE}/${model}:generateContent`;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
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
          res.status(500).json({
            error: { code: 'INVALID_KEY', message: `Gemini API key invalid: ${msg}` },
            requestId,
          });
          return;
        }
        continue;
      }

      const data = (await response.json()) as VisionResponseBody;
      if (data.error) {
        errors.push(`${model}: ${data.error.message ?? 'Unknown'}`);
        continue;
      }

      const raw = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
      if (!raw) {
        errors.push(`${model}: empty response`);
        continue;
      }

      const result = parseVisionResult(raw);
      logger.info('Vision success', {
        model,
        category: result.category,
        severity: result.severity,
      });
      res.status(200).json({ result, model, requestId });
      return;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown';
      errors.push(`${model}: ${msg}`);
    }
  }

  logger.error('Vision all models failed', { errors: errors.join(' | ') });
  res.status(500).json({
    error: {
      code: 'VISION_FAILED',
      message: 'All models failed to analyze the image.',
      details: errors,
    },
    requestId,
  });
}

function parseVisionResult(raw: string): VisionResult {
  const cleaned = raw
    .replace(/```json\n?/g, '')
    .replace(/```\n?/g, '')
    .trim();
  try {
    const parsed = JSON.parse(cleaned) as Partial<VisionResult>;
    return {
      category: parsed.category ?? 'other',
      severity: parsed.severity ?? 'low',
      description: parsed.description ?? 'Unable to analyze photo.',
      visualCues: Array.isArray(parsed.visualCues) ? parsed.visualCues : [],
      confidence: parsed.confidence ?? 0.1,
      safetyConcerns: parsed.safetyConcerns ?? 'none',
    };
  } catch {
    return {
      category: 'other',
      severity: 'low',
      description: 'Vision model returned unparseable output.',
      visualCues: [],
      confidence: 0.1,
      safetyConcerns: 'Manual review required.',
    };
  }
}
