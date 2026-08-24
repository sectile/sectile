/* Law evidence: SEL-01 SEL-02 SEL-03 SEL-04 SEL-05 SEL-06 SEL-07 SEL-08 SEL-09 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { createCursorState } from '../../.verification-dist/internal/state/cursor.js';
import {
  clearSelection,
  createSelectionState,
  reconcileSelection,
  selectInterval,
  selectOne,
  toggleMultipleSelection,
} from '../../.verification-dist/internal/state/selection.js';
import {
  ReferenceSelectionState,
  reconcileReferenceSelection,
  referenceClearSelection,
  referenceSelectInterval,
  referenceSelectOne,
  referenceToggleMultipleSelection,
} from '../../.verification-dist/internal/reference/state/selection.js';
import { createSequence } from '../../.verification-dist/structures/sequence.js';
import { canonicalIDs, permutations, powerset, unwrap } from '../support.mjs';

test('SEL-01..07: selection operations preserve domain, cardinality, and algebraic laws', () => {
  let selectionCases = 0;
  let invalidSnapshotCases = 0;
  let intervalCases = 0;

  for (let size = 0; size <= 8; size += 1) {
    const ids = canonicalIDs(size);
    const outside = `outside-${size}`;
    const domain = createSequence(ids);
    const previousDomain = createSequence([...ids, outside]);
    const anchors = [null, ...ids, outside];
    const subsets = [...powerset(ids)];
    const multipleInputs = [
      ...subsets,
      ...subsets.map((selected) => [...selected, outside]),
    ];

    for (const selected of multipleInputs) {
      for (const anchor of anchors) {
        const state = unwrap(
          createSelectionState(previousDomain, 'multiple', { selected, anchor }),
        );
        const result = unwrap(reconcileSelection(state, domain, 'multiple'));
        const reference = reconcileReferenceSelection(
          new ReferenceSelectionState(selected, anchor),
          domain,
          'multiple',
        );

        assert.deepEqual(observe(result), observe(reference));
        assert.equal(result.selected.every((id) => domain.contains(id)), true);
        assert.deepEqual(
          observe(unwrap(reconcileSelection(result, domain, 'multiple'))),
          observe(result),
        );
        assert.equal(Object.isFrozen(result), true);
        assert.equal(Object.isFrozen(result.selected), true);

        for (const id of ids) {
          const toggled = toggleMultipleSelection(result, id, domain);
          const referenceToggled = referenceToggleMultipleSelection(reference, id, domain);
          assert.deepEqual(observe(toggled), observe(referenceToggled));
          assert.deepEqual(
            toggleMultipleSelection(toggled, id, domain).selected,
            result.selected,
          );
        }

        const cleared = clearSelection(result);
        assert.deepEqual(observe(cleared), observe(referenceClearSelection(reference)));
        assert.equal(clearSelection(cleared), cleared);
        selectionCases += 1;
      }
    }

    const singleInputs = [[], ...ids.map((id) => [id])];
    for (const selected of singleInputs) {
      for (const anchor of anchors) {
        const state = unwrap(
          createSelectionState(previousDomain, 'single', { selected, anchor }),
        );
        const result = unwrap(reconcileSelection(state, domain, 'single'));
        const reference = reconcileReferenceSelection(
          new ReferenceSelectionState(selected, anchor),
          domain,
          'single',
        );

        assert.deepEqual(observe(result), observe(reference));
        assert.ok(result.size <= 1);
        for (const id of ids) {
          const selectedOne = selectOne(result, id, domain);
          const referenceOne = referenceSelectOne(reference, id, domain);
          assert.deepEqual(observe(selectedOne), observe(referenceOne));
          assert.equal(selectOne(selectedOne, id, domain), selectedOne);
        }
        selectionCases += 1;
      }
    }

    for (const selected of subsets) {
      if (selected.length <= 1) continue;
      const invalid = createSelectionState(domain, 'single', { selected });
      assert.equal(invalid.ok, false);
      assert.equal(invalid.error.class, 'construction');
      assert.equal(invalid.error.code, 'invalid-selection-cardinality');
      invalidSnapshotCases += 1;
    }

    for (const anchor of ids) {
      for (const extent of ids) {
        const empty = unwrap(createSelectionState(domain, 'multiple'));
        const result = selectInterval(empty, anchor, extent, domain, false);
        const reference = referenceSelectInterval(empty, anchor, extent, domain, false);
        const anchorIndex = domain.indexOf(anchor);
        const extentIndex = domain.indexOf(extent);
        const start = Math.min(anchorIndex, extentIndex);
        const end = Math.max(anchorIndex, extentIndex);
        assert.deepEqual(result.selected, domain.ids.slice(start, end + 1));
        assert.deepEqual(observe(result), observe(reference));
        assert.equal(result.anchor, anchor);
        intervalCases += 1;
      }
    }
  }

  assert.equal(selectionCases, 9_546);
  assert.equal(invalidSnapshotCases, 466);
  assert.equal(intervalCases, 204);
});

test('SEL-08: identity renaming commutes with every selection operation', () => {
  let cases = 0;
  for (let size = 0; size <= 6; size += 1) {
    const ids = canonicalIDs(size);
    const sourceDomain = createSequence(ids);
    for (const renamedIDs of permutations(ids)) {
      const targetDomain = createSequence(renamedIDs);
      const rename = new Map(ids.map((id, index) => [id, renamedIDs[index]]));
      for (const selected of powerset(ids)) {
        const sourceAnchor = ids[0] ?? null;
        const targetAnchor = sourceAnchor === null ? null : rename.get(sourceAnchor);
        const source = unwrap(
          createSelectionState(sourceDomain, 'multiple', { selected, anchor: sourceAnchor }),
        );
        const target = unwrap(
          createSelectionState(targetDomain, 'multiple', {
            selected: selected.map((id) => rename.get(id)),
            anchor: targetAnchor,
          }),
        );
        const sourceResult = unwrap(reconcileSelection(source, sourceDomain, 'multiple'));
        const targetResult = unwrap(reconcileSelection(target, targetDomain, 'multiple'));
        assertRenamed(sourceResult, targetResult, rename);
        assertRenamed(
          clearSelection(sourceResult),
          clearSelection(targetResult),
          rename,
        );
        if (ids.length > 0) {
          const probe = ids[selected.length % ids.length];
          const extent = ids[(selected.length + 1) % ids.length];
          const renamedProbe = rename.get(probe);
          const renamedExtent = rename.get(extent);
          assertRenamed(
            selectOne(sourceResult, probe, sourceDomain),
            selectOne(targetResult, renamedProbe, targetDomain),
            rename,
          );
          assertRenamed(
            toggleMultipleSelection(sourceResult, probe, sourceDomain),
            toggleMultipleSelection(targetResult, renamedProbe, targetDomain),
            rename,
          );
          assertRenamed(
            selectInterval(sourceResult, probe, extent, sourceDomain, selected.length % 2 === 0),
            selectInterval(
              targetResult,
              renamedProbe,
              renamedExtent,
              targetDomain,
              selected.length % 2 === 0,
            ),
            rename,
          );
        }
        cases += 1;
      }
    }
  }
  assert.equal(cases, 50_363);
});

test('controlled snapshots reject invalid state and selection never owns cursor authority', () => {
  const domain = createSequence(['a', 'b', 'c']);
  for (const invalid of [
    createSelectionState(domain, 'single', { selected: ['a', 'b'] }),
    createSelectionState(domain, 'multiple', { selected: ['missing'] }),
    createSelectionState(domain, 'multiple', { anchor: 'missing' }),
    createSelectionState(domain, 'invalid'),
  ]) {
    assert.equal(invalid.ok, false);
    assert.equal(invalid.error.class, 'construction');
  }

  const forged = Object.freeze({
    selected: Object.freeze(['a', 'b']),
    anchor: null,
    size: 2,
    has: (id) => id === 'a' || id === 'b',
  });
  const rejected = reconcileSelection(forged, domain, 'single');
  assert.equal(rejected.ok, false);
  assert.equal(rejected.error.class, 'transition-rejection');
  assert.equal(rejected.error.code, 'invalid-selection-cardinality');
  const invalidMode = reconcileSelection(forged, domain, 'invalid');
  assert.equal(invalidMode.ok, false);
  assert.equal(invalidMode.error.code, 'invalid-selection-mode');

  const state = unwrap(createSelectionState(domain, 'multiple', { selected: ['a'] }));
  assert.equal(selectOne(state, 'missing', domain), state);
  assert.equal(toggleMultipleSelection(state, 'missing', domain), state);
  assert.equal(selectInterval(state, 'a', 'missing', domain, false), state);
  assert.deepEqual(
    selectInterval(state, 'b', 'c', domain, true).selected,
    ['a', 'b', 'c'],
  );

  const cursor = createCursorState('b');
  void toggleMultipleSelection(state, 'b', domain);
  assert.equal(cursor.current, 'b');
  assert.equal('current' in state, false);
});

function observe(state) {
  return { selected: state.selected, anchor: state.anchor };
}

function assertRenamed(source, target, rename) {
  assert.deepEqual(
    new Set(target.selected),
    new Set(source.selected.map((id) => rename.get(id))),
  );
  assert.equal(target.anchor, source.anchor === null ? null : rename.get(source.anchor));
}
