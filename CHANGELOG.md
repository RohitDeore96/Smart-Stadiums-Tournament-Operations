# Changelog

All notable changes to StadiumOps AI are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [0.4.0] — Multi-Agent Architecture + Innovation Bundle

### Added — Innovation (#72, #73, #74, #75, #76, #78, #79)

- **Function calling** (#74): 4 Gemini functionDeclarations (`get_crowd_status`,
  `file_incident`, `broadcast_announcement`, `find_nearest_facility`) with a
  3-iteration tool dispatch loop. The model can now programmatically file
  incidents, query crowd density, and broadcast announcements instead of just
  suggesting UI buttons.
- **Predictive crush analytics** (#73): Least-squares linear regression on the
  10-reading densityRatio history extrapolates time-to-critical. Per-zone
  warning badges ("⚠ Predicted critical in ~4 min") appear on cards, plus a
  top-level dashboard alert banner when any zone is flagged.
- **Multi-agent orchestration** (#79): Three specialized agents —
  Triage (classifies severity from text), Routing (dispatches responder team),
  Summary (generates shift-end reports) — exposed via `/api/agents?action=...`
  and chainable via `runIncidentResponseChain`.
- **Prompt chaining** (#78): `isComplexQuery` detector identifies multi-intent
  queries ("How crowded is Gate A and should I go there?") and routes them
  through the tool-enabled path for multi-step reasoning.
- **Gemini Vision photo severity** (#75): New `/api/vision` endpoint accepts
  base64 photos with `inlineData` and returns structured JSON (category,
  severity, description, visual cues, safety concerns). `IncidentForm` now has
  a photo upload field that auto-fills severity/category/description.
- **Real sentiment analysis** (#76): New `/api/sentiment` endpoint classifies
  incident descriptions as positive/neutral/negative + emotion + trend.
  `FanSentimentWidget` no longer uses `Math.random()` — it polls real AI
  analysis and combines with fan votes.

### Added — Testing (#37)

- Playwright E2E test suite with 3 specs: `fan-chat`, `volunteer-dashboard`,
  `incident-workflow`. Auto-starts Vite dev server; CI job uploads HTML report
  - traces on failure.
- 25 new unit tests (111 total, up from 86): `tools.test.ts` (tool dispatchers),
  `predictCrush.test.ts` (regression logic), `isComplexQuery` tests in
  `intent.test.ts`.

### Changed

- `api/chat.ts` routes crowd/incident/wayfinding intents (and complex queries)
  through `streamReplyWithTools` instead of plain `streamReply`.
- `api/_lib/gemini.ts` adds `callGeminiWithTools`, `callGeminiWithToolLoop`,
  `streamReplyWithTools` (function-calling support).
- `FanSentimentWidget` UI labels switched from happy/neutral/sad to
  positive/neutral/negative (matches AI output).

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
- 86 unit tests (safety, intent, prompt, schema, chat, app)

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
