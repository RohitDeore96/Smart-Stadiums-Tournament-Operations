/**
 * @file apps/web/src/hooks/useChat.ts
 * @description React hook for streaming chat with the /api/chat endpoint.
 *   Manages message history, streaming state, and error handling.
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import type { ChatStreamEvent, Locale } from '@stadiumops/shared';
import { streamChat } from '../services/chatService.js';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: number;
  intent?: string;
  confidence?: number;
  emergencyEscalated?: boolean;
  suggestedActions?: {
    type: string;
    label: string;
    payload: Record<string, unknown>;
  }[];
}

interface UseChatOptions {
  locale: Locale;
  stadiumId?: string | undefined;
}

interface UseChatReturn {
  messages: ChatMessage[];
  isStreaming: boolean;
  error: string | null;
  sendMessage: (text: string) => Promise<void>;
  clearMessages: () => void;
}

export function useChat(options: UseChatOptions): UseChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    // Load chat history from localStorage on mount (multi-turn memory)
    try {
      const stored = localStorage.getItem('stadiumops-chat-history');
      if (stored) {
        const parsed = JSON.parse(stored) as ChatMessage[];
        // Only load last 20 messages to prevent unbounded growth
        return parsed.slice(-20);
      }
    } catch {
      // Ignore parse errors
    }
    return [];
  });
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Persist messages to localStorage whenever they change
  useEffect(() => {
    try {
      // Only persist non-streaming messages (skip empty assistant placeholders)
      const toSave = messages.filter((m) => m.content.length > 0).slice(-20);
      localStorage.setItem('stadiumops-chat-history', JSON.stringify(toSave));
    } catch {
      // localStorage might be full or unavailable
    }
  }, [messages]);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isStreaming) return;

      setError(null);

      // Add user message
      const userMessage: ChatMessage = {
        id: `user_${String(Date.now())}`,
        role: 'user',
        content: text,
        createdAt: Date.now(),
      };
      setMessages((prev) => [...prev, userMessage]);

      // Add placeholder assistant message
      const assistantId = `assistant_${String(Date.now())}`;
      const assistantMessage: ChatMessage = {
        id: assistantId,
        role: 'assistant',
        content: '',
        createdAt: Date.now(),
      };
      setMessages((prev) => [...prev, assistantMessage]);

      setIsStreaming(true);

      // Create abort controller for this request
      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        await streamChat(
          {
            message: text,
            locale: options.locale,
            stadiumId: options.stadiumId,
          },
          (event: ChatStreamEvent) => {
            switch (event.type) {
              case 'token':
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId ? { ...m, content: m.content + event.value } : m,
                  ),
                );
                break;

              case 'metadata':
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId
                      ? {
                          ...m,
                          intent: event.intent,
                          confidence: event.confidence,
                          emergencyEscalated: event.emergencyEscalated,
                          suggestedActions: event.suggestedActions,
                        }
                      : m,
                  ),
                );
                break;

              case 'done':
                setIsStreaming(false);
                break;

              case 'error':
                setError(event.message);
                setIsStreaming(false);
                // Remove the empty assistant message
                setMessages((prev) => prev.filter((m) => m.id !== assistantId));
                break;
            }
          },
          controller.signal,
        );
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        if (message.includes('aborted')) {
          // User cancelled — keep partial response
        } else {
          setError(message);
          // Remove the empty assistant message
          setMessages((prev) => prev.filter((m) => m.id !== assistantId));
        }
        setIsStreaming(false);
      } finally {
        abortControllerRef.current = null;
      }
    },
    [isStreaming, options.locale, options.stadiumId],
  );

  const clearMessages = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setMessages([]);
    setError(null);
    setIsStreaming(false);
  }, []);

  return {
    messages,
    isStreaming,
    error,
    sendMessage,
    clearMessages,
  };
}
