import assert from 'node:assert/strict';
import test from 'node:test';
import {
  MAX_ANCHORED_LAYOUT_CANDIDATES,
  solveAnchoredLayout,
  trySolveAnchoredLayout,
} from '../../.verification-dist/structures/anchored-layout.js';

test('side, align, offset, padding, flip, shift, size, arrow, and hidden outcomes are explicit', () => {
  const base = {
    reference: { x: 100, y: 100, width: 40, height: 40 },
    floating: { width: 80, height: 50 },
    boundary: { x: 0, y: 0, width: 300, height: 300 },
  };
  assert.deepEqual(solveAnchoredLayout({ ...base, side: 'bottom', align: 'center', offset: 4, flip: false }).rect, {
    x: 80, y: 144, width: 80, height: 50,
  });
  const flipped = solveAnchoredLayout({ ...base, reference: { ...base.reference, y: 250 }, side: 'bottom', offset: 5 });
  assert.equal(flipped.side, 'top');
  assert.equal(flipped.rect.y, 195);
  assert.equal(flipped.candidateCount, MAX_ANCHORED_LAYOUT_CANDIDATES);
  const shifted = solveAnchoredLayout({ ...base, reference: { x: 0, y: 100, width: 10, height: 10 }, padding: 10, flip: false });
  assert.equal(shifted.rect.x, 10);
  assert.deepEqual(shifted.availableSize, { width: 280, height: 180 });
  const arrow = solveAnchoredLayout({ ...base, side: 'bottom', arrow: { width: 10, height: 6 }, arrowPadding: 4 });
  assert.deepEqual(arrow.arrow, { x: 35, y: -3, centerOffset: 0 });
  assert.equal(solveAnchoredLayout({ ...base, reference: { x: 400, y: 400, width: 10, height: 10 } }).referenceHidden, true);
});

test('solver agrees with an independent scalar candidate reference', () => {
  const sides = ['top', 'right', 'bottom', 'left'];
  const aligns = ['start', 'center', 'end'];
  for (let fixture = 0; fixture < 128; fixture += 1) {
    const input = {
      reference: { x: (fixture * 37) % 240 - 30, y: (fixture * 53) % 190 - 20, width: 10 + fixture % 41, height: 8 + fixture % 29 },
      floating: { width: 12 + fixture % 83, height: 10 + fixture % 57 },
      boundary: { x: -10, y: -5, width: 220, height: 170 },
      side: sides[fixture % sides.length],
      align: aligns[fixture % aligns.length],
      offset: fixture % 7,
      padding: { top: 3, right: 5, bottom: 7, left: 11 },
      flip: fixture % 5 !== 0,
      shift: fixture % 7 !== 0,
    };
    const actual = solveAnchoredLayout(input);
    const expected = solveReference(input);
    assert.deepEqual({ rect: actual.rect, side: actual.side, candidateCount: actual.candidateCount }, expected);
    assert.ok(actual.candidateCount <= MAX_ANCHORED_LAYOUT_CANDIDATES);
  }
});

test('invalid solver boundaries reject without partial output', () => {
  const base = { reference: { x: 0, y: 0, width: 1, height: 1 }, floating: { width: 1, height: 1 }, boundary: { x: 0, y: 0, width: 10, height: 10 } };
  assert.equal(trySolveAnchoredLayout({ ...base, offset: Number.NaN }).error.code, 'invalid-boundary');
  assert.equal(trySolveAnchoredLayout({ ...base, floating: { width: -1, height: 1 } }).error.code, 'invalid-boundary');
  assert.equal(trySolveAnchoredLayout({ ...base, padding: -1 }).error.code, 'invalid-boundary');
  assert.equal(trySolveAnchoredLayout({ ...base, arrowPadding: -1 }).error.code, 'invalid-boundary');
});

function solveReference(input) {
  const sides = ['top', 'right', 'bottom', 'left'];
  const preferred = sides.indexOf(input.side);
  const candidates = input.flip === false
    ? [input.side]
    : [input.side, sides[(preferred + 2) % 4], sides[(preferred + 1) % 4], sides[(preferred + 3) % 4]];
  const padding = input.padding;
  const inner = {
    x: input.boundary.x + padding.left,
    y: input.boundary.y + padding.top,
    width: input.boundary.width - padding.left - padding.right,
    height: input.boundary.height - padding.top - padding.bottom,
  };
  let best = null;
  for (const side of candidates) {
    const rect = place(input.reference, input.floating, side, input.align, input.offset);
    const overflow = Math.max(0, inner.x - rect.x) + Math.max(0, inner.y - rect.y)
      + Math.max(0, rect.x + rect.width - inner.x - inner.width)
      + Math.max(0, rect.y + rect.height - inner.y - inner.height);
    if (best === null || overflow < best.overflow) best = { side, rect, overflow };
  }
  if (input.shift !== false) {
    best.rect.x = clamp(best.rect.x, inner.x, inner.x + inner.width - best.rect.width);
    best.rect.y = clamp(best.rect.y, inner.y, inner.y + inner.height - best.rect.height);
  }
  delete best.overflow;
  return { rect: best.rect, side: best.side, candidateCount: candidates.length };
}

function place(reference, floating, side, align, offset) {
  const x = align === 'start' ? reference.x : align === 'end' ? reference.x + reference.width - floating.width : reference.x + (reference.width - floating.width) / 2;
  const y = align === 'start' ? reference.y : align === 'end' ? reference.y + reference.height - floating.height : reference.y + (reference.height - floating.height) / 2;
  if (side === 'top') return { x, y: reference.y - floating.height - offset, ...floating };
  if (side === 'bottom') return { x, y: reference.y + reference.height + offset, ...floating };
  if (side === 'left') return { x: reference.x - floating.width - offset, y, ...floating };
  return { x: reference.x + reference.width + offset, y, ...floating };
}

function clamp(value, minimum, maximum) { return maximum < minimum ? minimum : Math.min(Math.max(value, minimum), maximum); }
