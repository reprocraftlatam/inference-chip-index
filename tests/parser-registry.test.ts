import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { resolveAccelerator } from '../src/data/alias-registry';
import { METRICS } from '../src/data/metric-registry';
import { numericInteger, parseMetric, systemSchema } from '../src/data/parser';

test('reviewed aliases resolve known vendors and reject guesses', () => {
  assert.deepEqual(resolveAccelerator('AMD Instinct MI355X 288GB'), { vendor: 'AMD', family: 'Instinct MI355X' });
  assert.deepEqual(resolveAccelerator('Intel Arc Pro B60'), { vendor: 'Intel', family: 'Arc Pro B60' });
  assert.deepEqual(resolveAccelerator('NVIDIA B300-SXM-270GB'), { vendor: 'NVIDIA', family: 'B300' });
  assert.equal(resolveAccelerator('Mystery TPU x8'), null);
});

test('accelerator count is accepted only as an explicit bounded integer', () => {
  assert.equal(numericInteger('8'), 8);
  assert.equal(numericInteger(72), 72);
  for (const value of ['x8', '8.0', '1.5', 'unknown', 0, 1025]) assert.equal(numericInteger(value), null);
});

test('metric parser accepts reviewed upstream keys and rejects unknown values', () => {
  assert.equal(parseMetric('Result is : VALID\nTokens per second : 1234.5'), 1234.5);
  assert.equal(parseMetric('Completed tokens per second: 99'), 99);
  assert.equal(parseMetric('Queries per second: 99'), null);
  assert.equal(parseMetric('Tokens per second: -1'), null);
});

test('metric registry fixes semantics and derivation policy', () => {
  const metric = METRICS['tokens-per-second'];
  assert.equal(metric.unit, 'tokens/s');
  assert.equal(metric.direction, 'higher-is-better');
  assert.equal(metric.validityRequired, 'Result is : VALID');
  assert.equal(metric.derivedPerAcceleratorAllowed, true);
});

test('system schema and negative fixture reject ambiguous identity and topology', () => {
  const fixture = JSON.parse(readFileSync('fixtures/invalid-ambiguous-system.json', 'utf8'));
  assert.equal(resolveAccelerator(fixture.accelerator_model_name), null);
  assert.equal(numericInteger(fixture.accelerators_per_node), null);
  assert.equal(systemSchema.safeParse({ submitter: 'x', system_name: 'x', accelerator_model_name: 'NVIDIA B300' }).success, false);
});
