import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const runtime = readFileSync('src/agent/runtime.ts', 'utf8');

test('one server-only runtime composes canonical HTTP and payment extensions', () => {
  assert.match(runtime, /import 'server-only'/);
  assert.equal((runtime.match(/createAgent\(/g) ?? []).length, 1);
  assert.match(runtime, /\.use\(payments\(/);
  assert.match(runtime, /\.use\(http\(\{ basePath: '\/api\/agent'/);
});

test('paid entrypoints advertise exact x402 Base Sepolia offers', () => {
  assert.match(runtime, /key: 'rank-inference-chips'[\s\S]*price: '0\.02'[\s\S]*paymentProtocol: 'x402'[\s\S]*network: 'eip155:84532'/);
  assert.match(runtime, /key: 'compare-inference-chips'[\s\S]*price: '0\.03'[\s\S]*paymentProtocol: 'x402'[\s\S]*network: 'eip155:84532'/);
});

test('Next route modules delegate to canonical runtime handlers', () => {
  const files = [
    'app/api/agent/health/route.ts', 'app/api/agent/entrypoints/route.ts',
    'app/api/agent/entrypoints/[key]/invoke/route.ts', 'app/api/agent/entrypoints/[key]/stream/route.ts',
    'app/api/agent/.well-known/agent-card.json/route.ts', 'app/api/agent/.well-known/agent.json/route.ts',
    'app/api/agent/.well-known/oasf-record.json/route.ts', 'app/api/agent/openapi.json/route.ts',
  ];
  for (const file of files) assert.match(readFileSync(file, 'utf8'), /runtime\.http\.handlers\./, file);
});
