/**
 * @file packages/shared/src/types/chat.ts
 * @description GenAI chat domain types. Used by the streaming chat endpoint
 *   and the frontend chat UI.
 */

import type { ISODateString, Locale } from './api.js';

/** A single user↔assistant turn in a conversation. */
export interface ChatMessage {
  id: string;
  sessionId: string;
  role: ChatRole;
  content: string;
  locale: Locale;
  createdAt: ISODateString;
  /** Gemini-specific token usage accounting (assistant messages only). */
  tokenUsage?: TokenUsage;
}

export type ChatRole = 'user' | 'assistant' | 'system';

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

/** Logical conversation thread, scoped per user. */
export interface ChatSession {
  id: string;
  userId: string;
  stadiumId: string | null;
  matchId: string | null;
  locale: Locale;
  createdAt: ISODateString;
  updatedAt: ISODateString;
  /** Cached preview of the last user message — used in session list UI. */
  lastMessagePreview: string | null;
  /** True if user or admin archived the session. */
  archived: boolean;
}

/**
 * Operational intent tag the assistant uses to scope its answers.
 * Extracted by a lightweight classifier prompt before the main reply is generated.
 */
export type ChatIntent =
  | 'wayfinding' // "Where is Gate A?"
  | 'crowd_status' // "How busy is Section 312?"
  | 'incident_report' // "There's a medical issue near me."
  | 'facility_info' // "Where's the nearest restroom?"
  | 'translation' // "How do I say 'where is my seat' in Spanish?"
  | 'general_faq' // "What time does kickoff start?"
  | 'safety_emergency' // "I see smoke" → escalates immediately
  | 'unknown';

/**
 * Assistant-side metadata attached to each reply so the UI can render
 * action cards (e.g. "Show route to Gate A", "File incident").
 */
export interface ChatReplyMetadata {
  intent: ChatIntent;
  /** Confidence 0..1. If <0.6 the UI shows a "Was this helpful?" prompt. */
  confidence: number;
  /** Suggested follow-up action IDs the UI may render as buttons. */
  suggestedActions: SuggestedAction[];
  /** Indicates the assistant detected a safety emergency and paged responders. */
  emergencyEscalated: boolean;
}

export interface SuggestedAction {
  type: 'show_route' | 'file_incident' | 'view_crowd' | 'translate' | 'open_map';
  label: string;
  payload: Record<string, unknown>;
}
