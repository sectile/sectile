import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createSelectionExpression,
  excludeSelectionID,
  includeSelectionID,
  intersectSelectionExpressions,
  materializeSelectionExpression,
  subtractSelectionExpressions,
  toggleSelectionID,
  tryCreateSelectionExpression,
  unionSelectionExpressions,
} from '../../.verification-dist/structures/selection-expression.js';
import { createSequence } from '../../.verification-dist/structures/sequence.js';

const universe = Object.freeze(['a', 'b', 'c', 'd', 'e', 'f']);
const selected = (expression) => universe.filter((id) => expression.contains(id));

test('construction retains deterministic exception order and membership uses expression polarity', () => {
  const explicit = createSelectionExpression('explicit', ['c', 'a', 'b']);
  const complement = createSelectionExpression('complement', ['c', 'a', 'b']);
  assert.deepEqual(explicit.exceptions, ['c', 'a', 'b']);
  assert.deepEqual(selected(explicit), ['a', 'b', 'c']);
  assert.deepEqual(selected(complement), ['d', 'e', 'f']);
  assert.equal(Object.isFrozen(explicit.exceptions), true);
});

test('include, exclude, and toggle retain no-op identity', () => {
  const original = createSelectionExpression('explicit', ['b']);
  assert.equal(includeSelectionID(original, 'b'), original);
  const included = includeSelectionID(original, 'a');
  assert.deepEqual(included.exceptions, ['b', 'a']);
  assert.equal(excludeSelectionID(included, 'z'), included);
  assert.deepEqual(toggleSelectionID(included, 'b').exceptions, ['a']);
  const complement = createSelectionExpression('complement', ['b']);
  assert.deepEqual(includeSelectionID(complement, 'b').exceptions, []);
  assert.deepEqual(excludeSelectionID(complement, 'a').exceptions, ['b', 'a']);
});

test('closed algebra agrees with every six-bit truth table', () => {
  for (const leftKind of ['explicit', 'complement']) for (const rightKind of ['explicit', 'complement']) {
    for (let leftMask = 0; leftMask < 64; leftMask += 1) for (let rightMask = 0; rightMask < 64; rightMask += 1) {
      const left = fromMask(leftKind, leftMask);
      const right = fromMask(rightKind, rightMask);
      const leftSet = new Set(selected(left));
      const rightSet = new Set(selected(right));
      assert.deepEqual(selected(unionSelectionExpressions(left, right)), universe.filter((id) => leftSet.has(id) || rightSet.has(id)));
      assert.deepEqual(selected(intersectSelectionExpressions(left, right)), universe.filter((id) => leftSet.has(id) && rightSet.has(id)));
      assert.deepEqual(selected(subtractSelectionExpressions(left, right)), universe.filter((id) => leftSet.has(id) && !rightSet.has(id)));
    }
  }
});

test('large deterministic random expressions agree with finite-set references', () => {
  const largeUniverse = Object.freeze(Array.from({ length: 1_024 }, (_, index) => `id-${index}`));
  let seed = 0x9e3779b9;
  const random = () => {
    seed ^= seed << 13;
    seed ^= seed >>> 17;
    seed ^= seed << 5;
    return seed >>> 0;
  };
  for (let trial = 0; trial < 32; trial += 1) {
    const left = createSelectionExpression(random() % 2 === 0 ? 'explicit' : 'complement', largeUniverse.filter(() => random() % 5 === 0));
    const right = createSelectionExpression(random() % 2 === 0 ? 'explicit' : 'complement', largeUniverse.filter(() => random() % 7 === 0));
    for (const [operation, reference] of [
      [unionSelectionExpressions, (a, b) => a || b],
      [intersectSelectionExpressions, (a, b) => a && b],
      [subtractSelectionExpressions, (a, b) => a && !b],
    ]) {
      const actual = operation(left, right);
      assert.deepEqual(
        largeUniverse.filter((id) => actual.contains(id)),
        largeUniverse.filter((id) => reference(left.contains(id), right.contains(id))),
      );
    }
  }
});

test('only materialization scans and preserves Sequence order', () => {
  const sequence = createSequence(['f', 'd', 'b', 'a']);
  assert.deepEqual(materializeSelectionExpression(createSelectionExpression('complement', ['b']), sequence), ['f', 'd', 'a']);
});

test('resource and identity validation reject deterministically', () => {
  assert.equal(tryCreateSelectionExpression('explicit', ['a', 'b'], { maxExceptions: 1 }).error.code, 'item-ceiling-exceeded');
  assert.equal(tryCreateSelectionExpression('explicit', ['a', 'a']).error.code, 'duplicate-id');
  assert.equal(tryCreateSelectionExpression('explicit', ['']).error.code, 'empty-id');
  assert.throws(() => includeSelectionID(createSelectionExpression('explicit', ['a'], { maxExceptions: 1 }), 'b'), { code: 'item-ceiling-exceeded' });
});

function fromMask(kind, mask) {
  return createSelectionExpression(kind, universe.filter((_, index) => (mask & (1 << index)) !== 0));
}
