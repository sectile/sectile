/* Law evidence: TXT-01..12 carrier, offsets, replace, selection, normalization, composition */
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  applyTextEvent,
  cancelTextComposition,
  commitTextComposition,
  createTextEditingState,
  createTextSnapshot,
  isTextCodeUnitBoundary,
  isWellFormedPlainText,
  normalizeTextEditingState,
  replacePlainText,
  replaceTextState,
  slicePlainText,
  startTextComposition,
  tryCreateTextEditingState,
  updateTextComposition,
} from '../../.verification-dist/internal/editing/text.js';
import {
  createReferenceTextEditingState,
  referenceCancelTextComposition,
  referenceCommitTextComposition,
  referenceReplacePlainText,
  referenceStartTextComposition,
  referenceTextCodeUnitBoundaries,
  referenceUpdateTextComposition,
} from '../../.verification-dist/internal/reference/editing/text.js';
import { unwrap } from '../support.mjs';

test('TXT-01..07: plain text preserves UTF-16 boundaries, replace algebra, direction, and normalization', () => {
  let replaceCases = 0;
  let selectionCases = 0;
  let normalizationCases = 0;
  const strings = representativeStrings();
  const replacements = strings.filter((text) => text.length <= 2);
  assert.equal(strings.length, 24);

  assert.equal(isWellFormedPlainText('\ud800'), false);
  assert.equal(isWellFormedPlainText('\udc00'), false);

  for (const text of strings) {
    const boundaries = referenceTextCodeUnitBoundaries(text);
    assert.equal(boundaries[0], 0);
    assert.equal(boundaries.at(-1), text.length);
    for (let offset = 0; offset <= text.length; offset += 1) {
      assert.equal(isTextCodeUnitBoundary(text, offset), boundaries.includes(offset));
    }

    for (const anchorCodeUnitOffset of boundaries) {
      for (const focusCodeUnitOffset of boundaries) {
        const snapshot = createTextSnapshot(text, { anchorCodeUnitOffset, focusCodeUnitOffset });
        assert.equal(snapshot.selection.anchorCodeUnitOffset, anchorCodeUnitOffset);
        assert.equal(snapshot.selection.focusCodeUnitOffset, focusCodeUnitOffset);
        assert.equal(
          snapshot.selection.direction,
          anchorCodeUnitOffset === focusCodeUnitOffset
            ? 'none'
            : anchorCodeUnitOffset < focusCodeUnitOffset
              ? 'forward'
              : 'backward',
        );
        assert.equal(Object.isFrozen(snapshot), true);
        assert.equal(Object.isFrozen(snapshot.selection), true);
        selectionCases += 1;
      }
    }

    for (const startCodeUnitOffset of boundaries) {
      for (const endCodeUnitOffset of boundaries) {
        if (startCodeUnitOffset > endCodeUnitOffset) continue;
        const removed = unwrap(slicePlainText(text, startCodeUnitOffset, endCodeUnitOffset));
        for (const replacement of replacements) {
          const result = unwrap(
            replacePlainText(text, startCodeUnitOffset, endCodeUnitOffset, replacement),
          );
          const reference = referenceReplacePlainText(
            text,
            startCodeUnitOffset,
            endCodeUnitOffset,
            replacement,
          );
          assert.equal(result, reference);
          assert.equal(
            result.length,
            text.length - (endCodeUnitOffset - startCodeUnitOffset) + replacement.length,
          );
          assert.equal(
            unwrap(
              replacePlainText(
                result,
                startCodeUnitOffset,
                startCodeUnitOffset + replacement.length,
                removed,
              ),
            ),
            text,
          );
          if (replacement === removed) assert.equal(result, text);
          replaceCases += 1;
        }
      }
    }
  }

  for (const [left, right] of [['가', '가'], ['á', 'a\u0301']]) {
    assert.notEqual(left, right);
    assert.equal(left.normalize('NFC'), right.normalize('NFC'));
    assert.equal(createTextEditingState(left).snapshot.text, left);
    assert.equal(createTextEditingState(right).snapshot.text, right);
    normalizationCases += 1;
  }

  assert.equal(replaceCases, 2_355);
  assert.equal(selectionCases, 243);
  assert.equal(normalizationCases, 2);
});

