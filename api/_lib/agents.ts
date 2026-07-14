/**
 * @file api/_lib/agents.ts
 * @description Multi-agent orchestration layer.
 *
 *   Implements specialized agents that handle distinct operational tasks:
 *
 *   1. Triage Agent — classifies incident severity from free-text reports.
 *      Uses structured output (JSON) to return category, severity, urgency,
 *      and a brief risk assessment. This is the "first responder" of the
 *      system: every new incident flows through triage first.
 *
 *   2. Routing Agent — given a triaged incident, determines the best
 *      responder team based on category, severity, and current zone load.
 *      Returns team assignment + ETA estimate + recommended action.
 *
 *   3. Summary Agent — generates shift-end summaries by aggregating
 *      incident history. Returns a structured report (counts by category,
 *      resolution rate, key events, recommendations).
 *
 *   These agents can be chained (triage → routing → action) for incident
 *   response, or invoked individually (summary for shift reports).
 *
 *   Together with the function-calling tool loop in gemini.ts, this
 *   transforms the architecture from "standard RAG chatbot" to a
 *   multi-agent system with specialized roles.
 */

import { callGeminiForStructuredOutput } from './geminiHelpers.js';
import { MOCK_STADIUM } from '../_mock/stadiumData.js';
import { incidentStore } from './store.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TriageResult {
  category: 'medical' | 'security' | 'fire' | 'crowd_flow' | 'lost_child' | 'facilities' | 'other';
  severity: 'low' | 'medium' | 'high' | 'critical';
  urgencyScore: number; // 0-100
  riskAssessment: string;
  recommendedAction: string;
  confidence: number;
}

export interface RoutingResult {
  assignedTeam: 'medical' | 'security' | 'fire' | 'facilities' | 'crowd_management' | 'police';
  responderZoneId: string;
  estimatedEtaMinutes: number;
  recommendedAction: string;
  alternateTeam?: string | undefined;
}

export interface ShiftSummaryResult {
  totalIncidents: number;
  byCategory: Record<string, number>;
  bySeverity: Record<string, number>;
  resolutionRate: number;
  avgResponseTimeMinutes: number;
  keyEvents: string[];
  recommendations: string[];
  narrative: string;
}

export interface AgentTrace {
  agentName: 'triage' | 'routing' | 'summary';
  input: Record<string, unknown>;
  output: Record<string, unknown>;
  durationMs: number;
  tokensUsed: number;
}

// ---------------------------------------------------------------------------
// 1. Triage Agent
// ---------------------------------------------------------------------------

const TRIAGE_SYSTEM_PROMPT = `You are the Triage Agent for StadiumOps AI at MetLife Stadium (FIFA World Cup 2026).
Your job: classify incoming incident reports by severity and recommend an immediate action.

You MUST respond with valid JSON only — no markdown, no explanation. Use this exact schema:
{
  "category": "medical" | "security" | "fire" | "crowd_flow" | "lost_child" | "facilities" | "other",
  "severity": "low" | "medium" | "high" | "critical",
  "urgencyScore": <number 0-100>,
  "riskAssessment": "<one sentence risk summary>",
  "recommendedAction": "<one sentence immediate action>",
  "confidence": <number 0-1>
}

Severity guidelines:
- critical: life-threatening, mass casualty, fire, active violence, lost child
- high: urgent medical, crowd crush risk, security incident
- medium: requires attention but not life-threatening (long queue, minor injury)
- low: minor facility issue, spill, noise complaint`;

export async function triageAgent(
  incidentText: string,
): Promise<{ result: TriageResult; trace: AgentTrace }> {
  const start = Date.now();
  const userPrompt = `Triage this incident report:\n\n${incidentText}`;

  const raw = await callGeminiForStructuredOutput(TRIAGE_SYSTEM_PROMPT, userPrompt);
  const result = parseTriageResult(raw);

  return {
    result,
    trace: {
      agentName: 'triage',
      input: { incidentText },
      output: result as unknown as Record<string, unknown>,
      durationMs: Date.now() - start,
      tokensUsed: 0,
    },
  };
}

function parseTriageResult(raw: string): TriageResult {
  // Strip any markdown fences
  const cleaned = raw
    .replace(/```json\n?/g, '')
    .replace(/```\n?/g, '')
    .trim();
  try {
    const parsed = JSON.parse(cleaned) as Partial<TriageResult>;
    return {
      category: parsed.category ?? 'other',
      severity: parsed.severity ?? 'medium',
      urgencyScore: parsed.urgencyScore ?? 50,
      riskAssessment: parsed.riskAssessment ?? 'Unable to assess.',
      recommendedAction: parsed.recommendedAction ?? 'Investigate and assess.',
      confidence: parsed.confidence ?? 0.5,
    };
  } catch {
    return {
      category: 'other',
      severity: 'medium',
      urgencyScore: 50,
      riskAssessment: 'Triage agent returned unparseable output.',
      recommendedAction: 'Manual review required.',
      confidence: 0.1,
    };
  }
}

