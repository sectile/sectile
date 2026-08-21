/* Composite evidence: visible navigation, expansion ownership, selection ownership, focus commands */
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createTreeViewState,
  stepTreeView,
} from '../../.verification-dist/internal/composites/tree-view.js';
import {
  createReferenceTreeViewState,
  referenceStepTreeView,
} from '../../.verification-dist/internal/reference/composites/tree-view.js';
import { createTree } from '../../.verification-dist/structures/tree.js';
import { enumerateOrderedForests, powerset, unwrap } from '../support.mjs';

const EVENTS = ['next', 'previous', 'right', 'left', 'toggle-select'];

test('tree-view composition matches accepted exhaustive transition counts', () => {
  let states = 0;
  let transitions = 0;
  for (let size = 0; size <= 4; size += 1) {
    for (const raw of enumerateOrderedForests(size)) {
      const tree = unwrap(createTree(stringTree(raw)));
      const ids = tree.preorder().ids;
      const branches = ids.filter((id) => tree.childrenOf(id).size > 0);
      for (const expanded of powerset(branches)) {
        const visible = tree.visible(expanded).ids;
        for (const current of [null, ...visible]) {
          const start = unwrap(createTreeViewState(tree, { expanded, current }));
          const referenceStart = createReferenceTreeViewState(tree, { expanded, current });
          assert.deepEqual(stateObservation(start), stateObservation(referenceStart));
          const queue = [{ state: start, depth: 0 }];
          const seen = new Set([stateKey(start, 0)]);

          for (let cursor = 0; cursor < queue.length; cursor += 1) {
            const { state, depth } = queue[cursor];
            states += 1;
            assertState(tree, state);
            if (depth === 4) continue;
            for (const event of EVENTS) {
              const left = stepTreeView(tree, state, event);
              const repeated = stepTreeView(tree, state, event);
              const reference = referenceStepTreeView(tree, state, event);
              assert.deepEqual(resultObservation(left), resultObservation(repeated));
              assert.deepEqual(resultObservation(left), referenceResultObservation(reference));
              transitions += 1;
              const next = left.ok ? left.value.state : state;
              if (!left.ok) assert.deepEqual(resultObservation(left), {
                ok: false,
                errorClass: 'transition-rejection',
                errorCode: 'no-cursor',
              });
              assertState(tree, next);
              const key = stateKey(next, depth + 1);
              if (!seen.has(key)) {
                seen.add(key);
                queue.push({ state: next, depth: depth + 1 });
              }
            }
          }
        }
      }
    }
  }
  assert.equal(states, 73_649);
  assert.equal(transitions, 169_835);
});

test('tree-view right and left separate expansion from focus movement', () => {
  const tree = unwrap(createTree([
    { id: 'root', parentID: null },
    { id: 'child', parentID: 'root' },
    { id: 'leaf', parentID: 'child' },
  ]));
  const root = unwrap(createTreeViewState(tree, { current: 'root' }));
  const opened = unwrap(stepTreeView(tree, root, 'right'));
  assert.deepEqual(opened.state.expansion.ids, ['root']);
  assert.equal(opened.state.cursor.current, 'root');
  assert.deepEqual(opened.commands, []);

  const child = unwrap(stepTreeView(tree, opened.state, 'right'));
  assert.equal(child.state.cursor.current, 'child');
  assert.deepEqual(child.commands, [{ type: 'focus', id: 'child' }]);

  const returned = unwrap(stepTreeView(tree, child.state, 'left'));
  assert.equal(returned.state.cursor.current, 'root');
  const closed = unwrap(stepTreeView(tree, returned.state, 'left'));
  assert.deepEqual(closed.state.expansion.ids, []);
  assert.equal(closed.state.cursor.current, 'root');

  const selected = unwrap(stepTreeView(tree, child.state, 'toggle-select'));
  assert.deepEqual(selected.state.selection.selected, ['child']);
  assert.equal(selected.state.cursor.current, 'child');
});

test('tree-view rejects hidden cursors and unknown events atomically', () => {
  const tree = unwrap(createTree([
    { id: 'root', parentID: null },
    { id: 'child', parentID: 'root' },
  ]));
  assert.equal(createTreeViewState(tree, { current: 'child' }).error.code, 'tree-view-cursor-hidden');
  const empty = unwrap(createTreeViewState(tree));
  assert.equal(stepTreeView(tree, empty, 'toggle-select').error.code, 'no-cursor');
  assert.equal(stepTreeView(tree, empty, 'unknown').error.code, 'invalid-tree-view-event');

  const hidden = Object.freeze({ ...empty, cursor: Object.freeze({ current: 'child' }) });
  const result = stepTreeView(tree, hidden, 'next');
  assert.equal(result.ok, false);
  assert.equal(result.error.code, 'tree-view-cursor-hidden');
  assert.equal(hidden.cursor.current, 'child');
  assert.deepEqual(hidden.expansion.ids, []);
});

function stringTree(nodes) {
  return nodes.map(({ id, parentID }) => ({
    id: `i${id}`,
    parentID: parentID === null ? null : `i${parentID}`,
  }));
}

function assertState(tree, state) {
  const visible = tree.visible(state.expansion).ids;
  assert.equal(state.cursor.current === null || visible.includes(state.cursor.current), true);
  assert.equal(state.selection.selected.every((id) => tree.has(id)), true);
}

function stateKey(state, depth) {
  return JSON.stringify([
    depth,
    state.expansion.ids,
    state.cursor.current,
    state.selection.selected,
    state.selection.anchor,
  ]);
}

function stateObservation(state) {
  return {
    expanded: state.expansion.ids,
    current: state.cursor.current,
    selected: state.selection.selected,
    anchor: state.selection.anchor,
  };
}

function resultObservation(result) {
  return result.ok
    ? { ok: true, ...stateObservation(result.value.state), commands: result.value.commands }
    : { ok: false, errorClass: result.error.class, errorCode: result.error.code };
}

function referenceResultObservation(result) {
  return result.ok
    ? { ok: true, ...stateObservation(result.value.state), commands: result.value.commands }
    : { ok: false, errorClass: result.errorClass, errorCode: result.errorCode };
}
