/**
 * @file apps/api/src/config/firebase.ts
 * @description Firebase Admin SDK initialization. Singleton — initialized
 *   once per process. In production, credentials come from Secret Manager
 *   (loaded into env before this module imports).
 *
 *   For tests, callers can call `getFirebaseApp()` after setting env vars
 *   to get a mock-initialized app, or use the `__resetForTests` helper.
 */

import admin from 'firebase-admin';
import { loadEnv } from './env.js';
import { scopedLogger } from '../utils/logger.js';
import { UnauthorizedError } from '../utils/errors.js';

const log = scopedLogger('firebase');

let initializedApp: admin.app.App | null = null;

type DecodedIdToken = admin.auth.DecodedIdToken;

/**
 * Initializes and returns the Firebase Admin app singleton.
 * Safe to call multiple times — returns the same instance.
 */
export function getFirebaseApp(): admin.app.App {
  if (initializedApp) return initializedApp;

  const env = loadEnv();

  // In production: use application default credentials (Cloud Run service account)
  // In dev/test: use explicit credentials from env if present, else fallback to ADC
  if (env.FIREBASE_CLIENT_EMAIL && env.FIREBASE_PRIVATE_KEY) {
    log.info(
      { projectId: env.FIREBASE_PROJECT_ID },
      'Initializing Firebase with explicit credentials',
    );
    initializedApp = admin.initializeApp({
      credential: admin.credential.cert({
        projectId: env.FIREBASE_PROJECT_ID,
        clientEmail: env.FIREBASE_CLIENT_EMAIL,
        // Env vars store \n as literal "\\n" — convert back to real newlines
        privateKey: env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      }),
      projectId: env.FIREBASE_PROJECT_ID,
    });
  } else {
    log.info(
      { projectId: env.FIREBASE_PROJECT_ID },
      'Initializing Firebase with application default credentials',
    );
    initializedApp = admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      projectId: env.FIREBASE_PROJECT_ID,
    });
  }

  return initializedApp;
}

/**
 * Returns the Firestore client. Initializes the app if needed.
 */
export function getFirestore(): admin.firestore.Firestore {
  return getFirebaseApp().firestore();
}

/**
 * Returns the Auth client. Initializes the app if needed.
 */
export function getAuth(): admin.auth.Auth {
  return getFirebaseApp().auth();
}

/**
 * Verifies a Firebase ID token and returns the decoded user.
 * Throws AppError on invalid/expired tokens.
 */
export async function verifyIdToken(idToken: string): Promise<DecodedIdToken> {
  try {
    return await getAuth().verifyIdToken(idToken);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    log.warn({ err: message }, 'ID token verification failed');
    throw UnauthorizedError(`Invalid authentication token: ${message}`);
  }
}

/** Test-only helper — resets the singleton. Call in beforeEach. */
export function __resetForTests(): void {
  if (initializedApp) {
    void initializedApp.delete();
    initializedApp = null;
  }
}
