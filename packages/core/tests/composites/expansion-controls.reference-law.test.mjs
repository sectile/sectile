import assert from 'node:assert/strict';
import test from 'node:test';
import { applyDisclosureEvent, createDisclosureState } from '../../.verification-dist/disclosure.js';
import { applyAccordionEvent, createAccordionState } from '../../.verification-dist/accordion.js';
import { referenceApplyOpenEvent, referenceOpenState } from '../../.verification-dist/internal/reference/state/open-state.js';
import { applyReferenceAccordionEvent, createReferenceAccordionState } from '../../.verification-dist/internal/reference/composites/accordion.js';
import { createSequence } from '../../.verification-dist/structures/sequence.js';
import { powerset, unwrap } from '../support.mjs';

test('disclosure boolean algebra is idempotent and matches its reference', () => {
  for (const open of [false, true]) for (const event of [
    'toggle', 'open', 'close', { type: 'set-open', open: false }, { type: 'set-open', open: true },
  ]) {
    const left = applyDisclosureEvent(createDisclosureState(open), event);
    const right = referenceApplyOpenEvent(referenceOpenState(open), event);
    assert.deepEqual(observeOpen(left), observeReference(right));
  }
});

test('accordion matches an independent keyed-open reference over bounded domains', () => {
  let transitions = 0;
  for (let size = 0; size <= 4; size += 1) {
    const ids = Array.from({ length: size }, (_, index) => `i${index}`);
    const domain = createSequence(ids);
    for (const expansion of ['single', 'multiple']) for (const candidate of powerset(ids)) {
      if (expansion === 'single' && candidate.length > 1) continue;
      for (const current of [null, ...ids]) {
        const policies = { expansion, collapsible: true, boundary: 'wrap' };
        const optimized = createAccordionState(domain, { current, openIDs: candidate }, policies);
        const reference = createReferenceAccordionState(domain, { current, openIDs: candidate }, policies).value.state;
        const target = ids[0] ?? 'missing';
        for (const event of ['next', 'previous', 'first', 'last', 'toggle',
          { type: 'focus', id: target }, { type: 'toggle', id: target },
          { type: 'set-open', id: target, open: true }, { type: 'set-open', id: target, open: false }]) {
          assert.deepEqual(
            observeAccordion(applyAccordionEvent(domain, optimized, event, policies)),
            observeReference(applyReferenceAccordionEvent(domain, reference, event, policies)),
          );
          transitions += 1;
        }
      }
    }
  }
  assert.equal(transitions, 1_656);
});

test('non-collapsible single accordion rejects closing its last open item atomically', () => {
  const domain = createSequence(['a', 'b']);
  const policies = { expansion: 'single', collapsible: false };
  const state = createAccordionState(domain, { current: 'a', openIDs: ['a'] }, policies);
  const rejected = applyAccordionEvent(domain, state, 'toggle', policies);
  assert.equal(rejected.ok, false);
  assert.equal(rejected.error.code, 'accordion-collapse-forbidden');
  assert.deepEqual(state.openIDs, ['a']);
});

function observeOpen(result) {
  return result.ok ? { ok: true, open: result.value.state.open, commands: result.value.commands }
    : { ok: false, errorClass: result.error.class, errorCode: result.error.code };
}
function observeAccordion(result) {
  return result.ok ? { ok: true, current: result.value.state.cursor.current, openIDs: result.value.state.openIDs, commands: result.value.commands }
    : { ok: false, errorClass: result.error.class, errorCode: result.error.code };
}
function observeReference(result) {
  return result.ok ? { ok: true, ...(result.value.state.open === undefined
    ? { current: result.value.state.cursor.current, openIDs: result.value.state.openIDs }
    : { open: result.value.state.open }), commands: result.value.commands }
    : { ok: false, errorClass: result.errorClass, errorCode: result.errorCode };
}
