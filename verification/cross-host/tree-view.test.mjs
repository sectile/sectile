import assert from 'node:assert/strict';
import test from 'node:test';
import { unwrap } from '@sectile/primitives/result';
import { createTreeViewController as createDOMTreeViewController } from '@sectile/dom/tree-view';
import { createTree } from '@sectile/primitives/tree';
import { createTreeViewController as createTerminalTreeViewController } from '@sectile/terminal/tree-view';

const INPUTS = [
  [{ key: 'ArrowDown' }, { key: 'down' }],
  [{ key: 'ArrowUp' }, { key: 'up' }],
  [{ key: 'ArrowRight' }, { key: 'right' }],
  [{ key: 'ArrowLeft' }, { key: 'left' }],
  [{ key: ' ' }, { key: 'space' }],
];

test('DOM and terminal tree-view controllers produce equivalent semantic traces', () => {
  const tree = fixtureTree();
  const options = { tree, defaultHighlightedValue: 'root' };
  const DOMController = unwrap(createDOMTreeViewController(options));
  const terminalController = unwrap(createTerminalTreeViewController(options));
  for (const [DOMInput, terminalInput] of INPUTS) {
    assert.deepEqual(
      observe(DOMController.handleKeyboardInput(DOMInput)),
      observe(terminalController.handleKeyboardInput(terminalInput)),
    );
  }
});

test('DOM and terminal tree-view controllers remain equivalent across 20,000 transitions', () => {
  const rng = random(0x7ee);
  const tree = fixtureTree();
  const options = { tree, defaultExpandedValue: ['root'], defaultHighlightedValue: 'root' };
  const DOMController = unwrap(createDOMTreeViewController(options));
  const terminalController = unwrap(createTerminalTreeViewController(options));
  for (let index = 0; index < 10_000; index += 1) {
    const [DOMInput, terminalInput] = INPUTS[rng.int(INPUTS.length)];
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
        commandIDs: result.commands.map((command) => command.id),
      }
    : { ok: false, revision: result.snapshot.revision, error: result.error.code };
}

function fixtureTree() {
  return unwrap(createTree([
    { id: 'root', parentID: null },
    { id: 'a', parentID: 'root' },
    { id: 'a-1', parentID: 'a' },
    { id: 'a-2', parentID: 'a' },
    { id: 'b', parentID: 'root' },
    { id: 'b-1', parentID: 'b' },
  ]));
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
