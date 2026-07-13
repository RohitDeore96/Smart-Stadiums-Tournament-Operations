# Changelog

All notable changes to StadiumOps AI are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Real unit tests for `@stadiumops/shared` schemas (`chat.test.ts`, `incident.test.ts`) — 21 tests covering `sanitizeUserText` and Zod schemas.
- ESLint config + vitest config for `packages/shared` (was a stub).
- `check-secrets` gate job in `deploy.yml` so deploy workflow skips cleanly when secrets aren't configured (instead of failing noisily).
- `CHANGELOG.md`.

### Fixed

- **CI lint failures** (root cause of 5 red CI runs):
  - `apps/api/src/utils/errors.ts` — added explicit `AppError` return types to all 9 error factory functions (`@typescript-eslint/explicit-module-boundary-types`).
  - `apps/api/src/app.ts` — wrapped `Math.ceil()` in `String()` for template literal (`@typescript-eslint/restrict-template-expressions`); removed unnecessary `async` from health route (`@typescript-eslint/require-await`).
  - `apps/api/src/index.ts` — typed all 3 `catch` callbacks as `unknown` (`@typescript-eslint/use-unknown-in-catch-callback-variable`).
  - `apps/web/src/App.tsx` — replaced deprecated global `JSX.Element` with `ReactElement` import (`@typescript-eslint/no-deprecated`); wrapped `r.status` in `String()`; typed catch as `unknown` with safe narrowing; removed void-expression arrow shorthand.
- `scripts/seed-stadiums.ts` — typed catch callback as `unknown`.
- `apps/api/vitest.config.ts` — added `setupFiles` reference (was missing).
- `apps/web/vite.config.ts` — `defineConfig` imported from `vitest/config` (was `vite/config` which doesn't include the `test` field).
- `apps/web/tests/setup.ts` — added `afterEach(cleanup)` (auto-cleanup needs globals or explicit cleanup with `globals: false`).
- `.github/workflows/ci.yml` — removed nonexistent `test:a11y` step (Phase 3 adds it); fixed `pnpm test:coverage` to `pnpm -r exec vitest run --coverage` (root had no such script).

## [0.1.0] — Phase 1 initial release

### Added

- **Monorepo structure** via pnpm workspaces (`apps/api`, `apps/web`, `packages/shared`).
- **Shared package** `@stadiumops/shared` — domain types (`Stadium`, `Match`, `Incident`, `ChatMessage`, `ChatSession`) and Zod schemas with `sanitizeUserText` for prompt-injection defense.
- **Backend** (`apps/api`) — Fastify + TypeScript with helmet, CORS, rate-limit, sensible plugins; Pino logger with secret redaction; typed `AppError` hierarchy; bootable `/api/v1/health` route.
- **Frontend** (`apps/web`) — Vite + React 18 + TypeScript; WCAG 2.1 AA global CSS (skip link, focus rings, reduced-motion); bootable `App.tsx` with live health check.
- **Dockerfile** — 3-stage build, distroless runtime (~120 MB), non-root uid 65534, no shell.
- **GitHub Actions** — `ci.yml` (lint + typecheck + test + build + coverage) and `deploy.yml` (Cloud Run + Firebase Hosting).
- **Firestore rules** — strict, auth required everywhere, owner-only writes, no client-side role escalation.
- **Documentation** — `README.md` (with badges), `ARCHITECTURE.md`, `DATA_MODELS.md`, `API_CONTRACTS.md`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`.
- **Community files** — `LICENSE` (MIT), `CODEOWNERS`, issue templates, PR template, `dependabot.yml`.
- **Scripts** — `dev-up.sh` (bootstrap), `health-check.sh` (smoke test), `seed-stadiums.ts` (16 FIFA 2026 host stadiums).

[Unreleased]: https://github.com/RohitDeore96/Smart-Stadiums-Tournament-Operations/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/RohitDeore96/Smart-Stadiums-Tournament-Operations/releases/tag/v0.1.0
