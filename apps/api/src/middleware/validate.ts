/**
 * @file apps/api/src/middleware/validate.ts
 * @description Fastify preHandler hook factory that validates the request
 *   body against a Zod schema. Throws ValidationError on failure.
 *
 *   Usage:
 *     import { ChatMessageSchema } from '@stadiumops/shared';
 *     instance.post('/chat', { preHandler: validate(ChatMessageSchema) }, handler);
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import type { ZodType } from 'zod';
import { ValidationError } from '../utils/errors.js';

type PreHandler = (req: FastifyRequest, reply: FastifyReply) => Promise<void>;

export function validate<T>(schema: ZodType<T>): PreHandler {
  return async (req, _reply) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      const issues = result.error.issues
        .map((i) => `${i.path.join('.') || 'root'}: ${i.message}`)
        .join('; ');
      throw ValidationError('Request body validation failed', {
        issues: result.error.issues,
        summary: issues,
      });
    }

    // Replace body with the parsed + transformed result
    req.body = result.data;
  };
}
