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
3. Affected components (api / web / firestore rules / docker)
4. Suggested fix (optional)

You will receive an acknowledgment within 48 hours. We will coordinate a fix and disclosure timeline with you.

## Security measures in this codebase

| Threat                        | Mitigation                                                                                                          |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Leaked API keys / tokens      | Secrets stored in Google Secret Manager; never committed; `.gitignore` blocks key files                             |
| Prompt injection on GenAI     | User input sanitized (control chars + zero-width + bidi override stripped); system prompt isolated; output filtered |
| Unauthorized Firestore access | Strict `firestore.rules` — every collection requires `request.auth != null`                                         |
| Brute-force / DoS             | Per-user rate limiting (`@fastify/rate-limit`) on every endpoint                                                    |
| Supply-chain attacks          | Dependabot weekly updates; `pnpm audit` in CI; lockfile required                                                    |
| Container escape              | Distroless runtime image, non-root uid 65534, no shell                                                              |
| XSS in chat output            | React escapes by default; assistant text rendered as text nodes, never `dangerouslySetInnerHTML`                    |
| CSRF                          | All state-changing routes require Bearer token (not cookies); CORS allowlist enforced                               |

## What we explicitly do NOT support

- Anonymous read access to Firestore (every read requires auth)
- Client-side role escalation (roles come from custom claims set via Admin SDK only)
- Long-lived API tokens (Firebase ID tokens expire in 1 hour; refresh handled by Firebase SDK)
