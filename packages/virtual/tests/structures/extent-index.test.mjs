import assert from 'node:assert/strict';
import test from 'node:test';
import { createExtentIndex } from '../../.verification-dist/extent-index.js';

const exact = (value) => ({ kind: 'exact', value });
const estimated = (value) => ({ kind: 'estimated', value });

test('EXT-01, EXT-02: extent offsets are searchable prefix sums', () => {
  const index = createExtentIndex([exact(10), exact(20), exact(30)]);
  assert.deepEqual([0, 1, 2, 3].map((item) => index.offsetAt(item)), [0, 10, 30, 60]);
  assert.deepEqual([0, 9, 10, 29, 30, 59].map((offset) => index.indexAtOffset(offset)), [0, 0, 1, 1, 2, 2]);
  assert.deepEqual(index.locateOffset(29), { index: 1, itemOffset: 10, offsetWithin: 19, extent: exact(20) });
  assert.deepEqual(index.slice(1, 3), [exact(20), exact(30)]);
  assert.equal(index.indexAtOffset(60), null);
});

test('EXT-03, EXT-05: measurement updates preserve untouched geometry', () => {
  const before = createExtentIndex([estimated(10), exact(20), { kind: 'unknown', fallback: 30 }]);
  const after = before.update([{ index: 0, extent: exact(12) }]).value;
  assert.deepEqual(after.extentAt(0), exact(12));
  assert.equal(after.extentAt(1), before.extentAt(1));
  assert.equal(before.totalExtent, 60);
  assert.equal(after.totalExtent, 62);
  const unchanged = after.update([{ index: 0, extent: exact(12) }]).value;
  assert.equal(unchanged.extentAt(0), after.extentAt(0));
  const knowledgeChanged = createExtentIndex([estimated(10)]).update([{ index: 0, extent: exact(10) }]).value;
  assert.equal(knowledgeChanged.extentAt(0).kind, 'exact');
  const duplicate = before.update([
    { index: 2, extent: exact(31) },
    { index: 0, extent: exact(13) },
    { index: 2, extent: exact(32) },
  ]).value;
  assert.deepEqual([0, 1, 2].map((item) => duplicate.extentAt(item).value), [13, 20, 32]);
  assert.equal(createExtentIndex([estimated(10), exact(10), { kind: 'unknown', fallback: 10 }]).totalExtent, 30);
});

test('EXT-04: extent splice matches ordered array semantics across chunk boundaries', () => {
  let reference = Array.from({ length: 257 }, (_, value) => value + 1);
  let index = createExtentIndex(reference.map(exact));
  reference.splice(63, 130, 7, 11, 13);
  index = index.splice(63, 130, [exact(7), exact(11), exact(13)]).value;
  assert.equal(index.size, reference.length);
  assert.equal(index.totalExtent, reference.reduce((sum, value) => sum + value, 0));
  assert.deepEqual(reference.map((_value, item) => index.extentAt(item).value), reference);
});

test('EXT-06: extent moves use post-removal destinations without changing geometry', () => {
  const before = createExtentIndex([1, 2, 3, 4, 5].map(exact));
  const after = before.move(1, 3, 2).value;
  assert.deepEqual(Array.from({ length: 5 }, (_, item) => after.extentAt(item).value), [1, 4, 5, 2, 3]);
  assert.equal(after.totalExtent, before.totalExtent);
});

test('extent index remains equivalent to a flat model through deterministic edits', () => {
  let values = Array.from({ length: 500 }, (_, index) => (index % 31) + 1);
  let index = createExtentIndex(values.map(exact));
  let seed = 0x9e3779b9;
  const random = () => {
    seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5;
    return seed >>> 0;
  };
  for (let operation = 0; operation < 500; operation += 1) {
    if (random() % 3 === 0 && values.length > 0) {
      const item = random() % values.length;
      const value = (random() % 100) + 1;
      values[item] = value;
      index = index.update([{ index: item, extent: exact(value) }]).value;
    } else {
      const start = random() % (values.length + 1);
      const count = Math.min(random() % 4, values.length - start);
      const inserted = Array.from({ length: random() % 4 }, () => (random() % 100) + 1);
      values.splice(start, count, ...inserted);
      index = index.splice(start, count, inserted.map(exact)).value;
    }
    assert.equal(index.size, values.length);
    assert.equal(index.totalExtent, values.reduce((sum, value) => sum + value, 0));
    for (let sample = 0; sample < 5 && values.length > 0; sample += 1) {
      const item = random() % values.length;
      const expectedOffset = values.slice(0, item).reduce((sum, value) => sum + value, 0);
      assert.equal(index.offsetAt(item), expectedOffset);
      assert.equal(index.indexAtOffset(expectedOffset), item);
    }
  }
});
