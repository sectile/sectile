import { unwrap } from '@sectile/core/result';
import type { VirtualResult } from './error.js';
import { fail, ok, validateMaxItems } from './internal/foundation.js';

export type Extent =
  | { readonly kind: 'exact'; readonly value: number }
  | { readonly kind: 'estimated'; readonly value: number }
  | { readonly kind: 'unknown'; readonly fallback: number };

export interface ExtentUpdate {
  readonly index: number;
  readonly extent: Extent;
}

export interface ExtentLocation {
  readonly index: number;
  readonly itemOffset: number;
  readonly offsetWithin: number;
  readonly extent: Extent;
}

export interface ExtentIndexOptions {
  readonly maxItems?: number;
}

export interface ExtentIndex {
  readonly size: number;
  readonly totalExtent: number;
  readonly maxItems: number;
  extentAt(index: number): Extent | null;
  slice(start: number, end: number): readonly Extent[] | null;
  offsetAt(index: number): number | null;
  indexAtOffset(offset: number): number | null;
  locateOffset(offset: number): ExtentLocation | null;
  update(updates: readonly ExtentUpdate[]): VirtualResult<ExtentIndex>;
  splice(start: number, deleteCount: number, inserted?: readonly Extent[]): VirtualResult<ExtentIndex>;
  move(from: number, to: number, count?: number): VirtualResult<ExtentIndex>;
}

type Node = Leaf | Branch;
interface Leaf {
  readonly kind: 'leaf';
  readonly entries: readonly Extent[];
  readonly size: number;
  readonly sum: number;
  readonly height: 1;
}
interface Branch {
  readonly kind: 'branch';
  readonly left: Node;
  readonly right: Node;
  readonly size: number;
  readonly sum: number;
  readonly height: number;
}

interface UniformOverride {
  readonly index: number;
  readonly extent: Extent;
  readonly delta: number;
}

interface UniformStore {
  readonly overrides: readonly UniformOverride[];
  readonly prefixDeltas: readonly number[];
}

const LEAF_SIZE = 64;

export function createExtentIndex(
  extents: readonly Extent[],
  options: ExtentIndexOptions = {},
): ExtentIndex {
  return unwrap(tryCreateExtentIndex(extents, options));
}

export function tryCreateExtentIndex(
  extents: readonly Extent[],
  options: ExtentIndexOptions = {},
): VirtualResult<ExtentIndex> {
  const maxItems = options.maxItems ?? 1_000_000;
  const ceilingError = validateMaxItems(maxItems);
  if (ceilingError !== null) return { ok: false, error: ceilingError };
  if (extents.length > maxItems) {
    return fail('resource-rejection', 'extent-index-ceiling-exceeded', 'Extent index exceeds maxItems.', {
      size: extents.length,
      maxItems,
    });
  }
  const validated = validateExtents(extents);
  if (!validated.ok) return validated;
  return ok(createIndex(build(validated.value), maxItems));
}

/**
 * Creates an extent index backed by one shared extent and sparse overrides.
 * This avoids allocating one extent entry per item when a large collection
 * starts from the same fixed or estimated size.
 */
export function createUniformExtentIndex(
  size: number,
  extent: Extent,
  options: ExtentIndexOptions = {},
): ExtentIndex {
  return unwrap(tryCreateUniformExtentIndex(size, extent, options));
}

export function tryCreateUniformExtentIndex(
  size: number,
  extent: Extent,
  options: ExtentIndexOptions = {},
): VirtualResult<ExtentIndex> {
  const maxItems = options.maxItems ?? 1_000_000;
  const ceilingError = validateMaxItems(maxItems);
  if (ceilingError !== null) return { ok: false, error: ceilingError };
  if (!Number.isSafeInteger(size) || size < 0) {
    return fail('construction', 'extent-index-size-invalid', 'Extent index size must be a non-negative safe integer.', {
      size,
    });
  }
  if (size > maxItems) {
    return fail('resource-rejection', 'extent-index-ceiling-exceeded', 'Extent index exceeds maxItems.', {
      size,
      maxItems,
    });
  }
  const validated = validateExtent(extent);
  if (!validated.ok) return validated;
  return ok(createUniformIndex(size, validated.value, maxItems, createUniformStore([])));
}

