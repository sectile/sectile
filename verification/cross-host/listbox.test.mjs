/* Cross-package evidence: two published host surfaces drive one semantic machine. */
import assert from 'node:assert/strict';
import test from 'node:test';
import { unwrap } from '@sectile/core/result';
import {
  createListboxController as createDOMListboxController,
  toListboxEvent as toDOMListboxEvent,
} from '@sectile/dom/listbox';
import { createSequence } from '@sectile/core/sequence';
import {
  createListboxController as createTerminalListboxController,
  toListboxEvent as toTerminalListboxEvent,
} from '@sectile/terminal/listbox';

const INPUTS = [
  [{ key: 'ArrowDown' }, { key: 'down' }, 'next'],
  [{ key: ' ' }, { key: 'space' }, 'toggle'],
  [{ key: 'Enter' }, { key: 'enter' }, 'activate'],
  [{ key: 'ArrowUp' }, { key: 'up' }, 'previous'],
  [{ key: 'Escape' }, { key: 'escape' }, 'clear'],
];

test('DOM and terminal packages produce equivalent semantic traces', () => {
  const domain = createSequence(['a', 'b', 'c']);
  const policies = { boundary: 'stop', selectionFollowsFocus: false };
  const DOMController = unwrap(createDOMListboxController({ domain, policies }));
  const terminalController = unwrap(createTerminalListboxController({ domain, policies }));

  for (const [DOMInput, terminalInput, semantic] of INPUTS) {
    assert.equal(toDOMListboxEvent(DOMInput), semantic);
    assert.equal(toTerminalListboxEvent(terminalInput), semantic);
    const DOMResult = DOMController.handleKeyboardInput(DOMInput);
    const terminalResult = terminalController.handleKeyboardInput(terminalInput);
    assert.deepEqual(observe(DOMResult), observe(terminalResult));
  }
  const DOMSnapshot = DOMController.getSnapshot();
  const terminalSnapshot = terminalController.getSnapshot();
  assert.deepEqual(stateObservation(DOMSnapshot.state), {
    current: 'a',
    selected: [],
    anchor: null,
  });
  assert.equal(DOMSnapshot.revision, 5);
  assert.equal(terminalSnapshot.revision, 5);
});

test('DOM and terminal packages remain equivalent across 40,000 host transitions', () => {
  const rng = createRNG(0x5ec71e ^ 0xada7);
  let transitions = 0;
  for (let iteration = 0; iteration < 2_000; iteration += 1) {
    const ids = Array.from({ length: rng.int(0, 40) }, (_, index) => `a${iteration}-${index}`);
    const domain = createSequence(ids);
    const eligible = new Set(ids.filter(() => rng.bool()));
    const policies = {
      eligible: (id) => eligible.has(id),
      selectionFollowsFocus: rng.bool(),
      boundary: rng.pick(['stop', 'wrap']),
      maxScan: rng.int(0, ids.length + 2),
    };
    const DOMController = unwrap(createDOMListboxController({ domain, policies }));
    const terminalController = unwrap(createTerminalListboxController({ domain, policies }));
    for (let step = 0; step < 10; step += 1) {
      const [DOMInput, terminalInput] = rng.pick(INPUTS);
      const DOMResult = DOMController.handleKeyboardInput(DOMInput);
      const terminalResult = terminalController.handleKeyboardInput(terminalInput);
      assert.deepEqual(observe(DOMResult), observe(terminalResult));
      transitions += 2;
    }
  }
  assert.equal(transitions, 40_000);
});

test('DOM and terminal listboxes preserve edge movement and single-selection parity', () => {
  const domain = createSequence(['a', 'disabled', 'c']);
  const options = {
    domain,
    selectionMode: 'single',
    policies: { eligible: (id) => id !== 'disabled' },
  };
  const DOMController = unwrap(createDOMListboxController(options));
  const terminalController = unwrap(createTerminalListboxController(options));
  for (const event of ['last', 'toggle', 'first', 'toggle', 'toggle']) {
    assert.deepEqual(
      observe(DOMController.handleEvent(event)),
      observe(terminalController.handleEvent(event)),
    );
    assert.deepEqual(
      stateObservation(DOMController.getSnapshot().state),
      stateObservation(terminalController.getSnapshot().state),
    );
  }
  assert.deepEqual(stateObservation(DOMController.getSnapshot().state), {
    current: 'a',
    selected: ['a'],
    anchor: 'a',
  });
});

function observe(result) {
  return result.ok
    ? {
        ok: true,
        revision: result.snapshot.revision,
        ...stateObservation(result.snapshot.state),
        targets: result.commands.map((command) => command.id),
      }
    : {
        ok: false,
        revision: result.snapshot.revision,
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
