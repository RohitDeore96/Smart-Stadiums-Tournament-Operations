/**
 * @file apps/web/src/components/ChatPanel.tsx
 * @description Full chat UI — message list, input, send button.
 *   Accessible: aria-live for streaming, keyboard submit, auto-scroll.
 */

import { type FC, useState, useRef, useEffect, type FormEvent, type KeyboardEvent } from 'react';
import { useI18n } from '../context/I18nContext.js';
import { useChat } from '../hooks/useChat.js';
import { MessageBubble } from './MessageBubble.js';

interface ChatPanelProps {
  stadiumId?: string;
}

export const ChatPanel: FC<ChatPanelProps> = ({ stadiumId }) => {
  const { t, locale } = useI18n();
  const { messages, isStreaming, error, sendMessage } = useChat({ locale, stadiumId });
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = (e: FormEvent): void => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isStreaming) return;
    void sendMessage(trimmed);
    setInput('');
  };

  // Ctrl/Cmd+Enter to submit
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>): void => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const hasMessages = messages.length > 0;

  return (
    <section className="chat-panel" aria-label={t('chat.title')}>
      <div className="chat-messages" role="log" aria-live="polite" aria-label="Chat messages">
        {!hasMessages && (
          <div className="chat-welcome">
            <div className="chat-welcome-icon" aria-hidden="true">
              💬
            </div>
            <p className="chat-welcome-text">{t('chat.welcome')}</p>
          </div>
        )}
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}
        {error && (
          <div className="chat-error" role="alert">
            <span aria-hidden="true">⚠️</span>
            <span>{t('chat.error')}</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form className="chat-input-form" onSubmit={handleSubmit}>
        <label htmlFor="chat-input" className="visually-hidden">
          {t('chat.placeholder')}
        </label>
        <textarea
          id="chat-input"
          ref={inputRef}
          className="chat-input"
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
          }}
          onKeyDown={handleKeyDown}
          placeholder={t('chat.placeholder')}
          rows={2}
          maxLength={2000}
          disabled={isStreaming}
          aria-label={t('chat.placeholder')}
        />
        <button
          type="submit"
          className="chat-send-button"
          disabled={!input.trim() || isStreaming}
          aria-label={t('chat.send')}
        >
          {isStreaming ? t('chat.thinking') : t('chat.send')}
        </button>
      </form>
    </section>
  );
};
