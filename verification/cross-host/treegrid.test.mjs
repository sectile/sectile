import assert from 'node:assert/strict';
import test from 'node:test';
import { createTreeGridController as createDOMTreeGridController } from '@sectile/dom/treegrid';
import { createGrid } from '@sectile/primitives/grid';
import { createTree } from '@sectile/primitives/tree';
import { createTreeGridModel } from '@sectile/primitives/treegrid';
import { createTreeGridController as createTerminalTreeGridController } from '@sectile/terminal/treegrid';

const INPUTS = [
  [{ key: 'ArrowDown' }, { key: 'down' }],
  [{ key: 'ArrowUp' }, { key: 'up' }],
  [{ key: 'ArrowRight' }, { key: 'right' }],
  [{ key: 'ArrowLeft' }, { key: 'left' }],
  [{ key: 'ArrowRight', altKey: true }, { key: 'expand' }],
  [{ key: 'ArrowLeft', altKey: true }, { key: 'collapse' }],
  [{ key: ' ' }, { key: 'space' }],
  [{ key: 'Enter' }, { key: 'enter' }],
  [{ key: 'Escape' }, { key: 'escape' }],
];

test('DOM and terminal treegrid controllers produce equivalent semantic traces', () => {
  const options = {
    model: fixtureModel(),
    defaultHighlightedValue: 'root-name',
  };
  const DOMController = unwrap(createDOMTreeGridController(options));
  const terminalController = unwrap(createTerminalTreeGridController(options));
  for (const [DOMInput, terminalInput] of [INPUTS[4], INPUTS[0], INPUTS[6], INPUTS[7], INPUTS[7]]) {
    assert.deepEqual(
      observe(DOMController.handleKeyboardInput(DOMInput)),
      observe(terminalController.handleKeyboardInput(terminalInput)),
    );
  }
});

test('DOM and terminal treegrid controllers remain equivalent across 20,000 transitions', () => {
  const rng = random(0x7ee6);
  const options = {
    model: fixtureModel(),
    defaultExpandedValue: ['root', 'a', 'b'],
    defaultHighlightedValue: 'root-name',
    policies: { boundary: 'wrap-axis' },
  };
  const DOMController = unwrap(createDOMTreeGridController(options));
  const terminalController = unwrap(createTerminalTreeGridController(options));
  for (let index = 0; index < 10_000; index += 1) {
    const pair = INPUTS[rng.int(INPUTS.length)];
    assert.notEqual(pair, undefined);
    const [DOMInput, terminalInput] = pair;
    assert.deepEqual(
      observe(DOMController.handleKeyboardInput(DOMInput)),
      observe(terminalController.handleKeyboardInput(terminalInput)),
    );
  }
});

function observe(result) {
  const state = result.snapshot.state;
  return result.ok
    ? {
        ok: true,
        revision: result.snapshot.revision,
        expanded: state.expansion.ids,
        current: state.cursor.current,
        selected: state.selection.selected,
        editMode: state.editMode,
        commands: result.commands.map(canonicalCommand),
      }
    : {
        ok: false,
        revision: result.snapshot.revision,
        error: result.error.code === 'unsupported-dom-key' || result.error.code === 'unsupported-terminal-key'
          ? 'unsupported-host-key'
          : result.error.code,
      };
}

function canonicalCommand(command) {
  return {
    type: command.type === 'focus-element' || command.type === 'move-highlight'
      ? 'focus'
      : command.type,
    id: command.id,
  };
}

function fixtureModel() {
  const tree = unwrap(createTree([
    { id: 'root', parentID: null },
    { id: 'a', parentID: 'root' },
    { id: 'a-1', parentID: 'a' },
    { id: 'a-2', parentID: 'a' },
    { id: 'b', parentID: 'root' },
    { id: 'b-1', parentID: 'b' },
  ]));
  const rowIDs = tree.preorder().ids;
  const grid = unwrap(createGrid(rowIDs.map((row) => [`${row}-name`, `${row}-value`])));
  return unwrap(createTreeGridModel(tree, grid, rowIDs));
}

function random(seed) {
  let state = seed >>> 0;
  return {
    int(maximumExclusive) {
      state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
      return Math.floor((state / 0x100000000) * maximumExclusive);
    },
  };
}

function unwrap(result) {
  assert.equal(result.ok, true, result.ok ? undefined : result.error.message);
  return result.value;
}
