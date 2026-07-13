/**
 * @file packages/shared/src/index.ts
 * @description Barrel export for the shared package. Both `apps/api` and `apps/web`
 *   import from `@stadiumops/shared` so types and Zod schemas are defined once.
 */

export * from './types/index.js';
export * from './schemas/index.js';
