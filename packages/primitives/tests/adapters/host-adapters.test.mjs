/* Adapter evidence: two hosts map distinct raw inputs onto one revisioned semantic machine */
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DOMListboxEvent,
  stepDOMListboxAdapter,
} from '../../.verification-dist/internal/adapters/dom.js';
import {
  stepTerminalListboxAdapter,
  terminalListboxEvent,
} from '../../.verification-dist/internal/adapters/terminal.js';
import { createListboxState } from '../../.verification-dist/internal/composites/listbox.js';
import { createRevisionEnvelope } from '../../.verification-dist/internal/runtime/revision.js';
import { createSequence } from '../../.verification-dist/structures/sequence.js';
import { unwrap } from '../support.mjs';

const INPUTS = [
  [{ key: 'ArrowDown' }, { key: 'down' }, 'next'],
  [{ key: ' ' }, { key: 'space' }, 'toggle'],
  [{ key: 'Enter' }, { key: 'enter' }, 'activate'],
  [{ key: 'ArrowUp' }, { key: 'up' }, 'previous'],
  [{ key: 'Escape' }, { key: 'escape' }, 'clear'],
];

test('DOM and terminal adapters produce equivalent semantic traces', () => {
  const domain = unwrap(createSequence(['a', 'b', 'c']));
  const initial = unwrap(createListboxState(domain));
  let DOMEnvelope = unwrap(createRevisionEnvelope(initial));
  let terminalEnvelope = unwrap(createRevisionEnvelope(initial));
  const policies = { boundary: 'stop', selectionFollowsFocus: false };

  for (const [DOMInput, terminalInput, semantic] of INPUTS) {
    assert.equal(DOMListboxEvent(DOMInput), semantic);
    assert.equal(terminalListboxEvent(terminalInput), semantic);
    const DOMResult = stepDOMListboxAdapter(
      domain,
      DOMEnvelope,
      DOMEnvelope.revision,
      DOMInput,
      policies,
    );
    const terminalResult = stepTerminalListboxAdapter(
      domain,
      terminalEnvelope,
      terminalEnvelope.revision,
      terminalInput,
      policies,
    );
    assert.equal(DOMResult.ok, terminalResult.ok);
    if (DOMResult.ok && terminalResult.ok) {
      assert.deepEqual(stateObservation(DOMResult.envelope.state), stateObservation(terminalResult.envelope.state));
      assert.equal(DOMResult.envelope.revision, terminalResult.envelope.revision);
      assert.deepEqual(effectTargets(DOMResult.commands), effectTargets(terminalResult.commands));
      DOMEnvelope = DOMResult.envelope;
      terminalEnvelope = terminalResult.envelope;
    } else {
      assert.equal(DOMResult.error.code, terminalResult.error.code);
      assert.equal(DOMResult.envelope, DOMEnvelope);
      assert.equal(terminalResult.envelope, terminalEnvelope);
    }
  }
  assert.deepEqual(stateObservation(DOMEnvelope.state), {
    current: 'a',
    selected: [],
    anchor: null,
  });
  assert.equal(DOMEnvelope.revision, 5);
  assert.equal(terminalEnvelope.revision, 5);
});

test('host adapters project semantic commands into host-specific effects', () => {
  const domain = unwrap(createSequence(['a']));
  const initial = unwrap(createRevisionEnvelope(unwrap(createListboxState(domain))));
  const DOMFocused = stepDOMListboxAdapter(domain, initial, 0, { key: 'ArrowDown' });
  const terminalFocused = stepTerminalListboxAdapter(domain, initial, 0, { key: 'down' });
  assert.deepEqual(DOMFocused.commands, [{ type: 'focus-element', id: 'a' }]);
  assert.deepEqual(terminalFocused.commands, [{ type: 'move-highlight', id: 'a' }]);

  const DOMActivated = stepDOMListboxAdapter(domain, DOMFocused.envelope, 1, { key: 'Enter' });
  const terminalActivated = stepTerminalListboxAdapter(
    domain,
    terminalFocused.envelope,
    1,
    { key: 'enter' },
  );
  assert.deepEqual(DOMActivated.commands, [{ type: 'dispatch-activation', id: 'a' }]);
  assert.deepEqual(terminalActivated.commands, [{ type: 'submit-item', id: 'a' }]);
});

test('unsupported and stale host inputs are failure-atomic', () => {
  const domain = unwrap(createSequence(['a']));
  const initial = unwrap(createRevisionEnvelope(unwrap(createListboxState(domain))));
  for (const result of [
    stepDOMListboxAdapter(domain, initial, 0, { key: 'Tab' }),
    stepDOMListboxAdapter(domain, initial, 0, { key: 'ArrowDown', ctrlKey: true }),
    stepTerminalListboxAdapter(domain, initial, 0, { key: 'tab' }),
  ]) {
    assert.equal(result.ok, false);
    assert.equal(result.envelope, initial);
    assert.deepEqual(result.commands, []);
  }
  const DOMStale = stepDOMListboxAdapter(domain, initial, 1, { key: 'ArrowDown' });
  const terminalStale = stepTerminalListboxAdapter(domain, initial, 1, { key: 'down' });
  assert.equal(DOMStale.error.code, 'stale-revision');
  assert.equal(terminalStale.error.code, 'stale-revision');
  assert.equal(DOMStale.envelope, initial);
  assert.equal(terminalStale.envelope, initial);
});

function stateObservation(state) {
  return {
    current: state.cursor.current,
    selected: state.selection.selected,
    anchor: state.selection.anchor,
  };
}

function effectTargets(commands) {
  return commands.map((command) => command.id);
}
