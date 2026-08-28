import assert from 'node:assert/strict';
import test from 'node:test';
import { assertCompatibleSource, mergeRuns } from './source-metadata.mjs';

const report = (fingerprint, runs = {}) => ({
  source: { buildFingerprint: fingerprint },
  runs,
});

test('accepts only reports produced from the same source build', () => {
  assert.doesNotThrow(() => assertCompatibleSource(report('same'), report('same')));
  assert.throws(
    () => assertCompatibleSource(report('left'), report('right')),
    /different source builds/,
  );
  assert.throws(
    () => assertCompatibleSource({}, report('right')),
    /without source provenance/,
  );
});

test('unions run provenance and rejects conflicting run identifiers', () => {
  assert.deepEqual(mergeRuns(
    report('same', { first: { observedAt: '2026-08-28T00:00:00.000Z' } }),
    report('same', { second: { observedAt: '2026-08-28T01:00:00.000Z' } }),
  ), {
    first: { observedAt: '2026-08-28T00:00:00.000Z' },
    second: { observedAt: '2026-08-28T01:00:00.000Z' },
  });
  assert.throws(
    () => mergeRuns(
      report('same', { duplicated: { observedAt: 'first' } }),
      report('same', { duplicated: { observedAt: 'second' } }),
    ),
    /conflicting provenance/,
  );
});
