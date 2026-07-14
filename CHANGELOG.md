# Changelog

All notable changes to StadiumOps AI are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [0.3.0] — Vercel Serverless + Full Interactivity

### Added

- Vercel serverless functions: /api/chat (SSE streaming), /api/health, /api/diagnostics
- Direct Gemini REST API integration (no SDK, 3-model fallback chain)
- 3-layer prompt injection defense (system prompt + XML delimiters + sanitizeUserText)
- 29 emergency keyword patterns with canned safety replies
- Rule-based intent classifier (6 intents, confidence scoring)
- LRU cache (100 entries, 5-min TTL, SHA-256 keys)
- Rate limiting (30 req/min per IP)
- Interactive SVG stadium map with live crowd heatmap (12 zones)
- Voice input + text-to-speech (Web Speech API, 9 locales)
- Match countdown ticker (live timer + simulated score)
- Announcements ticker (CSS marquee, pause on hover)
- Crowd zone cards with trend sparklines (10-reading history)
- Fan sentiment poll widget (live simulated voting)
- QR code generator for incident sharing (local canvas, no third-party API)
- Translate button on assistant messages (9 locales)
- Announcements page (Organizer persona — publish, activate, delete)
- Multi-turn chat memory (localStorage, last 20 messages)
- ErrorBoundary component (catches render-time exceptions)
- React.lazy + Suspense for code-splitting 4 pages
- Page Visibility API (pauses polling when tab not focused)
- 9-language i18n with RTL Arabic support
- WCAG 2.1 AA: skip link, ARIA live, keyboard nav, reduced-motion
- Strict Firestore rules (auth required for all reads/writes)
- CSP + HSTS + security headers on all routes
- 82 unit tests (safety, intent, prompt, schema, chat, app)

### Changed

- Migrated from Cloud Run (Fastify) to Vercel serverless functions
- Removed @google/generative-ai SDK in favor of direct REST API calls
- Removed apps/api/ directory (Fastify backend — not deployed)
- API key moved from URL query string to x-goog-api-key header
- Diagnostics endpoint no longer leaks key prefix or length

### Security

- 3-layer prompt injection defense
- API key in x-goog-api-key header (not URL query)
- Strict Firestore rules (auth required)
- CSP with frame-ancestors 'none', base-uri 'self', form-action 'self'
- Rate limiting (30 req/min per IP)
- No third-party API calls (QR codes generated locally)

## [0.1.0] — Initial Architecture

### Added

- pnpm monorepo structure (api/, apps/web/, packages/shared/)
- Shared Zod schemas + TypeScript types package
- Vite + React 18 + TypeScript frontend
- Vercel serverless functions with TypeScript
- GitHub Actions CI/CD (lint + typecheck + test + build)
- Documentation: README, ARCHITECTURE, DATA_MODELS, API_CONTRACTS
- Community files: LICENSE, CONTRIBUTING, CODE_OF_CONDUCT, SECURITY
- GitHub: Issue templates, PR template, CODEOWNERS, Dependabot
