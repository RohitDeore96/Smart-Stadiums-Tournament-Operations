/**
 * @file apps/api/src/utils/errors.ts
 * @description Typed error classes used by the global error handler.
 *   Controllers throw these; the error hook converts them to the standard
 *   ApiError envelope from @stadiumops/shared.
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
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'AppError';
    // Restore prototype chain (TS quirk when extending built-in Error)
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export const ValidationError = (message: string, details?: Record<string, unknown>) =>
  new AppError('VALIDATION_ERROR', 400, message, details);

export const UnauthorizedError = (message = 'Authentication required') =>
  new AppError('UNAUTHORIZED', 401, message);

export const ForbiddenError = (message = 'You do not have permission to do that') =>
  new AppError('FORBIDDEN', 403, message);

export const NotFoundError = (resource: string) =>
  new AppError('NOT_FOUND', 404, `${resource} not found`);

export const RateLimitedError = (message = 'Too many requests') =>
  new AppError('RATE_LIMITED', 429, message);

export const UpstreamUnavailableError = (service: string) =>
  new AppError('UPSTREAM_UNAVAILABLE', 503, `${service} is temporarily unavailable`);

export const InternalError = (message = 'Something went wrong') =>
  new AppError('INTERNAL_ERROR', 500, message);
