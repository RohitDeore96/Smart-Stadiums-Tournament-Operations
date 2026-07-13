/**
 * @file apps/web/src/services/firebase.ts
 * @description Firebase client SDK initialization.
 *   If VITE_FIREBASE_API_KEY is set, uses real Firestore.
 *   Otherwise, returns null and the app uses mock data services.
 *
 *   This lets the app deploy to Vercel immediately without Firebase setup,
 *   and the user can enable Firestore later by adding env vars.
 */

import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getFirestore as getFirebaseFirestore, type Firestore } from 'firebase/firestore';

let firebaseApp: FirebaseApp | null = null;
let firestoreDb: Firestore | null = null;

interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

/**
 * Returns true if Firebase env vars are configured.
 * Used by data services to decide whether to use real Firestore or mock data.
 */
export function isFirebaseConfigured(): boolean {
  return Boolean(import.meta.env.VITE_FIREBASE_API_KEY);
}

/**
 * Returns the Firebase app instance, initializing if needed.
 * Returns null if Firebase is not configured.
 */
export function getFirebaseApp(): FirebaseApp | null {
  if (firebaseApp) return firebaseApp;
  if (!isFirebaseConfigured()) return null;

  const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
  const authDomain = import.meta.env.VITE_FIREBASE_AUTH_DOMAIN;
  const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
  const storageBucket = import.meta.env.VITE_FIREBASE_STORAGE_BUCKET;
  const messagingSenderId = import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID;
  const appId = import.meta.env.VITE_FIREBASE_APP_ID;

  if (!apiKey || !authDomain || !projectId || !storageBucket || !messagingSenderId || !appId) {
    console.error('[firebase] Missing required env vars');
    return null;
  }

  const config: FirebaseConfig = {
    apiKey,
    authDomain,
    projectId,
    storageBucket,
    messagingSenderId,
    appId,
  };

  firebaseApp = initializeApp(config);
  return firebaseApp;
}

/**
 * Returns the Firestore instance, initializing if needed.
 * Returns null if Firebase is not configured.
 */
export function getFirestore(): Firestore | null {
  if (firestoreDb) return firestoreDb;
  const app = getFirebaseApp();
  if (!app) return null;
  firestoreDb = getFirebaseFirestore(app);
  return firestoreDb;
}
