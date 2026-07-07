<div align="center">

# ⚽ StadiumOps AI

### GenAI-enabled stadium operations, crowd management & fan experience for FIFA World Cup 2026

[![Phase](https://img.shields.io/badge/phase-1%20architecture-00d4ff?style=flat-square)](docs/ARCHITECTURE.md)
[![Node](https://img.shields.io/badge/node-20.11%2B-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/typescript-5.6%2B-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue?style=flat-square)](LICENSE)
[![PRs welcome](https://img.shields.io/badge/PRs-welcome-brightgreen?style=flat-square)](CONTRIBUTING.md)

</div>

---

## 📋 What is this?

StadiumOps AI is a production-grade, GenAI-enabled platform that helps stadium operators and fans during the FIFA World Cup 2026. It combines:

- **Real-time multilingual chat assistance** for fans (wayfinding, facilities, translation, emergencies)
- **Predictive crowd routing** using live zone-density data
- **Operational intelligence** for staff dashboards (incidents, announcements, crowd hotspots)

Built across three phases. Currently in **Phase 1: Architecture & CI/CD design**.

## ✨ The 5 pillars (enforced in every PR)

| Pillar            | How we enforce it                                                                                                 |
| ----------------- | ----------------------------------------------------------------------------------------------------------------- |
| **Code Quality**  | TS `strict: true`, Zod at every API boundary, files ≤ 300 LOC, DRY shared types package                           |
| **Security**      | Input validation everywhere, prompt-injection defense on GenAI, strict Firestore rules, secrets in Secret Manager |
| **Efficiency**    | SSE streaming for chat, LRU cache for repeat queries, distroless Docker image (~120 MB), scale-to-zero            |
| **Testing**       | Vitest unit + Supertest integration, ≥ 80% coverage on services/, axe-core a11y tests in CI                       |
| **Accessibility** | WCAG 2.1 AA — semantic HTML, ARIA, full keyboard nav, 4.5:1 contrast, `prefers-reduced-motion` respected          |

## 🏗️ Monorepo layout

```
stadiumops-ai/
├── .github/
│   ├── workflows/
│   │   ├── ci.yml              Lint + typecheck + test + build on every PR
│   │   └── deploy.yml          Auto-deploy to Cloud Run + Firebase Hosting on push to main
│   ├── ISSUE_TEMPLATE/         bug_report.md, feature_request.md
│   ├── PULL_REQUEST_TEMPLATE.md
│   ├── CODEOWNERS              Mandatory reviewers per area
│   ├── SECURITY.md             Vulnerability disclosure policy
│   └── dependabot.yml          Weekly dependency updates
├── apps/
│   ├── api/                    Fastify + TypeScript backend → Cloud Run
│   │   ├── src/
│   │   │   ├── config/         env.ts (Zod-validated)
│   │   │   ├── controllers/    (Phase 2)
│   │   │   ├── middleware/     (Phase 2)
│   │   │   ├── routes/         (Phase 2)
│   │   │   ├── services/       (Phase 2)
│   │   │   ├── utils/          logger.ts, errors.ts
│   │   │   ├── app.ts          Fastify factory
│   │   │   └── index.ts        Cloud Run entry point
│   │   ├── tests/              Vitest unit + integration
│   │   ├── Dockerfile          3-stage distroless build
│   │   └── package.json
│   └── web/                    Vite + React + TypeScript frontend → Firebase Hosting
│       ├── src/
│       │   ├── components/     (Phase 3)
│       │   ├── pages/          (Phase 3)
│       │   ├── hooks/          (Phase 3)
│       │   ├── services/       (Phase 3)
│       │   ├── context/        (Phase 3)
│       │   ├── i18n/           (Phase 3)
│       │   ├── styles/         global.css (a11y-first)
│       │   ├── App.tsx         Phase 1 placeholder
│       │   └── main.tsx
│       ├── tests/              Vitest + Testing Library + axe
│       ├── public/             favicon.svg
│       ├── index.html
│       ├── vite.config.ts
│       ├── firebase.json
│       └── package.json
├── packages/
│   └── shared/                 THE DRY KEYSTONE — types + Zod schemas used by both apps
│       └── src/
│           ├── types/          api.ts, chat.ts, match.ts, stadium.ts, incident.ts
│           └── schemas/        chat.ts, incident.ts (with sanitizeUserText)
├── infrastructure/
│   └── firebase-rules/
│       ├── firestore.rules     Strict rules — auth required everywhere
│       └── firestore.indexes.json
├── docs/
│   ├── ARCHITECTURE.md         Topology, request lifecycle, security boundaries
│   ├── DATA_MODELS.md          Firestore schema, sizing estimates, indexes
│   └── API_CONTRACTS.md        REST + SSE contracts, rate limits, error envelopes
├── scripts/
│   ├── dev-up.sh               Bootstrap fresh checkout
│   ├── health-check.sh         Smoke test for local services
│   └── seed-stadiums.ts        Seed 16 FIFA 2026 host stadiums
├── .editorconfig
├── .env.example
├── .gitignore
├── .nvmrc                      Node 20.11
├── .prettierrc.json
├── .prettierignore
├── CODE_OF_CONDUCT.md
├── CONTRIBUTING.md
├── LICENSE                     MIT
├── Makefile                    Common commands (run `make help`)
├── README.md                   This file
├── eslint.config.cjs           Flat config, strict TS rules
├── package.json                Root workspace
└── pnpm-workspace.yaml         pnpm workspaces
```

## 🚀 Quick start

### Prerequisites

- **Node.js 20.11+** — install via [nvm](https://github.com/nvm-sh/nvm): `nvm install 20 && nvm use 20`
- **pnpm 9** — install: `npm install -g pnpm@9`
- **(Optional for deploy)** `gcloud` CLI, `firebase` CLI, Docker

### One-command bootstrap

```bash
git clone https://github.com/RohitDeore96/Smart-Stadiums-Tournament-Operations.git
cd Smart-Stadiums-Tournament-Operations
./scripts/dev-up.sh
```

This script verifies prerequisites, installs dependencies, and copies `.env.example` → `.env`.

### Run the dev servers

```bash
# Terminal 1 — backend
pnpm dev:api
# → Fastify on http://localhost:8080

# Terminal 2 — frontend
pnpm dev:web
# → Vite on http://localhost:5173

# Verify both are healthy
make -C /path/to/repo help    # see all targets
./scripts/health-check.sh
```

Open **http://localhost:5173** — you should see the StadiumOps AI landing page with a live backend health check.

## ☁️ Cloud setup (beginner-friendly, trial-billing safe)

See **[Beginner's Cloud Setup Guide](docs/ARCHITECTURE.md#6-trial-billing-cost-controls)** in the Architecture doc. Highlights:

- ✅ Cloud Run with `min-instances=0` → scales to zero when idle (no surprise bills)
- ✅ Firebase Spark plan covers all dev usage (50k Firestore reads/day free)
- ✅ Gemini API free tier (15 RPM, 1500/day) sufficient for dev
- ✅ Trial $300 credit lasts 90 days — plenty for development

## 🔑 Required GitHub Secrets (for CI/CD)

Set these in your repo: **Settings → Secrets and variables → Actions → New repository secret**

| Secret name                         | Source                                                 |
| ----------------------------------- | ------------------------------------------------------ |
| `GCP_PROJECT_ID`                    | Your GCP project ID (e.g. `stadiumops-ai-dev`)         |
| `GCP_SA_KEY`                        | JSON content of `github-deployer` service account key  |
| `FIREBASE_TOKEN`                    | From `firebase login:ci`                               |
| `GEMINI_API_KEY`                    | From https://aistudio.google.com/app/apikey (dev only) |
| `VITE_FIREBASE_API_KEY`             | Firebase web app config                                |
| `VITE_FIREBASE_AUTH_DOMAIN`         | `stadiumops-ai-dev.firebaseapp.com`                    |
| `VITE_FIREBASE_STORAGE_BUCKET`      | `stadiumops-ai-dev.appspot.com`                        |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | From Firebase console                                  |
| `VITE_FIREBASE_APP_ID`              | From Firebase console                                  |

## 📦 Available commands

Run these from the repo root:

| Command                     | What it does                                         |
| --------------------------- | ---------------------------------------------------- |
| `pnpm install`              | Install all workspace dependencies                   |
| `pnpm dev:api`              | Start backend dev server (Fastify on :8080)          |
| `pnpm dev:web`              | Start frontend dev server (Vite on :5173)            |
| `pnpm build`                | Build all workspaces                                 |
| `pnpm test`                 | Run all unit + integration tests                     |
| `pnpm test:coverage`        | Run tests with coverage report                       |
| `pnpm lint`                 | ESLint across all workspaces (zero warnings allowed) |
| `pnpm typecheck`            | `tsc --noEmit` across all workspaces                 |
| `pnpm format`               | Prettier write                                       |
| `pnpm format:check`         | Prettier check (CI uses this)                        |
| `./scripts/dev-up.sh`       | Bootstrap a fresh checkout                           |
| `./scripts/health-check.sh` | Smoke test API + Web                                 |
| `make help`                 | Show all Makefile targets                            |

## 🧪 Phase roadmap

| Phase | Status   | Deliverables                                                                                       |
| ----- | -------- | -------------------------------------------------------------------------------------------------- |
| **1** | ✅ Done  | Monorepo, shared types/schemas, Firestore models, API contracts, Dockerfile, CI/CD, security rules |
| **2** | 🔜 Next  | Cloud Run backend, Gemini service w/ prompt-injection defense, full Vitest + Supertest test suite  |
| **3** | ⏳ Later | Accessible React frontend, Firebase Auth, strict Firestore rules, axe-core a11y tests              |

## 🛡️ Security

See **[SECURITY.md](.github/SECURITY.md)** for the full policy. Highlights:

- 🔒 All secrets via Google Secret Manager (never env vars in prod)
- 🔒 Strict Firestore rules — every collection requires `request.auth != null`
- 🔒 Prompt-injection defense on every GenAI call (input sanitization + system prompt isolation)
- 🔒 Distroless runtime image, non-root uid 65534, no shell
- 🔒 Per-user rate limiting on every endpoint
- 🔒 Defense-in-depth `.gitignore` blocks `*-key.json` and `.env*` from ever being committed

To report a vulnerability, **do not open a public issue** — see SECURITY.md for the disclosure process.

## 🤝 Contributing

Read **[CONTRIBUTING.md](CONTRIBUTING.md)** before opening a PR. The 5-pillar checklist is non-negotiable.

## 📄 License

MIT — see [LICENSE](LICENSE).

## 🙏 Acknowledgements

- Built with [Fastify](https://fastify.dev), [React](https://react.dev), [Vite](https://vitejs.dev), [pnpm](https://pnpm.io)
- AI by [Google Gemini](https://ai.google.dev)
- Hosting by [Firebase](https://firebase.google.com) + [Google Cloud Run](https://cloud.google.com/run)

<div align="center">

**[⬆ Back to top](#-stadiumops-ai)**

</div>