function createUniformIndex(
  size: number,
  baseExtent: Extent,
  maxItems: number,
  store: UniformStore,
): ExtentIndex {
  const baseValue = valueOf(baseExtent);
  const totalDelta = store.prefixDeltas[store.prefixDeltas.length - 1] ?? 0;
  const offset = (index: number): number | null => {
    if (!Number.isSafeInteger(index) || index < 0 || index > size) return null;
    const overrideEnd = uniformLowerBound(store.overrides, index);
    return (baseValue * index) + store.prefixDeltas[overrideEnd]!;
  };
  const at = (index: number): Extent | null => {
    if (!Number.isSafeInteger(index) || index < 0 || index >= size) return null;
    const position = uniformLowerBound(store.overrides, index);
    const override = store.overrides[position];
    return override?.index === index ? override.extent : baseExtent;
  };
  const locate = (value: number): ExtentLocation | null => {
    const totalExtent = (baseValue * size) + totalDelta;
    if (size === 0 || !Number.isFinite(value) || value < 0 || value >= totalExtent) return null;
    let low = 0;
    let high = size - 1;
    while (low < high) {
      const middle = low + Math.ceil((high - low) / 2);
      const middleOffset = offset(middle)!;
      if (middleOffset <= value) low = middle;
      else high = middle - 1;
    }
    const itemExtent = at(low)!;
    const itemOffset = offset(low)!;
    return Object.freeze({
      index: low,
      itemOffset,
      offsetWithin: value - itemOffset,
      extent: itemExtent,
    });
  };
  return Object.freeze({
    size,
    totalExtent: (baseValue * size) + totalDelta,
    maxItems,
    extentAt: at,
    slice: (start: number, end: number): readonly Extent[] | null => {
      if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || end < start || end > size) return null;
      const output = Array.from({ length: end - start }, () => baseExtent);
      let position = uniformLowerBound(store.overrides, start);
      while (position < store.overrides.length) {
        const override = store.overrides[position]!;
        if (override.index >= end) break;
        output[override.index - start] = override.extent;
        position += 1;
      }
      return Object.freeze(output);
    },
    offsetAt: offset,
    indexAtOffset: (value: number): number | null => locate(value)?.index ?? null,
    locateOffset: locate,
    update: (updates: readonly ExtentUpdate[]): VirtualResult<ExtentIndex> => (
      updateUniformIndex(size, baseExtent, maxItems, store, updates)
    ),
    splice: (
      start: number,
      deleteCount: number,
      inserted: readonly Extent[] = [],
    ): VirtualResult<ExtentIndex> => (
      spliceUniformIndex(size, baseExtent, maxItems, store, start, deleteCount, inserted)
    ),
    move: (from: number, to: number, count = 1): VirtualResult<ExtentIndex> => (
      moveUniformIndex(size, baseExtent, maxItems, store, from, to, count)
    ),
  });
}

function updateUniformIndex(
  size: number,
  baseExtent: Extent,
  maxItems: number,
  store: UniformStore,
  updates: readonly ExtentUpdate[],
): VirtualResult<ExtentIndex> {
  const byIndex = new Map(store.overrides.map((override) => [override.index, override.extent]));
  for (const update of updates) {
    if (!Number.isSafeInteger(update.index) || update.index < 0 || update.index >= size) {
      return fail('transition-rejection', 'extent-index-update-invalid', 'Extent update index is outside the domain.', {
        index: update.index,
        size,
      });
    }
    const validated = validateExtent(update.extent);
    if (!validated.ok) return validated;
    if (sameExtent(baseExtent, validated.value)) byIndex.delete(update.index);
    else byIndex.set(update.index, validated.value);
  }
  return ok(createUniformIndex(size, baseExtent, maxItems, createUniformStore(
    [...byIndex].sort(([left], [right]) => left - right).map(([index, extent]) => ({ index, extent })),
    baseExtent,
  )));
}

