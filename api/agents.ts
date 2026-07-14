/**
 * @file api/agents.ts
 * @description Multi-agent orchestration endpoint.
 *
 *   Exposes three specialized agents and one chained workflow:
 *     POST /api/agents?action=triage       — classify an incident
 *     POST /api/agents?action=routing      — dispatch a responder
 *     POST /api/agents?action=summary      — generate shift summary
 *     POST /api/agents?action=incident     — full triage → routing chain
 *
 *   This is the "multi-agent" surface that distinguishes the architecture
 *   from a standard RAG chatbot. The chat endpoint (chat.ts) handles
 *   conversational AI; this endpoint handles structured operational workflows.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { requireAuth } from './_lib/auth.js';
import { verifyOrigin } from './_lib/csrf.js';
import { logger, generateRequestId, setRequestId } from './_lib/logger.js';
import {
  triageAgent,
  routingAgent,
  summaryAgent,
  runIncidentResponseChain,
} from './_lib/agents.js';

export const config = { maxDuration: 30 };

const TriageInputSchema = z.object({
  incidentText: z.string().min(10).max(2000),
});

const RoutingInputSchema = z.object({
  triaged: z.object({
    category: z.string(),
    severity: z.string(),
    urgencyScore: z.number(),
    riskAssessment: z.string(),
    recommendedAction: z.string(),
    confidence: z.number(),
  }),
  incidentZoneId: z.string().min(1),
});

const IncidentChainInputSchema = z.object({
  incidentText: z.string().min(10).max(2000),
  incidentZoneId: z.string().min(1),
});

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  const requestId = generateRequestId();
  setRequestId(requestId);
  logger.info('Agent request received', { method: req.method, url: req.url });

  if (req.method !== 'POST') {
    res.status(405).json({
      error: { code: 'METHOD_NOT_ALLOWED', message: 'Use POST.' },
    });
    return;
  }

  if (!requireAuth(req, res)) return;
  if (!verifyOrigin(req, res)) return;

  const action = (req.query.action as string) ?? '';
  logger.info('Agent action', { action });

  try {
    switch (action) {
      case 'triage': {
        const parse = TriageInputSchema.safeParse(req.body);
        if (!parse.success) {
          res.status(400).json({
            error: { code: 'VALIDATION_ERROR', details: parse.error.issues },
          });
          return;
        }
        const { result, trace } = await triageAgent(parse.data.incidentText);
        res.status(200).json({ result, trace, requestId });
        return;
      }

      case 'routing': {
        const parse = RoutingInputSchema.safeParse(req.body);
        if (!parse.success) {
          res.status(400).json({
            error: { code: 'VALIDATION_ERROR', details: parse.error.issues },
          });
          return;
        }
        const { result, trace } = await routingAgent(
          parse.data.triaged as Parameters<typeof routingAgent>[0],
          parse.data.incidentZoneId,
        );
        res.status(200).json({ result, trace, requestId });
        return;
      }

      case 'summary': {
        const { result, trace } = await summaryAgent();
        res.status(200).json({ result, trace, requestId });
        return;
      }

      case 'incident':
      case 'chain': {
        const parse = IncidentChainInputSchema.safeParse(req.body);
        if (!parse.success) {
          res.status(400).json({
            error: { code: 'VALIDATION_ERROR', details: parse.error.issues },
          });
          return;
        }
        const chain = await runIncidentResponseChain(
          parse.data.incidentText,
          parse.data.incidentZoneId,
        );
        res.status(200).json({ ...chain, requestId });
        return;
      }

      default:
        res.status(400).json({
          error: {
            code: 'INVALID_ACTION',
            message: 'Specify ?action=triage|routing|summary|incident',
          },
        });
    }
  } catch (err: unknown) {
    logger.error('Agent handler failed', {
      action,
      error: err instanceof Error ? err.message : 'Unknown',
    });
    res.status(500).json({
      error: {
        code: 'AGENT_ERROR',
        message: err instanceof Error ? err.message : 'Unknown agent failure',
      },
      requestId,
    });
  }
}
