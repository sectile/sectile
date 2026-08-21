/* Cross-package evidence: two published host surfaces drive one semantic machine. */
import assert from 'node:assert/strict';
import test from 'node:test';
import { DOMListboxEvent, stepDOMListboxAdapter } from '@sectile/dom/listbox';
import { createListboxState } from '@sectile/primitives/listbox';
import { createRevisionEnvelope } from '@sectile/primitives/revision';
import { createSequence } from '@sectile/primitives/sequence';
import { stepTerminalListboxAdapter, terminalListboxEvent } from '@sectile/terminal/listbox';

const INPUTS = [
  [{ key: 'ArrowDown' }, { key: 'down' }, 'next'],
  [{ key: ' ' }, { key: 'space' }, 'toggle'],
  [{ key: 'Enter' }, { key: 'enter' }, 'activate'],
  [{ key: 'ArrowUp' }, { key: 'up' }, 'previous'],
  [{ key: 'Escape' }, { key: 'escape' }, 'clear'],
];

test('DOM and terminal packages produce equivalent semantic traces', () => {
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
    assert.deepEqual(observe(DOMResult), observe(terminalResult));
    if (DOMResult.ok && terminalResult.ok) {
      DOMEnvelope = DOMResult.envelope;
      terminalEnvelope = terminalResult.envelope;
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

test('DOM and terminal packages remain equivalent across 40,000 host transitions', () => {
  const rng = createRNG(0x5ec71e ^ 0xada7);
  let transitions = 0;
  for (let iteration = 0; iteration < 2_000; iteration += 1) {
    const ids = Array.from({ length: rng.int(0, 40) }, (_, index) => `a${iteration}-${index}`);
    const domain = unwrap(createSequence(ids));
    const eligible = new Set(ids.filter(() => rng.bool()));
    const initial = unwrap(createListboxState(domain));
    let DOMEnvelope = unwrap(createRevisionEnvelope(initial));
    let terminalEnvelope = unwrap(createRevisionEnvelope(initial));
    const policies = {
      eligible: (id) => eligible.has(id),
      selectionFollowsFocus: rng.bool(),
      boundary: rng.pick(['stop', 'wrap']),
      maxScan: rng.int(0, ids.length + 2),
    };
    for (let step = 0; step < 10; step += 1) {
      const [DOMInput, terminalInput] = rng.pick(INPUTS);
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
      assert.deepEqual(observe(DOMResult), observe(terminalResult));
      transitions += 2;
      if (DOMResult.ok && terminalResult.ok) {
        DOMEnvelope = DOMResult.envelope;
        terminalEnvelope = terminalResult.envelope;
      }
    }
  }
  assert.equal(transitions, 40_000);
});

function observe(result) {
  return result.ok
    ? {
        ok: true,
        revision: result.envelope.revision,
        ...stateObservation(result.envelope.state),
        targets: result.commands.map((command) => command.id),
      }
    : {
        ok: false,
        revision: result.envelope.revision,
        errorClass: result.error.class,
        errorCode: result.error.code,
      };
}

function stateObservation(state) {
  return {
    current: state.cursor.current,
    selected: state.selection.selected,
    anchor: state.selection.anchor,
  };
}

function unwrap(result) {
  assert.equal(result.ok, true, result.ok ? undefined : result.error.message);
  return result.value;
}

function createRNG(seed) {
  let state = seed >>> 0;
  const next = () => {
    state = (Math.imul(state, 1_664_525) + 1_013_904_223) >>> 0;
    return state / 0x1_0000_0000;
  };
  return {
    bool: () => next() < 0.5,
    int: (minimum, maximumExclusive) => minimum + Math.floor(next() * (maximumExclusive - minimum)),
    pick: (values) => values[Math.floor(next() * values.length)],
  };
}