function spliceUniformIndex(
  size: number,
  baseExtent: Extent,
  maxItems: number,
  store: UniformStore,
  start: number,
  deleteCount: number,
  inserted: readonly Extent[],
): VirtualResult<ExtentIndex> {
  if (
    !Number.isSafeInteger(start)
    || !Number.isSafeInteger(deleteCount)
    || start < 0
    || deleteCount < 0
    || start > size
    || deleteCount > size - start
  ) {
    return fail('transition-rejection', 'extent-index-splice-invalid', 'Extent splice range is invalid.', {
      start,
      deleteCount,
      size,
    });
  }
  const nextSize = size - deleteCount + inserted.length;
  if (nextSize > maxItems) {
    return fail('resource-rejection', 'extent-index-ceiling-exceeded', 'Extent splice exceeds maxItems.', {
      size: nextSize,
      maxItems,
    });
  }
  const validated = validateExtents(inserted);
  if (!validated.ok) return validated;
  const shift = inserted.length - deleteCount;
  const next: { readonly index: number; readonly extent: Extent }[] = [];
  for (const override of store.overrides) {
    if (override.index < start) next.push(override);
    else if (override.index >= start + deleteCount) {
      next.push({ index: override.index + shift, extent: override.extent });
    }
  }
  for (let index = 0; index < validated.value.length; index += 1) {
    const extent = validated.value[index]!;
    if (!sameExtent(baseExtent, extent)) next.push({ index: start + index, extent });
  }
  next.sort((left, right) => left.index - right.index);
  return ok(createUniformIndex(nextSize, baseExtent, maxItems, createUniformStore(next, baseExtent)));
}

function moveUniformIndex(
  size: number,
  baseExtent: Extent,
  maxItems: number,
  store: UniformStore,
  from: number,
  to: number,
  count: number,
): VirtualResult<ExtentIndex> {
  if (
    !Number.isSafeInteger(from)
    || !Number.isSafeInteger(to)
    || !Number.isSafeInteger(count)
    || from < 0
    || count < 0
    || from > size
    || count > size - from
    || to < 0
    || to > size - count
  ) {
    return fail(
      'transition-rejection',
      'extent-index-move-invalid',
      'Extent move must identify a valid source and post-removal destination.',
      { from, to, count, size },
    );
  }
  if (count === 0 || from === to || store.overrides.length === 0) {
    return ok(createUniformIndex(size, baseExtent, maxItems, store));
  }
  const next = store.overrides.map((override) => {
    if (override.index >= from && override.index < from + count) {
      return { index: to + override.index - from, extent: override.extent };
    }
    const afterRemoval = override.index < from ? override.index : override.index - count;
    return {
      index: afterRemoval >= to ? afterRemoval + count : afterRemoval,
      extent: override.extent,
    };
  }).sort((left, right) => left.index - right.index);
  return ok(createUniformIndex(size, baseExtent, maxItems, createUniformStore(next, baseExtent)));
}

function createUniformStore(
  entries: readonly { readonly index: number; readonly extent: Extent }[],
  baseExtent?: Extent,
): UniformStore {
  const baseValue = baseExtent === undefined ? 0 : valueOf(baseExtent);
  let sum = 0;
  const prefixDeltas = [0];
  const overrides = entries.map((entry) => {
    const override = Object.freeze({
      index: entry.index,
      extent: entry.extent,
      delta: valueOf(entry.extent) - baseValue,
    });
    sum += override.delta;
    prefixDeltas.push(sum);
    return override;
  });
  return Object.freeze({
    overrides: Object.freeze(overrides),
    prefixDeltas: Object.freeze(prefixDeltas),
  });
}

function uniformLowerBound(overrides: readonly UniformOverride[], index: number): number {
  let low = 0;
  let high = overrides.length;
  while (low < high) {
    const middle = low + Math.floor((high - low) / 2);
    if (overrides[middle]!.index < index) low = middle + 1;
    else high = middle;
  }
  return low;
}

function createIndex(root: Node | null, maxItems: number): ExtentIndex {
  return Object.freeze({
    size: root?.size ?? 0,
    totalExtent: root?.sum ?? 0,
    maxItems,
    extentAt: (index: number): Extent | null => extentAt(root, index),
    slice: (start: number, end: number): readonly Extent[] | null => sliceExtents(root, start, end),
    offsetAt: (index: number): number | null => offsetAt(root, index),
    indexAtOffset: (offset: number): number | null => locateOffset(root, offset)?.index ?? null,
    locateOffset: (offset: number): ExtentLocation | null => locateOffset(root, offset),
    update: (updates: readonly ExtentUpdate[]): VirtualResult<ExtentIndex> => updateIndex(root, maxItems, updates),
    splice: (
      start: number,
      deleteCount: number,
      inserted: readonly Extent[] = [],
    ): VirtualResult<ExtentIndex> => spliceIndex(root, maxItems, start, deleteCount, inserted),
    move: (from: number, to: number, count = 1): VirtualResult<ExtentIndex> => (
      moveIndex(root, maxItems, from, to, count)
    ),
  });
}

