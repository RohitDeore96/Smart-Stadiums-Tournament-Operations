# StadiumOps AI — Contributing Guide

Thanks for helping build StadiumOps AI! This doc covers the rules every contribution must follow to keep the codebase production-grade.

## 1. The 5 non-negotiable pillars

Every PR is reviewed against these. A PR that breaks any pillar is **blocked**, not nitpicked.

| Pillar        | Minimum bar                                                                                             |
| ------------- | ------------------------------------------------------------------------------------------------------- |
| Code Quality  | TS `strict: true`, no `any`, no `eslint-disable` without a comment justifying it, files ≤ 300 LOC       |
| Security      | All inputs validated with Zod, no secrets in code, prompt-injection defense on every GenAI call         |
| Efficiency    | No N+1 Firestore reads, paginated list endpoints, no synchronous I/O on the hot path                    |
| Testing       | Unit tests for every service function, integration tests for every route, ≥ 80% coverage on `services/` |
| Accessibility | WCAG 2.1 AA — semantic HTML, ARIA on every interactive element, keyboard nav works, axe-core tests pass |

## 2. Local setup

```bash
git clone https://github.com/RohitDeore96/Smart-Stadiums-Tournament-Operations.git
cd Smart-Stadiums-Tournament-Operations
nvm use                  # uses .nvmrc → Node 20.11
npm install -g pnpm@9
pnpm install
cp .env.example .env     # fill in FIREBASE_* and GEMINI_API_KEY
```

## 3. Development workflow

```bash
pnpm dev:api              # backend on :8080 (hot reload via tsx watch)
pnpm dev:web              # frontend on :5173 (Vite HMR)
pnpm test                 # run all unit + integration tests
pnpm test:coverage        # generate coverage report
pnpm lint                 # eslint across all workspaces
pnpm typecheck            # tsc --noEmit across all workspaces
pnpm format               # prettier write
```

## 4. Commit message convention

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:** `feat` `fix` `docs` `style` `refactor` `test` `chore` `ci` `perf`

**Examples:**

```
feat(api): add streaming chat endpoint with prompt-injection defense
fix(web): restore keyboard focus trap on incident modal
docs(readme): add trial-billing cost controls section
test(api): cover intentService edge cases
```

## 5. Branch naming

- `feat/<short-description>` — new features
- `fix/<short-description>` — bug fixes
- `chore/<short-description>` — tooling, deps, CI
- `docs/<short-description>` — documentation only

## 6. Pull request checklist

Before requesting review, confirm:

- [ ] Branch is up to date with `main`
- [ ] `pnpm lint` passes with zero warnings
- [ ] `pnpm typecheck` passes
- [ ] `pnpm test` passes
- [ ] New code has unit tests
- [ ] New routes have integration tests
- [ ] No secrets in code or commit history
- [ ] No `console.log` left in production code (use the `logger` util)
- [ ] PR description explains the "why", not just the "what"
- [ ] Linked issue is referenced (`Closes #123`)

## 7. Code review etiquette

- Reviewers focus on the 5 pillars, not personal preference
- Use [conventional comments](https://conventionalcomments.org/): prefix with `nit:`, `suggestion:`, `issue:`, `question:`, `praise:`
- Approve with "LGTM" only when the PR meets the bar — don't rubber-stamp
- Author must address every comment, even if just "acknowledged, will follow up in #XYZ"

## 8. Release process

- We use semantic versioning (`v0.1.0` → `v0.1.1` for patch, `v0.2.0` for minor, `v1.0.0` for major)
- Releases are tagged on `main` after CI passes
- Cloud Run + Firebase Hosting deploy automatically on push to `main`
