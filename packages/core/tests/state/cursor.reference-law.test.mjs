/* Law evidence: CUR-01 CUR-02 CUR-03 CUR-04 */
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createCursorState,
  reconcileCursor,
} from '../../.verification-dist/internal/state/cursor.js';
import { reconcileReferenceCursor } from '../../.verification-dist/internal/reference/state/cursor.js';
import { createSequence } from '../../.verification-dist/structures/sequence.js';
import { canonicalIDs, unwrap } from '../support.mjs';

test('CUR-01..04: reconciliation preserves valid cursors and applies explicit fallback', () => {
  let cases = 0;
  for (let size = 0; size <= 8; size += 1) {
    const ids = canonicalIDs(size);
    const domain = unwrap(createSequence(ids));
    const candidates = [null, ...ids, `outside-${size}`];
    for (const current of candidates) {
      for (const fallback of ['none', 'first', 'last']) {
        const state = createCursorState(current);
        const result = reconcileCursor(state, domain, fallback);
        const reference = reconcileReferenceCursor(state, domain, fallback);

        assert.deepEqual(result, reference);
        assert.equal(result.current === null || domain.contains(result.current), true);
        if (current !== null && domain.contains(current)) assert.equal(result, state);
        assert.deepEqual(reconcileCursor(result, domain, fallback), result);
        assert.equal(Object.isFrozen(result), true);
        cases += 1;
      }
    }
  }
  assert.equal(cases, 162);
});

test('cursor fallback remains explicit for missing current and empty domains', () => {
  const domain = unwrap(createSequence(['first', 'middle', 'last']));
  const missing = createCursorState('missing');
  assert.equal(reconcileCursor(missing, domain, 'none').current, null);
  assert.equal(reconcileCursor(missing, domain, 'first').current, 'first');
  assert.equal(reconcileCursor(missing, domain, 'last').current, 'last');

  const empty = unwrap(createSequence([]));
  for (const fallback of ['none', 'first', 'last']) {
    assert.equal(reconcileCursor(missing, empty, fallback).current, null);
  }
});
