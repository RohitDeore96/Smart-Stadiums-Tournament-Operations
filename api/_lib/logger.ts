/**
 * @file api/_lib/logger.ts
 * @description Structured logger for Vercel serverless functions.
 *   Generates a request ID per invocation and includes it in all log lines.
 *   Redacts sensitive data (API keys, auth tokens).
 */

let currentRequestId: string | null = null;

/** Sets the request ID for the current invocation. */
export function setRequestId(id: string): void {
  currentRequestId = id;
}

/** Returns the current request ID. */
export function getRequestId(): string | null {
  return currentRequestId;
}

/** Generates a new request ID (UUID v4). */
export function generateRequestId(): string {
  return crypto.randomUUID();
}

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

function log(level: LogLevel, message: string, context?: Record<string, unknown>): void {
  const entry = {
    level,
    message,
    requestId: currentRequestId,
    timestamp: new Date().toISOString(),
    ...(context ? redactSensitive(context) : {}),
  };
  const output = JSON.stringify(entry);
  if (level === 'error') {
    console.error(output);
  } else if (level === 'warn') {
    console.warn(output);
  } else {
    console.log(output);
  }
}

/** Redacts sensitive values from a context object. */
function redactSensitive(obj: Record<string, unknown>): Record<string, unknown> {
  const redacted: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (
      key.toLowerCase().includes('key') ||
      key.toLowerCase().includes('token') ||
      key.toLowerCase().includes('secret') ||
      key.toLowerCase().includes('password') ||
      key.toLowerCase().includes('authorization')
    ) {
      redacted[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      redacted[key] = redactSensitive(value as Record<string, unknown>);
    } else {
      redacted[key] = value;
    }
  }
  return redacted;
}

export const logger = {
  debug: (message: string, context?: Record<string, unknown>): void => {
    log('debug', message, context);
  },
  info: (message: string, context?: Record<string, unknown>): void => {
    log('info', message, context);
  },
  warn: (message: string, context?: Record<string, unknown>): void => {
    log('warn', message, context);
  },
  error: (message: string, context?: Record<string, unknown>): void => {
    log('error', message, context);
  },
};
