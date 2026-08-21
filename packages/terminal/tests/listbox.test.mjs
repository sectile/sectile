import assert from 'node:assert/strict';
import test from 'node:test';
import { stepTerminalListboxAdapter, terminalListboxEffect, terminalListboxEvent } from '../dist/listbox.js';
import { createListboxState } from '@sectile/primitives/listbox';
import { createRevisionEnvelope } from '@sectile/primitives/revision';
import { createSequence } from '@sectile/primitives/sequence';

test('terminal keys map onto listbox semantic events', () => {
  assert.equal(terminalListboxEvent({ key: 'down' }), 'next');
  assert.equal(terminalListboxEvent({ key: 'up' }), 'previous');
  assert.equal(terminalListboxEvent({ key: 'space' }), 'toggle');
  assert.equal(terminalListboxEvent({ key: 'enter' }), 'activate');
  assert.equal(terminalListboxEvent({ key: 'escape' }), 'clear');
  assert.equal(terminalListboxEvent({ key: 'tab' }), null);
});

test('terminal commands project into terminal-specific effects', () => {
  assert.deepEqual(terminalListboxEffect({ type: 'focus', id: 'a' }), {
    type: 'move-highlight',
    id: 'a',
  });
  assert.deepEqual(terminalListboxEffect({ type: 'activate', id: 'a' }), {
    type: 'submit-item',
    id: 'a',
  });
});

test('unsupported and stale terminal inputs are failure-atomic', () => {
  const domain = unwrap(createSequence(['a']));
  const initial = unwrap(createRevisionEnvelope(unwrap(createListboxState(domain))));
  const unsupported = stepTerminalListboxAdapter(domain, initial, 0, { key: 'tab' });
  assert.equal(unsupported.ok, false);
  assert.equal(unsupported.envelope, initial);
  assert.deepEqual(unsupported.commands, []);
  const stale = stepTerminalListboxAdapter(domain, initial, 1, { key: 'down' });
  assert.equal(stale.ok, false);
  assert.equal(stale.error.code, 'stale-revision');
  assert.equal(stale.envelope, initial);
});

function unwrap(result) {
  assert.equal(result.ok, true, result.ok ? undefined : result.error.message);
  return result.value;
}
