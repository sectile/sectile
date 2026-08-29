import type { VirtualIndexedView } from '../layout.js';

const BLOCK_SIZE = 64;

type VectorNode<T> = VectorLeaf<T> | VectorBranch<T>;

interface VectorLeaf<T> {
  readonly kind: 'leaf';
  readonly entries: readonly T[];
  readonly size: number;
}

interface VectorBranch<T> {
  readonly kind: 'branch';
  readonly left: VectorNode<T>;
  readonly right: VectorNode<T>;
  readonly size: number;
}

export interface BlockedVector<T> {
  readonly size: number;
  readonly view: VirtualIndexedView<T>;
  at(index: number): T | undefined;
  iterate(): IterableIterator<T>;
  forEach(callback: (value: T, index: number) => void): void;
  updateDetailed(changes: readonly (readonly [number, T])[]): BlockedVectorUpdate<T>;
}

export interface BlockedVectorUpdate<T> {
  readonly vector: BlockedVector<T>;
  readonly copiedNodes: number;
  readonly copiedEntries: number;
}

export function createBlockedVector<T>(values: readonly T[]): BlockedVector<T> {
  const leaves: VectorNode<T>[] = [];
  for (let start = 0; start < values.length; start += BLOCK_SIZE) {
    leaves.push(leaf(values.slice(start, start + BLOCK_SIZE)));
  }
  return createVector(build(leaves, 0, leaves.length));
}

export function blockedRepairBound(changed: number, size: number, touchedPartitions: number = changed): number {
  const depth = Math.ceil(Math.log2(Math.ceil(size / BLOCK_SIZE) + 1));
  return touchedPartitions * (BLOCK_SIZE + depth) + changed;
}

export function useBlockedRepair(changed: number, size: number, touchedPartitions: number = changed): boolean {
  return size >= 1_024 && blockedRepairBound(changed, size, touchedPartitions) < size / 2;
}

export function blockedTrackRepairBound(changed: number, size: number): number {
  const depth = Math.ceil(Math.log2(Math.ceil(size / BLOCK_SIZE) + 1));
  return changed * (BLOCK_SIZE + depth);
}

export function useBlockedTrackRepair(changed: number, size: number): boolean {
  return size >= 1_024 && blockedTrackRepairBound(changed, size) < size / 2;
}

function createVector<T>(root: VectorNode<T> | null): BlockedVector<T> {
  const size = root?.size ?? 0;
  const atIndex = (index: number): T | undefined => at(root, index);
  const iterateValues = (): IterableIterator<T> => iterate(root);
  const forEachValue = (callback: (value: T, index: number) => void): void => forEach(root, callback);
  const view: VirtualIndexedView<T> = Object.freeze({
    size,
    at: atIndex,
    iterate: iterateValues,
    forEach: forEachValue,
    toArray: (): readonly T[] => materialize(root, size),
  });
  const vector = {
    size,
    view,
    at: atIndex,
    iterate: iterateValues,
    forEach: forEachValue,
    updateDetailed: (changes: readonly (readonly [number, T])[]): BlockedVectorUpdate<T> => {
      if (changes.length === 0 || root === null) return Object.freeze({ vector, copiedNodes: 0, copiedEntries: 0 });
      assertSortedUniqueChanges(changes, size);
      const work = { copiedNodes: 0, copiedEntries: 0 };
      const next = updateNode(root, 0, changes, 0, changes.length, work);
      return Object.freeze({
        vector: next === root ? vector : createVector(next),
        copiedNodes: work.copiedNodes,
        copiedEntries: work.copiedEntries,
      });
    },
  } satisfies BlockedVector<T>;
  return Object.freeze(vector);
}

function* iterate<T>(root: VectorNode<T> | null): IterableIterator<T> {
  if (root === null) return;
  if (root.kind === 'leaf') {
    yield* root.entries;
    return;
  }
  yield* iterate(root.left);
  yield* iterate(root.right);
}

function forEach<T>(root: VectorNode<T> | null, callback: (value: T, index: number) => void): void {
  if (root === null) return;
  let index = 0;
  const visit = (node: VectorNode<T>): void => {
    if (node.kind === 'leaf') {
      for (const value of node.entries) callback(value, index++);
      return;
    }
    visit(node.left);
    visit(node.right);
  };
  visit(root);
}

function materialize<T>(root: VectorNode<T> | null, size: number): readonly T[] {
  const output = new Array<T>(size);
  forEach(root, (value, index) => { output[index] = value; });
  return Object.freeze(output);
}

function build<T>(leaves: readonly VectorNode<T>[], start: number, end: number): VectorNode<T> | null {
  if (start === end) return null;
  if (end - start === 1) return leaves[start]!;
  const middle = start + Math.floor((end - start) / 2);
  return branch(build(leaves, start, middle)!, build(leaves, middle, end)!);
}

function at<T>(root: VectorNode<T> | null, index: number): T | undefined {
  if (root === null || !Number.isSafeInteger(index) || index < 0 || index >= root.size) return undefined;
  let node = root;
  let local = index;
  while (node.kind === 'branch') {
    if (local < node.left.size) node = node.left;
    else { local -= node.left.size; node = node.right; }
  }
  return node.entries[local];
}

function updateNode<T>(
  node: VectorNode<T>,
  start: number,
  changes: readonly (readonly [number, T])[],
  from: number,
  to: number,
  work: { copiedNodes: number; copiedEntries: number },
): VectorNode<T> {
  if (from === to) return node;
  if (node.kind === 'leaf') {
    const entries = [...node.entries];
    work.copiedNodes += 1;
    work.copiedEntries += entries.length;
    for (let cursor = from; cursor < to; cursor += 1) {
      const [index, value] = changes[cursor]!;
      entries[index - start] = value;
    }
    return leaf(entries);
  }
  const boundary = start + node.left.size;
  let middle = from;
  while (middle < to && changes[middle]![0] < boundary) middle += 1;
  const left = updateNode(node.left, start, changes, from, middle, work);
  const right = updateNode(node.right, boundary, changes, middle, to, work);
  if (left === node.left && right === node.right) return node;
  work.copiedNodes += 1;
  return branch(left, right);
}

function leaf<T>(entries: T[]): VectorLeaf<T> {
  return Object.freeze({ kind: 'leaf', entries: Object.freeze(entries), size: entries.length });
}

function branch<T>(left: VectorNode<T>, right: VectorNode<T>): VectorBranch<T> {
  return Object.freeze({ kind: 'branch', left, right, size: left.size + right.size });
}

function assertSortedUniqueChanges<T>(changes: readonly (readonly [number, T])[], size: number): void {
  let previous = -1;
  for (const [index] of changes) {
    if (!Number.isSafeInteger(index) || index <= previous || index >= size) {
      throw new RangeError('BlockedVector changes must contain sorted unique in-range indexes.');
    }
    previous = index;
  }
}
