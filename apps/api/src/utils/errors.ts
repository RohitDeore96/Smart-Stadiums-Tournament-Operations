/**
 * @file apps/api/src/utils/errors.ts
 * @description Typed error classes used by the global error handler.
 *   Controllers throw these; the error hook converts them to the standard
 *   ApiError envelope from @stadiumops/shared.
 *
 *   Pattern: factory functions returning typed instances. Cheaper than
 *   subclassing Error for each variant, and tree-shakes better.
 */

export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'UNPROCESSABLE'
  | 'RATE_LIMITED'
  | 'SAFETY_FILTER'
  | 'UPSTREAM_UNAVAILABLE'
  | 'INTERNAL_ERROR';

export class AppError extends Error {
  constructor(
    public readonly code: ErrorCode,
    public readonly statusCode: number,
    message: string,
    public readonly details?: Readonly<Record<string, unknown>>,
  ) {
    super(message);
    this.name = 'AppError';
    // Restore prototype chain (TS quirk when extending built-in Error)
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

/** 400 — input failed Zod validation. */
export const ValidationError = (
  message: string,
  details?: Readonly<Record<string, unknown>>,
): AppError => new AppError('VALIDATION_ERROR', 400, message, details);

/** 401 — no token or token invalid. */
export const UnauthorizedError = (message = 'Authentication required'): AppError =>
  new AppError('UNAUTHORIZED', 401, message);

/** 403 — authenticated but role/ownership check failed. */
export const ForbiddenError = (message = 'You do not have permission to do that'): AppError =>
  new AppError('FORBIDDEN', 403, message);

/** 404 — resource does not exist or has been deleted. */
export const NotFoundError = (resource: string): AppError =>
  new AppError('NOT_FOUND', 404, `${resource} not found`);

/** 409 — concurrent modification or duplicate create. */
export const ConflictError = (message: string): AppError => new AppError('CONFLICT', 409, message);

/** 422 — semantically invalid (e.g. invalid state transition). */
export const UnprocessableError = (message: string): AppError =>
  new AppError('UNPROCESSABLE', 422, message);

/** 429 — rate limit exceeded. */
export const RateLimitedError = (message = 'Too many requests'): AppError =>
  new AppError('RATE_LIMITED', 429, message);

/** 503 — upstream (Gemini/Firestore) unavailable. */
export const UpstreamUnavailableError = (service: string): AppError =>
  new AppError('UPSTREAM_UNAVAILABLE', 503, `${service} is temporarily unavailable`);

/** 500 — catch-all for unexpected errors. Use sparingly. */
export const InternalError = (message = 'Something went wrong'): AppError =>
  new AppError('INTERNAL_ERROR', 500, message);
