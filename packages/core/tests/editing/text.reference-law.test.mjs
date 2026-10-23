/* Law evidence: TXT-01..12 carrier, offsets, replace, selection, normalization, composition */
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  applyTextEvent,
  cancelTextComposition,
  commitTextComposition,
  createTextEditingState,
  createTextSnapshot,
  findTextQuery,
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
  referenceFindTextQuery,
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

test('text queries project bounded trigger ranges against an independent complete-prefix grammar', () => {
  for (const text of ['', '@', '@Ada', 'Hi @Ada!', 'x@Ada', '@a@b', '##한글', 'a\u00a0🌟😀x', '@abcdef', '🌟😀', 'x\n@a', '@a suffix']) {
    for (const caret of referenceTextCodeUnitBoundaries(text)) for (const trigger of ['@', '##', '🌟']) {
      const state = createTextEditingState(text, { anchorCodeUnitOffset: caret, focusCodeUnitOffset: caret });
      for (const maxQueryCodeUnits of [0, 1, 2, 4, 8]) for (const allowInline of [false, true]) {
        const options = { trigger, maxQueryCodeUnits, allowInline };
        assert.deepEqual(unwrap(findTextQuery(state, options)), referenceFindTextQuery(state, options), JSON.stringify({ text, caret, options }));
      }
    }
  }
  const selected = createTextEditingState('@Ada', { anchorCodeUnitOffset: 0, focusCodeUnitOffset: 4 });
  const options = { trigger: '@', maxQueryCodeUnits: 16 };
  assert.equal(unwrap(findTextQuery(selected, options)), null);
  const active = unwrap(startTextComposition(createTextEditingState('@'), 1, 1, '한', { anchorCodeUnitOffset: 2, focusCodeUnitOffset: 2 }));
  assert.equal(unwrap(findTextQuery(active, options)), null);
  for (const invalid of [null, {}, { trigger: '', maxQueryCodeUnits: 2 }, { trigger: '\ud800', maxQueryCodeUnits: 2 },
    { trigger: '@ ', maxQueryCodeUnits: 2 }, { trigger: '@', maxQueryCodeUnits: -1 }, { trigger: '@', maxQueryCodeUnits: 1.5 }, { trigger: '@', maxQueryCodeUnits: 2, allowInline: 1 }]) {
    const result = findTextQuery(selected, invalid); assert.equal(result.ok, false); assert.equal(result.error.code, 'invalid-text-query-options');
  }
  const forged = { snapshot: { text: '\ud800 @a', selection: { anchorCodeUnitOffset: 4, focusCodeUnitOffset: 4 } }, composition: null };
  const invalid = findTextQuery(forged, options); assert.equal(invalid.ok, false); assert.equal(invalid.error.code, 'ill-formed-text');
});

test('canonical text query work is bounded by trigger and query ceilings, not source length', t => {
  const options = { trigger: '@', maxQueryCodeUnits: 16, allowInline: true };
  for (const size of [32, 100_000]) {
    const text = 'x'.repeat(size) + '@Ada', state = createTextEditingState(text, endSelection(text));
    let read = 0, boundaries = 0;
    const charAt = String.prototype.charAt, charCodeAt = String.prototype.charCodeAt;
    const characters = t.mock.method(String.prototype, 'charAt', function (index) { if (this.valueOf() === text) read++; return Reflect.apply(charAt, this, [index]); });
    const codes = t.mock.method(String.prototype, 'charCodeAt', function (index) { if (this.valueOf() === text) boundaries++; return Reflect.apply(charCodeAt, this, [index]); });
    let query;
    try { query = unwrap(findTextQuery(state, options)); } finally { characters.mock.restore(); codes.mock.restore(); }
    assert.equal(query.query, 'Ada'); assert.equal(query.startCodeUnitOffset, size);
    assert.ok(read <= options.maxQueryCodeUnits + options.trigger.length + 1); assert.ok(boundaries <= 2);
  }
});

test('selection-only events preserve text, direction, no-op identity and active composition ownership', () => {
  const initial = createTextEditingState('a😀b', endSelection('a😀b'));
  const event = { type: 'select', selection: { anchorCodeUnitOffset: 3, focusCodeUnitOffset: 1 } };
  const selected = unwrap(applyTextEvent(initial, event));
  assert.equal(selected.state.snapshot.text, initial.snapshot.text);
  assert.deepEqual(selected.state.snapshot.selection, {
    anchorCodeUnitOffset: 3, focusCodeUnitOffset: 1, startCodeUnitOffset: 1, endCodeUnitOffset: 3, direction: 'backward',
  });
  assert.deepEqual(selected.commands, []);
  assert.equal(unwrap(applyTextEvent(selected.state, event)).state, selected.state);
  const active = unwrap(startTextComposition(selected.state, 1, 3, '한', endSelection('a한b')));
  const moved = unwrap(applyTextEvent(active, { type: 'select', selection: { anchorCodeUnitOffset: 2, focusCodeUnitOffset: 1 } })).state;
  assert.equal(moved.snapshot.text, active.snapshot.text);
  assert.equal(moved.composition, active.composition);
  assert.equal(unwrap(cancelTextComposition(moved)).snapshot, selected.state.snapshot);
  assert.equal(unwrap(commitTextComposition(moved)).snapshot, moved.snapshot);
  for (const selection of [null, { anchorCodeUnitOffset: 2, focusCodeUnitOffset: 3 },
    { anchorCodeUnitOffset: -1, focusCodeUnitOffset: 0 }, { anchorCodeUnitOffset: 0, focusCodeUnitOffset: 5 },
    { anchorCodeUnitOffset: 1.5, focusCodeUnitOffset: 0 }]) {
    const rejected = applyTextEvent(initial, { type: 'select', selection });
    assert.equal(rejected.ok, false); assert.equal(rejected.error.class, 'transition-rejection');
    assert.equal(initial.snapshot.text, 'a😀b'); assert.deepEqual(initial.snapshot.selection, createTextSnapshot('a😀b', endSelection('a😀b')).selection);
  }
  const forged = { snapshot: { text: '\ud800', selection: { anchorCodeUnitOffset: 0, focusCodeUnitOffset: 0 } }, composition: null };
  const rejected = applyTextEvent(forged, { type: 'select', selection: { anchorCodeUnitOffset: 0, focusCodeUnitOffset: 0 } });
  assert.equal(rejected.ok, false); assert.equal(rejected.error.code, 'ill-formed-text');
});

