/**
 * @file apps/web/src/hooks/useVoice.ts
 * @description Voice input (Speech Recognition) + text-to-speech (Speech Synthesis).
 *   Uses the Web Speech API — no library needed, built into modern browsers.
 *
 *   Challenge areas: Accessibility + Multilingual Assistance
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import type { Locale } from '@stadiumops/shared';

const LOCALE_MAP: Record<Locale, string> = {
  en: 'en-US',
  es: 'es-ES',
  fr: 'fr-FR',
  ar: 'ar-SA',
  de: 'de-DE',
  pt: 'pt-BR',
  ja: 'ja-JP',
  ko: 'ko-KR',
  zh: 'zh-CN',
};

type SpeechRecognitionType = new () => SpeechRecognitionInstance;

interface SpeechRecognitionInstance {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((event: unknown) => void) | null;
  onerror: ((event: unknown) => void) | null;
  onend: (() => void) | null;
}

function getSpeechRecognition(): SpeechRecognitionType | null {
  if (typeof window === 'undefined') return null;
  return (
    (window as unknown as { SpeechRecognition?: SpeechRecognitionType }).SpeechRecognition ??
    (window as unknown as { webkitSpeechRecognition?: SpeechRecognitionType })
      .webkitSpeechRecognition ??
    null
  );
}

interface UseVoiceInputReturn {
  listening: boolean;
  transcript: string;
  supported: boolean;
  start: () => void;
  stop: () => void;
  reset: () => void;
}

/**
 * Hook for voice input using the Web Speech API.
 * Returns listening state, transcript, and start/stop controls.
 */
export function useVoiceInput(locale: Locale): UseVoiceInputReturn {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const SpeechRecognition = getSpeechRecognition();
  const supported = SpeechRecognition !== null;

  const start = useCallback(() => {
    if (!SpeechRecognition) return;
    if (listening) return;

    const recognition = new SpeechRecognition();
    recognition.lang = LOCALE_MAP[locale] ?? 'en-US';
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onresult = (event: unknown) => {
      // SpeechRecognitionEvent has results as a SpeechRecognitionResultList
      // which is array-like. Convert to array for iteration.
      const results = Array.from(
        (event as { results: ArrayLike<ArrayLike<{ transcript: string }>> }).results,
      );
      let final = '';
      for (const entry of results) {
        if (entry?.[0]?.transcript) {
          final += entry[0].transcript;
        }
      }
      setTranscript(final);
    };

    recognition.onerror = () => {
      setListening(false);
    };

    recognition.onend = () => {
      setListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  }, [SpeechRecognition, listening, locale]);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
    setListening(false);
  }, []);

  const reset = useCallback(() => {
    setTranscript('');
  }, []);

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
    };
  }, []);

  return { listening, transcript, supported, start, stop, reset };
}

/**
 * Speaks the given text using the Web Speech API.
 * Returns a function that can be called to speak.
 */
export function useSpeech(locale: Locale): {
  speak: (text: string) => void;
  stop: () => void;
  speaking: boolean;
  supported: boolean;
} {
  const [speaking, setSpeaking] = useState(false);
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window;

  const speak = useCallback(
    (text: string) => {
      if (!supported || !text) return;

      // Cancel any ongoing speech
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = LOCALE_MAP[locale] ?? 'en-US';
      utterance.rate = 0.95;
      utterance.onstart = () => {
        setSpeaking(true);
      };
      utterance.onend = () => {
        setSpeaking(false);
      };
      utterance.onerror = () => {
        setSpeaking(false);
      };

      window.speechSynthesis.speak(utterance);
    },
    [locale, supported],
  );

  const stop = useCallback(() => {
    if (!supported) return;
    window.speechSynthesis.cancel();
    setSpeaking(false);
  }, [supported]);

  return { speak, stop, speaking, supported };
}
