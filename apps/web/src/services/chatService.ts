/**
 * @file apps/web/src/services/chatService.ts
 * @description Chat service — connects to /api/chat SSE endpoint.
 *   Parses Server-Sent Events and yields structured events to the UI.
 */

import type { ChatStreamEvent, Locale } from '@stadiumops/shared';

export interface ChatRequest {
  message: string;
  locale: Locale;
  sessionId?: string | undefined;
  stadiumId?: string | undefined;
  matchId?: string | undefined;
  /** Previous conversation turns for multi-turn context. */
  history?: { role: 'user' | 'model'; text: string }[];
}

/**
 * Streams a chat reply from the /api/chat endpoint.
 * Calls onEvent for each SSE event received.
 * Returns a promise that resolves when the stream completes.
 */
export async function streamChat(
  request: ChatRequest,
  onEvent: (event: ChatStreamEvent) => void,
  signal?: AbortSignal,
): Promise<void> {
  const init: RequestInit = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
      Authorization: 'Bearer stadiumops-demo-2026',
    },
    body: JSON.stringify(request),
  };
  if (signal) {
    init.signal = signal;
  }
  const response = await fetch('/api/chat', init);

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Chat request failed: HTTP ${String(response.status)} ${text}`);
  }

  if (!response.body) {
    throw new Error('Response body is null — streaming not supported');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    let done = false;
    while (!done) {
      const result = await reader.read();
      done = result.done;
      if (done) break;

      const value = result.value;
      buffer += decoder.decode(value, { stream: true });

      // Parse complete SSE events (separated by \n\n)
      const events = buffer.split('\n\n');
      buffer = events.pop() ?? '';

      for (const rawEvent of events) {
        const parsed = parseSSEEvent(rawEvent);
        if (parsed) {
          onEvent(parsed);
          if (parsed.type === 'done' || parsed.type === 'error') {
            return;
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

/**
 * Parses a raw SSE event string into a structured event.
 * Returns null if the event is malformed.
 */
function parseSSEEvent(raw: string): ChatStreamEvent | null {
  const lines = raw.split('\n');
  let eventType = '';
  let data = '';

  for (const line of lines) {
    if (line.startsWith('event: ')) {
      eventType = line.slice(7).trim();
    } else if (line.startsWith('data: ')) {
      data = line.slice(6);
    }
  }

  if (!eventType || !data) return null;

  try {
    const parsed = JSON.parse(data) as { type: string };
    if (parsed.type !== eventType) {
      // Type mismatch — use the event: header as source of truth
      return { ...parsed, type: eventType } as ChatStreamEvent;
    }
    return parsed as ChatStreamEvent;
  } catch {
    return null;
  }
}
