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
import { checkProperty } from '../support/property.mjs';

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
  let transitions = 0;
  checkProperty({
    name: 'DOM and terminal listbox parity',
    seed: 0x5ec71e ^ 0xada7,
    runs: 2_000,
    generate: (rng, iteration) => {
      const ids = Array.from({ length: rng.int(0, 40) }, (_, index) => `a${iteration}-${index}`);
      return Object.freeze({
        ids,
        eligible: ids.filter(() => rng.bool()),
        selectionFollowsFocus: rng.bool(),
        boundary: rng.pick(['stop', 'wrap']),
        maxScan: rng.int(0, ids.length + 2),
        inputs: Array.from({ length: 10 }, () => INPUTS.indexOf(rng.pick(INPUTS))),
      });
    },
    verify: (scenario) => {
      const domain = createSequence(scenario.ids);
      const eligible = new Set(scenario.eligible);
      const policies = {
        eligible: (id) => eligible.has(id),
        selectionFollowsFocus: scenario.selectionFollowsFocus,
        boundary: scenario.boundary,
        maxScan: scenario.maxScan,
      };
      const DOMController = unwrap(createDOMListboxController({ domain, policies }));
      const terminalController = unwrap(createTerminalListboxController({ domain, policies }));
      for (const inputIndex of scenario.inputs) {
        const [DOMInput, terminalInput] = INPUTS[inputIndex];
        const DOMResult = DOMController.handleKeyboardInput(DOMInput);
        const terminalResult = terminalController.handleKeyboardInput(terminalInput);
        assert.deepEqual(observe(DOMResult), observe(terminalResult));
        transitions += 2;
      }
    },
    shrink: shrinkListboxScenario,
  });
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

function shrinkListboxScenario(scenario) {
  const candidates = [];
  if (scenario.inputs.length > 1) {
    candidates.push({ ...scenario, inputs: scenario.inputs.slice(0, Math.ceil(scenario.inputs.length / 2)) });
    for (let index = 0; index < scenario.inputs.length; index += 1) {
      candidates.push({ ...scenario, inputs: scenario.inputs.toSpliced(index, 1) });
    }
  }
  if (scenario.ids.length > 0) {
    const ids = scenario.ids.slice(0, Math.floor(scenario.ids.length / 2));
    const domain = new Set(ids);
    candidates.push({
      ...scenario,
      ids,
      eligible: scenario.eligible.filter((id) => domain.has(id)),
      maxScan: Math.min(scenario.maxScan, ids.length + 1),
    });
  }
  if (scenario.boundary !== 'stop') candidates.push({ ...scenario, boundary: 'stop' });
  if (scenario.selectionFollowsFocus) candidates.push({ ...scenario, selectionFollowsFocus: false });
  if (scenario.maxScan > 0) candidates.push({ ...scenario, maxScan: Math.floor(scenario.maxScan / 2) });
  return candidates;
}
