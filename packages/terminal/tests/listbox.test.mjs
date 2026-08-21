import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createListboxController,
  toListboxEffect,
  toListboxEvent,
} from '../dist/listbox.js';
import { createSequence } from '@sectile/primitives/sequence';

test('terminal keys map onto listbox semantic events', () => {
  assert.equal(toListboxEvent({ key: 'down' }), 'next');
  assert.equal(toListboxEvent({ key: 'up' }), 'previous');
  assert.equal(toListboxEvent({ key: 'space' }), 'toggle');
  assert.equal(toListboxEvent({ key: 'enter' }), 'activate');
  assert.equal(toListboxEvent({ key: 'escape' }), 'clear');
  assert.equal(toListboxEvent({ key: 'tab' }), null);
});

test('terminal commands project into terminal-specific effects', () => {
  assert.deepEqual(toListboxEffect({ type: 'focus', id: 'a' }), {
    type: 'move-highlight',
    id: 'a',
  });
  assert.deepEqual(toListboxEffect({ type: 'activate', id: 'a' }), {
    type: 'submit-item',
    id: 'a',
  });
});

test('terminal controller supports mixed controlled and uncontrolled state', () => {
  const domain = unwrap(createSequence(['a', 'b']));
  const highlights = [];
  const controller = unwrap(createListboxController({
    domain,
    value: [],
    defaultHighlightedValue: 'a',
    onHighlightedValueChange(change) {
      highlights.push(change);
    },
  }));

  const moved = controller.handleKeyboardInput({ key: 'down' });
  assert.equal(moved.ok, true);
  assert.equal(moved.snapshot.state.cursor.current, 'b');
  assert.deepEqual(moved.commands, [{ type: 'move-highlight', id: 'b' }]);
  assert.deepEqual(highlights, [{ value: 'b', previousValue: 'a' }]);

  const toggled = controller.handleKeyboardInput({ key: 'space' });
  assert.equal(toggled.ok, true);
  assert.deepEqual(toggled.snapshot.state.selection.selected, []);

  const synchronized = unwrap(controller.syncControlledValues({ value: ['b'] }));
  assert.deepEqual(synchronized.state.selection.selected, ['b']);
  assert.equal(synchronized.state.cursor.current, 'b');
});

test('unsupported and stale terminal inputs are failure-atomic', () => {
  const domain = unwrap(createSequence(['a']));
  const controller = unwrap(createListboxController({ domain }));
  const initial = controller.getSnapshot();
  const unsupported = controller.handleKeyboardInput({ key: 'tab' });
  assert.equal(unsupported.ok, false);
  assert.equal(unsupported.snapshot, initial);
  assert.deepEqual(unsupported.commands, []);
  const stale = controller.handleKeyboardInput({ key: 'down' }, 1);
  assert.equal(stale.ok, false);
  assert.equal(stale.error.code, 'stale-revision');
  assert.equal(stale.snapshot, initial);
});

function unwrap(result) {
  assert.equal(result.ok, true, result.ok ? undefined : result.error.message);
  return result.value;
}
