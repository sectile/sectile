/* Law evidence: TRE-01 TRE-02 TRE-03 TRE-04 TRE-05 TRE-06 TRE-07 TRE-08 TRE-09 TRE-10 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { createTree, tryCreateTree } from '../../.verification-dist/structures/tree.js';
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
