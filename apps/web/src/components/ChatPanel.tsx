/**
 * @file apps/web/src/components/ChatPanel.tsx
 * @description Full chat UI — message list, voice input, text-to-speech,
 *   input, send button. Accessible: aria-live for streaming, keyboard submit.
 */

import { type FC, useState, useRef, useEffect, type FormEvent, type KeyboardEvent } from 'react';
import { useI18n } from '../context/I18nContext.js';
import { useChat } from '../hooks/useChat.js';
import { useVoiceInput, useSpeech } from '../hooks/useVoice.js';
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

  const {
    listening,
    transcript,
    supported: voiceSupported,
    start,
    stop,
    reset,
  } = useVoiceInput(locale);
  const { speak, speaking, stop: stopSpeech, supported: ttsSupported } = useSpeech(locale);

  // Update input when voice transcript changes
  useEffect(() => {
    if (transcript) {
      setInput(transcript);
    }
  }, [transcript]);

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
    reset();
  };

  // Ctrl/Cmd+Enter to submit
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>): void => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleVoiceToggle = (): void => {
    if (listening) {
      stop();
    } else {
      reset();
      setInput('');
      start();
    }
  };

  const handleSpeak = (text: string): void => {
    if (speaking) {
      stopSpeech();
    } else {
      speak(text);
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
          <MessageBubble
            key={message.id}
            message={message}
            onSpeak={ttsSupported ? handleSpeak : undefined}
            speaking={speaking}
          />
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
          placeholder={listening ? '🎤 Listening...' : t('chat.placeholder')}
          rows={2}
          maxLength={2000}
          disabled={isStreaming}
          aria-label={t('chat.placeholder')}
        />
        {voiceSupported && (
          <button
            type="button"
            className={`voice-button ${listening ? 'voice-button--active' : ''}`}
            onClick={handleVoiceToggle}
            disabled={isStreaming}
            aria-label={listening ? 'Stop voice input' : 'Start voice input'}
            aria-pressed={listening}
          >
            {listening ? '⏹️' : '🎤'}
          </button>
        )}
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
