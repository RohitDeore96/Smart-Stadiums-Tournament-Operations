/**
 * @file packages/shared/src/types/api.ts
 * @description Generic API envelope types shared between web & api.
 */

/**
 * Standard success envelope returned by every REST endpoint.
 * Errors never use this shape — they are handled by Fastify's error hook and
 * return `{ error: ApiError }`.
 */
export interface ApiResponse<T> {
  data: T;
  meta?: PaginationMeta;
}

export interface PaginationMeta {
  /** Cursor to send back as `?cursor=` for the next page. */
  nextCursor: string | null;
  /** Page size actually returned (may be < requested). */
  pageSize: number;
  /** True when more pages exist. */
  hasMore: boolean;
}

export interface ApiError {
  /** Stable machine-readable error code, e.g. `VALIDATION_ERROR`. */
  code: string;
  /** Human-readable message safe to show to end users. */
  message: string;
  /** Field-level validation details (only present for 400s). */
  details?: Record<string, unknown>;
  /** Correlation ID for log lookup. */
  requestId: string;
}

/** ISO-8601 UTC timestamp string, e.g. `2026-06-12T15:30:00.000Z`. */
export type ISODateString = string;

/** BCP-47 language tag, e.g. `en`, `es-MX`, `ar`, `fr-CA`. */
export type Locale = 'en' | 'es' | 'fr' | 'ar' | 'de' | 'pt' | 'ja' | 'ko' | 'zh';
