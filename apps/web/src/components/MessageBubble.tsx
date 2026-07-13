/**
 * @file apps/web/src/components/MessageBubble.tsx
 * @description Single chat message bubble — user or assistant.
 *   Renders emergency banner if escalated. Shows suggested actions.
 */

import { type FC } from 'react';
import type { ChatMessage } from '../hooks/useChat.js';
import { useI18n } from '../context/I18nContext.js';

interface MessageBubbleProps {
  message: ChatMessage;
}

export const MessageBubble: FC<MessageBubbleProps> = ({ message }) => {
  const { t } = useI18n();
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
        {message.suggestedActions && message.suggestedActions.length > 0 && (
          <div className="message-actions" role="group" aria-label="Suggested actions">
            {message.suggestedActions.map((action, idx) => (
              <a
                key={`${action.type}-${String(idx)}`}
                href={getActionHref(action.type)}
                className="suggested-action"
              >
                {action.label}
              </a>
            ))}
          </div>
        )}
        <time className="message-time" dateTime={new Date(message.createdAt).toISOString()}>
          {new Date(message.createdAt).toLocaleTimeString()}
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
