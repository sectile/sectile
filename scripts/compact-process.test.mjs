import assert from 'node:assert/strict';
import test from 'node:test';
import { boundedFailureOutput } from './lib/compact-process.mjs';

test('failure output keeps the diagnostic tail without flooding the terminal', () => {
  const output = `${'noise\n'.repeat(10_000)}actionable failure\n`;
  const bounded = boundedFailureOutput(output, 512);
  assert.ok(bounded.length < 600);
  assert.match(bounded, /^… \d+ characters omitted …/u);
  assert.match(bounded, /actionable failure/u);
});
