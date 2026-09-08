import test from 'node:test';
import assert from 'node:assert/strict';
import { createDateValue } from '@sectile/temporal/date-field';
import { createTimeValue } from '@sectile/temporal/time-field';
import { createDateTimeRange, createDateTimeValue } from '@sectile/temporal/date-time-field';
import { createDateField as createDOMDateField } from '@sectile/dom/temporal/date-field';
import { createDateTimeField as createDOMDateTimeField } from '@sectile/dom/temporal/date-time-field';
import { createTimeField as createDOMTimeField } from '@sectile/dom/temporal/time-field';
import { createDatePicker as createDOMDatePicker } from '@sectile/dom/temporal/date-picker';
import { createDateTimePicker as createDOMDateTimePicker } from '@sectile/dom/temporal/date-time-picker';
import { createDateTimeRangePicker as createDOMDateTimeRangePicker } from '@sectile/dom/temporal/date-time-range-picker';
import { createDateField as createTerminalDateField } from '@sectile/terminal/date-field';
import { createDateTimeField as createTerminalDateTimeField } from '@sectile/terminal/date-time-field';
import { createTimeField as createTerminalTimeField } from '@sectile/terminal/time-field';
import { createDatePicker as createTerminalDatePicker } from '@sectile/terminal/date-picker';
import { createDateTimePicker as createTerminalDateTimePicker } from '@sectile/terminal/date-time-picker';
import { createDateTimeRangePicker as createTerminalDateTimeRangePicker } from '@sectile/terminal/date-time-range-picker';
import { createDateRangeField as createDOMDateRangeField } from '@sectile/dom/temporal/date-range-field';
import { createTimeRangeField as createDOMTimeRangeField } from '@sectile/dom/temporal/time-range-field';
import { createDateRangeField as createTerminalDateRangeField } from '@sectile/terminal/date-range-field';
import { createTimeRangeField as createTerminalTimeRangeField } from '@sectile/terminal/time-range-field';

const date = (year, month, day) => createDateValue(year, month, day);
const time = (hour, minute) => createTimeValue(hour, minute);
const dateTime = (year, month, day, hour, minute) => createDateTimeValue(
  date(year, month, day),
  time(hour, minute),
);

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

test('DOM and terminal required ranges preserve committed values and suppress rejected clear callbacks', () => {
  for (const [kind, createDOM, createTerminal, value, textLength] of [
    ['date', createDOMDateRangeField, createTerminalDateRangeField, { start: date(2026, 9, 1), end: date(2026, 9, 2) }, 10],
    ['time', createDOMTimeRangeField, createTerminalTimeRangeField, { start: time(9, 0), end: time(17, 0) }, 5],
  ]) {
    for (const required of [true, false]) {
      for (const endpoint of ['start', 'end']) {
        for (const mode of ['direct', 'commit']) {
          const startInput = new FakeInput();
          const endInput = new FakeInput();
          const DOMChanges = [];
          const terminalChanges = [];
          const options = { defaultValue: value, required };
          const DOM = createDOM({ ...options, startInput, endInput, onValueChange: (next) => DOMChanges.push(next) });
          const terminal = createTerminal({ ...options, onValueChange: (next) => terminalChanges.push(next) });
          const label = `${kind} ${endpoint} ${mode} required=${required}`;
          try {
            assert.equal(startInput.required, required, label);
            assert.equal(endInput.required, required, label);
            if (mode === 'commit') {
              const edit = { type: 'field', endpoint, event: { type: 'text', event: {
                type: 'replace', startCodeUnitOffset: 0, endCodeUnitOffset: textLength,
                text: '', selection: { anchorCodeUnitOffset: 0, focusCodeUnitOffset: 0 },
              } } };
              assert.equal(DOM.handleEvent(edit), true, label);
              assert.equal(terminal.handleEvent(edit), true, label);
              assert.deepEqual(DOMChanges, [], label);
              assert.deepEqual(terminalChanges, [], label);
            }
            const previousDOM = DOM.getSnapshot();
            const previousTerminal = terminal.getSnapshot();
            const clear = { type: 'field', endpoint, event: mode === 'direct' ? { type: 'set-value', value: null } : 'commit' };
            assert.equal(DOM.handleEvent(clear), !required, label);
            assert.equal(terminal.handleEvent(clear), !required, label);
            assert.deepEqual(DOM.getValue(), required ? value : null, label);
            assert.deepEqual(terminal.getValue(), required ? value : null, label);
            assert.deepEqual(DOMChanges, required ? [] : [null], label);
            assert.deepEqual(terminalChanges, required ? [] : [null], label);
            if (required) {
              assert.deepEqual(DOM.getSnapshot(), previousDOM, label);
              assert.deepEqual(terminal.getSnapshot(), previousTerminal, label);
            }
          } finally {
            DOM.disconnect();
          }
        }
      }
    }
  }
});

test('DOM and terminal date pickers preserve navigation, availability, and selection', () => {
  const value = date(2026, 8, 21);
  const options = { defaultValue: value, defaultHighlightedValue: value, defaultOpen: true, policies: { unavailable: (candidate) => candidate.day === 22 || candidate.day === 23 } };
  const DOM = createDOMDatePicker({ ...options, root: new FakeElement(), grid: new FakeElement(), trigger: new FakeElement() });
  const terminal = createTerminalDatePicker(options);
  assertTrace(DOM, terminal, ['next-day', 'next-month', 'previous-week', 'select-highlighted']);
});

test('DOM and terminal date-time pickers preserve calendar and wall-clock selection', () => {
  const value = dateTime(2026, 8, 21, 16, 30);
  const options = { defaultValue: value, defaultHighlightedValue: value.date, defaultOpen: true };
  const DOM = createDOMDateTimePicker({ ...options, root: new FakeElement(), grid: new FakeElement(), trigger: new FakeElement() });
  const terminal = createTerminalDateTimePicker(options);
  assertTrace(DOM, terminal, [
    'next-day',
    { type: 'set-time', value: time(17, 45) },
    'select-highlighted',
    'next-month',
  ]);
});

test('DOM and terminal date-time range pickers preserve endpoint times and range anchoring', () => {
  const value = createDateTimeRange(
    dateTime(2026, 8, 21, 9, 0),
    dateTime(2026, 8, 23, 17, 0),
  );
  const options = { defaultValue: value, defaultHighlightedValue: value.end.date, defaultOpen: true };
  const DOM = createDOMDateTimeRangePicker({ ...options, root: new FakeElement(), grid: new FakeElement(), trigger: new FakeElement() });
  const terminal = createTerminalDateTimeRangePicker(options);
  assertTrace(DOM, terminal, [
    { type: 'set-start-time', value: time(10, 15) },
    { type: 'set-end-time', value: time(18, 45) },
    { type: 'select-date', value: date(2026, 8, 25) },
    { type: 'select-date', value: date(2026, 8, 28) },
  ]);
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
