/**
 * @file packages/shared/src/schemas/chat.test.ts
 * @description Unit tests for sanitizeUserText and ChatMessageSchema.
 *   These run in both the API and web test pipelines indirectly via the
 *   shared package import — proves the prompt-injection defense works.
 */

import { describe, it, expect } from 'vitest';
import { ChatMessageSchema, sanitizeUserText } from './chat.js';

describe('sanitizeUserText', () => {
  it('strips control characters except newlines and tabs', () => {
    // Control chars (\u0000, \u0007) are removed; \n and \t survive, then
    // whitespace-collapse turns the \n into a single space.
    const input = 'hello\u0000world\u0007end\ntab\there';
    expect(sanitizeUserText(input)).toBe('helloworldend tab here');
  });

  it('strips zero-width characters used to bypass content filters', () => {
    const input = 'in\u200Bnocuous\u200Dtext\uFEFF';
    expect(sanitizeUserText(input)).toBe('innocuoustext');
  });

  it('strips RTL/LTR override characters (bidi spoofing)', () => {
    const input = 'nor\u202Emal_text\u202C';
    expect(sanitizeUserText(input)).toBe('normal_text');
  });

  it('collapses runs of whitespace', () => {
    expect(sanitizeUserText('hello    world\n\n\nend')).toBe('hello world end');
  });

  it('trims leading and trailing whitespace', () => {
    expect(sanitizeUserText('   hello   ')).toBe('hello');
  });
});

describe('ChatMessageSchema', () => {
  it('parses a valid minimal message', () => {
    const result = ChatMessageSchema.parse({ message: 'Where is Gate A?' });
    expect(result.message).toBe('Where is Gate A?');
    expect(result.locale).toBe('en'); // default
  });

  it('sanitizes the message field automatically', () => {
    const result = ChatMessageSchema.parse({
      message: 'hello\u0000world\u200Bend',
    });
    expect(result.message).toBe('helloworldend');
  });

  it('rejects empty messages', () => {
    expect(() => ChatMessageSchema.parse({ message: '' })).toThrow();
  });

  it('rejects messages over 2000 characters', () => {
    const long = 'a'.repeat(2001);
    expect(() => ChatMessageSchema.parse({ message: long })).toThrow();
  });

  it('accepts all supported locales', () => {
    for (const locale of ['en', 'es', 'fr', 'ar', 'de', 'pt', 'ja', 'ko', 'zh']) {
      const result = ChatMessageSchema.parse({ message: 'hi', locale });
      expect(result.locale).toBe(locale);
    }
  });

  it('rejects unsupported locales', () => {
    expect(() => ChatMessageSchema.parse({ message: 'hi', locale: 'xx' })).toThrow();
  });

  it('accepts optional sessionId, stadiumId, matchId', () => {
    const result = ChatMessageSchema.parse({
      message: 'hi',
      sessionId: 'sess_abc12345',
      stadiumId: 'st_metlife',
      matchId: 'm03',
    });
    expect(result.sessionId).toBe('sess_abc12345');
    expect(result.stadiumId).toBe('st_metlife');
    expect(result.matchId).toBe('m03');
  });
});
