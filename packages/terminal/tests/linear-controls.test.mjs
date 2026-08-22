import assert from 'node:assert/strict';
import test from 'node:test';
import { createTabs, toTabsEvent } from '../dist/tabs.js';
import { createRadioGroup, toRadioGroupEvent } from '../dist/radio-group.js';
import { createToolbar, toToolbarEvent } from '../dist/toolbar.js';

test('terminal tabs, radio group, and toolbar witness distinct linear algebras', () => {
  const tabs = createTabs({
    items: ['one', 'two'], defaultValue: 'one', defaultHighlightedValue: 'one',
  });
  tabs.handleKeyboardInput({ key: 'right' });
  assert.deepEqual(tabs.getSnapshot().state.selection.selected, ['one']);
  tabs.handleKeyboardInput({ key: 'enter' });
  assert.deepEqual(tabs.getSnapshot().state.selection.selected, ['two']);

  const radio = createRadioGroup({
    items: ['a', 'b'], defaultValue: 'a', defaultHighlightedValue: 'a',
  });
  radio.handleKeyboardInput({ key: 'down' });
  assert.deepEqual(radio.getSnapshot().state.selection.selected, ['b']);

  const invoked = [];
  const toolbar = createToolbar({
    items: ['bold', 'italic'], defaultHighlightedValue: 'bold',
    onInvoke: (id) => invoked.push(id),
  });
  toolbar.handleKeyboardInput({ key: 'right' });
  toolbar.handleKeyboardInput({ key: 'enter' });
  assert.equal(toolbar.getSnapshot().state.cursor.current, 'italic');
  assert.deepEqual(invoked, ['italic']);
});

test('terminal linear controls own key normalization', () => {
  assert.equal(toTabsEvent({ key: 'right' }), 'next');
  assert.equal(toTabsEvent({ key: 'down' }, 'vertical'), 'next');
  assert.equal(toRadioGroupEvent({ key: 'space' }), 'check');
  assert.equal(toToolbarEvent({ key: 'enter' }), 'invoke');
  assert.equal(toToolbarEvent({ key: 'down' }), null);
});

test('terminal linear controls skip disabledItems without application policy glue', () => {
  const tabs = createTabs({
    items: ['one', 'disabled', 'three'], disabledItems: ['disabled'],
    defaultHighlightedValue: 'one',
  });
  tabs.handleKeyboardInput({ key: 'right' });
  assert.equal(tabs.getSnapshot().state.cursor.current, 'three');

  const radio = createRadioGroup({
    items: ['a', 'b', 'c'], disabledItems: ['b'], defaultValue: 'a', defaultHighlightedValue: 'a',
  });
  radio.handleKeyboardInput({ key: 'down' });
  assert.equal(radio.getSnapshot().state.cursor.current, 'c');

  const toolbar = createToolbar({
    items: ['bold', 'disabled', 'italic'], disabledItems: ['disabled'],
    defaultHighlightedValue: 'bold',
  });
  toolbar.handleKeyboardInput({ key: 'right' });
  assert.equal(toolbar.getSnapshot().state.cursor.current, 'italic');
});
