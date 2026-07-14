<div align="center">

# ⚽ StadiumOps AI

### GenAI-enabled stadium operations, crowd management & fan experience for FIFA World Cup 2026

[![Phase](https://img.shields.io/badge/phase-3%20live-00d4ff?style=flat-square)](https://smart-stadiums-tournament-operation-nine.vercel.app)
[![Node](https://img.shields.io/badge/node-20.11%2B-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/typescript-5.6%2B-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue?style=flat-square)](LICENSE)
[![PRs welcome](https://img.shields.io/badge/PRs-welcome-brightgreen?style=flat-square)](CONTRIBUTING.md)
[![Live](https://img.shields.io/badge/live-Vercel-000000?style=flat-square&logo=vercel&logoColor=white)](https://smart-stadiums-tournament-operation-nine.vercel.app)

</div>

---

## 📋 What is this?

StadiumOps AI is a GenAI-enabled platform that helps **volunteers** and **fans** during the FIFA World Cup 2026. It combines:

- **Real-time multilingual chat assistance** for fans (wayfinding, facilities, translation, emergencies)
- **Live crowd density dashboard** for volunteers (12 zones, color-coded levels, 5-second updates)
- **Incident reporting workflow** with Zod validation and Firestore persistence

**Persona focus:** Volunteers + Fans
**Verticals:** Multilingual Assistance + Crowd Management + Operational Intelligence

## 🚀 Live deployment

- **Frontend + API:** https://smart-stadiums-tournament-operation-nine.vercel.app
- **API health:** https://smart-stadiums-tournament-operation-nine.vercel.app/api/health
- **Chat endpoint (SSE):** `POST /api/chat` with `{ "message": "...", "locale": "en" }`

## ✨ The 5 pillars (enforced in every PR)

| Pillar            | How we enforce it                                                                                   |
| ----------------- | --------------------------------------------------------------------------------------------------- |
| **Code Quality**  | TS `strict: true`, Zod at every API boundary, files ≤ 300 LOC, DRY shared types package             |
| **Security**      | Input validation, 3-layer prompt-injection defense, strict Firestore rules, CSP + security headers  |
| **Efficiency**    | SSE streaming for chat, LRU cache for repeat queries, code-split chunks, mock-data fallback         |
| **Testing**       | Vitest unit tests (82 tests) covering safety, intent, prompt, schemas, env, health                  |
| **Accessibility** | WCAG 2.1 AA — semantic HTML, ARIA, keyboard nav, 9 languages + RTL Arabic, `prefers-reduced-motion` |

## 🏗️ Monorepo layout

```
stadiumops-ai/
├── api/                          Vercel serverless functions (DEPLOYED)
│   ├── _lib/                     gemini.ts, prompt.ts, safety.ts, intent.ts, schema.ts
│   ├── chat.ts                   POST /api/chat (SSE streaming)
│   └── health.ts                 GET /api/health
├── apps/
│   ├── web/                      Vite + React 18 + TypeScript (DEPLOYED to Vercel)
│   │   ├── src/
│   │   │   ├── components/       17 accessible components
│   │   │   ├── pages/            Dashboard, Chat, Incidents
│   │   │   ├── hooks/            useChat, useCrowdData, useIncidents
│   │   │   ├── services/         firebase, crowd, incident, chat, mockData
│   │   │   ├── context/          I18nContext (9 languages)
│   │   │   └── i18n/             translations.ts
│   │   └── tests/                Vitest + Testing Library

├── packages/
│   └── shared/                   DRY keystone — Zod schemas + TS types
├── infrastructure/
│   └── firebase-rules/           Strict Firestore rules (public demo)
├── docs/                         ARCHITECTURE, DATA_MODELS, API_CONTRACTS
├── .github/workflows/            ci.yml + deploy.yml (Vercel)
├── vercel.json                   Routing, headers (CSP, HSTS), function config
└── package.json                  pnpm workspace root
```

## 🚀 Quick start

### Prerequisites

- **Node.js 20.11+** — install via [nvm](https://github.com/nvm-sh/nvm)
- **pnpm 9** — `npm install -g pnpm@9`

### One-command bootstrap

```bash
git clone https://github.com/RohitDeore96/Smart-Stadiums-Tournament-Operations.git
cd Smart-Stadiums-Tournament-Operations
./scripts/dev-up.sh
```

### Run the dev servers

```bash
pnpm dev:web    # Vite on :5173
pnpm dev:api    # Vercel dev on :3000
```

## 🔑 Environment variables

### Vercel (production)

| Name                  | Purpose                                   |
| --------------------- | ----------------------------------------- |
| `GEMINI_API_KEY`      | Google Gemini API key (required for chat) |
| `GEMINI_CACHE_TTL_MS` | Cache TTL in ms (default 300000 = 5 min)  |

### Frontend (`.env.local`)

| Name                                | Purpose                                                       |
| ----------------------------------- | ------------------------------------------------------------- |
| `VITE_FIREBASE_API_KEY`             | Firebase web config (optional — app uses mock data if absent) |
| `VITE_FIREBASE_AUTH_DOMAIN`         | Firebase auth domain                                          |
| `VITE_FIREBASE_PROJECT_ID`          | Firebase project ID                                           |
| `VITE_FIREBASE_STORAGE_BUCKET`      | Firebase storage bucket                                       |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Firebase messaging sender ID                                  |
| `VITE_FIREBASE_APP_ID`              | Firebase app ID                                               |

If Firebase env vars are not set, the app automatically falls back to **mock data** (realistic FIFA 2026 MetLife Stadium data with 5-second polling).

## 📦 Available commands

| Command                     | What it does                                 |
| --------------------------- | -------------------------------------------- |
| `pnpm install`              | Install all workspace dependencies           |
| `pnpm dev:web`              | Start frontend dev server (Vite on :5173)    |
| `pnpm dev:api`              | Start Vercel dev server (:3000)              |
| `pnpm build`                | Build all workspaces                         |
| `pnpm test`                 | Run all unit + integration tests (82 tests)  |
| `pnpm lint`                 | ESLint across all workspaces (zero warnings) |
| `pnpm typecheck`            | `tsc --noEmit` across all workspaces         |
| `pnpm format`               | Prettier write                               |
| `./scripts/health-check.sh` | Smoke test API + Web                         |

## 🧪 Phases

| Phase | Status  | Deliverables                                                                           |
| ----- | ------- | -------------------------------------------------------------------------------------- |
| **1** | ✅ Done | Architecture, data models, API contracts, CI/CD, security rules                        |
| **2** | ✅ Done | Vercel serverless backend, Gemini service w/ prompt-injection defense, full test suite |
| **3** | ✅ Done | Accessible React frontend, Firebase client SDK, strict Firestore rules, i18n           |

## 🛡️ Security

- **3-layer prompt injection defense**: system prompt instructions + XML delimiters + `sanitizeUserText`
- **29 emergency keyword patterns** — fires BEFORE Gemini, returns canned safety reply
- **Zod validation** on every API boundary
- **CSP + HSTS + X-Frame-Options + X-Content-Type-Options** headers on all routes
- **Strict Firestore rules** — field validation, server-set fields forced, default deny
- **Secret via Vercel env vars** (never committed)

See **[SECURITY.md](.github/SECURITY.md)** for the full policy.

## 🤝 Contributing

Read **[CONTRIBUTING.md](CONTRIBUTING.md)** before opening a PR.

## 📄 License

MIT — see [LICENSE](LICENSE).

## 🙏 Acknowledgements

- Built with [Vite](https://vitejs.dev), [React](https://react.dev), [Vercel](https://vercel.com)
- AI by [Google Gemini](https://ai.google.dev)
- Database by [Firebase Firestore](https://firebase.google.com)

<div align="center">

**[⬆ Back to top](#-stadiumops-ai)**

</div>
