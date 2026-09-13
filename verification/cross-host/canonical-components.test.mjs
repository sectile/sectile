import assert from 'node:assert/strict';
import test from 'node:test';
import { createSequence } from '@sectile/core/sequence';
import { createSelect as createDOMSelect } from '@sectile/dom/select';
import { createSelect as createTerminalSelect } from '@sectile/terminal/select';
import { createGridControl as createDOMGrid } from '@sectile/dom/grid';
import { createGridControl as createTerminalGrid } from '@sectile/terminal/grid';
import { createCascadeList as createDOMCascadeList } from '@sectile/dom/cascade-list';
import { createCascadeList as createTerminalCascadeList } from '@sectile/terminal/cascade-list';
import { createCascadeSelect as createDOMCascadeSelect } from '@sectile/dom/cascade-select';
import { createCascadeSelect as createTerminalCascadeSelect } from '@sectile/terminal/cascade-select';
import { applyCheckboxGroupEvent, createCheckboxGroupState } from '@sectile/core/checkbox-group';
import { applyRatingEvent, createRatingState } from '@sectile/core/rating';
import { applyStepperEvent, createStepperState } from '@sectile/core/stepper';
import { unwrap } from '@sectile/core/result';
import { createCheckboxGroup as createDOMCheckboxGroup } from '@sectile/dom/checkbox-group';
import { createRating as createDOMRating } from '@sectile/dom/rating';
import { createStepper as createDOMStepper } from '@sectile/dom/stepper';
import { createCheckboxGroup as createTerminalCheckboxGroup } from '@sectile/terminal/checkbox-group';
import { createRating as createTerminalRating } from '@sectile/terminal/rating';
import { createStepper as createTerminalStepper } from '@sectile/terminal/stepper';

test('checkbox-group hosts follow the canonical toggle trace including disabled items', () => {
  const items = ['one', 'disabled', 'three'];
  const domain = createSequence(items);
  const policies = { eligible: (id) => id !== 'disabled' };
  let canonical = createCheckboxGroupState(domain, { current: 'one', selected: ['one'] });
  let revision = 0;
  const options = {
    items,
    disabledItems: ['disabled'],
    defaultValue: ['one'],
    defaultHighlightedValue: 'one',
  };
  const DOM = createDOMCheckboxGroup({ ...options, root: new FakeElement() });
  const terminal = createTerminalCheckboxGroup(options);
  for (const event of ['next', 'toggle', 'previous', 'toggle']) {
    const update = unwrap(applyCheckboxGroupEvent(domain, canonical, event, policies));
    canonical = update.state;
    revision += 1;
    assert.equal(DOM.handleEvent(event), true);
    assert.equal(terminal.handleEvent(event), true);
    assertCanonicalSnapshot(DOM, canonical, revision);
    assertCanonicalSnapshot(terminal, canonical, revision);
  }
  DOM.disconnect();
});

test('stepper hosts preserve canonical activation state, commands, and revision', () => {
  const items = ['one', 'disabled', 'three'];
  const domain = createSequence(items);
  const policies = { eligible: (id) => id !== 'disabled' };
  let canonical = createStepperState(domain, 'one', 'one');
  let revision = 0;
  const DOMActivations = [];
  const terminalActivations = [];
  const options = {
    items,
    disabledItems: ['disabled'],
    defaultValue: 'one',
    defaultHighlightedValue: 'one',
  };
  const DOM = createDOMStepper({ ...options, root: new FakeElement(), onActivate: (id) => DOMActivations.push(id) });
  const terminal = createTerminalStepper({ ...options, onActivate: (id) => terminalActivations.push(id) });
  for (const event of ['next-step', 'activate-step', 'first-step', { type: 'activate-step', id: 'three' }]) {
    const update = unwrap(applyStepperEvent(domain, canonical, event, policies));
    canonical = update.state;
    revision += 1;
    assert.equal(DOM.handleEvent(event), true);
    assert.equal(terminal.handleEvent(event), true);
    assertCanonicalSnapshot(DOM, canonical, revision);
    assertCanonicalSnapshot(terminal, canonical, revision);
  }
  assert.deepEqual(DOMActivations, terminalActivations);
  DOM.disconnect();
});

test('rating hosts preserve canonical clear and direct-set traces', () => {
  const items = ['one', 'two', 'three'];
  const domain = createSequence(items);
  let canonical = createRatingState(domain, 'one');
  let revision = 0;
  const DOMValues = [];
  const terminalValues = [];
  const options = { items, defaultValue: 'one', clearable: true };
  const DOM = createDOMRating({ ...options, root: new FakeElement(), onValueChange: (value) => DOMValues.push(value) });
  const terminal = createTerminalRating({ ...options, onValueChange: (value) => terminalValues.push(value) });
  for (const event of ['increase', { type: 'set', id: 'three' }, 'clear']) {
    const update = unwrap(applyRatingEvent(domain, canonical, event));
    canonical = update.state;
    revision += 1;
    assert.equal(DOM.handleEvent(event), true);
    assert.equal(terminal.handleEvent(event), true);
    assertCanonicalSnapshot(DOM, canonical, revision);
    assertCanonicalSnapshot(terminal, canonical, revision);
  }
  assert.deepEqual(DOMValues, terminalValues);
  DOM.disconnect();
});

