/**
 * @file packages/shared/src/schemas/index.ts
 * @description Barrel for Zod schemas. Every API boundary validates with one of these.
 *   Imported by both apps/api (Fastify route handlers) and apps/web (form validation).
 */

export * from './chat.js';
export * from './incident.js';