test('TXT-08..11: composition keeps its baseline, replaces the active passage, commits, and cancels', () => {
  let compositionCases = 0;
  const strings = representativeStrings();
  const replacements = strings.filter((text) => text.length <= 2);

  for (const text of strings) {
    const boundaries = referenceTextCodeUnitBoundaries(text);
    for (const anchorCodeUnitOffset of boundaries) {
      for (const focusCodeUnitOffset of boundaries) {
        const baseline = createTextEditingState(text, { anchorCodeUnitOffset, focusCodeUnitOffset });
        const referenceBaseline = createReferenceTextEditingState(text, {
          anchorCodeUnitOffset,
          focusCodeUnitOffset,
        });
        const startCodeUnitOffset = Math.min(anchorCodeUnitOffset, focusCodeUnitOffset);
        const endCodeUnitOffset = Math.max(anchorCodeUnitOffset, focusCodeUnitOffset);

        for (const composingText of replacements) {
          const projected = referenceReplacePlainText(
            text,
            startCodeUnitOffset,
            endCodeUnitOffset,
            composingText,
          );
          const selection = endSelection(projected);
          const started = unwrap(
            startTextComposition(
              baseline,
              startCodeUnitOffset,
              endCodeUnitOffset,
              composingText,
              selection,
            ),
          );
          const referenceStarted = referenceStartTextComposition(
            referenceBaseline,
            startCodeUnitOffset,
            endCodeUnitOffset,
            composingText,
            selection,
          );
          assert.deepEqual(observe(started), observe(referenceStarted));
          assert.equal(started.composition.baseline, baseline.snapshot);
          assert.deepEqual(observe(unwrap(cancelTextComposition(started))), observe(baseline));
          assert.deepEqual(
            observe(unwrap(commitTextComposition(started))),
            observe(referenceCommitTextComposition(referenceStarted)),
          );

          for (const second of replacements) {
            const projectedSecond = referenceReplacePlainText(
              text,
              startCodeUnitOffset,
              endCodeUnitOffset,
              second,
            );
            const secondSelection = endSelection(projectedSecond);
            const updated = unwrap(updateTextComposition(started, second, secondSelection));
            const referenceUpdated = referenceUpdateTextComposition(
              referenceStarted,
              second,
              secondSelection,
            );
            assert.deepEqual(observe(updated), observe(referenceUpdated));
            assert.equal(updated.snapshot.text, projectedSecond);
            assert.equal(updated.composition.baseline, baseline.snapshot);
            assert.deepEqual(
              observe(unwrap(cancelTextComposition(updated))),
              observe(referenceCancelTextComposition(referenceUpdated)),
            );
            assert.equal(unwrap(commitTextComposition(updated)).snapshot.text, projectedSecond);
            compositionCases += 1;
          }
        }
      }
    }
  }

  assert.equal(compositionCases, 54_675);
});

test('TXT-12: malformed snapshots, surrogate splits, and invalid composition phases reject atomically', () => {
  const baseline = createTextEditingState('a😀b', {
    anchorCodeUnitOffset: 1,
    focusCodeUnitOffset: 3,
  });
  for (const invalid of [
    tryCreateTextEditingState('\ud800'),
    tryCreateTextEditingState('😀', { anchorCodeUnitOffset: 1, focusCodeUnitOffset: 2 }),
    replacePlainText('abc', 2, 1, ''),
    replacePlainText('😀', 1, 2, ''),
    replacePlainText('abc', 0, 1, '\udc00'),
  ]) {
    assert.equal(invalid.ok, false);
    assert.equal(invalid.error.class, 'construction');
  }

  for (const invalid of [
    updateTextComposition(baseline, 'x', endSelection('x')),
    commitTextComposition(baseline),
    cancelTextComposition(baseline),
  ]) {
    assert.equal(invalid.ok, false);
    assert.equal(invalid.error.class, 'transition-rejection');
    assert.equal(invalid.error.code, 'composition-inactive');
  }

  const active = unwrap(startTextComposition(baseline, 1, 3, '가', endSelection('a가b')));
  const rejectedStart = startTextComposition(active, 0, 1, 'x', endSelection('x가b'));
  const rejectedReplace = replaceTextState(active, 0, 1, 'x', endSelection('x가b'));
  assert.equal(rejectedStart.ok, false);
  assert.equal(rejectedStart.error.code, 'composition-active');
  assert.equal(rejectedReplace.ok, false);
  assert.equal(rejectedReplace.error.code, 'composition-active');
  assert.equal(active.snapshot.text, 'a가b');

  const unchanged = unwrap(replaceTextState(baseline, 1, 3, '😀', baseline.snapshot.selection));
  assert.equal(unchanged, baseline);
});

