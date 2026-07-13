# Security Policy

## Supported versions

StadiumOps AI is pre-1.0. We patch security issues on the latest `main` branch only.

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |
| < 0.1   | :x:                |

## Reporting a vulnerability

**Please do NOT open a public GitHub issue for security vulnerabilities.**

Instead, email **rohitdeore96@github.com** with:

1. Description of the issue
2. Steps to reproduce
3. Affected components (api / web / firestore rules)
4. Suggested fix (optional)

You will receive an acknowledgment within 48 hours. We will coordinate a fix and disclosure timeline with you.

## Security measures in this codebase

| Threat                        | Mitigation                                                                                                       |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Leaked API keys / tokens      | Secrets stored in Vercel env vars; never committed; `.gitignore` blocks key files                                |
| Prompt injection on GenAI     | 3-layer defense: system prompt instructions + XML delimiters + sanitizeUserText (strips control/zero-width/bidi) |
| Unauthorized Firestore access | Strict rules — authentication required for ALL reads and writes; default deny; server-set fields forced          |
| Brute-force / DoS             | Per-IP rate limiting (30 req/min) via in-memory counter. NOTE: per-instance, resets on cold starts               |
| Container escape              | N/A — Vercel serverless (no container management)                                                                |
| XSS in chat output            | React escapes by default; assistant text rendered as text nodes, never `dangerouslySetInnerHTML`                 |
| CSRF                          | All state-changing routes use POST with JSON body (not cookies); CORS not needed (same-origin on Vercel)         |
| Information disclosure        | /api/diagnostics does NOT expose API key prefix, length, or value — only reports key type (format family)        |
| Supply-chain attacks          | Dependabot weekly updates; `pnpm install --frozen-lockfile` in CI; lockfile required                             |

## Known limitations (honest disclosure)

| Limitation                                      | Impact                                   | Mitigation plan                                       |
| ----------------------------------------------- | ---------------------------------------- | ----------------------------------------------------- |
| No authentication on API endpoints              | /api/chat is publicly callable           | Add Firebase Auth (anonymous) in next iteration       |
| In-memory rate limiter                          | Resets on Vercel cold starts; not global | Migrate to Upstash Redis for cross-instance limiting  |
| CSP allows 'unsafe-inline' for scripts          | Required by Vite's module loading        | Use Vite's nonce-based CSP plugin in production       |
| No server-side output filter on Gemini          | Relies on React escaping                 | Add server-side content sanitization on Gemini output |
| Mock data fallback when Firebase not configured | Dashboard shows simulated data           | Configure VITE_FIREBASE_* env vars for real Firestore |
