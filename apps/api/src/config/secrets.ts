/**
 * @file apps/api/src/config/secrets.ts
 * @description Loads secrets from Google Secret Manager in production.
 *   In dev/test, secrets come from env vars directly.
 *
 *   Usage: call `loadSecrets()` once at boot, before `buildApp()`.
 *   It populates process.env with the secrets it fetches.
 */

import { SecretManagerServiceClient } from '@google-cloud/secret-manager';
import { loadEnv } from './env.js';
import { scopedLogger } from '../utils/logger.js';

const log = scopedLogger('secrets');

const SECRET_NAMES = ['GEMINI_API_KEY'] as const;

/**
 * Loads all secrets from Secret Manager and populates process.env.
 * No-op in development/test (env vars are used directly).
 *
 * In production, requires the Cloud Run service account to have
 * `roles/secretmanager.secretAccessor` on each secret.
 */
export async function loadSecrets(): Promise<void> {
  const env = loadEnv();

  if (env.NODE_ENV === 'development' || env.NODE_ENV === 'test') {
    log.info('Skipping Secret Manager in development/test — using env vars directly');
    return;
  }

  log.info(
    { project: env.FIREBASE_PROJECT_ID, secrets: SECRET_NAMES },
    'Loading secrets from Secret Manager',
  );

  const client = new SecretManagerServiceClient();

  for (const name of SECRET_NAMES) {
    try {
      const [version] = await client.accessSecretVersion({
        name: `projects/${env.FIREBASE_PROJECT_ID}/secrets/${name}/versions/latest`,
      });

      const payload = version.payload?.data?.toString();
      if (!payload) {
        throw new Error(`Secret ${name} has empty payload`);
      }

      process.env[name] = payload;
      log.info({ secret: name }, 'Loaded secret');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      log.error({ secret: name, err: message }, 'Failed to load secret');
      throw new Error(`Failed to load secret ${name}: ${message}`);
    }
  }

  // Reset cached env so loadEnv() picks up the new values
  const { __resetEnvForTests } = await import('./env.js');
  __resetEnvForTests();
}