function updateIndex(
  root: Node | null,
  maxItems: number,
  updates: readonly ExtentUpdate[],
): VirtualResult<ExtentIndex> {
  const size = root?.size ?? 0;
  let strictlyIncreasing = true;
  const indices: number[] = [];
  const extents: Extent[] = [];
  let previousIndex = -1;
  for (const update of updates) {
    if (!Number.isSafeInteger(update.index) || update.index < 0 || update.index >= size) {
      return fail('transition-rejection', 'extent-index-update-invalid', 'Extent update index is outside the domain.', {
        index: update.index,
        size,
      });
    }
    const validated = validateExtent(update.extent);
    if (!validated.ok) return validated;
    if (update.index <= previousIndex) strictlyIncreasing = false;
    indices.push(update.index);
    extents.push(validated.value);
    previousIndex = update.index;
  }
  if (indices.length === 0 || root === null) return ok(createIndex(root, maxItems));
  if (!strictlyIncreasing) {
    const byIndex = new Map<number, Extent>();
    for (let update = 0; update < indices.length; update += 1) {
      byIndex.set(indices[update]!, extents[update]!);
    }
    const sorted = [...byIndex].sort(([left], [right]) => left - right);
    indices.length = 0;
    extents.length = 0;
    for (const [index, extent] of sorted) {
      indices.push(index);
      extents.push(extent);
    }
  }
  const next = isContiguous(indices)
    ? updateContiguousNode(root, 0, indices[0]!, extents)
    : updateNode(root, 0, indices, extents, 0, indices.length);
  return ok(createIndex(next, maxItems));
}

function spliceIndex(
  root: Node | null,
  maxItems: number,
  start: number,
  deleteCount: number,
  inserted: readonly Extent[],
): VirtualResult<ExtentIndex> {
  const size = root?.size ?? 0;
  if (
    !Number.isSafeInteger(start)
    || !Number.isSafeInteger(deleteCount)
    || start < 0
    || deleteCount < 0
    || start > size
    || deleteCount > size - start
  ) {
    return fail('transition-rejection', 'extent-index-splice-invalid', 'Extent splice range is invalid.', {
      start,
      deleteCount,
      size,
    });
  }
  if (inserted.length > maxItems - (size - deleteCount)) {
    return fail('resource-rejection', 'extent-index-ceiling-exceeded', 'Extent splice exceeds maxItems.', {
      size: size - deleteCount + inserted.length,
      maxItems,
    });
  }
  const validated = validateExtents(inserted);
  if (!validated.ok) return validated;
  const [before, remainder] = split(root, start);
  const [, after] = split(remainder, deleteCount);
  return ok(createIndex(join(join(before, build(validated.value)), after), maxItems));
}

function moveIndex(
  root: Node | null,
  maxItems: number,
  from: number,
  to: number,
  count: number,
): VirtualResult<ExtentIndex> {
  const size = root?.size ?? 0;
  if (
    !Number.isSafeInteger(from)
    || !Number.isSafeInteger(to)
    || !Number.isSafeInteger(count)
    || from < 0
    || count < 0
    || from > size
    || count > size - from
    || to < 0
    || to > size - count
  ) {
    return fail(
      'transition-rejection',
      'extent-index-move-invalid',
      'Extent move must identify a valid source and post-removal destination.',
      { from, to, count, size },
    );
  }
  if (root === null || count === 0 || from === to) return ok(createIndex(root, maxItems));
  const [before, remainder] = split(root, from);
  const [moved, after] = split(remainder, count);
  const withoutMoved = join(before, after);
  const [destinationBefore, destinationAfter] = split(withoutMoved, to);
  return ok(createIndex(join(join(destinationBefore, moved), destinationAfter), maxItems));
}

function extentAt(root: Node | null, index: number): Extent | null {
  if (root === null || !Number.isSafeInteger(index) || index < 0 || index >= root.size) return null;
  let node = root;
  let local = index;
  while (node.kind === 'branch') {
    if (local < node.left.size) node = node.left;
    else {
      local -= node.left.size;
      node = node.right;
    }
  }
  return node.entries[local] ?? null;
}

