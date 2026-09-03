import { spawn } from 'node:child_process';

const port = 3233;
const origin = `http://127.0.0.1:${port}`;
const child = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', String(port)], {
  env: { ...process.env, PAYMENTS_RECEIVABLE_ADDRESS: '', PAYMENTS_FACILITATOR_URL: '', PAYMENTS_NETWORK: '', PAYMENTS_FACILITATOR_AUTH: '' },
  stdio: ['ignore', 'pipe', 'pipe'],
});
let logs = '';
child.stdout.on('data', chunk => { logs += chunk; });
child.stderr.on('data', chunk => { logs += chunk; });

async function waitUntilReady() {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try { if ((await fetch(`${origin}/api/agent/health`)).ok) return; } catch {}
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  throw new Error(`Server did not start. ${logs.slice(-2000)}`);
}

async function invoke(key, input) {
  return fetch(`${origin}/api/agent/entrypoints/${key}/invoke`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ input }) });
}

try {
  await waitUntilReady();
  for (const path of ['/', '/leaderboard', '/methodology', '/api', '/updates', '/api/agent/entrypoints', '/api/agent/.well-known/agent-card.json', '/api/agent/.well-known/agent.json', '/api/agent/openapi.json']) {
    const response = await fetch(`${origin}${path}`);
    if (!response.ok) throw new Error(`${path} returned ${response.status}`);
  }
  const oasf = await fetch(`${origin}/api/agent/.well-known/oasf-record.json`);
  const oasfBody = await oasf.json();
  if (oasf.status !== 404 || oasfBody?.error?.code !== 'not_found') throw new Error(`OASF optional-state contract changed: ${oasf.status}`);
  for (const key of ['get-dataset-status', 'preview-inference-chips']) {
    const response = await invoke(key, {});
    if (!response.ok) throw new Error(`${key} returned ${response.status}`);
  }
  const sliceId = 'v6.0-closed-gpt-oss-120b-offline-official-default-tokens-per-second';
  for (const [key, input] of [['rank-inference-chips', { sliceId }], ['compare-inference-chips', { sliceId, acceleratorSlugs: ['a', 'b'] }]]) {
    const response = await invoke(key, input);
    const body = await response.json();
    if (response.status !== 503 || body?.error?.code !== 'payment_configuration_error') throw new Error(`${key} did not fail closed: ${response.status}`);
  }
  console.log(JSON.stringify({ ok: true, pages: 10, optionalOasfState: 404, freeEntrypoints: 2, paidFailClosedEntrypoints: 2 }));
} finally {
  child.kill('SIGTERM');
}
