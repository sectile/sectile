import assert from 'node:assert/strict';
import test from 'node:test';
import { unwrap } from '@sectile/core/result';
import { createCalendarController as createDOMCalendarController } from '@sectile/dom/calendar';
import { createGrid } from '@sectile/core/grid';
import { createCalendarController as createTerminalCalendarController } from '@sectile/terminal/calendar';

const INPUTS = [
  [{ key: 'ArrowLeft' }, { key: 'left' }],
  [{ key: 'ArrowRight' }, { key: 'right' }],
  [{ key: 'ArrowUp' }, { key: 'up' }],
  [{ key: 'ArrowDown' }, { key: 'down' }],
  [{ key: 'Enter' }, { key: 'enter' }],
  [{ key: 'PageUp' }, { key: 'page-up' }],
  [{ key: 'PageDown' }, { key: 'page-down' }],
];

test('DOM and terminal calendar controllers produce equivalent semantic traces', () => {
  const grid = unwrap(createGrid([['a', 'b', 'c'], ['d', null, 'e']]));
  const options = { grid, defaultHighlightedValue: 'a', policies: { boundary: 'wrap-axis' } };
  const DOMController = unwrap(createDOMCalendarController(options));
  const terminalController = unwrap(createTerminalCalendarController(options));
  for (const [DOMInput, terminalInput] of INPUTS) {
    assert.deepEqual(
      observe(DOMController.handleKeyboardInput(DOMInput)),
      observe(terminalController.handleKeyboardInput(terminalInput)),
    );
  }
});

test('DOM and terminal calendar controllers remain equivalent across 20,000 transitions', () => {
  const rng = random(0xca1e);
  const grid = unwrap(createGrid([['a', 'b', null], ['c', 'd', 'e'], [null, 'f', 'g']]));
  const options = { grid, defaultHighlightedValue: 'd', policies: { boundary: 'stop' } };
  const DOMController = unwrap(createDOMCalendarController(options));
  const terminalController = unwrap(createTerminalCalendarController(options));
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
        current: state.cursor.current,
        selected: state.selection.selected,
        commands: result.commands.map((command) => ({
          id: 'id' in command ? command.id : null,
          direction: 'direction' in command ? command.direction : null,
          from: 'from' in command ? command.from : null,
        })),
      }
    : { ok: false, revision: result.snapshot.revision, error: result.error.code };
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