function sliceExtents(root: Node | null, start: number, end: number): readonly Extent[] | null {
  const size = root?.size ?? 0;
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || end < start || end > size) return null;
  if (start === end || root === null) return Object.freeze([]);
  const output: Extent[] = [];
  collectExtents(root, 0, start, end, output);
  return Object.freeze(output);
}

function collectExtents(node: Node, nodeStart: number, start: number, end: number, output: Extent[]): void {
  const nodeEnd = nodeStart + node.size;
  if (end <= nodeStart || start >= nodeEnd) return;
  if (node.kind === 'leaf') {
    output.push(...node.entries.slice(Math.max(0, start - nodeStart), Math.min(node.size, end - nodeStart)));
    return;
  }
  collectExtents(node.left, nodeStart, start, end, output);
  collectExtents(node.right, nodeStart + node.left.size, start, end, output);
}

function offsetAt(root: Node | null, index: number): number | null {
  const size = root?.size ?? 0;
  if (!Number.isSafeInteger(index) || index < 0 || index > size) return null;
  if (root === null || index === 0) return 0;
  if (index === size) return root.sum;
  let node = root;
  let local = index;
  let offset = 0;
  while (node.kind === 'branch') {
    if (local <= node.left.size) node = node.left;
    else {
      local -= node.left.size;
      offset += node.left.sum;
      node = node.right;
    }
  }
  for (let current = 0; current < local; current += 1) offset += valueOf(node.entries[current]!);
  return offset;
}

function locateOffset(root: Node | null, offset: number): ExtentLocation | null {
  if (root === null || !Number.isFinite(offset) || offset < 0 || offset >= root.sum) return null;
  let node = root;
  let localOffset = offset;
  let base = 0;
  while (node.kind === 'branch') {
    if (localOffset < node.left.sum) node = node.left;
    else {
      localOffset -= node.left.sum;
      base += node.left.size;
      node = node.right;
    }
  }
  for (let index = 0; index < node.entries.length; index += 1) {
    const entry = node.entries[index]!;
    const extent = valueOf(entry);
    if (localOffset < extent) return Object.freeze({ index: base + index, itemOffset: offset - localOffset, offsetWithin: localOffset, extent: entry });
    localOffset -= extent;
  }
  return null;
}

function updateNode(
  node: Node,
  start: number,
  indices: readonly number[],
  extents: readonly Extent[],
  from: number,
  to: number,
): Node {
  if (from === to) return node;
  if (node.kind === 'leaf') {
    let entries: Extent[] | null = null;
    for (let update = from; update < to; update += 1) {
      const local = indices[update]! - start;
      const extent = extents[update]!;
      if (sameExtent(node.entries[local]!, extent)) continue;
      entries ??= [...node.entries];
      entries[local] = extent;
    }
    return entries === null ? node : leaf(entries);
  }
  const boundary = start + node.left.size;
  const middle = lowerBound(indices, boundary, from, to);
  const left = updateNode(node.left, start, indices, extents, from, middle);
  const right = updateNode(node.right, boundary, indices, extents, middle, to);
  return left === node.left && right === node.right ? node : branch(left, right);
}

function lowerBound(
  indices: readonly number[],
  boundary: number,
  from: number,
  to: number,
): number {
  let low = from;
  let high = to;
  while (low < high) {
    const middle = low + Math.floor((high - low) / 2);
    if (indices[middle]! < boundary) low = middle + 1;
    else high = middle;
  }
  return low;
}

function updateContiguousNode(
  node: Node,
  start: number,
  updateStart: number,
  extents: readonly Extent[],
): Node {
  const end = start + node.size;
  const updateEnd = updateStart + extents.length;
  if (updateEnd <= start || updateStart >= end) return node;
  if (node.kind === 'leaf') {
    let entries: Extent[] | null = null;
    const first = Math.max(start, updateStart);
    const last = Math.min(end, updateEnd);
    for (let index = first; index < last; index += 1) {
      const local = index - start;
      const extent = extents[index - updateStart]!;
      if (sameExtent(node.entries[local]!, extent)) continue;
      entries ??= [...node.entries];
      entries[local] = extent;
    }
    return entries === null ? node : leaf(entries);
  }
  const boundary = start + node.left.size;
  const left = updateContiguousNode(node.left, start, updateStart, extents);
  const right = updateContiguousNode(node.right, boundary, updateStart, extents);
  return left === node.left && right === node.right ? node : branch(left, right);
}

