/* Law evidence: SEQ-01 SEQ-02 SEQ-03 SEQ-04 SEQ-05 SEQ-06 SEQ-07 SEQ-08 SEQ-09 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { createSequence } from '../.verification-dist/sequence.js';
import { ReferenceSequence } from '../.verification-dist/internal/reference/sequence.js';
import { canonicalIds, permutations, powerset, unwrap } from './support.mjs';

test('SEQ-01..03: reference sequence exposes a strict total order with inverse observations', () => {
  let models = 0;
  for (let size = 0; size <= 6; size += 1) {
    for (const ids of permutations(canonicalIds(size))) {
      const model = new ReferenceSequence(ids);
      assert.equal(model.size, size);
      ids.forEach((id, index) => {
        assert.equal(model.at(index), id);
        assert.equal(model.indexOf(id), index);
        assert.equal(model.compare(id, id), 0);
      });
      assert.equal(model.at(-1), null);
      assert.equal(model.at(size), null);
      assert.equal(model.indexOf('missing'), null);
      models += 1;
    }
  }
  assert.equal(models, 874);
});

test('SEQ-04..05: projection has identity and composition laws', () => {
  let cases = 0;
  for (let size = 0; size <= 8; size += 1) {
    const ids = canonicalIds(size);
    const model = new ReferenceSequence(ids);
    for (const subset of powerset(ids)) {
      const set = new Set(subset);
      const projected = model.project((id) => set.has(id));
      assert.deepEqual(projected.ids, ids.filter((id) => set.has(id)));
      assert.deepEqual(projected.project(() => true).ids, projected.ids);
      const even = projected.project((_, index) => index % 2 === 0);
      assert.deepEqual(even.ids, projected.ids.filter((_, index) => index % 2 === 0));
      cases += 1;
    }
  }
  assert.equal(cases, 511);
});

test('SEQ-06..08: movement returns the first eligible directional candidate and obeys boundaries', () => {
  let cases = 0;
  for (let size = 0; size <= 8; size += 1) {
    const ids = canonicalIds(size);
    const model = new ReferenceSequence(ids);
    for (const eligibleIds of powerset(ids)) {
      const eligible = new Set(eligibleIds);
      for (const current of ids) {
        for (const direction of [-1, 1]) {
          for (const boundary of ['stop', 'wrap']) {
            const result = model.move(current, direction, boundary, {
              eligible: (id) => eligible.has(id),
            });
            if (result.kind === 'found') {
              assert.equal(eligible.has(result.id), true);
              assert.notEqual(result.id, current);
            }
            cases += 1;
          }
        }
      }
    }
  }
  assert.equal(cases, 14_344);
});

test('SEQ-09: identity renaming commutes with every observation', () => {
  const source = new ReferenceSequence(['a', 'b', 'c', 'd']);
  const renamed = new ReferenceSequence(['δ', 'β', 'α', 'γ']);
  const mapping = new Map(source.ids.map((id, index) => [id, renamed.ids[index]]));
  for (const id of source.ids) {
    assert.equal(renamed.indexOf(mapping.get(id)), source.indexOf(id));
  }
  assert.equal(
    mapping.get(source.move('b', 1, 'wrap').id),
    renamed.move(mapping.get('b'), 1, 'wrap').id,
  );
});

test('sequence construction and scan ceilings use explicit failure classes', () => {
  assert.equal(createSequence(['a', 'a']).ok, false);
  assert.equal(createSequence(['']).ok, false);
  assert.equal(createSequence([], { maxIdCodeUnits: 0 }).error.code, 'invalid-max-id-code-units');
  assert.equal(createSequence(['\ud800']).ok, false);
  assert.equal(createSequence([1]).error.code, 'invalid-id-type');
  const canonicallyEquivalent = unwrap(createSequence(['á', 'a\u0301']));
  assert.equal(canonicallyEquivalent.size, 2);
  assert.equal(createSequence(['a', 'b'], { maxItems: 1 }).error.class, 'resource-rejection');
  const sequence = unwrap(createSequence(['a', 'b', 'c']));
  const result = sequence.move('a', 1, 'stop', { eligible: () => false, maxScan: 1 });
  assert.equal(result.kind, 'resource-rejected');
  assert.equal(result.error.class, 'resource-rejection');
  const invalidScan = sequence.move('a', 1, 'stop', { maxScan: -1 });
  assert.equal(invalidScan.kind, 'resource-rejected');
  assert.equal(invalidScan.error.code, 'invalid-scan-ceiling');
});
