# StadiumOps AI — Architecture

> Phase 1 architecture document. Covers system topology, data flow, and rationale for each technology choice.

## 1. High-level topology

```
                ┌───────────────────────────────────────────────────────┐
                │                  Fan / Staff device                    │
                │  Browser (PWA) ─ multilingual, a11y-first React UI    │
                └───────────────┬───────────────────────────┬───────────┘
                                │                            │
                  HTTPS (REST + SSE)              Firebase Auth (OIDC)
                                │                            │
                                ▼                            ▼
                ┌────────────────────────┐      ┌────────────────────────┐
                │  Firebase Hosting      │      │  Firebase Auth         │
                │  (CDN, SSL, SPA)       │      │  (Email/Google)        │
                └────────────────────────┘      └────────────────────────┘
                                │                            │
                                ▼                            ▼
                ┌────────────────────────────────────────────────────────┐
                │  Cloud Run — stadiumops-api (Fastify, Node 20)         │
                │  • Zod input validation on every route                 │
                │  • Firebase Admin token verification                   │
                │  • Gemini service (cache + stream + injection defense) │
                │  • Firestore service (paginated reads/writes)          │
                └─────┬──────────────────┬────────────────────┬──────────┘
                      │                  │                    │
                      ▼                  ▼                    ▼
            ┌─────────────────┐ ┌──────────────────┐ ┌──────────────────┐
            │ Firestore       │ │ Secret Manager   │ │ Vertex AI /      │
            │ (NoSQL)         │ │ (Gemini key)     │ │ Gemini API       │
            └─────────────────┘ └──────────────────┘ └──────────────────┘
```

## 2. Component responsibilities

| Layer          | Owner                  | Responsibility                                                              |
| -------------- | ---------------------- | --------------------------------------------------------------------------- |
| UI             | `apps/web`             | Render state, capture input, enforce a11y, call API. No business logic.     |
| API routes     | `apps/api/routes`      | Parse + validate HTTP, auth check, delegate to controller.                  |
| Controllers    | `apps/api/controllers` | Orchestrate services, shape responses, no direct DB/AI calls.               |
| Services       | `apps/api/services`    | All business logic: `geminiService`, `firestoreService`, `incidentService`. |
| Shared types   | `packages/shared`      | Single source of truth for types + Zod schemas, imported by web & api.      |
| Infrastructure | `infrastructure/`      | Firestore rules, indexes, IaC snippets.                                     |

## 3. Why these specific technologies?

| Choice              | Reason                                                                                                       |
| ------------------- | ------------------------------------------------------------------------------------------------------------ |
| **Fastify**         | ~2× faster request throughput than Express; built-in schema validation hooks; first-class TS support.        |
| **Vite + React 18** | Sub-second HMR; tree-shaking; React's Suspense model pairs well with SSE streaming for chat.                 |
| **pnpm workspaces** | Disk-efficient (one copy of each package version), strict about phantom deps, monorepo-native.               |
| **Zod**             | Single schema definition consumed at both the Fastify route boundary and the React form — true DRY.          |
| **Distroless**      | ~120 MB final image, no shell, no package manager — vastly smaller attack surface than Alpine.               |
| **Secret Manager**  | Audit-logged secret access, automatic versioning, IAM-controlled — far safer than env vars baked into image. |
| **SSE (not WS)**    | Cloud Run supports HTTP streaming; SSE is one-way (server→client) which is exactly what chat needs.          |

## 4. Request lifecycle (chat example)

1. Client sends `POST /api/v1/chat` with Firebase ID token in `Authorization: Bearer`.
2. `authMiddleware` verifies token via Firebase Admin; attaches `request.user`.
3. `rateLimitMiddleware` checks user bucket (60 req/min).
4. `validate(ChatMessageSchema)` parses + sanitizes body; rejects on error.
5. `chatController.stream()` calls:
   - `intentService.classify(message)` → returns `ChatIntent` via a cheap Gemini call.
   - `safetyService.checkEmergency(message)` → if positive, escalate + page responders.
   - `geminiService.streamReply(systemPrompt, history, message)` → yields token chunks.
6. Each chunk is written as an SSE event: `event: token\ndata: {…}\n\n`.
7. On completion, controller emits `metadata` + `done` events and persists the turn to Firestore.

## 5. Security boundaries

```
Internet ─[TLS]─> Firebase Hosting CDN ─[TLS]─> Cloud Run ─[mTLS via Google]─> Firestore / Secret Manager / Gemini
                         │
                         └─[OIDC token]─> Firebase Auth (verifies fan identity)
```

- **Fan → Web:** HTTPS only, HSTS via Firebase Hosting headers.
- **Web → API:** Bearer JWT (Firebase ID token, 1-hour TTL).
- **API → Gemini:** API key pulled from Secret Manager at boot, never written to disk.
- **API → Firestore:** Service account with Firestore User role only (no Admin).
- **Firestore → Client:** Locked down by `firestore.rules` — every collection requires `request.auth != null`.

## 6. Trial-billing cost controls (lock these in before going live)

| Control                           | Where set                       | Effect                                    |
| --------------------------------- | ------------------------------- | ----------------------------------------- |
| Cloud Run `min-instances = 0`     | `deploy.yml`                    | Service scales to zero when idle.         |
| Cloud Run `max-instances = 3`     | `deploy.yml`                    | Caps concurrency-driven cost.             |
| Cloud Run `memory = 512Mi`        | `deploy.yml`                    | Sufficient for Node + LRU cache.          |
| Firestore daily read budget alert | GCP Console → Billing → Budgets | Email at 80% of $5/day cap.               |
| Gemini API quota                  | GCP Console → APIs → Quotas     | 60 req/min default; raise only if needed. |
