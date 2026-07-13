/**
 * @file apps/api/tests/setup.ts
 * @description Vitest setup file for the API workspace. Runs before any test
 *   file is loaded. Sets the minimum required env vars so modules that
 *   load env at import time (like logger.ts) don't crash.
 *
 *   Individual tests can still override these via vi.stubEnv or process.env.
 */

process.env.NODE_ENV = 'test';
process.env.PORT = '8080';
process.env.LOG_LEVEL = 'warn'; // keep test output clean
process.env.GEMINI_API_KEY = 'test-key-mock-do-not-use-in-prod';
process.env.FIREBASE_PROJECT_ID = 'stadiumops-test';
process.env.ALLOWED_ORIGINS = 'http://localhost:5173';