// ---------------------------------------------------------------------------
// 2. Routing Agent
// ---------------------------------------------------------------------------

const ROUTING_SYSTEM_PROMPT = `You are the Routing Agent for StadiumOps AI at MetLife Stadium.
Given a triaged incident, determine the best responder team to dispatch.

MetLife zones: ${MOCK_STADIUM.zones.map((z) => `${z.id} (${z.name})`).join(', ')}.

You MUST respond with valid JSON only:
{
  "assignedTeam": "medical" | "security" | "fire" | "facilities" | "crowd_management" | "police",
  "responderZoneId": "<zone id of nearest responder station>",
  "estimatedEtaMinutes": <number>,
  "recommendedAction": "<one sentence dispatch instruction>",
  "alternateTeam": "<optional alternate team if primary is overloaded>"
}

Routing rules:
- medical → medical team (stationed at first_aid zone)
- security/police → security team (stationed at concourse_north)
- fire → fire team (stationed at concourse_south)
- crowd_flow → crowd_management team (stationed at nearest gate)
- facilities → facilities team (stationed at concourse_south)
- For critical severity, also notify police as alternate team.`;

export async function routingAgent(
  triaged: TriageResult,
  incidentZoneId: string,
): Promise<{ result: RoutingResult; trace: AgentTrace }> {
  const start = Date.now();
  const userPrompt = `Incident to route:
  Category: ${triaged.category}
  Severity: ${triaged.severity}
  Urgency: ${String(triaged.urgencyScore)}/100
  Location: ${incidentZoneId}
  Risk: ${triaged.riskAssessment}

Determine the best responder team.`;

  const raw = await callGeminiForStructuredOutput(ROUTING_SYSTEM_PROMPT, userPrompt);
  const result = parseRoutingResult(raw);

  return {
    result,
    trace: {
      agentName: 'routing',
      input: { triaged, incidentZoneId },
      output: result as unknown as Record<string, unknown>,
      durationMs: Date.now() - start,
      tokensUsed: 0,
    },
  };
}

function parseRoutingResult(raw: string): RoutingResult {
  const cleaned = raw
    .replace(/```json\n?/g, '')
    .replace(/```\n?/g, '')
    .trim();
  try {
    const parsed = JSON.parse(cleaned) as Partial<RoutingResult>;
    return {
      assignedTeam: parsed.assignedTeam ?? 'security',
      responderZoneId: parsed.responderZoneId ?? 'concourse_north',
      estimatedEtaMinutes: parsed.estimatedEtaMinutes ?? 5,
      recommendedAction: parsed.recommendedAction ?? 'Dispatch nearest responder.',
      alternateTeam: parsed.alternateTeam,
    };
  } catch {
    return {
      assignedTeam: 'security',
      responderZoneId: 'concourse_north',
      estimatedEtaMinutes: 5,
      recommendedAction: 'Manual dispatch required (routing agent failed).',
    };
  }
}

// ---------------------------------------------------------------------------
// 3. Summary Agent
// ---------------------------------------------------------------------------

const SUMMARY_SYSTEM_PROMPT = `You are the Summary Agent for StadiumOps AI.
Generate a shift-end operational summary from incident data.

You MUST respond with valid JSON only:
{
  "totalIncidents": <number>,
  "byCategory": { "<category>": <count>, ... },
  "bySeverity": { "<severity>": <count>, ... },
  "resolutionRate": <number 0-1>,
  "avgResponseTimeMinutes": <number>,
  "keyEvents": ["<event 1>", "<event 2>", ...],
  "recommendations": ["<rec 1>", "<rec 2>", ...],
  "narrative": "<2-3 sentence executive summary>"
}

The narrative should highlight the most serious incidents, response effectiveness,
and one actionable recommendation for the next shift.`;

