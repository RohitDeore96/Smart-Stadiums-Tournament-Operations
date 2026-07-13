# StadiumOps AI — Architecture

> This document describes the deployed Vercel serverless architecture.

## 1. High-level topology

```
                ┌───────────────────────────────────────────────────────┐
                │                  Fan / Volunteer device                │
                │  Browser (PWA) ─ multilingual, a11y-first React UI    │
                └───────────────┬───────────────────────────┬───────────┘
                                │                            │
                  HTTPS (REST + SSE)              localStorage (chat memory)
                                │                            │
                                ▼                            ▼
                ┌────────────────────────┐      ┌────────────────────────┐
                │  Vercel Hosting        │      │  Browser localStorage  │
                │  (CDN, SSL, SPA)       │      │  (chat history, prefs) │
                └────────────────────────┘      └────────────────────────┘
                                │
                  /api/* → Vercel serverless functions
                                │
                                ▼
                ┌────────────────────────────────────────────────────────┐
                │  Vercel Serverless Functions (Node.js, TypeScript)     │
                │  • /api/chat — SSE streaming chat with Gemini          │
                │  • /api/health — health check + cache stats            │
                │  • /api/diagnostics — API key + model diagnostics      │
                │  • Rate limiting (30 req/min per IP, in-memory)        │
                │  • Zod validation on every boundary                    │
                │  • 3-layer prompt injection defense                    │
                │  • Multi-model fallback (5 Gemini variants)            │
                └─────┬──────────────────────────────────────┬──────────┘
                      │                                     │
                      ▼                                     ▼
            ┌─────────────────┐                   ┌──────────────────┐
            │ Google Gemini   │                   │ Firebase         │
            │ REST API        │                   │ Firestore        │
            │ (AI Studio      │                   │ (optional —      │
            │  free tier)     │                   │  falls back to   │
            │                 │                   │  mock data)      │
            └─────────────────┘                   └──────────────────┘
```

## 2. Component responsibilities

| Layer          | Owner             | Responsibility                                                            |
| -------------- | ----------------- | ------------------------------------------------------------------------- |
| UI             | `apps/web`        | Render state, capture input, enforce a11y, call API. No business logic.   |
| API functions  | `api/`            | Parse + validate HTTP, rate limit, safety check, call Gemini, stream SSE. |
| Shared types   | `packages/shared` | Single source of truth for Zod schemas + TS types.                        |
| Infrastructure | `infrastructure/` | Firestore rules, indexes.                                                 |

## 3. Technology decisions

| Choice                | Reason                                                                                               |
| --------------------- | ---------------------------------------------------------------------------------------------------- |
| **Vercel serverless** | Zero-config deployment, free tier, global CDN, automatic HTTPS. No container management needed.      |
| **Direct REST API**   | No SDK dependency — smaller bundle, better error messages, full control over retry + fallback logic. |
| **Vite + React 18**   | Sub-second HMR; tree-shaking; React's Suspense model pairs well with SSE streaming for chat.         |
| **pnpm workspaces**   | Disk-efficient (one copy of each package version), strict about phantom deps, monorepo-native.       |
| **Zod**               | Single schema definition consumed at both the API boundary and the React form — true DRY.            |
| **SSE (not WS)**      | Vercel supports HTTP streaming; SSE is one-way (server→client) which is exactly what chat needs.     |
| **localStorage**      | Multi-turn chat memory without requiring a database. Persists across sessions, no server cost.       |

## 4. Request lifecycle (chat example)

1. Client sends `POST /api/chat` with message + locale in JSON body.
2. Rate limiter checks IP bucket (30 req/min).
3. `ChatMessageSchema.safeParse()` validates + sanitizes body; rejects on error (400).
4. `checkSafety()` scans for 29 emergency keywords; if positive, return canned safety reply (bypasses Gemini).
5. `classifyIntent()` runs rule-based classification (6 intents, confidence scoring).
6. `streamReply()` calls Gemini REST API with 5-model fallback chain.
7. Response is chunked into 3-word pieces and streamed as SSE `event: token` events.
8. After streaming completes, `metadata` event (intent, confidence, suggested actions) is sent.
9. `done` event with token usage is sent; connection closes.

## 5. Security boundaries

```
Internet ─[TLS]─> Vercel CDN ─[TLS]─> Serverless Function ─[HTTPS]─> Gemini REST API
                         │
                         └─[CSP, HSTS, X-Frame-Options, X-Content-Type-Options,
                            Referrer-Policy, Permissions-Policy headers]
```

- **Fan → Web:** HTTPS only, HSTS via Vercel + vercel.json headers.
- **Web → API:** Same-origin (no CORS issues on Vercel).
- **API → Gemini:** API key in env var, never exposed to client.
- **Firestore → Client:** Auth required for all reads/writes (strict rules).

## 6. Multi-model fallback chain

The Gemini client tries 5 models in order until one succeeds:

1. `gemini-2.5-flash` — newest, may be deprecated for some keys
2. `gemini-3.1-flash-lite` — free tier in India (1,000 RPD, 15 RPM)
3. `gemini-3.1-flash` — free tier in India (1,500 RPD, 10 RPM)
4. `gemini-2.0-flash` — older, may have zero quota in some regions
5. `gemini-flash-latest` — alias for latest flash model

Retry logic: 2 attempts with 500ms backoff for 503 (overloaded) and 429 (rate limit, excluding limit:0).

## 7. Cost controls (free tier)

| Control                       | Where set                            | Effect                                            |
| ----------------------------- | ------------------------------------ | ------------------------------------------------- |
| Vercel function `maxDuration` | `vercel.json`                        | 30s for chat, 10s for health, 15s for diagnostics |
| Rate limiting                 | `api/_lib/rateLimit.ts`              | 30 req/min per IP (in-memory per instance)        |
| Gemini `maxOutputTokens`      | `api/_lib/gemini.ts`                 | 500 tokens per response                           |
| LRU cache                     | `api/_lib/gemini.ts`                 | 100 entries, 5-min TTL, SHA-256 keys              |
| Page Visibility API           | `apps/web/src/hooks/useCrowdData.ts` | Pauses polling when tab is not focused            |
| Intent classifier             | `api/_lib/intent.ts`                 | Rule-based, saves a Gemini call for metadata      |
| Emergency fast-path           | `api/_lib/safety.ts`                 | 29 patterns bypass Gemini entirely (zero tokens)  |
