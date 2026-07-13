/**
 * @file apps/api/tests/unit/errors.test.ts
 * @description Unit tests for the AppError hierarchy and factory functions.
 */

import { describe, it, expect } from 'vitest';
import {
  AppError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  UnprocessableError,
  RateLimitedError,
  UpstreamUnavailableError,
  InternalError,
} from '../../src/utils/errors.js';

describe('AppError', () => {
  it('is an instance of Error', () => {
    const err = ValidationError('bad input');
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(AppError);
  });

  it('preserves the message', () => {
    const err = NotFoundError('Stadium');
    expect(err.message).toBe('Stadium not found');
  });

  it('preserves the code', () => {
    const err = ValidationError('bad');
    expect(err.code).toBe('VALIDATION_ERROR');
  });

  it('preserves the statusCode', () => {
    const err = UnauthorizedError();
    expect(err.statusCode).toBe(401);
  });

  it('preserves details when provided', () => {
    const err = ValidationError('bad', { field: 'message' });
    expect(err.details).toEqual({ field: 'message' });
  });

  it('has details undefined when not provided', () => {
    const err = ValidationError('bad');
    expect(err.details).toBeUndefined();
  });

  it('sets name to AppError', () => {
    const err = InternalError();
    expect(err.name).toBe('AppError');
  });
});

describe('error factory functions', () => {
  it('ValidationError returns 400', () => {
    expect(ValidationError('bad').statusCode).toBe(400);
    expect(ValidationError('bad').code).toBe('VALIDATION_ERROR');
  });

  it('UnauthorizedError returns 401 with default message', () => {
    const err = UnauthorizedError();
    expect(err.statusCode).toBe(401);
    expect(err.message).toBe('Authentication required');
  });

  it('UnauthorizedError accepts custom message', () => {
    expect(UnauthorizedError('custom').message).toBe('custom');
  });

  it('ForbiddenError returns 403', () => {
    expect(ForbiddenError().statusCode).toBe(403);
    expect(ForbiddenError().code).toBe('FORBIDDEN');
  });

  it('NotFoundError returns 404 and formats message', () => {
    const err = NotFoundError('Match');
    expect(err.statusCode).toBe(404);
    expect(err.message).toBe('Match not found');
  });

  it('ConflictError returns 409', () => {
    expect(ConflictError('dup').statusCode).toBe(409);
  });

  it('UnprocessableError returns 422', () => {
    expect(UnprocessableError('bad state').statusCode).toBe(422);
  });

  it('RateLimitedError returns 429', () => {
    expect(RateLimitedError().statusCode).toBe(429);
    expect(RateLimitedError().message).toBe('Too many requests');
  });

  it('UpstreamUnavailableError returns 503 and formats message', () => {
    const err = UpstreamUnavailableError('Gemini');
    expect(err.statusCode).toBe(503);
    expect(err.message).toBe('Gemini is temporarily unavailable');
  });

  it('InternalError returns 500', () => {
    expect(InternalError().statusCode).toBe(500);
    expect(InternalError().message).toBe('Something went wrong');
  });

  it('InternalError accepts custom message', () => {
    expect(InternalError('custom error').message).toBe('custom error');
  });
});