test('public text events reduce replacement and composition as one atomic state transition', () => {
  const baseline = createTextEditingState('ab', endSelection('ab'));
  const replaced = unwrap(applyTextEvent(baseline, {
    type: 'replace',
    startCodeUnitOffset: 1,
    endCodeUnitOffset: 2,
    text: '😀',
    selection: endSelection('a😀'),
  }));
  assert.equal(replaced.state.snapshot.text, 'a😀');
  assert.deepEqual(replaced.commands, []);

  const started = unwrap(applyTextEvent(replaced.state, {
    type: 'composition-start',
    startCodeUnitOffset: 1,
    endCodeUnitOffset: 3,
    text: 'ㅎ',
    selection: endSelection('aㅎ'),
  }));
  const updated = unwrap(applyTextEvent(started.state, {
    type: 'composition-update',
    text: '한',
    selection: endSelection('a한'),
  }));
  const committed = unwrap(applyTextEvent(updated.state, { type: 'composition-commit' }));
  assert.equal(committed.state.snapshot.text, 'a한');
  assert.equal(committed.state.composition, null);

  const cancelled = unwrap(applyTextEvent(started.state, { type: 'composition-cancel' }));
  assert.deepEqual(cancelled.state, replaced.state);
});

test('public text normalization rejects malformed external state without throwing', () => {
  for (const invalid of [
    normalizeTextEditingState({ snapshot: null, composition: null }),
    normalizeTextEditingState({
      snapshot: { text: 'projected', selection: endSelection('projected') },
      composition: {
        baseline: { text: 'base', selection: endSelection('base') },
        startCodeUnitOffset: 0,
        endCodeUnitOffset: 4,
        composingText: 'different',
      },
    }),
    applyTextEvent(null, { type: 'composition-commit' }),
    applyTextEvent(createTextEditingState(), { type: 'unknown' }),
  ]) {
    assert.equal(invalid.ok, false);
  }
});

function representativeStrings() {
  const atoms = ['a', '가', '😀', '\u0301'];
  const result = new Set(['']);
  for (const left of atoms) result.add(left);
  for (const left of atoms) {
    for (const right of atoms) result.add(left + right);
  }
  for (const text of ['가', 'a\u0301', '🇰🇷', '👨\u200d👩\u200d👧\u200d👦']) result.add(text);
  return [...result].sort((left, right) => left.length - right.length || left.localeCompare(right));
}

function endSelection(text) {
  return {
    anchorCodeUnitOffset: text.length,
    focusCodeUnitOffset: text.length,
  };
}

function observe(state) {
  return {
    text: state.snapshot.text,
    selection: {
      anchorCodeUnitOffset: state.snapshot.selection.anchorCodeUnitOffset,
      focusCodeUnitOffset: state.snapshot.selection.focusCodeUnitOffset,
      startCodeUnitOffset: state.snapshot.selection.startCodeUnitOffset,
      endCodeUnitOffset: state.snapshot.selection.endCodeUnitOffset,
      direction: state.snapshot.selection.direction,
    },
    composition: state.composition === null
      ? null
      : {
          baselineText: state.composition.baseline.text,
          baselineSelection: state.composition.baseline.selection,
          startCodeUnitOffset: state.composition.startCodeUnitOffset,
          endCodeUnitOffset: state.composition.endCodeUnitOffset,
          composingText: state.composition.composingText,
        },
  };
}
