/**
 * @file apps/web/src/components/MessageBubble.tsx
 * @description Single chat message bubble — user or assistant.
 *   Renders emergency banner if escalated. Shows suggested actions.
 *   Supports text-to-speech and translation on assistant messages.
 */

import { type FC } from 'react';
import { Link } from 'react-router-dom';
import type { ChatMessage } from '../hooks/useChat.js';
import { useI18n } from '../context/I18nContext.js';
import { TranslateButton } from './TranslateButton.js';

interface MessageBubbleProps {
  message: ChatMessage;
  onSpeak?: ((text: string) => void) | undefined;
  speaking?: boolean;
}

export const MessageBubble: FC<MessageBubbleProps> = ({ message, onSpeak, speaking }) => {
  const { t, locale } = useI18n();
  const isUser = message.role === 'user';
  const isEmergency = Boolean(message.emergencyEscalated);
  const timeStr = new Date(message.createdAt).toLocaleTimeString();
  const roleLabel = isUser ? 'Your message' : 'Assistant reply';
  const emergencyLabel = isEmergency ? ', emergency escalated' : '';
  const intentLabel = message.intent ? `, intent: ${message.intent}` : '';

  return (
    <article
      className={`message message--${message.role} ${isEmergency ? 'message--emergency' : ''}`}
      aria-label={`${roleLabel} at ${timeStr}${emergencyLabel}${intentLabel}`}
      role="article"
    >
      <div className="message-avatar" aria-hidden="true">
        {isUser ? '🧑' : '🤖'}
      </div>
      <div className="message-content">
        {isEmergency && (
          <div className="emergency-banner" role="alert">
            <span aria-hidden="true">🚨</span>
            <span>{t('chat.emergencyBanner')}</span>
          </div>
        )}
        <div className="message-text">
          {message.content || (message.role === 'assistant' ? t('chat.thinking') : '')}
        </div>
        <div className="message-actions-row">
          {!isUser && onSpeak && message.content && (
            <button
              type="button"
              className="message-action-btn"
              onClick={() => {
                onSpeak(message.content);
              }}
              aria-label={speaking ? 'Stop speaking' : 'Read aloud'}
            >
              {speaking ? '⏹️' : '🔊'}
            </button>
          )}
          {!isUser && message.content && message.content.length > 10 && (
            <TranslateButton originalText={message.content} originalLocale={locale} />
          )}
          {message.suggestedActions && message.suggestedActions.length > 0 && (
            <div className="message-actions" role="group" aria-label="Suggested actions">
              {message.suggestedActions.map((action, idx) => (
                <Link
                  key={`${action.type}-${String(idx)}`}
                  to={getActionHref(action.type)}
                  className="suggested-action"
                >
                  {action.label}
                </Link>
              ))}
            </div>
          )}
        </div>
        <time className="message-time" dateTime={new Date(message.createdAt).toISOString()}>
          {timeStr}
        </time>
      </div>
    </article>
  );
};

function getActionHref(type: string): string {
  switch (type) {
    case 'file_incident':
      return '/incidents';
    case 'show_route':
    case 'open_map':
      return '/';
    case 'view_crowd':
      return '/';
    case 'translate':
      return '/chat';
    default:
      return '/';
  }
}
