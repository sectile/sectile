import assert from 'node:assert/strict';
import test from 'node:test';
import { unwrap } from '@sectile/primitives/result';
import { createSliderController as createDOMSliderController } from '@sectile/dom/slider';
import { createRange } from '@sectile/primitives/range';
import { createSliderController as createTerminalSliderController } from '@sectile/terminal/slider';

const INPUTS = [
  [{ key: 'ArrowRight' }, { key: 'right' }],
  [{ key: 'ArrowLeft' }, { key: 'left' }],
  [{ key: 'ArrowUp' }, { key: 'up' }],
  [{ key: 'ArrowDown' }, { key: 'down' }],
  [{ key: 'PageUp' }, { key: 'page-up' }],
  [{ key: 'PageDown' }, { key: 'page-down' }],
  [{ key: 'Home' }, { key: 'home' }],
  [{ key: 'End' }, { key: 'end' }],
];

test('DOM and terminal slider controllers produce equivalent semantic traces', () => {
  const range = unwrap(createRange({ origin: '-1', step: '0.25', count: 8 }));
  const DOMController = unwrap(createDOMSliderController({ range, defaultValue: 3, page: 3 }));
  const terminalController = unwrap(createTerminalSliderController({
    range,
    defaultValue: 3,
    page: 3,
  }));
  for (const [DOMInput, terminalInput] of INPUTS) {
    assert.deepEqual(
      observe(DOMController.handleKeyboardInput(DOMInput)),
      observe(terminalController.handleKeyboardInput(terminalInput)),
    );
  }
  assert.deepEqual(DOMController.getSnapshot(), terminalController.getSnapshot());
});

test('DOM and terminal slider controllers remain equivalent across 20,000 transitions', () => {
  const rng = random(0x51de);
  const range = unwrap(createRange({ origin: '0', step: '1', count: 100 }));
  const DOMController = unwrap(createDOMSliderController({ range, defaultValue: 50, page: 7 }));
  const terminalController = unwrap(createTerminalSliderController({
    range,
    defaultValue: 50,
    page: 7,
  }));
  for (let index = 0; index < 10_000; index += 1) {
    const [DOMInput, terminalInput] = INPUTS[rng.int(INPUTS.length)];
    assert.deepEqual(
      observe(DOMController.handleKeyboardInput(DOMInput)),
      observe(terminalController.handleKeyboardInput(terminalInput)),
    );
  }
});

function observe(result) {
  return result.ok
    ? {
        ok: true,
        revision: result.snapshot.revision,
        tick: result.snapshot.state.tick,
        commandTicks: result.commands.map((command) => command.tick),
      }
    : {
        ok: false,
        revision: result.snapshot.revision,
        error: result.error.code,
      };
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
