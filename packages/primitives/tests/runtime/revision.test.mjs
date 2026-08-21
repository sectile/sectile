/* Runtime evidence: stale rejection, failure atomicity, and exactly-once revision advancement */
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createListboxState,
  stepListbox,
} from '../../.verification-dist/internal/composites/listbox.js';
import {
  createRevisionEnvelope,
  stepRevisioned,
} from '../../.verification-dist/internal/runtime/revision.js';
import { createSequence } from '../../.verification-dist/structures/sequence.js';
import { powerset, unwrap } from '../support.mjs';

test('revision wrapper reproduces all accepted stale and failure-atomic cases', () => {
  let cases = 0;
  for (let size = 0; size <= 4; size += 1) {
    const ids = Array.from({ length: size }, (_, index) => `i${index}`);
    const domain = unwrap(createSequence(ids));
    for (const eligibleIDs of powerset(ids)) {
      const eligible = new Set(eligibleIDs);
      const state = unwrap(createListboxState(domain));
      const base = unwrap(createRevisionEnvelope(state, 7));
      let calls = 0;
      const reducer = (current, event) => {
        calls += 1;
        return stepListbox(domain, current, event, {
          eligible: (id) => eligible.has(id),
          selectionFollowsFocus: false,
          boundary: 'stop',
        });
      };

      const stale = stepRevisioned(base, 6, 'next', reducer);
      assert.equal(stale.ok, false);
      assert.equal(stale.error.code, 'stale-revision');
      assert.equal(stale.envelope, base);
      assert.deepEqual(stale.commands, []);
      assert.equal(calls, 0);
      cases += 1;

      const failed = stepRevisioned(base, 7, 'toggle', reducer);
      assert.equal(failed.ok, false);
      assert.equal(failed.error.code, 'no-cursor');
      assert.equal(failed.envelope, base);
      assert.deepEqual(failed.commands, []);
      assert.equal(calls, 1);
      cases += 1;

      const accepted = stepRevisioned(base, 7, 'next', reducer);
      assert.equal(accepted.ok, true);
      assert.equal(accepted.envelope.revision, 8);
      assert.equal(Object.isFrozen(accepted.envelope), true);
      assert.equal(Object.isFrozen(accepted.commands), true);
      cases += 1;

      const repeated = stepRevisioned(accepted.envelope, 7, 'next', reducer);
      assert.equal(repeated.ok, false);
      assert.equal(repeated.error.code, 'stale-revision');
      assert.equal(repeated.envelope, accepted.envelope);
      assert.deepEqual(repeated.commands, []);
      cases += 1;
    }
  }
  assert.equal(cases, 124);
});

test('accepted semantic no-ops still advance exactly one revision', () => {
  const domain = unwrap(createSequence(['a']));
  const state = unwrap(createListboxState(domain, { current: 'a' }));
  const base = unwrap(createRevisionEnvelope(state, 3));
  const result = stepRevisioned(base, 3, 'next', (current, event) =>
    stepListbox(domain, current, event, { boundary: 'stop' }));
  assert.equal(result.ok, true);
  assert.equal(result.envelope.revision, 4);
  assert.equal(result.envelope.state, state);
  assert.deepEqual(result.commands, []);
});

test('invalid and exhausted revisions reject before reducer execution', () => {
  const state = Object.freeze({ value: 1 });
  assert.equal(createRevisionEnvelope(state, -1).error.code, 'invalid-revision');
  const exhausted = unwrap(createRevisionEnvelope(state, Number.MAX_SAFE_INTEGER));
  let calls = 0;
  const result = stepRevisioned(exhausted, Number.MAX_SAFE_INTEGER, 'input', () => {
    calls += 1;
    throw new Error('must not run');
  });
  assert.equal(result.ok, false);
  assert.equal(result.error.class, 'resource-rejection');
  assert.equal(result.error.code, 'revision-ceiling-reached');
  assert.equal(result.envelope, exhausted);
  assert.equal(calls, 0);
});
