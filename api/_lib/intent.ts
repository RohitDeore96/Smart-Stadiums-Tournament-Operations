/**
 * @file apps/api/src/services/intentService.ts
 * @description Lightweight rule-based intent classifier. Runs BEFORE the
 *   Gemini call so we can:
 *   1. Choose the right system prompt scope.
 *   2. Decide whether to skip Gemini entirely (e.g. for translation).
 *   3. Suggest follow-up actions in the UI.
 *
 *   This is intentionally rule-based, not LLM-based. A separate Gemini
 *   call to classify intent would add latency and cost for every message.
 *   The patterns below cover the 80% case; unknown intents fall through
 *   to Gemini for general FAQ.
 */

import type { ChatIntent } from './types.js';

interface IntentPattern {
  intent: ChatIntent;
  patterns: readonly RegExp[];
}

const INTENT_PATTERNS: readonly IntentPattern[] = [
  {
    intent: 'wayfinding',
    patterns: [
      /\bwhere(?:'s| is| are)\b/i,
      /\bhow do i (?:get|find)\b/i,
      /\bdirections?\b/i,
      /\bgate [a-z]\b/i,
      /\bsection \d+\b/i,
      /\bnearest\b/i,
      /\bfind\b/i,
      /\blocate\b/i,
    ],
  },
  {
    intent: 'crowd_status',
    patterns: [
      /\bhow (?:busy|crowded)\b/i,
      /\bcrowd\b/i,
      /\bwait time\b/i,
      /\bline\b/i,
      /\bqueue\b/i,
      /\bdensity\b/i,
      /\bpacked\b/i,
    ],
  },
  {
    intent: 'incident_report',
    patterns: [
      /\b(?:someone|a person|a fan) (?:is|feels|looks)\b/i,
      /\b(?:hurt|injured|sick|fainted|bleeding)\b/i,
      /\bneed (?:help|a medic|first aid)\b/i,
      /\bmedical\b/i,
      /\bsecurity\b/i,
      /\bissue\b/i,
      /\bproblem\b/i,
    ],
  },
  {
    intent: 'facility_info',
    patterns: [
      /\brestroom\b/i,
      /\bbathroom\b/i,
      /\btoilet\b/i,
      /\bfood\b/i,
      /\bdrink\b/i,
      /\bconcession\b/i,
      /\bwater\b/i,
      /\bfirst aid\b/i,
      /\batm\b/i,
      /\bmerchandise\b/i,
      /\bsouvenir\b/i,
    ],
  },
  {
    intent: 'translation',
    patterns: [
      /\bhow do (?:i|you) say\b/i,
      /\btranslate\b/i,
      /\bin (?:spanish|french|arabic|german|portuguese|japanese|korean|chinese|english)\b/i,
      /\bwhat does .+ mean\b/i,
    ],
  },
  {
    intent: 'general_faq',
    patterns: [
      /\bwhat time\b/i,
      /\bwhen\b/i,
      /\bkickoff\b/i,
      /\bstart\b/i,
      /\bschedule\b/i,
      /\bticket\b/i,
      /\bseat\b/i,
      /\bparking\b/i,
      /\bwifi\b/i,
      /\bpolicy\b/i,
    ],
  },
] as const;

export interface IntentResult {
  intent: ChatIntent;
  /** 0..1 confidence based on number of pattern matches. */
  confidence: number;
}

/**
 * Classifies the user message into a ChatIntent.
 * Returns `unknown` if no patterns match — caller lets Gemini handle it.
 */
export function classifyIntent(message: string): IntentResult {
  let bestMatch: { intent: ChatIntent; count: number } | null = null;

  for (const { intent, patterns } of INTENT_PATTERNS) {
    let count = 0;
    for (const pattern of patterns) {
      if (pattern.test(message)) {
        count++;
      }
    }

    if (count > 0 && (!bestMatch || count > bestMatch.count)) {
      bestMatch = { intent, count };
    }
  }

  if (!bestMatch) {
    return { intent: 'unknown', confidence: 0 };
  }

  // Confidence: 1 pattern = 0.6, 2 patterns = 0.85, 3+ = 0.95
  const confidence = bestMatch.count >= 3 ? 0.95 : bestMatch.count === 2 ? 0.85 : 0.6;

  return { intent: bestMatch.intent, confidence };
}
