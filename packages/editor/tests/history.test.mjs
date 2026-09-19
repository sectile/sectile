// EDT-02 EDT-03
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  clearEditorHistory,
  recordEditorHistory,
  redoEditorHistory,
  tryCreateEditorHistory,
  undoEditorHistory,
} from '../.verification-dist/history.js';

function document(text) {
  return {
    formatVersion: 1,
    schema: { id: 'editor/history', version: 1 },
    root: {
      type: 'document',
      children: [{
        id: 'p1',
        type: 'paragraph',
        children: text === '' ? [] : [{
          type: 'text',
          text,
          marks: [],
        }],
      }],
    },
  };
}

function entry(before, after, key = null) {
  return Object.freeze({
    beforeDocument: document(before),
    afterDocument: document(after),
    beforeSelection: null,
    afterSelection: null,
    intent: 'command',
    coalesceKey: key,
  });
}

test('history validates bounds and zero disables retention', () => {
  assert.equal(tryCreateEditorHistory(-1).ok, false);
  assert.equal(tryCreateEditorHistory(10_001).ok, false);

  const disabled = tryCreateEditorHistory(0);
  assert.equal(disabled.ok, true);
  const recorded = recordEditorHistory(
    disabled.value,
    entry('a', 'b'),
  );
  assert.deepEqual(recorded.past, []);
  assert.deepEqual(recorded.future, []);
});

test('history keeps only its bounded tail', () => {
  const created = tryCreateEditorHistory(2);
  assert.equal(created.ok, true);

  let state = recordEditorHistory(created.value, entry('a', 'b'));
  state = recordEditorHistory(state, entry('b', 'c'));
  state = recordEditorHistory(state, entry('c', 'd'));

  assert.equal(state.past.length, 2);
  assert.equal(state.past[0].beforeDocument.root.children[0].children[0].text, 'b');
  assert.equal(state.past[1].afterDocument.root.children[0].children[0].text, 'd');
});

test('coalescing preserves the first before-state and last after-state', () => {
  const created = tryCreateEditorHistory(10);
  assert.equal(created.ok, true);

  let state = recordEditorHistory(
    created.value,
    entry('a', 'ab', 'typing:p1'),
  );
  state = recordEditorHistory(
    state,
    entry('ab', 'abc', 'typing:p1'),
  );

  assert.equal(state.past.length, 1);
  assert.equal(
    state.past[0].beforeDocument.root.children[0].children[0].text,
    'a',
  );
  assert.equal(
    state.past[0].afterDocument.root.children[0].children[0].text,
    'abc',
  );
});

test('undo/redo moves entries between branches and clear resets both', () => {
  const created = tryCreateEditorHistory(10);
  assert.equal(created.ok, true);
  const recorded = recordEditorHistory(
    created.value,
    entry('a', 'b'),
  );

  const undone = undoEditorHistory(recorded);
  assert.equal(undone.ok, true);
  assert.equal(undone.value.history.past.length, 0);
  assert.equal(undone.value.history.future.length, 1);

  const redone = redoEditorHistory(undone.value.history);
  assert.equal(redone.ok, true);
  assert.equal(redone.value.history.past.length, 1);
  assert.equal(redone.value.history.future.length, 0);

  const cleared = clearEditorHistory(redone.value.history);
  assert.equal(cleared.past.length, 0);
  assert.equal(cleared.future.length, 0);
});
