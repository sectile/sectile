import assert from 'node:assert/strict';
import test from 'node:test';
import {
  prepareVirtualList,
  updatePreparedVirtualList,
} from '../.verification-dist/internal/virtual-collection-model.js';

const key = (value) => value.id;

test('prepared virtual collections retain Core sequence patches for small keyed changes', () => {
  const source = Object.freeze([
    Object.freeze({ id: 'a' }),
    Object.freeze({ id: 'b' }),
    Object.freeze({ id: 'c' }),
  ]);
  const prepared = prepareVirtualList(source, key, 10);
  const inserted = Object.freeze({ id: 'x' });
  const next = updatePreparedVirtualList(
    prepared,
    Object.freeze([source[0], inserted, source[1], source[2]]),
    key,
  );

  assert.deepEqual(next.change, { index: 1, deleteCount: 0, inserted: ['x'] });
  assert.equal(next.domain.size, 4);
  assert.equal(next.domain.at(0), 'a');
  assert.equal(next.domain.at(1), 'x');
  assert.equal(next.domain.at(3), 'c');
  assert.equal(next.domain.indexOf('b'), 2);
  assert.equal(prepared.domain.size, 3);
  assert.deepEqual(prepared.domain.ids, ['a', 'b', 'c']);
});

test('prepared virtual collections reuse their domain when values change without key changes', () => {
  const source = Object.freeze([
    Object.freeze({ id: 'a', label: 'before' }),
    Object.freeze({ id: 'b', label: 'stable' }),
  ]);
  const prepared = prepareVirtualList(source, key, 10);
  const next = updatePreparedVirtualList(
    prepared,
    Object.freeze([Object.freeze({ id: 'a', label: 'after' }), source[1]]),
    key,
  );

  assert.equal(next.domain, prepared.domain);
  assert.equal(next.change, null);
});

test('prepared virtual collection patches preserve duplicate-key rejection', () => {
  const source = Object.freeze([
    Object.freeze({ id: 'a' }),
    Object.freeze({ id: 'b' }),
    Object.freeze({ id: 'c' }),
  ]);
  const prepared = prepareVirtualList(source, key, 10);

  assert.throws(
    () => updatePreparedVirtualList(
      prepared,
      Object.freeze([source[0], Object.freeze({ id: 'c' }), source[1], source[2]]),
      key,
    ),
    (error) => error?.cause?.code === 'duplicate-id',
  );
});

test('prepared virtual collection maxItems applies before key resolution', () => {
  let calls = 0;
  assert.throws(
    () => prepareVirtualList(
      Object.freeze([{ id: 'a' }, { id: 'b' }]),
      (value) => {
        calls += 1;
        return value.id;
      },
      1,
    ),
    /exceeding maxItems 1/u,
  );
  assert.equal(calls, 0);
});
