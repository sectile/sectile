import assert from 'node:assert/strict';
import test from 'node:test';
import { unwrap } from '@sectile/core/result';
import { createTextEditingState } from '@sectile/core/text';
import { createText, createTextController, toTextEvent } from '../dist/text.js';

test('terminal text facade owns grapheme-safe keyboard editing', () => {
  let updates = 0;
  const connection = createText({
    defaultValue: createTextEditingState('a😀', selection(3)),
    onUpdate: () => { updates += 1; },
  });
  assert.equal(connection.handleKeyboardInput({ key: 'backspace' }), true);
  assert.equal(connection.getValue(), 'a');
  assert.equal(connection.handleKeyboardInput({ key: '한', text: '한' }), true);
  assert.equal(connection.getValue(), 'a한');
  assert.equal(connection.handleKeyboardInput({ key: 'left' }), false);
  assert.equal(updates, 2);
});

test('terminal insert, replace, and delete inputs map to semantic replacement', () => {
  assert.deepEqual(toTextEvent({
    type: 'insert',
    text: '가',
    startCodeUnitOffset: 1,
    endCodeUnitOffset: 1,
    selection: selection(2),
  }), {
    type: 'replace',
    startCodeUnitOffset: 1,
    endCodeUnitOffset: 1,
    text: '가',
    selection: selection(2),
  });
  assert.deepEqual(toTextEvent({
    type: 'delete',
    startCodeUnitOffset: 1,
    endCodeUnitOffset: 3,
    selection: selection(1),
  }), {
    type: 'replace',
    startCodeUnitOffset: 1,
    endCodeUnitOffset: 3,
    text: '',
    selection: selection(1),
  });
});

test('uncontrolled terminal text owns UTF-16-safe editing state', () => {
  const controller = unwrap(createTextController({
    defaultValue: createTextEditingState('a😀b', selection(4)),
  }));
  const result = controller.handleTextInput({
    type: 'replace',
    text: '가',
    startCodeUnitOffset: 1,
    endCodeUnitOffset: 3,
    selection: selection(2),
  });
  assert.equal(result.ok, true);
  assert.equal(result.snapshot.state.snapshot.text, 'a가b');
  const rejected = controller.handleTextInput({
    type: 'delete',
    startCodeUnitOffset: 0,
    endCodeUnitOffset: 1,
    selection: selection(5),
  });
  assert.equal(rejected.ok, false);
  assert.equal(controller.getSnapshot(), result.snapshot);
});

test('controlled terminal text emits a full-state proposal until synchronized', () => {
  const changes = [];
  const initial = createTextEditingState('a', selection(1));
  const controller = unwrap(createTextController({
    value: initial,
    onValueChange(change) {
      changes.push(change);
    },
  }));
  const result = controller.handleTextInput({
    type: 'insert',
    text: 'b',
    startCodeUnitOffset: 1,
    endCodeUnitOffset: 1,
    selection: selection(2),
  });
  assert.equal(result.ok, true);
  assert.equal(result.snapshot.state.snapshot.text, 'a');
  assert.equal(changes[0].value.snapshot.text, 'ab');
  assert.equal(unwrap(controller.syncControlledValues({ value: changes[0].value })).state.snapshot.text, 'ab');
});

test('terminal text rejects unsupported input and malformed external state atomically', () => {
  const malformed = createTextController({ value: { snapshot: null, composition: null } });
  assert.equal(malformed.ok, false);
  const controller = unwrap(createTextController());
  const initial = controller.getSnapshot();
  const result = controller.handleTextInput({ type: 'paste' });
  assert.equal(result.ok, false);
  assert.equal(result.error.code, 'unsupported-terminal-text-input');
  assert.equal(result.snapshot, initial);
});

function selection(offset) {
  return { anchorCodeUnitOffset: offset, focusCodeUnitOffset: offset };
}
