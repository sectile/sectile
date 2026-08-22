import test from 'node:test';
import assert from 'node:assert/strict';
import { unwrap } from '@sectile/core/result';
import { createDateValue } from '@sectile/core/date-field';
import { createTimeValue } from '@sectile/core/time-field';
import { createDateTimeValue } from '@sectile/core/date-time-field';
import { createDateField as createDOMDateField } from '@sectile/dom/date-field';
import { createDateTimeField as createDOMDateTimeField } from '@sectile/dom/date-time-field';
import { createTimeField as createDOMTimeField } from '@sectile/dom/time-field';
import { createDatePicker as createDOMDatePicker } from '@sectile/dom/date-picker';
import { createDateField as createTerminalDateField } from '@sectile/terminal/date-field';
import { createDateTimeField as createTerminalDateTimeField } from '@sectile/terminal/date-time-field';
import { createTimeField as createTerminalTimeField } from '@sectile/terminal/time-field';
import { createDatePicker as createTerminalDatePicker } from '@sectile/terminal/date-picker';

const date = (year, month, day) => unwrap(createDateValue(year, month, day));
const time = (hour, minute) => unwrap(createTimeValue(hour, minute));
const dateTime = (year, month, day, hour, minute) => unwrap(createDateTimeValue(
  date(year, month, day),
  time(hour, minute),
));

test('DOM and terminal date fields preserve date drafts and segment adjustment', () => {
  const DOM = createDOMDateField({ input: new FakeInput(), defaultValue: date(2024, 1, 31) });
  const terminal = createTerminalDateField({ defaultValue: date(2024, 1, 31) });
  assertTrace(DOM, terminal, [moveCaret(5), 'increment-segment', moveCaret(8), 'decrement-segment']);
});

test('DOM and terminal time fields preserve wall-clock segment adjustment', () => {
  const DOM = createDOMTimeField({ input: new FakeInput(), defaultValue: time(10, 30), policies: { step: { minute: 15 } } });
  const terminal = createTerminalTimeField({ defaultValue: time(10, 30), policies: { step: { minute: 15 } } });
  assertTrace(DOM, terminal, [moveCaret(3), 'increment-segment', moveCaret(0), 'decrement-segment']);
});

test('DOM and terminal date-time fields preserve segment carry', () => {
  const options = {
    defaultValue: dateTime(2024, 1, 31, 23, 45),
    policies: { step: { minute: 30 } },
  };
  const DOM = createDOMDateTimeField({ ...options, input: new FakeInput() });
  const terminal = createTerminalDateTimeField(options);
  assertTrace(DOM, terminal, [moveCaret(14), 'increment-segment', moveCaret(8), 'decrement-segment']);
});

test('DOM and terminal date-time fields preserve controlled value ownership', () => {
  const initial = dateTime(2024, 1, 31, 23, 45);
  let DOMProposal = null;
  let terminalProposal = null;
  const DOM = createDOMDateTimeField({
    input: new FakeInput(),
    value: initial,
    policies: { step: { minute: 30 } },
    onValueChange: (value) => { DOMProposal = value; },
  });
  const terminal = createTerminalDateTimeField({
    value: initial,
    policies: { step: { minute: 30 } },
    onValueChange: (value) => { terminalProposal = value; },
  });

  assertTrace(DOM, terminal, [moveCaret(14), 'increment-segment']);
  assert.deepEqual(DOMProposal, terminalProposal);
  assert.deepEqual(DOM.getValue(), initial);
  assert.deepEqual(terminal.getValue(), initial);
  assert.equal(DOM.syncControlledValues({ value: DOMProposal }).ok, true);
  assert.equal(terminal.syncControlledValues({ value: terminalProposal }).ok, true);
  assert.deepEqual(observe(DOM.getSnapshot()), observe(terminal.getSnapshot()));
});

test('DOM and terminal date pickers preserve navigation, availability, and selection', () => {
  const value = date(2026, 8, 21);
  const options = { defaultValue: value, defaultHighlightedValue: value, defaultOpen: true, policies: { unavailable: (candidate) => candidate.day === 22 || candidate.day === 23 } };
  const DOM = createDOMDatePicker({ ...options, root: new FakeElement(), grid: new FakeElement(), trigger: new FakeElement() });
  const terminal = createTerminalDatePicker(options);
  assertTrace(DOM, terminal, ['next-day', 'next-month', 'previous-week', 'select-highlighted']);
});

function assertTrace(DOM, terminal, events) {
  assert.deepEqual(observe(DOM.getSnapshot()), observe(terminal.getSnapshot()));
  for (const event of events) {
    assert.equal(DOM.handleEvent(event), terminal.handleEvent(event));
    assert.deepEqual(observe(DOM.getSnapshot()), observe(terminal.getSnapshot()));
  }
}
function observe(value) { return JSON.parse(JSON.stringify(value)); }
function moveCaret(offset) { return { type: 'text', event: { type: 'replace', startCodeUnitOffset: offset, endCodeUnitOffset: offset, text: '', selection: { anchorCodeUnitOffset: offset, focusCodeUnitOffset: offset } } }; }
class FakeElement {
  attributes = new Map(); dataset = {}; listeners = new Map(); tabIndex = -1; hidden = false; value = ''; disabled = false; readOnly = false; required = false;
  addEventListener(type, listener) { const values = this.listeners.get(type) ?? new Set(); values.add(listener); this.listeners.set(type, values); }
  removeEventListener(type, listener) { this.listeners.get(type)?.delete(listener); }
  setAttribute(name, value) { this.attributes.set(name, value); }
  removeAttribute(name) { this.attributes.delete(name); }
  querySelector() { return null; }
  querySelectorAll() { return []; }
  contains() { return true; }
  focus() {}
}
class FakeInput extends FakeElement { type = ''; inputMode = ''; placeholder = ''; selectionStart = 0; selectionEnd = 0; selectionDirection = 'none'; setSelectionRange(start, end, direction = 'none') { this.selectionStart = start; this.selectionEnd = end; this.selectionDirection = direction; } }
