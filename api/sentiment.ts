/**
 * @file api/sentiment.ts
 * @description Real sentiment analysis endpoint.
 *
 *   Replaces the FanSentimentWidget's Math.random() simulation with
 *   actual Gemini classification. Analyzes recent incident descriptions
 *   and returns a sentiment breakdown (positive/neutral/negative) +
 *   trend over time + dominant emotion.
 *
 *   POST /api/sentiment     — analyze a single text
 *   GET  /api/sentiment     — aggregate sentiment from recent incidents
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { requireAuth } from './_lib/auth.js';
import { verifyOrigin } from './_lib/csrf.js';
import { logger, generateRequestId, setRequestId } from './_lib/logger.js';
import { incidentStore } from './_lib/store.js';

export const config = { maxDuration: 30 };

const MODEL_NAMES = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-flash-latest'];
const API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

const SentimentInputSchema = z.object({
  text: z.string().min(5).max(2000),
});

const SENTIMENT_SYSTEM_PROMPT = `You are a sentiment analysis model for stadium incident reports.
Classify the text into one of three sentiment categories and provide a confidence score.

You MUST respond with valid JSON only:
{
  "sentiment": "positive" | "neutral" | "negative",
  "emotion": "calm" | "happy" | "frustrated" | "anxious" | "angry" | "neutral",
  "intensity": <number 0-1>,
  "confidence": <number 0-1>,
  "keywords": ["<keyword 1>", "<keyword 2>"]
}

Sentiment guidelines:
- positive: resolved issues, compliments, smooth operations, "all good"
- neutral: factual reports without emotional language
- negative: complaints, injuries, accidents, frustration, anger

Emotion guidelines:
- calm: matter-of-fact reports
- happy: positive feedback
- frustrated: minor complaints
- anxious: worried language, medical concerns
- angry: hostile language, altercations`;

interface GeminiResponseBody {
  candidates?: { content?: { parts?: { text?: string }[] } }[];
  error?: { message?: string };
}

export interface SentimentResult {
  sentiment: 'positive' | 'neutral' | 'negative';
  emotion: string;
  intensity: number;
  confidence: number;
  keywords: string[];
}

export interface AggregateSentiment {
  counts: { positive: number; neutral: number; negative: number };
  percentages: { positive: number; neutral: number; negative: number };
  dominant: 'positive' | 'neutral' | 'negative';
  dominantEmotion: string;
  trend: 'improving' | 'stable' | 'worsening';
  totalAnalyzed: number;
  recent: SentimentResult[];
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  const requestId = generateRequestId();
  setRequestId(requestId);

  if (req.method !== 'POST' && req.method !== 'GET') {
    res.status(405).json({ error: { code: 'METHOD_NOT_ALLOWED', message: 'Use POST or GET.' } });
    return;
  }

  if (!requireAuth(req, res)) return;
  if (!verifyOrigin(req, res)) return;

  // GET: aggregate sentiment from recent incidents
  if (req.method === 'GET') {
    try {
      const recent = incidentStore.slice(0, 10);
      const analyzed: SentimentResult[] = [];

      for (const inc of recent) {
        const text = `${inc.title}. ${inc.description}`;
        try {
          const result = await analyzeSentiment(text);
          analyzed.push(result);
        } catch {
          // Skip failed analyses
        }
      }

      const counts = { positive: 0, neutral: 0, negative: 0 };
      const emotionCounts: Record<string, number> = {};
      for (const a of analyzed) {
        counts[a.sentiment] += 1;
        emotionCounts[a.emotion] = (emotionCounts[a.emotion] ?? 0) + 1;
      }

      const total = analyzed.length;
      const percentages = {
        positive: total > 0 ? Math.round((counts.positive / total) * 100) : 0,
        neutral: total > 0 ? Math.round((counts.neutral / total) * 100) : 0,
        negative: total > 0 ? Math.round((counts.negative / total) * 100) : 0,
      };

      const dominant =
        counts.negative >= counts.neutral && counts.negative >= counts.positive
          ? 'negative'
          : counts.neutral >= counts.positive
            ? 'neutral'
            : 'positive';

      const dominantEmotion =
        Object.entries(emotionCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'neutral';

      // Simple trend: compare first half vs second half negativity
      const half = Math.floor(analyzed.length / 2);
      const firstHalfNeg = analyzed.slice(0, half).filter((a) => a.sentiment === 'negative').length;
      const secondHalfNeg = analyzed.slice(half).filter((a) => a.sentiment === 'negative').length;
      const trend =
        secondHalfNeg > firstHalfNeg
          ? 'worsening'
          : secondHalfNeg < firstHalfNeg
            ? 'improving'
            : 'stable';

      const result: AggregateSentiment = {
        counts,
        percentages,
        dominant,
        dominantEmotion,
        trend,
        totalAnalyzed: total,
        recent: analyzed.slice(0, 5),
      };

      res.status(200).json({ result, requestId });
      return;
    } catch (err) {
      logger.error('Sentiment GET failed', {
        error: err instanceof Error ? err.message : 'Unknown',
      });
      res.status(500).json({
        error: { code: 'SENTIMENT_ERROR', message: 'Failed to aggregate sentiment.' },
        requestId,
      });
      return;
    }
  }

  // POST: analyze a single text
  const parse = SentimentInputSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({
      error: { code: 'VALIDATION_ERROR', details: parse.error.issues },
    });
    return;
  }

  try {
    const result = await analyzeSentiment(parse.data.text);
    res.status(200).json({ result, requestId });
  } catch (err) {
    logger.error('Sentiment POST failed', {
      error: err instanceof Error ? err.message : 'Unknown',
    });
    res.status(500).json({
      error: { code: 'SENTIMENT_ERROR', message: 'Failed to analyze sentiment.' },
      requestId,
    });
  }
}

async function analyzeSentiment(text: string): Promise<SentimentResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY not set.');

  const errors: string[] = [];

  for (const model of MODEL_NAMES) {
    const endpoint = `${API_BASE}/${model}:generateContent`;
    const requestBody = {
      system_instruction: { parts: [{ text: SENTIMENT_SYSTEM_PROMPT }] },
      contents: [{ role: 'user', parts: [{ text }] }],
      generationConfig: {
        temperature: 0.1,
        topP: 0.9,
        maxOutputTokens: 200,
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
        continue;
      }

      const data = (await response.json()) as GeminiResponseBody;
      const raw = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
      if (!raw) {
        errors.push(`${model}: empty response`);
        continue;
      }

      return parseSentimentResult(raw);
    } catch (err) {
      errors.push(`${model}: ${err instanceof Error ? err.message : 'Unknown'}`);
    }
  }

  throw new Error(`Sentiment analysis failed: ${errors.join(' | ')}`);
}

function parseSentimentResult(raw: string): SentimentResult {
  const cleaned = raw
    .replace(/```json\n?/g, '')
    .replace(/```\n?/g, '')
    .trim();
  try {
    const parsed = JSON.parse(cleaned) as Partial<SentimentResult>;
    return {
      sentiment: parsed.sentiment ?? 'neutral',
      emotion: parsed.emotion ?? 'neutral',
      intensity: parsed.intensity ?? 0.5,
      confidence: parsed.confidence ?? 0.5,
      keywords: Array.isArray(parsed.keywords) ? parsed.keywords : [],
    };
  } catch {
    return {
      sentiment: 'neutral',
      emotion: 'neutral',
      intensity: 0.5,
      confidence: 0.1,
      keywords: [],
    };
  }
}
