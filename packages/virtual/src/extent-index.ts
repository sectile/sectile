import { unwrap } from '@sectile/core/result';
import type { Result } from '@sectile/core';
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
  extentAt(index: number): Extent | null;
  offsetAt(index: number): number | null;
  indexAtOffset(offset: number): number | null;
  locateOffset(offset: number): ExtentLocation | null;
  update(updates: readonly ExtentUpdate[]): Result<ExtentIndex>;
  splice(start: number, deleteCount: number, inserted?: readonly Extent[]): Result<ExtentIndex>;
  move(from: number, to: number, count?: number): Result<ExtentIndex>;
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
): Result<ExtentIndex> {
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

function createIndex(root: Node | null, maxItems: number): ExtentIndex {
  return Object.freeze({
    size: root?.size ?? 0,
    totalExtent: root?.sum ?? 0,
    extentAt: (index: number): Extent | null => extentAt(root, index),
    offsetAt: (index: number): number | null => offsetAt(root, index),
    indexAtOffset: (offset: number): number | null => locateOffset(root, offset)?.index ?? null,
    locateOffset: (offset: number): ExtentLocation | null => locateOffset(root, offset),
    update: (updates: readonly ExtentUpdate[]): Result<ExtentIndex> => updateIndex(root, maxItems, updates),
    splice: (
      start: number,
      deleteCount: number,
      inserted: readonly Extent[] = [],
    ): Result<ExtentIndex> => spliceIndex(root, maxItems, start, deleteCount, inserted),
    move: (from: number, to: number, count = 1): Result<ExtentIndex> => (
      moveIndex(root, maxItems, from, to, count)
    ),
  });
}

function updateIndex(
  root: Node | null,
  maxItems: number,
  updates: readonly ExtentUpdate[],
): Result<ExtentIndex> {
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
): Result<ExtentIndex> {
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
): Result<ExtentIndex> {
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

function validateExtents(extents: readonly Extent[]): Result<readonly Extent[]> {
  const result: Extent[] = [];
  for (const extent of extents) {
    const validated = validateExtent(extent);
    if (!validated.ok) return validated;
    result.push(validated.value);
  }
  return ok(Object.freeze(result));
}

function validateExtent(extent: Extent): Result<Extent> {
  const value = extent.kind === 'unknown' ? extent.fallback : extent.value;
  if (
    (extent.kind !== 'exact' && extent.kind !== 'estimated' && extent.kind !== 'unknown')
    || !Number.isFinite(value)
    || value < 0
  ) {
    return fail('construction', 'extent-invalid', 'Extent must have a non-negative finite effective value.');
  }
  return ok(Object.freeze({ ...extent }));
}

function sameExtent(left: Extent, right: Extent): boolean {
  if (left.kind === 'unknown') return right.kind === 'unknown' && left.fallback === right.fallback;
  return right.kind !== 'unknown' && left.kind === right.kind && left.value === right.value;
}

function valueOf(extent: Extent): number {
  return extent.kind === 'unknown' ? extent.fallback : extent.value;
}

export type { Result } from '@sectile/core';
