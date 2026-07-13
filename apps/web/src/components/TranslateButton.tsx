/**
 * @file apps/web/src/components/TranslateButton.tsx
 * @description Translate button for assistant messages — re-renders the
 *   text in a dropdown-selected language. Uses the same /api/chat endpoint
 *   with the target locale.
 *
 *   Challenge area: Multilingual Assistance
 */

import { type FC, useState } from 'react';
import type { Locale } from '@stadiumops/shared';

import { streamChat } from '../services/chatService.js';

interface TranslateButtonProps {
  /** The original message text to translate. */
  originalText: string;
  /** The locale the original was in. */
  originalLocale: Locale;
}

const TARGET_LOCALES: { code: Locale; name: string }[] = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'ar', name: 'Arabic' },
  { code: 'de', name: 'German' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'zh', name: 'Chinese' },
];

export const TranslateButton: FC<TranslateButtonProps> = ({ originalText, originalLocale }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [translatedText, setTranslatedText] = useState<string | null>(null);
  const [targetLocale, setTargetLocale] = useState<Locale | null>(null);
  const [showOriginal, setShowOriginal] = useState(true);

  const handleTranslate = async (locale: Locale): Promise<void> => {
    if (locale === originalLocale) {
      setTranslatedText(null);
      setTargetLocale(null);
      setShowOriginal(true);
      setIsOpen(false);
      return;
    }

    setTranslating(true);
    setTargetLocale(locale);
    setIsOpen(false);
    setShowOriginal(false);

    try {
      let translation = '';
      await streamChat(
        {
          message: `Translate this to ${TARGET_LOCALES.find((l) => l.code === locale)?.name ?? locale}: "${originalText}"`,
          locale,
        },
        (event) => {
          if (event.type === 'token') {
            translation += event.value;
          }
        },
      );
      setTranslatedText(translation || 'Translation unavailable');
    } catch {
      setTranslatedText('Translation failed — please try again');
    } finally {
      setTranslating(false);
    }
  };

  return (
    <div className="translate-button-container">
      <button
        type="button"
        className="message-action-btn translate-btn"
        onClick={() => {
          setIsOpen(!isOpen);
        }}
        aria-label="Translate this reply"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        🌐 Translate
      </button>

      {isOpen && (
        <ul className="translate-dropdown" role="listbox" aria-label="Select target language">
          {TARGET_LOCALES.map((l) => (
            <li key={l.code} role="option" aria-selected={targetLocale === l.code}>
              <button
                type="button"
                className="translate-option"
                onClick={() => void handleTranslate(l.code)}
              >
                {l.name}
              </button>
            </li>
          ))}
        </ul>
      )}

      {translating && (
        <p className="translate-status" aria-live="polite">
          Translating...
        </p>
      )}

      {translatedText && !translating && (
        <div className="translated-text">
          <p className="translated-content">{translatedText}</p>
          <button
            type="button"
            className="message-action-btn"
            onClick={() => {
              setShowOriginal(!showOriginal);
            }}
          >
            {showOriginal ? 'Show translation' : 'Show original'}
          </button>
        </div>
      )}
    </div>
  );
};
