import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeMutationResult } from './result-normalization.mjs';

test('gives legacy target positioning failures a specific failure code', () => {
  const result = normalizeMutationResult({
    correctSamples: 1,
    recoveredSamples: 0,
    failedSamples: 2,
    totalSamples: 3,
    samples: [
      { sample: 1, outcome: 'clean', elapsedMs: 4, failureCodes: [] },
      { sample: 2, outcome: 'failed', elapsedMs: null, failureCodes: ['exception'] },
      { sample: 3, outcome: 'failed', elapsedMs: null, failureCodes: ['timeout'] },
    ],
    failures: [
      { sample: 2, code: 'exception', severity: 'fatal', message: 'Could not position row 50000 in the viewport.' },
      { sample: 3, code: 'timeout', message: 'The screen did not settle.' },
    ],
  });

  assert.deepEqual(result.samples.map((sample) => sample.outcome), ['clean', 'failed', 'failed']);
  assert.deepEqual(result.samples[1].failureCodes, ['target-position']);
  assert.equal(result.failedSamples, 2);
  assert.equal(result.failures[0].code, 'target-position');
  assert.equal(result.failures[0].severity, 'fatal');
});