for (const [name, create, DOM] of [
  ['DOM Select', createDOMSelect, true],
  ['Terminal Select', createTerminalSelect, false],
]) {
  test(`${name} keeps outer proposal payloads stable when the first callback synchronizes a newer revision`, () => {
    const trace = [];
    let control;
    const options = {
      items: ['a', 'b'],
      value: 'a',
      highlightedValue: 'a',
      open: true,
      onValueChange(value) {
        trace.push(`value:${value}`);
        const synchronized = control.update({ value, highlightedValue: value, open: false });
        assert.equal(synchronized.ok, true);
      },
      onHighlightedValueChange: (value) => trace.push(`highlight:${value}`),
      onOpenChange: (open) => trace.push(`open:${open}`),
      onUpdate: () => trace.push('update'),
      ...(DOM ? { root: new FakeElement(), trigger: new FakeElement(), popup: new FakeElement(), position: false } : {}),
    };
    control = create(options);
    control.subscribe((snapshot) => trace.push(`subscriber:${snapshot.revision}`));
    assert.equal(control.handleEvent({ type: 'select', id: 'b' }), true);
    assert.deepEqual(trace, ['value:b', 'subscriber:2', 'update', 'highlight:b', 'open:false']);
    assert.equal(control.getSnapshot().revision, 2);
    assert.deepEqual(readChoice(control), { value: 'b', highlight: 'b' });
    assert.equal(control.state.open, false);
    control.destroy();
  });
}

for (const [name, create, DOM] of [
  ['DOM Grid', createDOMGrid, true],
  ['Terminal Grid', createTerminalGrid, false],
]) {
  test(`${name} completes edit effects and facade publication before rethrowing proposal failure`, () => {
    const trace = [];
    const firstError = new Error('value callback failed');
    const control = create({
      rows: [['a', 'b']],
      defaultValue: 'a',
      defaultHighlightedValue: 'a',
      defaultEditMode: 'navigation',
      onValueChange: (value) => { trace.push(`value:${value}`); throw firstError; },
      onHighlightedValueChange: (value) => trace.push(`highlight:${value}`),
      onEditModeChange: (mode) => trace.push(`mode:${mode}`),
      onEditStart: (id) => trace.push(`start:${id}`),
      onUpdate: () => trace.push('update'),
      ...(DOM ? { root: new FakeElement() } : {}),
    });
    control.subscribe((snapshot) => trace.push(`subscriber:${snapshot.revision}`));
    assert.throws(() => control.handleEvent({ type: 'start-edit', id: 'b' }), (error) => error === firstError);
    assert.deepEqual(trace, ['value:b', 'highlight:b', 'mode:editing', 'start:b', 'subscriber:1', 'update']);
    assert.deepEqual(control.getSnapshot().state.selection.selected, ['b']);
    assert.equal(control.getSnapshot().state.cursor.current, 'b');
    assert.equal(control.getSnapshot().state.editMode, 'editing');
    control.destroy();
  });
}

const nullableChoiceFactories = [
  ['DOM Select', createDOMSelect, true], ['Terminal Select', createTerminalSelect, true],
  ['DOM CascadeList', createDOMCascadeList, false], ['Terminal CascadeList', createTerminalCascadeList, false],
  ['DOM CascadeSelect', createDOMCascadeSelect, true], ['Terminal CascadeSelect', createTerminalCascadeSelect, true],
];
const choiceItems = [0, '0', 'last'];
const choiceOptions = () => ({
  root: new FakeElement(), trigger: new FakeElement(), popup: new FakeElement(), position: false,
  items: choiceItems, nodes: choiceItems.map((id) => ({ id, parentID: null })),
});
function readChoice(control) {
  const state = control.state;
  return state.choice === undefined
    ? { value: state.value, highlight: state.highlighted }
    : { value: state.choice.selection.selected[0] ?? null, highlight: state.choice.cursor.current };
}

