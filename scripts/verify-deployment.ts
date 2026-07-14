#!/usr/bin/env node
/**
 * verify-deployment.ts
 * Run after deploy to smoke-test the v0.4.0 endpoints.
 *
 * Usage:
 *   AUTH_TOKEN=your-token node --loader tsx scripts/verify-deployment.ts
 *
 * Or compile to JS first. This verifies:
 *   1. /api/health returns 200
 *   2. /api/chat streams SSE with tool-enabled path
 *   3. /api/agents?action=summary returns shift summary
 *   4. /api/sentiment (GET) returns aggregate sentiment
 *   5. /api/vision accepts a test image (uses a tiny base64 PNG)
 */

const BASE_URL =
  process.env.E2E_BASE_URL ?? 'https://smart-stadiums-tournament-operation-nine.vercel.app';
const AUTH_TOKEN = process.env.AUTH_TOKEN ?? '';

if (!AUTH_TOKEN) {
  console.error('❌ AUTH_TOKEN env var required');
  process.exit(1);
}

interface TestResult {
  name: string;
  passed: boolean;
  detail: string;
  durationMs: number;
}

const results: TestResult[] = [];

async function test(name: string, fn: () => Promise<string>): Promise<void> {
  const start = Date.now();
  try {
    const detail = await fn();
    results.push({ name, passed: true, detail, durationMs: Date.now() - start });
  } catch (err) {
    results.push({
      name,
      passed: false,
      detail: err instanceof Error ? err.message : String(err),
      durationMs: Date.now() - start,
    });
  }
}

async function main(): Promise<void> {
  console.log(`\n🚀 Verifying deployment: ${BASE_URL}\n`);

  // 1. Health check
  await test('GET /api/health', async () => {
    const r = await fetch(`${BASE_URL}/api/health`);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const data = (await r.json()) as { status: string };
    return `status=${data.status}`;
  });

  // 2. Chat (tool-enabled path — ask a crowd status question)
  await test('POST /api/chat (tool-enabled)', async () => {
    const r = await fetch(`${BASE_URL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${AUTH_TOKEN}`,
      },
      body: JSON.stringify({
        message: 'How crowded is Gate A right now?',
        locale: 'en',
      }),
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const text = await r.text();
    if (!text.includes('event: token')) throw new Error('No SSE tokens in response');
    if (!text.includes('event: done')) throw new Error('No done event');
    const hasToolCall = text.includes('🔧 Calling');
    return `SSE OK${hasToolCall ? ' + tool call detected' : ''}`;
  });

  // 3. Agents — summary
  await test('POST /api/agents?action=summary', async () => {
    const r = await fetch(`${BASE_URL}/api/agents?action=summary`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${AUTH_TOKEN}`,
      },
      body: JSON.stringify({}),
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const data = (await r.json()) as { result?: { totalIncidents?: number } };
    return `totalIncidents=${data.result?.totalIncidents ?? 'unknown'}`;
  });

  // 4. Sentiment (GET — aggregate from incidents)
  await test('GET /api/sentiment', async () => {
    const r = await fetch(`${BASE_URL}/api/sentiment`, {
      headers: { Authorization: `Bearer ${AUTH_TOKEN}` },
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const data = (await r.json()) as {
      result?: { totalAnalyzed?: number; dominant?: string; trend?: string };
    };
    return `analyzed=${data.result?.totalAnalyzed ?? 0}, dominant=${data.result?.dominant ?? 'unknown'}, trend=${data.result?.trend ?? 'unknown'}`;
  });

  // 5. Vision (POST with tiny test PNG)
  await test('POST /api/vision (test image)', async () => {
    // 1x1 red pixel PNG
    const tinyPng =
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';
    const r = await fetch(`${BASE_URL}/api/vision`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${AUTH_TOKEN}`,
      },
      body: JSON.stringify({
        imageBase64: tinyPng,
        mimeType: 'image/png',
        context: 'Test image for deployment verification',
      }),
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const data = (await r.json()) as { result?: { category?: string; severity?: string } };
    return `category=${data.result?.category ?? 'unknown'}, severity=${data.result?.severity ?? 'unknown'}`;
  });

  // Print results
  console.log('');
  const passed = results.filter((r) => r.passed).length;
  const total = results.length;
  for (const r of results) {
    const icon = r.passed ? '✅' : '❌';
    const time = `${r.durationMs}ms`;
    console.log(`${icon} ${r.name.padEnd(40)} ${time.padStart(8)}  ${r.detail}`);
  }
  console.log(`\n${passed}/${total} passed`);

  if (passed < total) process.exit(1);
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
