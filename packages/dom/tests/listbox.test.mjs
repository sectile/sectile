import assert from 'node:assert/strict';
import test from 'node:test';
import { DOMListboxEffect, DOMListboxEvent, stepDOMListboxAdapter } from '../dist/listbox.js';
import { createListboxState } from '@sectile/primitives/listbox';
import { createRevisionEnvelope } from '@sectile/primitives/revision';
import { createSequence } from '@sectile/primitives/sequence';

test('DOM keyboard inputs map onto listbox semantic events', () => {
  assert.equal(DOMListboxEvent({ key: 'ArrowDown' }), 'next');
  assert.equal(DOMListboxEvent({ key: 'ArrowUp' }), 'previous');
  assert.equal(DOMListboxEvent({ key: ' ' }), 'toggle');
  assert.equal(DOMListboxEvent({ key: 'Enter' }), 'activate');
  assert.equal(DOMListboxEvent({ key: 'Escape' }), 'clear');
  assert.equal(DOMListboxEvent({ key: 'ArrowDown', ctrlKey: true }), null);
  assert.equal(DOMListboxEvent({ key: 'Tab' }), null);
});

test('DOM commands project into DOM-specific effects', () => {
  assert.deepEqual(DOMListboxEffect({ type: 'focus', id: 'a' }), {
    type: 'focus-element',
    id: 'a',
  });
  assert.deepEqual(DOMListboxEffect({ type: 'activate', id: 'a' }), {
    type: 'dispatch-activation',
    id: 'a',
  });
});

test('unsupported and stale DOM inputs are failure-atomic', () => {
  const domain = unwrap(createSequence(['a']));
  const initial = unwrap(createRevisionEnvelope(unwrap(createListboxState(domain))));
  const unsupported = stepDOMListboxAdapter(domain, initial, 0, { key: 'Tab' });
  assert.equal(unsupported.ok, false);
  assert.equal(unsupported.envelope, initial);
  assert.deepEqual(unsupported.commands, []);
  const stale = stepDOMListboxAdapter(domain, initial, 1, { key: 'ArrowDown' });
  assert.equal(stale.ok, false);
  assert.equal(stale.error.code, 'stale-revision');
  assert.equal(stale.envelope, initial);
});

function unwrap(result) {
  assert.equal(result.ok, true, result.ok ? undefined : result.error.message);
  return result.value;
}