for (const [name, create, popup] of nullableChoiceFactories) {
  test(`${name} distinguishes absent, default and controlled null highlights`, () => {
    const cases = [
      [{ value: 'last' }, 'last', 'last'],
      [{ value: 'last', highlightedValue: undefined }, 'last', 'last'],
      [{ value: 'last', highlightedValue: null, defaultHighlightedValue: 0 }, 'last', null],
      [{ value: 'last', defaultHighlightedValue: null }, 'last', null],
      [{ defaultValue: 'last', defaultHighlightedValue: 0 }, 'last', 0],
      [{ value: null, defaultValue: 'last' }, null, null],
      [{ value: 0, defaultValue: 'last', highlightedValue: '0' }, 0, '0'],
    ];
    for (const [input, value, highlight] of cases) {
      const control = create({ ...choiceOptions(), ...input });
      try {
        assert.deepEqual(readChoice(control), { value, highlight });
        if (typeof control.setItemAttributes === 'function') {
          for (const id of choiceItems) {
            const element = new FakeElement();
            control.setItemAttributes(element, id);
            assert.equal(element.tabIndex, highlight === id ? 0 : -1);
            assert.equal(element.getAttribute('aria-selected'), String(value === id));
            if (name.includes('Cascade')) assert.equal('highlighted' in element.dataset, highlight === id);
          }
        }
      } finally { control.destroy(); }
    }
  });

  test(`${name} preserves every ownership shape during null synchronization and navigation`, async () => {
    for (let shape = 0; shape < (popup ? 8 : 4); shape += 1) {
      const ownsValue = (shape & 1) !== 0;
      const ownsHighlight = (shape & 2) !== 0;
      const ownsOpen = (shape & 4) !== 0;
      const valueChanges = [], highlightChanges = [], snapshots = [];
      const control = create({
        ...choiceOptions(), disabledItems: [0],
        ...(ownsValue ? { value: 'last' } : { defaultValue: 'last' }),
        ...(ownsHighlight ? { highlightedValue: null } : { defaultHighlightedValue: null }),
        ...(ownsOpen ? { open: false } : {}),
        onValueChange: (value) => valueChanges.push(value),
        onHighlightedValueChange: (value) => highlightChanges.push(value),
      });
      const accepted = {
        ...(ownsValue ? { value: 'last' } : {}),
        ...(ownsHighlight ? { highlightedValue: null } : {}),
        ...(ownsOpen ? { open: false } : {}),
      };
      control.subscribe((snapshot) => snapshots.push(snapshot));
      try {
        assert.deepEqual(readChoice(control), { value: 'last', highlight: null });
        const synced = control.syncControlledValues(accepted);
        assert.equal(synced.ok, true);
        assert.deepEqual(readChoice(control), { value: 'last', highlight: null });
        assert.equal(snapshots.length, 1);
        assert.deepEqual(highlightChanges, []);
        const before = control.getSnapshot();
        const mismatch = control.syncControlledValues({ ...accepted, highlightedValue: ownsHighlight ? undefined : null });
        assert.equal(mismatch.error.code, 'controlled-shape-mismatch');
        assert.equal(control.getSnapshot(), before);
        assert.equal(snapshots.length, 1);
        if (ownsHighlight) {
          assert.equal(control.syncControlledValues({ ...accepted, highlightedValue: 'missing' }).ok, false);
          assert.equal(control.getSnapshot(), before);
          assert.equal(control.syncControlledValues({ ...accepted, highlightedValue: '0' }).ok, true);
          assert.equal(readChoice(control).highlight, '0');
          assert.equal(control.syncControlledValues(accepted).ok, true);
          assert.equal(readChoice(control).highlight, null);
        }
        if (popup) {
          assert.equal(control.send('open'), true);
          assert.equal(readChoice(control).highlight, null);
          assert.equal(control.send('close'), true);
          assert.equal(readChoice(control).highlight, null);
        } else {
          assert.equal(control.send('right'), true);
          assert.equal(readChoice(control).highlight, null);
        }
        assert.equal(control.send('next'), true);
        assert.deepEqual(readChoice(control), { value: 'last', highlight: ownsHighlight ? null : '0' });
        assert.deepEqual(highlightChanges, ['0']);
        assert.deepEqual(valueChanges, []);
        if (ownsHighlight) {
          assert.equal(control.syncControlledValues({ ...accepted, highlightedValue: '0' }).ok, true);
        }
        assert.equal(control.send('select'), true);
        assert.equal(readChoice(control).value, ownsValue ? 'last' : '0');
        assert.deepEqual(valueChanges, ['0']);
      } finally { control.destroy(); }
      await Promise.resolve();
    }
  });
}

function assertCanonicalSnapshot(connection, state, revision) {
  const snapshot = connection.getSnapshot();
  assert.deepEqual(snapshot.state, state);
  assert.equal(snapshot.revision, revision);
}

class FakeElement {
  id = '';
  hidden = false;
  style = {};
  attributes = new Map();
  dataset = {};
  listeners = new Map();
  tabIndex = -1;
  addEventListener(type, listener) {
    const listeners = this.listeners.get(type) ?? new Set();
    listeners.add(listener);
    this.listeners.set(type, listeners);
  }
  removeEventListener(type, listener) { this.listeners.get(type)?.delete(listener); }
  setAttribute(name, value) { this.attributes.set(name, value); }
  getAttribute(name) { return this.attributes.get(name) ?? null; }
  removeAttribute(name) { this.attributes.delete(name); }
  querySelectorAll() { return []; }
  focus() {}
}
