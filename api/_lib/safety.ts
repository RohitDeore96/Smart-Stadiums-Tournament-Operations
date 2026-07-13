/**
 * @file api/_lib/safety.ts
 * @description Detects safety emergencies in user messages BEFORE they
 *   reach the Gemini model. If an emergency is detected, we:
 *   1. Skip the normal Gemini flow.
 *   2. Return a canned "responders notified" reply.
 *
 *   This is the FIRST line of defense — if the user says "fire" we don't
 *   wait for the LLM to decide what to do.
 */

import type { ChatIntent } from '@stadiumops/shared';

/**
 * Emergency keyword patterns. Matched case-insensitively against the
 * sanitized user message. Multi-word phrases are matched as substrings.
 *
 * IMPORTANT: keep this list curated. Too many false positives will annoy
 * users; too many false negatives will miss real emergencies.
 */
const EMERGENCY_PATTERNS: readonly RegExp[] = [
  /\bfire\b/i,
  /\bsmoke\b/i,
  /\bfaint(?:ed|ing)?\b/i,
  /\bheart attack\b/i,
  /\bseizure\b/i,
  /\bnot breathing\b/i,
  /\bunconscious\b/i,
  /\bblood\b/i,
  /\bstab(?:bed|bing)?\b/i,
  /\bshot\b/i,
  /\bweapon\b/i,
  /\bknife\b/i,
  /\bgun\b/i,
  /\bbomb\b/i,
  /\bexplosive\b/i,
  /\bsuspicious (?:package|bag|item)\b/i,
  /\blost (?:my )?child\b/i,
  /\bmissing child\b/i,
  /\bchild (?:is )?(?:lost|missing)\b/i,
  /\bcrush(?:ed|ing)?\b/i,
  /\bstampede\b/i,
  /\bpanic(?:king|ked)?\b/i,
  /\bevacuat(?:e|ed|ing|ion)\b/i,
  /\boverdos(?:e|ed|ing)\b/i,
  /\bchoking\b/i,
  /\bstroke\b/i,
  /\bconcussion\b/i,
  /\bsevere (?:bleed|injury|burn)/i,
  /\bbleeding\b/i,
] as const;

export interface SafetyCheckResult {
  isEmergency: boolean;
  matchedPattern?: string;
  intent: ChatIntent;
  /** A canned reply for emergencies — used instead of calling Gemini. */
  cannedReply?: string;
}

/**
 * Scans a sanitized user message for emergency patterns.
 * Returns the result + a canned reply if emergency detected.
 */
export function checkSafety(message: string): SafetyCheckResult {
  for (const pattern of EMERGENCY_PATTERNS) {
    const match = message.match(pattern);
    if (match) {
      console.warn(
        `[safety] Emergency keyword detected: "${match[0]}" in "${message.slice(0, 100)}"`,
      );

      return {
        isEmergency: true,
        matchedPattern: match[0],
        intent: 'safety_emergency',
        cannedReply:
          '🚨 This sounds like an emergency. Please stay calm and move to safety if you can. ' +
          'What is your exact location (section, gate, or nearby landmark)? ' +
          'Responders have been automatically notified and are on the way.',
      };
    }
  }

  return { isEmergency: false, intent: 'unknown' };
}
