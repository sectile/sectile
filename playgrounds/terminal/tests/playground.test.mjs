import assert from 'node:assert/strict';
import test from 'node:test';
import { unwrap } from '@sectile/core/result';
import { createCalendar } from '@sectile/terminal/calendar';
import { createCombobox } from '@sectile/terminal/combobox';
import { fitTerminalText } from '@sectile/terminal/layout';
import { createListbox } from '@sectile/terminal/listbox';
import { toTerminalKeyboardInput } from '@sectile/terminal/node';
import { createSlider } from '@sectile/terminal/slider';
import { createText } from '@sectile/terminal/text';
import { createTreeGrid } from '@sectile/terminal/tree-grid';
import { createTreeView } from '@sectile/terminal/tree-view';
import { demos } from '../dist/demos.mjs';

test('terminal playground exposes one demo for every public facade', () => {
  assert.deepEqual(demos.map(({ id }) => id), ['listbox', 'slider', 'calendar', 'tree-view', 'text', 'combobox', 'tree-grid', 'tabs', 'radio-group', 'toolbar', 'accordion', 'disclosure', 'checkbox', 'switch', 'toggle-button', 'window-splitter', 'spin-button', 'number-field', 'quantity-field', 'dialog', 'alert-dialog', 'tooltip', 'multi-thumb-slider', 'grid', 'menu', 'menubar', 'menu-button', 'carousel', 'feed', 'checkbox-group', 'select', 'pagination', 'stepper', 'rating', 'pin-input', 'tags-input']);
});

test('terminal playground exposes disabled cases for every facade and read-only cases where supported', () => {
  const readOnlyIDs = new Set([
    'listbox', 'slider', 'text', 'combobox', 'tree-grid', 'radio-group',
    'checkbox', 'spin-button', 'number-field', 'quantity-field', 'multi-thumb-slider', 'grid',
  ]);
  for (const demo of demos) {
    const session = demo.create(demoHost(demo));
    assert.equal(moveToScenario(session, 'disabled · input rejected'), true, `${demo.id} disabled case`);
    session.disconnect?.();
  }
  for (const demo of demos.filter(({ id }) => readOnlyIDs.has(id))) {
    const session = demo.create(demoHost(demo));
    assert.equal(
      moveToScenario(session, 'read-only · navigation allowed, mutation rejected'),
      true,
      `${demo.id} read-only case`,
    );
    session.disconnect?.();
  }
});

test('terminal read-only examples preserve navigation while rejecting mutation', () => {
  const listbox = demos.find(({ id }) => id === 'listbox');
  assert.notEqual(listbox, undefined);
  const listboxSession = listbox.create(demoHost(listbox));
  assert.equal(moveToScenario(listboxSession, 'read-only · navigation allowed, mutation rejected'), true);
  const before = listboxSession.lines(100).find((line) => line.includes('current='));
  assert.equal(listboxSession.handle({ key: 'down' }), true);
  const afterMove = listboxSession.lines(100).find((line) => line.includes('current='));
  assert.notEqual(afterMove, before);
  assert.equal(listboxSession.handle({ key: 'space' }), false);
  const afterMutation = listboxSession.lines(100).find((line) => line.includes('current='));
  assert.equal(afterMutation, afterMove);
  listboxSession.disconnect?.();
});

test('terminal playground composes every facade through public package subpaths', () => {
  const listbox = unwrap(createListbox({ items: ['a', 'b'], defaultHighlightedValue: 'a' }));
  assert.equal(listbox.handleKeyboardInput({ key: 'down' }), true);
  assert.equal(listbox.getSnapshot().state.cursor.current, 'b');

  const slider = unwrap(createSlider({ min: '0', max: '100', step: '5', defaultValue: 8 }));
  assert.equal(slider.handleKeyboardInput({ key: 'right' }), true);
  assert.equal(slider.getValue(), '45');

  const calendar = unwrap(createCalendar({
    rows: [['a', 'b'], ['c', 'd']], defaultHighlightedValue: 'a',
  }));
  assert.equal(calendar.handleKeyboardInput({ key: 'right' }), true);
  assert.equal(calendar.getSnapshot().state.cursor.current, 'b');

  const treeView = unwrap(createTreeView({
    nodes: [{ id: 'root', parentID: null }, { id: 'child', parentID: 'root' }],
    defaultHighlightedValue: 'root',
  }));
  assert.equal(treeView.handleKeyboardInput({ key: 'right' }), true);
  assert.deepEqual(treeView.getSnapshot().state.expansion.ids, ['root']);

  const text = unwrap(createText());
  assert.equal(text.handleKeyboardInput({ key: '한', text: '한' }), true);
  assert.equal(text.getValue(), '한');

  const combobox = unwrap(createCombobox({
    items: [{ id: 'alpha', label: 'Alpha' }, { id: 'beta', label: 'Beta' }],
    policies: { matches: (label, query) => label.toLowerCase().startsWith(query.toLowerCase()) },
  }));
  assert.equal(combobox.handleKeyboardInput({ key: 'a', text: 'a' }), true);
  assert.equal(combobox.getSnapshot().state.cursor.current, 'alpha');

  const treeGrid = unwrap(createTreeGrid({
    rows: [
      { id: 'root', parentID: null, cells: ['root-name', 'root-status'] },
      { id: 'child', parentID: 'root', cells: ['child-name', 'child-status'] },
    ],
    defaultHighlightedValue: 'root-name',
    getCellValue: () => '',
    setCellValue: () => {},
  }));
  assert.equal(treeGrid.handleKeyboardInput(
    toTerminalKeyboardInput(undefined, { name: 'right', meta: true }),
  ), true);
  assert.equal(treeGrid.handleKeyboardInput({ key: 'down' }), true);
  assert.equal(treeGrid.getSnapshot().state.cursor.current, 'child-name');

  const fitted = fitTerminalText('한글', 8);
  assert.equal(fitted.length > 0, true);
});

test('terminal calendar demo renders a complete month and fulfills page requests', () => {
  const demo = demos.find(({ id }) => id === 'calendar');
  assert.notEqual(demo, undefined);
  const session = demo.create({ render() {}, record() {} });
  const before = session.lines(80);
  const today = new Date();
  const selected = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
  assert.equal(before.length, 13);
  assert.equal(before.at(-1).includes(`selected=${selected}`), true);

  assert.equal(session.handle({ key: 'page-down' }), true);
  const expectedMonth = new Intl.DateTimeFormat('en-US', {
    month: 'long',
    year: 'numeric',
  }).format(new Date(today.getFullYear(), today.getMonth() + 1, 1));
  const after = session.lines(80);
  assert.equal(after.some((line) => line.includes(expectedMonth)), true);
  assert.equal(after.at(-1).includes(`selected=${selected}`), true);
});

function pad(value) {
  return String(value).padStart(2, '0');
}

function demoHost(demo) {
  return {
    render() {},
    record() {},
    recordText() {},
    readOnly: demo.readOnly === true,
    readOnlyCase: demo.readOnlyCase ?? 0,
  };
}

function moveToScenario(session, marker) {
  for (let index = 0; index < 12; index += 1) {
    const lines = session.lines(100);
    if (lines.some((line) => line.includes(marker))) return true;
    session.handle({ key: lines.some((line) => line.includes('{ / } switch')) ? '}' : ']' });
  }
  return false;
}
