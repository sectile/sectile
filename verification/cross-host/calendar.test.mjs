import assert from 'node:assert/strict';
import test from 'node:test';
import { createCalendar as createDOMCalendar } from '@sectile/dom/temporal';
import { createCalendar as createTerminalCalendar } from '@sectile/terminal/calendar';

const INPUTS = [
  [{ key: 'ArrowLeft' }, { key: 'left' }],
  [{ key: 'ArrowRight' }, { key: 'right' }],
  [{ key: 'ArrowUp' }, { key: 'up' }],
  [{ key: 'ArrowDown' }, { key: 'down' }],
  [{ key: 'Home' }, { key: 'home' }],
  [{ key: 'End' }, { key: 'end' }],
  [{ key: 'Enter' }, { key: 'enter' }],
  [{ key: 'PageUp' }, { key: 'page-up' }],
  [{ key: 'PageDown' }, { key: 'page-down' }],
  [{ key: 'PageUp', shiftKey: true }, { key: 'page-up', shiftKey: true }],
];

test('DOM and terminal calendars produce equivalent semantic traces', () => {
  const options = { defaultHighlightedValue: date(2024, 1, 31) };
  const DOMCalendar = createDOMCalendar({ ...options, root: new FakeElement() });
  const terminalCalendar = createTerminalCalendar(options);
  for (const [DOMInput, terminalInput] of INPUTS) {
    assert.equal(DOMCalendar.handleKeyboardEvent(DOMInput), terminalCalendar.handleKeyboardInput(terminalInput));
    assert.deepEqual(observe(DOMCalendar), observe(terminalCalendar));
  }
});

test('DOM and terminal calendars remain equivalent across 20,000 transitions', () => {
  const rng = random(0xca1e);
  const options = {
    defaultHighlightedValue: date(2026, 8, 22),
    policies: {
      min: date(1900, 1, 1),
      max: date(2100, 12, 31),
      unavailable: (value) => value.day === 13,
    },
  };
  const DOMCalendar = createDOMCalendar({ ...options, root: new FakeElement() });
  const terminalCalendar = createTerminalCalendar(options);
  for (let index = 0; index < 10_000; index += 1) {
    const [DOMInput, terminalInput] = INPUTS[rng.int(INPUTS.length)];
    assert.equal(DOMCalendar.handleKeyboardEvent(DOMInput), terminalCalendar.handleKeyboardInput(terminalInput));
    assert.deepEqual(observe(DOMCalendar), observe(terminalCalendar));
  }
});

function observe(connection) {
  const snapshot = connection.getSnapshot();
  return {
    revision: snapshot.revision,
    value: snapshot.state.value,
    highlighted: snapshot.state.highlighted,
    view: snapshot.state.view,
    viewMode: snapshot.state.viewMode,
  };
}
function date(year, month, day) { return Object.freeze({ year, month, day }); }
function random(seed) {
  let state = seed >>> 0;
  return {
    int(maximumExclusive) {
      state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
      return Math.floor((state / 0x100000000) * maximumExclusive);
    },
  };
}

class FakeElement {
  attributes = new Map();
  dataset = {};
  listeners = new Map();
  addEventListener(type, listener) {
    const listeners = this.listeners.get(type) ?? new Set();
    listeners.add(listener);
    this.listeners.set(type, listeners);
  }
  removeEventListener(type, listener) { this.listeners.get(type)?.delete(listener); }
  setAttribute(name, value) { this.attributes.set(name, value); }
  removeAttribute(name) { this.attributes.delete(name); }
  querySelectorAll() { return []; }
  querySelector() { return null; }
  contains() { return true; }
}
