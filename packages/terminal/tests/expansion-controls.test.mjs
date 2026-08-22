import assert from 'node:assert/strict';
import test from 'node:test';
import { createDisclosure } from '../dist/disclosure.js';
import { createAccordion } from '../dist/accordion.js';

test('terminal disclosure and accordion own key dispatch', () => {
  const disclosure = createDisclosure();
  assert.equal(disclosure.handleKeyboardInput({ key: 'enter' }), true);
  assert.equal(disclosure.getSnapshot().state.open, true);

  const accordion = createAccordion({
    items: ['a', 'b'], defaultHighlightedValue: 'a', defaultOpenIDs: ['a'],
  });
  accordion.handleKeyboardInput({ key: 'down' }); accordion.handleKeyboardInput({ key: 'space' });
  assert.equal(accordion.getSnapshot().state.cursor.current, 'b');
  assert.deepEqual(accordion.getSnapshot().state.openIDs, ['b']);
});

test('terminal accordion skips disabled headers', () => {
  const accordion = createAccordion({
    items: ['a', 'b', 'c'], disabledItems: ['b'], defaultHighlightedValue: 'a',
  });
  accordion.handleKeyboardInput({ key: 'down' });
  assert.equal(accordion.getSnapshot().state.cursor.current, 'c');
});