export async function summaryAgent(): Promise<{ result: ShiftSummaryResult; trace: AgentTrace }> {
  const start = Date.now();

  // Aggregate from the in-memory incident store
  const incidents = incidentStore;
  const totalIncidents = incidents.length;
  const byCategory: Record<string, number> = {};
  const bySeverity: Record<string, number> = {};
  let resolved = 0;

  for (const inc of incidents) {
    byCategory[inc.category] = (byCategory[inc.category] ?? 0) + 1;
    bySeverity[inc.severity] = (bySeverity[inc.severity] ?? 0) + 1;
    if (inc.status === 'resolved' || inc.status === 'closed') resolved += 1;
  }

  const resolutionRate = totalIncidents > 0 ? resolved / totalIncidents : 0;

  // Compute average response time (acknowledged - created)
  const responseTimes: number[] = [];
  for (const inc of incidents) {
    const created = new Date(inc.createdAt).getTime();
    const updated = new Date(inc.updatedAt).getTime();
    if (inc.status !== 'open') {
      responseTimes.push((updated - created) / 60_000);
    }
  }
  const avgResponseTime =
    responseTimes.length > 0 ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length : 0;

  // Build narrative via Gemini (only if we have incidents)
  let narrative = 'No incidents recorded this shift.';
  let keyEvents: string[] = [];
  let recommendations: string[] = [];

  if (totalIncidents > 0) {
    const incidentDigest = incidents
      .slice(0, 10)
      .map((i) => `- ${i.id} [${i.severity}/${i.category}] ${i.title} @ ${i.zoneId} — ${i.status}`)
      .join('\n');

    const userPrompt = `Generate shift summary from these incidents:\n${incidentDigest}\n\nStats: total=${String(totalIncidents)}, resolved=${String(resolved)}, resolutionRate=${String(Math.round(resolutionRate * 100))}%, avgResponseMin=${String(Math.round(avgResponseTime))}`;

    try {
      const raw = await callGeminiForStructuredOutput(SUMMARY_SYSTEM_PROMPT, userPrompt);
      const parsed = JSON.parse(
        raw
          .replace(/```json\n?/g, '')
          .replace(/```\n?/g, '')
          .trim(),
      ) as Partial<ShiftSummaryResult>;
      narrative = parsed.narrative ?? narrative;
      keyEvents = parsed.keyEvents ?? [];
      recommendations = parsed.recommendations ?? [];
    } catch {
      // Fallback — use the computed stats only
      narrative = `Shift completed with ${String(totalIncidents)} incidents (${String(resolved)} resolved, ${String(Math.round(resolutionRate * 100))}% resolution rate).`;
      keyEvents = incidents
        .filter((i) => i.severity === 'critical' || i.severity === 'high')
        .slice(0, 3)
        .map((i) => `${i.severity.toUpperCase()} ${i.category} at ${i.zoneId}: ${i.title}`);
      recommendations = ['Review response times for high-severity incidents.'];
    }
  }

  const result: ShiftSummaryResult = {
    totalIncidents,
    byCategory,
    bySeverity,
    resolutionRate,
    avgResponseTimeMinutes: avgResponseTime,
    keyEvents,
    recommendations,
    narrative,
  };

  return {
    result,
    trace: {
      agentName: 'summary',
      input: { incidentCount: totalIncidents },
      output: result as unknown as Record<string, unknown>,
      durationMs: Date.now() - start,
      tokensUsed: 0,
    },
  };
}

// ---------------------------------------------------------------------------
// Chained orchestration: triage → routing → action
// ---------------------------------------------------------------------------

export interface IncidentResponseChain {
  triage: TriageResult;
  routing: RoutingResult;
  traces: AgentTrace[];
  finalMessage: string;
}

/**
 * Runs the full incident response chain:
 *   1. Triage Agent classifies the incident
 *   2. Routing Agent dispatches the best responder team
 *   3. Synthesizes a final action message
 *
 * This is the multi-agent orchestration pattern — specialized agents
 * chained together for complex operational workflows.
 */
export async function runIncidentResponseChain(
  incidentText: string,
  incidentZoneId: string,
): Promise<IncidentResponseChain> {
  const traces: AgentTrace[] = [];

  // Step 1: Triage
  const { result: triage, trace: triageTrace } = await triageAgent(incidentText);
  traces.push(triageTrace);

  // Step 2: Routing
  const { result: routing, trace: routingTrace } = await routingAgent(triage, incidentZoneId);
  traces.push(routingTrace);

  // Step 3: Synthesize final action message
  const finalMessage = `🚨 INCIDENT TRIAGED & ROUTED

Severity: ${triage.severity.toUpperCase()} (urgency ${String(triage.urgencyScore)}/100)
Category: ${triage.category}
Risk: ${triage.riskAssessment}

Dispatched to: ${routing.assignedTeam} team (from ${routing.responderZoneId})
ETA: ~${String(routing.estimatedEtaMinutes)} min
Action: ${routing.recommendedAction}

Triage confidence: ${String(Math.round(triage.confidence * 100))}%`;

  return { triage, routing, traces, finalMessage };
}