test('VAL-019: canonical selection checks only two local UTF-16 boundaries regardless of text size', t => {
  for (const size of [32, 100_000]) {
    const text = 'a'.repeat(size), state = createTextEditingState(text, endSelection(text));
    let inspected = 0;
    const charCodeAt = String.prototype.charCodeAt;
    const counter = t.mock.method(String.prototype, 'charCodeAt', function (offset) {
      if (this.valueOf() === text) inspected++;
      return Reflect.apply(charCodeAt, this, [offset]);
    });
    let selected;
    try { selected = unwrap(applyTextEvent(state, { type: 'select', selection: { anchorCodeUnitOffset: size - 1, focusCodeUnitOffset: size - 2 } })); }
    finally { counter.mock.restore(); }
    assert.ok(inspected <= 4, `Selection inspected ${inspected} code units in ${size} retained code units`);
    assert.equal(selected.state.snapshot.text, text); assert.equal(selected.state.snapshot.selection.anchorCodeUnitOffset, size - 1);
    assert.equal(selected.state.snapshot.selection.focusCodeUnitOffset, size - 2);
  }
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

test('ISSUE-140: text canonicalization captures external selection and composition fields once', () => {
  let anchorReads = 0;
  let focusReads = 0;
  const selectionResult = tryCreateTextEditingState('😀', {
    get anchorCodeUnitOffset() {
      anchorReads += 1;
      return anchorReads === 1 ? 0 : 1;
    },
    get focusCodeUnitOffset() {
      focusReads += 1;
      return 2;
    },
  });
  assert.equal(selectionResult.ok, true);
  assert.deepEqual([anchorReads, focusReads], [1, 1]);
  assert.deepEqual(
    observe(selectionResult.value).selection,
    {
      anchorCodeUnitOffset: 0,
      focusCodeUnitOffset: 2,
      startCodeUnitOffset: 0,
      endCodeUnitOffset: 2,
      direction: 'forward',
    },
  );
  const selectionRevalidated = normalizeTextEditingState(structuralTextState(selectionResult.value));
  assert.equal(selectionRevalidated.ok, true);
  assert.deepEqual(observe(selectionRevalidated.value), observe(selectionResult.value));

  let compositionReads = 0;
  let baselineReads = 0;
  let startReads = 0;
  let endReads = 0;
  let composingTextReads = 0;
  const composition = {
    get baseline() {
      baselineReads += 1;
      return { text: 'ab', selection: endSelection('ab') };
    },
    get startCodeUnitOffset() {
      startReads += 1;
      return startReads === 1 ? 0 : 1;
    },
    get endCodeUnitOffset() {
      endReads += 1;
      return 1;
    },
    get composingText() {
      composingTextReads += 1;
      return 'x';
    },
  };
  const compositionResult = normalizeTextEditingState({
    snapshot: { text: 'xb', selection: endSelection('xb') },
    get composition() {
      compositionReads += 1;
      return composition;
    },
  });
  assert.equal(compositionResult.ok, true);
  assert.deepEqual(
    [compositionReads, baselineReads, startReads, endReads, composingTextReads],
    [1, 1, 1, 1, 1],
  );
  assert.equal(compositionResult.value.composition.startCodeUnitOffset, 0);
  const compositionRevalidated = normalizeTextEditingState(structuralTextState(compositionResult.value));
  assert.equal(compositionRevalidated.ok, true);
  assert.deepEqual(observe(compositionRevalidated.value), observe(compositionResult.value));
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

function structuralTextState(state) {
  const snapshot = (value) => ({
    text: value.text,
    selection: {
      anchorCodeUnitOffset: value.selection.anchorCodeUnitOffset,
      focusCodeUnitOffset: value.selection.focusCodeUnitOffset,
    },
  });
  return {
    snapshot: snapshot(state.snapshot),
    composition: state.composition === null
      ? null
      : {
          baseline: snapshot(state.composition.baseline),
          startCodeUnitOffset: state.composition.startCodeUnitOffset,
          endCodeUnitOffset: state.composition.endCodeUnitOffset,
          composingText: state.composition.composingText,
        },
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
