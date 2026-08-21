/* Expansion law evidence: toggle involution, setOpen idempotence, reconciliation, visibility */
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createExpansionState,
  reconcileExpansion,
  setExpansionOpen,
  toggleExpansion,
} from '../.verification-dist/internal/expansion.js';
import {
  createReferenceExpansionState,
  reconcileReferenceExpansion,
  referenceSetExpansionOpen,
  referenceToggleExpansion,
} from '../.verification-dist/internal/reference/expansion.js';
import { ReferenceTree } from '../.verification-dist/internal/reference/tree.js';
import { createTree } from '../.verification-dist/tree.js';
import { enumerateOrderedForests, powerset, unwrap } from './support.mjs';

test('expansion transitions satisfy involution, idempotence, reconciliation, and visibility laws', () => {
  let expansionCases = 0;
  for (let size = 0; size <= 6; size += 1) {
    for (const raw of enumerateOrderedForests(size)) {
      const nodes = stringTree(raw);
      const tree = unwrap(createTree(nodes));
      const referenceTree = new ReferenceTree(nodes);
      const ids = tree.preorder().ids;
      const branches = ids.filter((id) => tree.isLeaf(id) === false);
      const leaves = ids.filter((id) => tree.isLeaf(id) === true);
      const expansions = size <= 5 ? [...powerset(branches)] : [[], branches];

      for (const requested of expansions) {
        const noisy = [...requested, ...leaves, 'missing'];
        const state = createExpansionState(tree, noisy);
        const reference = createReferenceExpansionState(referenceTree, noisy);
        assert.deepEqual(state.ids, requested);
        assert.deepEqual(state.ids, reference.ids);
        assert.equal(reconcileExpansion(state, tree), state);
        assert.equal(reconcileReferenceExpansion(reference, referenceTree), reference);
        assert.equal(Object.isFrozen(state), true);
        assert.equal(Object.isFrozen(state.ids), true);

        const forged = expansionState(noisy);
        const reconciled = reconcileExpansion(forged, tree);
        const referenceReconciled = reconcileReferenceExpansion(forged, referenceTree);
        assert.deepEqual(reconciled.ids, requested);
        assert.deepEqual(reconciled.ids, referenceReconciled.ids);
        assert.deepEqual(tree.visible(reconciled).ids, tree.visible(noisy).ids);

        for (const id of branches) {
          const opened = setExpansionOpen(state, id, true, tree);
          const referenceOpened = referenceSetExpansionOpen(reference, id, true, referenceTree);
          assert.deepEqual(opened.ids, referenceOpened.ids);
          assert.equal(setExpansionOpen(opened, id, true, tree), opened);

          const closed = setExpansionOpen(state, id, false, tree);
          const referenceClosed = referenceSetExpansionOpen(reference, id, false, referenceTree);
          assert.deepEqual(closed.ids, referenceClosed.ids);
          assert.equal(setExpansionOpen(closed, id, false, tree), closed);

          const toggled = toggleExpansion(state, id, tree);
          const referenceToggled = referenceToggleExpansion(reference, id, referenceTree);
          assert.deepEqual(toggled.ids, referenceToggled.ids);
          assert.deepEqual(toggleExpansion(toggled, id, tree).ids, state.ids);
        }

        for (const id of [...leaves, 'missing']) {
          assert.equal(setExpansionOpen(state, id, true, tree), state);
          assert.equal(toggleExpansion(state, id, tree), state);
        }
        expansionCases += 1;
      }
    }
  }
  assert.equal(expansionCases, 23_810);
});

test('expansion reconciliation drops branches that become leaves or disappear', () => {
  const original = unwrap(createTree([
    { id: 'root', parentID: null },
    { id: 'branch', parentID: 'root' },
    { id: 'leaf', parentID: 'branch' },
  ]));
  const state = createExpansionState(original, ['root', 'branch']);
  assert.deepEqual(state.ids, ['root', 'branch']);

  const branchBecameLeaf = unwrap(createTree([
    { id: 'root', parentID: null },
    { id: 'branch', parentID: 'root' },
  ]));
  const reconciledLeaf = reconcileExpansion(state, branchBecameLeaf);
  assert.deepEqual(reconciledLeaf.ids, ['root']);
  assert.deepEqual(branchBecameLeaf.visible(reconciledLeaf).ids, ['root', 'branch']);

  const branchDisappeared = unwrap(createTree([{ id: 'root', parentID: null }]));
  const reconciledMissing = reconcileExpansion(state, branchDisappeared);
  assert.deepEqual(reconciledMissing.ids, []);
  assert.deepEqual(branchDisappeared.visible(reconciledMissing).ids, ['root']);
});

function stringTree(nodes) {
  return nodes.map(({ id, parentID }) => ({
    id: `i${id}`,
    parentID: parentID === null ? null : `i${parentID}`,
  }));
}

function expansionState(ids) {
  const frozen = Object.freeze([...ids]);
  const set = new Set(frozen);
  return Object.freeze({
    ids: frozen,
    size: frozen.length,
    has: (id) => set.has(id),
  });
}
