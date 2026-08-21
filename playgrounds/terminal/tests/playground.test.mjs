import assert from 'node:assert/strict';
import test from 'node:test';
import { unwrap } from '@sectile/primitives/result';
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
  assert.deepEqual(demos.map(({ id }) => id), ['listbox', 'slider', 'calendar', 'tree-view', 'text', 'combobox', 'tree-grid', 'tabs', 'radio-group', 'toolbar', 'accordion', 'disclosure', 'checkbox', 'switch', 'toggle-button', 'window-splitter', 'spinbutton', 'dialog', 'alert-dialog', 'tooltip', 'multi-thumb-slider', 'grid', 'menu', 'menubar', 'menu-button', 'carousel', 'feed']);
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