function isContiguous(indices: readonly number[]): boolean {
  for (let index = 1; index < indices.length; index += 1) {
    if (indices[index] !== indices[index - 1]! + 1) return false;
  }
  return true;
}

function split(node: Node | null, index: number): readonly [Node | null, Node | null] {
  if (node === null) return [null, null];
  if (index === 0) return [null, node];
  if (index === node.size) return [node, null];
  if (node.kind === 'leaf') return [leaf(node.entries.slice(0, index)), leaf(node.entries.slice(index))];
  if (index < node.left.size) {
    const [before, remainder] = split(node.left, index);
    return [before, join(remainder, node.right)];
  }
  const [remainder, after] = split(node.right, index - node.left.size);
  return [join(node.left, remainder), after];
}

function join(left: Node | null, right: Node | null): Node | null {
  if (left === null) return right;
  if (right === null) return left;
  if (left.kind === 'leaf' && right.kind === 'leaf' && left.size + right.size <= LEAF_SIZE) {
    return leaf([...left.entries, ...right.entries]);
  }
  if (left.height > right.height + 1 && left.kind === 'branch') {
    return balance(left.left, join(left.right, right)!);
  }
  if (right.height > left.height + 1 && right.kind === 'branch') {
    return balance(join(left, right.left)!, right.right);
  }
  return branch(left, right);
}

function balance(left: Node, right: Node): Node {
  if (left.height > right.height + 1 && left.kind === 'branch') {
    if (left.right.height > left.left.height && left.right.kind === 'branch') {
      return branch(branch(left.left, left.right.left), branch(left.right.right, right));
    }
    return branch(left.left, branch(left.right, right));
  }
  if (right.height > left.height + 1 && right.kind === 'branch') {
    if (right.left.height > right.right.height && right.left.kind === 'branch') {
      return branch(branch(left, right.left.left), branch(right.left.right, right.right));
    }
    return branch(branch(left, right.left), right.right);
  }
  return branch(left, right);
}

function build(entries: readonly Extent[]): Node | null {
  if (entries.length === 0) return null;
  const leaves: Node[] = [];
  for (let index = 0; index < entries.length; index += LEAF_SIZE) {
    leaves.push(leaf(entries.slice(index, index + LEAF_SIZE)));
  }
  let nodes = leaves;
  while (nodes.length > 1) {
    const next: Node[] = [];
    for (let index = 0; index < nodes.length; index += 2) {
      const left = nodes[index]!;
      const right = nodes[index + 1];
      next.push(right === undefined ? left : branch(left, right));
    }
    nodes = next;
  }
  return nodes[0]!;
}

function leaf(entries: readonly Extent[]): Leaf {
  const frozen = Object.freeze([...entries]);
  return Object.freeze({
    kind: 'leaf',
    entries: frozen,
    size: frozen.length,
    sum: frozen.reduce((sum, extent) => sum + valueOf(extent), 0),
    height: 1,
  });
}

function branch(left: Node, right: Node): Branch {
  return Object.freeze({
    kind: 'branch',
    left,
    right,
    size: left.size + right.size,
    sum: left.sum + right.sum,
    height: Math.max(left.height, right.height) + 1,
  });
}

function validateExtents(extents: readonly Extent[]): VirtualResult<readonly Extent[]> {
  const result: Extent[] = [];
  for (const extent of extents) {
    const validated = validateExtent(extent);
    if (!validated.ok) return validated;
    result.push(validated.value);
  }
  return ok(Object.freeze(result));
}

function validateExtent(extent: Extent): VirtualResult<Extent> {
  const value = extent.kind === 'unknown' ? extent.fallback : extent.value;
  if (
    (extent.kind !== 'exact' && extent.kind !== 'estimated' && extent.kind !== 'unknown')
    || !Number.isFinite(value)
    || value < 0
  ) {
    return fail('construction', 'extent-invalid', 'Extent must have a non-negative finite effective value.');
  }
  return ok(Object.isFrozen(extent) ? extent : Object.freeze({ ...extent }));
}

function sameExtent(left: Extent, right: Extent): boolean {
  if (left.kind === 'unknown') return right.kind === 'unknown' && left.fallback === right.fallback;
  return right.kind !== 'unknown' && left.kind === right.kind && left.value === right.value;
}

function valueOf(extent: Extent): number {
  return extent.kind === 'unknown' ? extent.fallback : extent.value;
}

export type { VirtualResult } from './error.js';
