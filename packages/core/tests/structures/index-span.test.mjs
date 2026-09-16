import assert from 'node:assert/strict';
import test from 'node:test';
import {
  clampIndexSpanSet,
  containsIndexInSpanSet,
  createIndexSpan,
  createIndexSpanSet,
  intersectIndexSpanSets,
  resizeIndexSpanSet,
  subtractIndexSpanSets,
  translateIndexSpanSet,
  tryCreateIndexSpan,
  tryCreateIndexSpanSet,
  unionIndexSpanSets,
} from '../../.verification-dist/structures/index-span.js';

const expand = (set) => set.spans.flatMap(({ start, endExclusive }) => Array.from({ length: endExclusive - start }, (_, offset) => start + offset));

test('span construction normalizes empty, overlapping, adjacent, and unordered input', () => {
  assert.equal(createIndexSpan(4, 4), null);
  const set = createIndexSpanSet([
    { start: 8, endExclusive: 10 },
    { start: 0, endExclusive: 3 },
    { start: 3, endExclusive: 8 },
    { start: 12, endExclusive: 12 },
  ]);
  assert.deepEqual(set.spans, [{ start: 0, endExclusive: 10 }]);
  assert.equal(set.spanCount, 1);
  assert.equal(set.coveredCount, 10);
  assert.equal(Object.isFrozen(set.spans), true);
});

test('ISSUE-186: span-set construction consumes one indexed prefix and captured bounds', () => {
  let indexedReads = 0;
  let iteratorStarts = 0;
  let yielded = 0;
  const iterating = Array(1);
  Object.defineProperty(iterating, 0, {
    enumerable: true,
    configurable: true,
    get() {
      indexedReads += 1;
      return { start: 0, endExclusive: 1 };
    },
  });
  Object.defineProperty(iterating, Symbol.iterator, {
    configurable: true,
    value() {
      iteratorStarts += 1;
      let index = 0;
      return {
        next() {
          if (index >= 4) return { done: true, value: undefined };
          const value = { start: index * 2, endExclusive: index * 2 + 1 };
          index += 1;
          yielded += 1;
          return { done: false, value };
        },
      };
    },
  });
  const bounded = tryCreateIndexSpanSet(iterating, { maxSpans: 1, maxExclusive: 8 });
  assert.equal(bounded.ok, true);
  assert.deepEqual([indexedReads, iteratorStarts, yielded], [1, 0, 0]);
  assert.deepEqual(bounded.value.spans, [{ start: 0, endExclusive: 1 }]);
  assert.equal(bounded.value.coveredCount, 1);

  let startReads = 0;
  let endReads = 0;
  const observedSpan = {};
  Object.defineProperties(observedSpan, {
    start: {
      enumerable: true,
      get() {
        startReads += 1;
        return startReads === 1 ? 0 : 100;
      },
    },
    endExclusive: {
      enumerable: true,
      get() {
        endReads += 1;
        return endReads === 1 ? 1 : 0;
      },
    },
  });
  const captured = tryCreateIndexSpanSet([observedSpan], { maxSpans: 1, maxExclusive: 1 });
  assert.equal(captured.ok, true);
  assert.deepEqual([startReads, endReads], [1, 1]);
  assert.deepEqual(captured.value.spans, [{ start: 0, endExclusive: 1 }]);
  assert.equal(captured.value.coveredCount, 1);
  for (const span of captured.value.spans) {
    assert.ok(span.start >= 0);
    assert.ok(span.start < span.endExclusive);
    assert.ok(span.endExclusive <= 1);
  }

  let overReads = 0;
  const over = Array(2);
  for (let index = 0; index < over.length; index += 1) {
    Object.defineProperty(over, index, {
      enumerable: true,
      configurable: true,
      get() {
        overReads += 1;
        return { start: index * 2, endExclusive: index * 2 + 1 };
      },
    });
  }
  const rejected = tryCreateIndexSpanSet(over, { maxSpans: 1, maxExclusive: 4 });
  assert.equal(rejected.ok, false);
  assert.equal(rejected.error.code, 'count-ceiling-exceeded');
  assert.equal(overReads, 0);
});

test('span-set algebra agrees with finite set references', () => {
  for (let maskA = 0; maskA < 64; maskA += 1) {
    for (let maskB = 0; maskB < 64; maskB += 1) {
      const a = fromMask(maskA);
      const b = fromMask(maskB);
      const valuesA = new Set(expand(a));
      const valuesB = new Set(expand(b));
      assert.deepEqual(expand(unionIndexSpanSets(a, b)), [...new Set([...valuesA, ...valuesB])].sort((x, y) => x - y));
      assert.deepEqual(expand(intersectIndexSpanSets(a, b)), [...valuesA].filter((value) => valuesB.has(value)));
      assert.deepEqual(expand(subtractIndexSpanSets(a, b)), [...valuesA].filter((value) => !valuesB.has(value)));
    }
  }
});

test('membership, clamp, translate, and resize preserve half-open semantics', () => {
  const set = createIndexSpanSet([{ start: 2, endExclusive: 5 }, { start: 9, endExclusive: 12 }]);
  assert.equal(containsIndexInSpanSet(set, 2), true);
  assert.equal(containsIndexInSpanSet(set, 5), false);
  assert.deepEqual(clampIndexSpanSet(set, { start: 4, endExclusive: 10 }).spans, [
    { start: 4, endExclusive: 5 },
    { start: 9, endExclusive: 10 },
  ]);
  assert.deepEqual(translateIndexSpanSet(set, 3).spans, [{ start: 5, endExclusive: 8 }, { start: 12, endExclusive: 15 }]);
  assert.deepEqual(resizeIndexSpanSet(set, -1, 1).spans, [{ start: 1, endExclusive: 6 }, { start: 8, endExclusive: 13 }]);
});

test('100,000 contiguous indexes retain one span and invalid bounds reject deterministically', () => {
  const set = createIndexSpanSet(Array.from({ length: 100_000 }, (_, index) => ({ start: index, endExclusive: index + 1 })));
  assert.deepEqual(set.spans, [{ start: 0, endExclusive: 100_000 }]);
  assert.equal(tryCreateIndexSpan(-1, 1).error.code, 'invalid-boundary');
  assert.equal(tryCreateIndexSpan(0, 11, { maxExclusive: 10 }).error.code, 'count-ceiling-exceeded');
  assert.throws(() => translateIndexSpanSet(createIndexSpanSet([{ start: 0, endExclusive: 1 }]), -1), { code: 'invalid-boundary' });
});

function fromMask(mask) {
  const spans = [];
  for (let index = 0; index < 6; index += 1) {
    if ((mask & (1 << index)) !== 0) spans.push({ start: index, endExclusive: index + 1 });
  }
  return createIndexSpanSet(spans);
}
