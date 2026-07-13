# Phase 1 placeholders

This directory is intentionally minimal in Phase 1. Phase 2 fills:

- `routes/` — Fastify route definitions
- `controllers/` — Request orchestration
- `services/` — `geminiService`, `firestoreService`, `intentService`, `safetyService`
- `middleware/` — `authMiddleware`, `validateMiddleware`, `rateLimitMiddleware`
- `schemas/` — Route-specific Zod schemas (most come from `@stadiumops/shared`)
- `utils/` — `logger.ts`, `errors.ts`, `cache.ts`
- `tests/unit/` — Vitest unit tests
- `tests/integration/` — Supertest integration tests
