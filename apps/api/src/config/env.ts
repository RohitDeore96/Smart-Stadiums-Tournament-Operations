/**
 * @file apps/api/src/config/env.ts
 * @description Centralized, validated environment configuration.
 *   The app NEVER reads process.env directly outside this file — every other
 *   module imports from here. This catches missing/malformed env at boot, not
 *   at 3am in production.
 */

import { z } from 'zod';

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(8080),
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),

  // Secrets — in production these come from Secret Manager (loaded before app boot).
  GEMINI_API_KEY: z.string().min(10, 'GEMINI_API_KEY must be set'),
  FIREBASE_PROJECT_ID: z.string().min(3),
  FIREBASE_CLIENT_EMAIL: z.string().email().optional(),
  FIREBASE_PRIVATE_KEY: z.string().optional(),

  // CORS
  ALLOWED_ORIGINS: z
    .string()
    .default('http://localhost:5173')
    .transform((s) => s.split(',').map((o) => o.trim())),

  // Rate limiting
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(60),

  // GenAI cache
  GEMINI_CACHE_TTL_MS: z.coerce.number().int().positive().default(300_000),
});

export type Env = z.infer<typeof EnvSchema>;

let cachedEnv: Env | null = null;

/**
 * Loads + validates env. Throws synchronously on boot if invalid — fail fast.
 * In production, callers should first call `loadSecrets()` to populate
 * process.env from Secret Manager, then call this.
 */
export function loadEnv(): Env {
  if (cachedEnv) return cachedEnv;

  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  • ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    // eslint-disable-next-line no-console
    console.error(`❌ Invalid environment configuration:\n${issues}`);
    process.exit(1);
  }

  cachedEnv = parsed.data;
  return cachedEnv;
}

/** Test-only helper to inject mock env values. */
export function __resetEnvForTests(): void {
  cachedEnv = null;
}
