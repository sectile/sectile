/* Law evidence: SEQ-01 SEQ-02 SEQ-03 SEQ-04 SEQ-05 SEQ-06 SEQ-07 SEQ-08 SEQ-09 SEQ-10 */
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  applySequencePatch,
  createSequence,
  tryApplySequencePatch,
  tryCreateSequence,
} from '../../.verification-dist/structures/sequence.js';
import { ReferenceSequence } from '../../.verification-dist/internal/reference/structures/sequence.js';
import { canonicalIDs, permutations, powerset, unwrap } from '../support.mjs';

test('SEQ-01..03: reference sequence exposes a strict total order with inverse observations', () => {
  let models = 0;
  for (let size = 0; size <= 6; size += 1) {
    for (const ids of permutations(canonicalIDs(size))) {
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
    const ids = canonicalIDs(size);
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
    const ids = canonicalIDs(size);
    const model = new ReferenceSequence(ids);
    for (const eligibleIDs of powerset(ids)) {
      const eligible = new Set(eligibleIDs);
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

test('SEQ-10: patches match array splice and post-removal move semantics', () => {
  const sequence = createSequence(['a', 'b', 'c', 'd', 'e']);
  const spliced = applySequencePatch(sequence, {
    type: 'splice', index: 1, deleteCount: 2, inserted: ['x', 'y'],
  });
  assert.deepEqual(spliced.ids, ['a', 'x', 'y', 'd', 'e']);
  assert.deepEqual(applySequencePatch(spliced, {
    type: 'move', from: 1, to: 3, count: 2,
  }).ids, ['a', 'd', 'e', 'x', 'y']);
  assert.equal(tryApplySequencePatch(sequence, {
    type: 'move', from: 4, to: 2, count: 2,
  }).error.code, 'sequence-patch-invalid');

  const movedEarlier = applySequencePatch(sequence, {
    type: 'move', from: 3, to: 1, count: 2,
  });
  assert.deepEqual(movedEarlier.ids, ['a', 'd', 'e', 'b', 'c']);
  movedEarlier.ids.forEach((id, index) => assert.equal(movedEarlier.indexOf(id), index));
  const movedLater = applySequencePatch(sequence, {
    type: 'move', from: 1, to: 3, count: 2,
  });
  assert.deepEqual(movedLater.ids, ['a', 'd', 'e', 'b', 'c']);
  movedLater.ids.forEach((id, index) => assert.equal(movedLater.indexOf(id), index));
});

test('incremental patches preserve uniqueness and observations across long chains', () => {
  let sequence = createSequence(Array.from({ length: 128 }, (_, index) => `id-${index}`), {
    maxItems: 256,
  });
  const expected = [...sequence.ids];
  for (let iteration = 0; iteration < 160; iteration += 1) {
    const inserted = `new-${iteration}`;
    const index = iteration % (expected.length + 1);
    sequence = applySequencePatch(sequence, {
      type: 'splice', index, deleteCount: 0, inserted: [inserted],
    });
    expected.splice(index, 0, inserted);
    if (expected.length > 180) {
      const remove = (iteration * 7) % expected.length;
      sequence = applySequencePatch(sequence, {
        type: 'splice', index: remove, deleteCount: 1, inserted: [],
      });
      expected.splice(remove, 1);
    }
  }
  assert.deepEqual(sequence.ids, expected);
  expected.forEach((id, index) => {
    assert.equal(sequence.at(index), id);
    assert.equal(sequence.indexOf(id), index);
    assert.equal(sequence.contains(id), true);
  });
  assert.equal(tryApplySequencePatch(sequence, {
    type: 'splice', index: 0, deleteCount: 0, inserted: [expected.at(-1)],
  }).error.code, 'duplicate-id');
});

test('patches revalidate retained IDs when the ID ceiling is lowered', () => {
  const sequence = createSequence(['short', 'longer-id'], { maxIDCodeUnits: 32 });
  const result = tryApplySequencePatch(sequence, {
    type: 'splice', index: 0, deleteCount: 1, inserted: ['new'],
  }, { maxIDCodeUnits: 5 });
  assert.equal(result.ok, false);
  assert.equal(result.error.code, 'id-code-unit-ceiling-exceeded');
});

test('incremental move patches preserve every valid post-removal destination', () => {
  for (let size = 0; size <= 9; size += 1) {
    const ids = canonicalIDs(size);
    const sequence = createSequence(ids);
    for (let from = 0; from <= size; from += 1) {
      for (let count = 0; count <= size - from; count += 1) {
        for (let to = 0; to <= size - count; to += 1) {
          const expected = [...ids];
          const moved = expected.splice(from, count);
          expected.splice(to, 0, ...moved);
          const actual = applySequencePatch(sequence, {
            type: 'move', from, to, count,
          });
          assert.deepEqual(actual.ids, expected);
          expected.forEach((id, index) => {
            assert.equal(actual.at(index), id);
            assert.equal(actual.indexOf(id), index);
          });
        }
      }
    }
  }
});

test('sequence construction and scan ceilings use explicit failure classes', () => {
  assert.equal(tryCreateSequence(['a', 'a']).ok, false);
  assert.equal(tryCreateSequence(['']).ok, false);
  assert.equal(tryCreateSequence([], { maxIDCodeUnits: 0 }).error.code, 'invalid-max-id-code-units');
  assert.equal(tryCreateSequence(['\ud800']).ok, false);
  const mixed = createSequence([1, '1', -1, '-1']);
  assert.equal(mixed.indexOf(1), 0);
  assert.equal(mixed.indexOf('1'), 1);
  assert.equal(mixed.indexOf(-1), 2);
  assert.equal(mixed.indexOf('-1'), 3);
  assert.equal(tryCreateSequence([-0]).error.code, 'invalid-id-type');
  assert.equal(tryCreateSequence([1.5]).error.code, 'invalid-id-type');
  const canonicallyEquivalent = createSequence(['á', 'a\u0301']);
  assert.equal(canonicallyEquivalent.size, 2);
  assert.equal(tryCreateSequence(['a', 'b'], { maxItems: 1 }).error.class, 'resource-rejection');
  const sequence = createSequence(['a', 'b', 'c']);
  const result = sequence.move('a', 1, 'stop', { eligible: () => false, maxScan: 1 });
  assert.equal(result.kind, 'resource-rejected');
  assert.equal(result.error.class, 'resource-rejection');
  const invalidScan = sequence.move('a', 1, 'stop', { maxScan: -1 });
  assert.equal(invalidScan.kind, 'resource-rejected');
  assert.equal(invalidScan.error.code, 'invalid-scan-ceiling');
});

test('sequence projections and patches preserve their resource contract', () => {
  const sequence = createSequence(['alpha', 'beta'], {
    maxItems: 4,
    maxIDCodeUnits: 12,
  });
  const projected = sequence.project((id) => id === 'alpha');
  const patched = applySequencePatch(sequence, {
    type: 'splice',
    index: 2,
    deleteCount: 0,
    inserted: ['gamma'],
  });

  assert.deepEqual(
    [sequence.maxItems, sequence.maxIDCodeUnits],
    [4, 12],
  );
  assert.deepEqual(
    [projected.maxItems, projected.maxIDCodeUnits],
    [4, 12],
  );
  assert.deepEqual(
    [patched.maxItems, patched.maxIDCodeUnits],
    [4, 12],
  );
  assert.equal(tryApplySequencePatch(patched, {
    type: 'splice',
    index: 3,
    deleteCount: 0,
    inserted: ['delta', 'epsilon'],
  }).error.code, 'item-ceiling-exceeded');
});

test('patch overlays compact before lookup depth can exceed 32', () => {
  let sequence = createSequence(['base'], { maxItems: 128 });
  for (let index = 0; index < 65; index += 1) {
    sequence = applySequencePatch(sequence, {
      type: 'splice',
      index: sequence.size,
      deleteCount: 0,
      inserted: [`overlay-${index}`],
    });
    assert.ok(sequence.depth === undefined || sequence.depth <= 32);
  }
  assert.equal(sequence.size, 66);
  assert.equal(sequence.indexOf('base'), 0);
  assert.equal(sequence.at(65), 'overlay-64');
  assert.equal(sequence.move('base', 1).id, 'overlay-0');
  assert.equal(sequence.ids.length, 66);
});

test('patch overlays compact when cumulative changed cardinality exceeds one eighth', () => {
  let sequence = createSequence(Array.from({ length: 128 }, (_, index) => `base-${index}`), {
    maxItems: 256,
  });
  for (let index = 0; index < 18; index += 1) {
    sequence = applySequencePatch(sequence, {
      type: 'splice',
      index: sequence.size,
      deleteCount: 0,
      inserted: [`added-${index}`],
    });
  }
  assert.equal(sequence.depth, 18);
  sequence = applySequencePatch(sequence, {
    type: 'splice',
    index: sequence.size,
    deleteCount: 0,
    inserted: ['compacting-change'],
  });
  assert.equal(sequence.depth, undefined);
  assert.equal(sequence.size, 147);
  assert.equal(sequence.at(146), 'compacting-change');
  assert.equal(sequence.indexOf('base-127'), 127);
});
