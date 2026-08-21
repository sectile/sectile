import assert from 'node:assert/strict';
import test from 'node:test';
import { unwrap } from '@sectile/primitives/result';
import { createTextEditingState } from '@sectile/primitives/text';
import { createTextController, toTextEvent } from '../dist/text.js';

test('DOM beforeinput and composition inputs map to semantic text events', () => {
  assert.deepEqual(toTextEvent({
    type: 'beforeinput',
    inputType: 'insertText',
    data: '😀',
    startCodeUnitOffset: 1,
    endCodeUnitOffset: 1,
    selection: selection(3),
  }), {
    type: 'replace',
    startCodeUnitOffset: 1,
    endCodeUnitOffset: 1,
    text: '😀',
    selection: selection(3),
  });
  assert.deepEqual(toTextEvent({
    type: 'beforeinput',
    inputType: 'deleteContentBackward',
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
  assert.equal(toTextEvent({ type: 'beforeinput', inputType: 'historyUndo' }), null);
});

test('uncontrolled DOM text owns replacement and IME composition state', () => {
  const controller = unwrap(createTextController({
    defaultValue: unwrap(createTextEditingState('ab', selection(2))),
  }));
  assert.equal(controller.handleTextInput({
    type: 'composition-start',
    text: 'ㅎ',
    startCodeUnitOffset: 1,
    endCodeUnitOffset: 2,
    selection: selection(2),
  }).ok, true);
  assert.equal(controller.getSnapshot().state.snapshot.text, 'aㅎ');
  assert.equal(controller.handleTextInput({
    type: 'composition-update',
    text: '한',
    selection: selection(2),
  }).ok, true);
  assert.equal(controller.getSnapshot().state.snapshot.text, 'a한');
  assert.equal(controller.handleTextInput({ type: 'composition-commit' }).ok, true);
  assert.equal(controller.getSnapshot().state.composition, null);
});

test('controlled DOM text emits a full-state proposal until synchronized', () => {
  const changes = [];
  const initial = unwrap(createTextEditingState('a', selection(1)));
  const controller = unwrap(createTextController({
    value: initial,
    onValueChange(change) {
      changes.push(change);
    },
  }));
  const result = controller.handleTextInput({
    type: 'beforeinput',
    inputType: 'insertText',
    data: '😀',
    startCodeUnitOffset: 1,
    endCodeUnitOffset: 1,
    selection: selection(3),
  });
  assert.equal(result.ok, true);
  assert.equal(result.snapshot.state.snapshot.text, 'a');
  assert.equal(changes.length, 1);
  assert.equal(changes[0].value.snapshot.text, 'a😀');
  const synchronized = unwrap(controller.syncControlledValues({ value: changes[0].value }));
  assert.equal(synchronized.state.snapshot.text, 'a😀');
});

test('DOM text rejects unsupported input and malformed external state atomically', () => {
  const malformed = createTextController({ value: { snapshot: null, composition: null } });
  assert.equal(malformed.ok, false);
  const controller = unwrap(createTextController());
  const initial = controller.getSnapshot();
  const result = controller.handleTextInput({ type: 'beforeinput', inputType: 'historyUndo' });
  assert.equal(result.ok, false);
  assert.equal(result.error.code, 'unsupported-dom-text-input');
  assert.equal(result.snapshot, initial);
});

function selection(offset) {
  return { anchorCodeUnitOffset: offset, focusCodeUnitOffset: offset };
}
