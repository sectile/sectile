/* Law evidence: TRE-01 TRE-02 TRE-03 TRE-04 TRE-05 TRE-06 TRE-07 TRE-08 TRE-09 TRE-10 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { createTree, tryCreateTree } from '../../.verification-dist/structures/tree.js';
import { tryApplySequencePatch } from '../../.verification-dist/structures/sequence.js';
import { ReferenceTree } from '../../.verification-dist/internal/reference/structures/tree.js';
import { enumerateOrderedForests, powerset, unwrap } from '../support.mjs';

function stringTree(nodes) {
  return nodes.map(({ id, parentID }) => ({
    id: `i${id}`,
    parentID: parentID === null ? null : `i${parentID}`,
  }));
}

test('TRE-01..06: reference tree validates and observes ordered rooted forests', () => {
  let models = 0;
  let nodeCases = 0;
  for (let size = 0; size <= 6; size += 1) {
    for (const raw of enumerateOrderedForests(size)) {
      const nodes = stringTree(raw);
      const tree = new ReferenceTree(nodes);
      const ids = tree.preorder().ids;
      assert.equal(ids.length, size);
      assert.equal(new Set(ids).size, size);
      for (const id of ids) {
        const seen = new Set();
        let current = id;
        while (current !== null) {
          assert.equal(seen.has(current), false);
          seen.add(current);
          current = tree.parentOf(current);
        }
        const children = tree.childrenOf(id).ids;
        for (const child of children) assert.equal(tree.parentOf(child), id);
        nodeCases += 1;
      }
      const pre = tree.preorder().ids;
      const post = tree.postorder().ids;
      assert.deepEqual([...pre].sort(), [...post].sort());
      models += 1;
    }
  }
  assert.equal(models, 11_465);
  assert.equal(nodeCases, 67_567);
});

test('TRE-07..10: normalized expansion produces a unique preorder subsequence with ancestor visibility', () => {
  let expansionCases = 0;
  let visibilityCases = 0;
  for (let size = 0; size <= 6; size += 1) {
    for (const raw of enumerateOrderedForests(size)) {
      const tree = new ReferenceTree(stringTree(raw));
      const ids = tree.preorder().ids;
      const branches = ids.filter((id) => tree.childrenOf(id).size > 0);
      const expansions = size <= 5 ? [...powerset(branches)] : [[], branches];
      const fullIndex = new Map(ids.map((id, index) => [id, index]));
      for (const requested of expansions) {
        const normalized = tree.normalizeExpansion([...requested, 'missing', ...ids.filter((id) => tree.isLeaf(id))]);
        assert.deepEqual(normalized.ids, requested);
        const visible = tree.visible(normalized).ids;
        assert.equal(new Set(visible).size, visible.length);
        assert.deepEqual(
          visible.map((id) => fullIndex.get(id)),
          [...visible].map((id) => fullIndex.get(id)).sort((a, b) => a - b),
        );
        for (const id of ids) {
          const ancestors = tree.ancestorsOf(id);
          const expected = ancestors.every((ancestor) => normalized.has(ancestor));
          assert.equal(visible.includes(id), expected);
          visibilityCases += 1;
        }
        expansionCases += 1;
      }
    }
  }
  assert.equal(expansionCases, 23_810);
  assert.equal(visibilityCases, 139_531);
});

test('ordered sibling semantics are not definable from parent relations alone', () => {
  const first = new ReferenceTree([
    { id: 'a', parentID: null },
    { id: 'b', parentID: 'a' },
    { id: 'c', parentID: 'a' },
  ]);
  const second = new ReferenceTree([
    { id: 'a', parentID: null },
    { id: 'c', parentID: 'a' },
    { id: 'b', parentID: 'a' },
  ]);
  for (const id of ['a', 'b', 'c']) assert.equal(first.parentOf(id), second.parentOf(id));
  assert.notDeepEqual(first.preorder().ids, second.preorder().ids);
});

test('tree construction rejects duplicate, missing, cyclic, self-parent, and depth-invalid models', () => {
  assert.equal(tryCreateTree([{ id: 'a', parentID: null }, { id: 'a', parentID: null }]).error.code, 'duplicate-id');
  assert.equal(tryCreateTree([], { maxIDCodeUnits: 0 }).error.code, 'invalid-max-id-code-units');
  assert.equal(tryCreateTree(Array(1)).error.code, 'invalid-node');
  assert.equal(tryCreateTree([{ id: 'a', parentID: 'missing' }]).error.code, 'missing-parent');
  assert.equal(tryCreateTree([{ id: 'a', parentID: 'a' }]).error.code, 'self-parent');
  assert.equal(tryCreateTree([{ id: 'a', parentID: 'b' }, { id: 'b', parentID: 'a' }]).error.code, 'cycle');
  assert.equal(
    tryCreateTree([
      { id: 'a', parentID: null },
      { id: 'b', parentID: 'a' },
      { id: 'c', parentID: 'b' },
    ], { maxDepth: 1 }).error.code,
    'depth-ceiling-exceeded',
  );
  const tree = createTree([
    { id: 'right', parentID: 'root' },
    { id: 'root', parentID: null },
    { id: 'left', parentID: 'root' },
  ]);
  assert.deepEqual(tree.childrenOf('root').ids, ['right', 'left']);
  assert.equal(tree.childrenOf('missing'), null);
  const forged = { ids: ['missing', 'right', 'root'], size: 3, has: () => true };
  assert.deepEqual(tree.visible(forged).ids, ['root', 'right', 'left']);
});


test('ISSUE-184: tree construction consumes one captured node prefix and header observation', () => {
  let nodeReads = 0;
  const growingNodes = [];
  Object.defineProperty(growingNodes, 0, {
    enumerable: true,
    configurable: true,
    get() {
      nodeReads += 1;
      if (growingNodes.length === 1) growingNodes.push({ id: 'node-1', parentID: null });
      return { id: 'node-0', parentID: null };
    },
  });
  const growing = tryCreateTree(growingNodes, { maxItems: 1, maxDepth: 1 });
  assert.equal(growing.ok, true);
  assert.equal(nodeReads, 1);
  assert.equal(growingNodes.length, 2);
  assert.equal(growing.value.size, 1);
  assert.deepEqual(growing.value.roots.ids, ['node-0']);
  assert.deepEqual(growing.value.preorder().ids, ['node-0']);
  assert.deepEqual(growing.value.postorder().ids, ['node-0']);
  for (const view of [
    growing.value.roots,
    growing.value.preorder(),
    growing.value.postorder(),
    growing.value.childrenOf('node-0'),
  ]) {
    assertTreeSequenceLimits(view, 1, 1_024);
  }
  assert.equal(growing.value.has('node-1'), false);

  let idReads = 0;
  let parentReads = 0;
  const observedNode = {};
  Object.defineProperties(observedNode, {
    id: {
      enumerable: true,
      get() {
        idReads += 1;
        return idReads === 1 ? 'first-id' : 'later-id';
      },
    },
    parentID: {
      enumerable: true,
      get() {
        parentReads += 1;
        return parentReads === 1 ? null : 'missing-parent';
      },
    },
  });
  const captured = tryCreateTree([observedNode], { maxItems: 1, maxDepth: 1 });
  assert.equal(captured.ok, true);
  assert.deepEqual([idReads, parentReads], [1, 1]);
  assert.deepEqual(captured.value.roots.ids, ['first-id']);
  assert.equal(captured.value.has('first-id'), true);
  assert.equal(captured.value.has('later-id'), false);
  assert.equal(captured.value.parentOf('first-id'), null);

  let overReads = 0;
  const over = [];
  for (const [index, id] of ['a', 'b'].entries()) {
    Object.defineProperty(over, index, {
      enumerable: true,
      configurable: true,
      get() {
        overReads += 1;
        return { id, parentID: null };
      },
    });
  }
  const rejected = tryCreateTree(over, { maxItems: 1, maxDepth: 1 });
  assert.equal(rejected.ok, false);
  assert.equal(rejected.error.code, 'item-ceiling-exceeded');
  assert.equal(overReads, 0);
});


test('tree production traversal remains stack-safe at the declared depth ceiling', () => {
  const size = 20_000;
  const nodes = Array.from({ length: size }, (_, index) => ({
    id: `deep-${index}`,
    parentID: index === 0 ? null : `deep-${index - 1}`,
  }));
  const tree = createTree(nodes, { maxItems: size, maxDepth: size - 1 });
  assert.equal(tree.depthOf(`deep-${size - 1}`), size - 1);
  const expansion = tree.normalizeExpansion(nodes.map((node) => node.id));
  assert.equal(tree.visible(expansion).size, size);
  assert.equal(tree.postorder().at(0), `deep-${size - 1}`);
});

test('tree production caches structural views and exposes half-open subtree intervals', () => {
  const tree = createTree([
    { id: 'root', parentID: null },
    { id: 'a', parentID: 'root' },
    { id: 'a1', parentID: 'a' },
    { id: 'b', parentID: 'root' },
  ]);
  assert.equal(tree.preorder(), tree.preorder());
  assert.equal(tree.postorder(), tree.postorder());
  assert.equal(tree.childrenOf('root'), tree.childrenOf('root'));
  assert.deepEqual(tree.subtreeIntervalOf('root'), { start: 0, endExclusive: 4 });
  assert.deepEqual(tree.subtreeIntervalOf('a'), { start: 1, endExclusive: 3 });
  assert.deepEqual(tree.subtreeIntervalOf('a1'), { start: 2, endExclusive: 3 });
  assert.equal(tree.subtreeIntervalOf('missing'), null);
  const interval = tree.subtreeIntervalOf('a');
  assert.deepEqual(tree.preorder().ids.slice(interval.start, interval.endExclusive), ['a', 'a1']);
});

test('tree sequences preserve raised item ceilings for both roots and child domains', () => {
  const count = 100_001;
  for (const parentID of [null, 'root']) {
    const nodes = Array.from({ length: count }, (_, id) => ({ id, parentID }));
    if (parentID !== null) nodes.unshift({ id: parentID, parentID: null });
    const tree = createTree(nodes, { maxItems: nodes.length });
    const root = parentID ?? 0;
    const expanded = parentID === null ? [] : [parentID];
    for (const view of [tree.roots, tree.preorder(), tree.postorder(), tree.childrenOf(root), tree.visible(expanded)]) {
      assertTreeSequenceLimits(view, nodes.length, 1_024);
    }
    assert.equal((parentID === null ? tree.roots : tree.childrenOf(parentID)).size, count);
    assert.equal(tree.visible(expanded).size, nodes.length);
    assert.equal(tree.preorder(), tree.preorder());
    assert.equal(tree.postorder(), tree.postorder());
    assert.equal(tree.childrenOf(root), tree.childrenOf(root));
    const domain = tree.preorder();
    const rejected = tryApplySequencePatch(domain, { type: 'splice', index: domain.size, deleteCount: 0, inserted: ['extra'] });
    assert.equal(rejected.error.code, 'item-ceiling-exceeded');
  }
});

test('tree sequences snapshot custom ID limits and carry them through projections and replacement', () => {
  const id = '😀'.repeat(750);
  const options = { maxItems: 2, maxIDCodeUnits: 2_000 };
  const tree = createTree([{ id: 'root', parentID: null }, { id, parentID: 'root' }], options);
  options.maxItems = 0;
  options.maxIDCodeUnits = 1;
  for (const view of [tree.roots, tree.preorder(), tree.postorder(), tree.childrenOf('root'), tree.childrenOf(id), tree.visible([]), tree.visible(['root'])]) {
    assertTreeSequenceLimits(view, 2, 2_000);
    const projected = view.project(() => true);
    assertTreeSequenceLimits(projected, 2, 2_000);
    assert.deepEqual(projected.ids, view.ids);
    if (view.contains(id)) {
      const replaced = unwrap(tryApplySequencePatch(view, { type: 'splice', index: view.indexOf(id), deleteCount: 1, inserted: [id] }));
      assertTreeSequenceLimits(replaced, 2, 2_000);
      assert.deepEqual(replaced.ids, view.ids);
    }
  }
  const empty = tree.preorder().project(() => false);
  assert.equal(tryApplySequencePatch(empty, { type: 'splice', index: 0, deleteCount: 0, inserted: ['x'.repeat(2_001)] }).error.code, 'id-code-unit-ceiling-exceeded');
});

test('tree empty and small views retain their configured limits and unchanged defaults', () => {
  for (const options of [{ maxItems: 0, maxIDCodeUnits: 1 }, { maxItems: 1, maxIDCodeUnits: 3 }, {}]) {
    const tree = createTree(options.maxItems === 0 ? [] : [{ id: 'a', parentID: null }], options);
    const views = [tree.roots, tree.preorder(), tree.postorder(), tree.visible([])];
    if (tree.has('a')) views.push(tree.childrenOf('a'));
    for (const view of views) assertTreeSequenceLimits(view, options.maxItems ?? 100_000, options.maxIDCodeUnits ?? 1_024);
  }
});

function assertTreeSequenceLimits(view, maxItems, maxIDCodeUnits) {
  assert.equal(view.maxItems, maxItems);
  assert.equal(view.maxIDCodeUnits, maxIDCodeUnits);
  assert.ok(view.size <= view.maxItems);
  const result = tryApplySequencePatch(view, { type: 'splice', index: view.size, deleteCount: 0, inserted: [] });
  assert.equal(result.ok, true);
  assert.equal(result.value, view, 'a no-op patch preserves the valid derived view');
}
