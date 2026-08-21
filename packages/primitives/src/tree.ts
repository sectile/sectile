import {
  DEFAULT_MAX_ID_CODE_UNITS,
  type ResourceCeilings,
  type Result,
  type StableId,
} from './shared.js';
import {
  fail,
  freezeArray,
  ok,
  validateSafeCeiling,
  validateStableId,
} from './internal/foundation.js';
import { IndexedSequence, type SequenceView } from './internal/optimized-sequence.js';
import type { Sequence } from './sequence.js';

export interface TreeNodeInput<Id extends StableId = StableId> {
  readonly id: Id;
  readonly parentId: Id | null;
}

export interface TreeOptions extends ResourceCeilings {
  readonly maxItems?: number;
  readonly maxDepth?: number;
}

export interface Tree<Id extends StableId = StableId> {
  readonly size: number;
  readonly roots: Sequence<Id>;
  has(id: Id): boolean;
  parentOf(id: Id): Id | null;
  childrenOf(id: Id): Sequence<Id> | null;
  isLeaf(id: Id): boolean | null;
  depthOf(id: Id): number | null;
  ancestorsOf(id: Id): readonly Id[] | null;
  preorder(): Sequence<Id>;
  postorder(): Sequence<Id>;
  normalizeExpansion(expanded: Iterable<Id>): Expansion<Id>;
  visible(expansion: Expansion<Id> | Iterable<Id>): Sequence<Id>;
}

export interface Expansion<Id extends StableId = StableId> {
  readonly ids: readonly Id[];
  readonly size: number;
  has(id: Id): boolean;
}

class NormalizedExpansion<Id extends StableId> implements Expansion<Id> {
  public readonly ids: readonly Id[];
  readonly #set: ReadonlySet<Id>;

  public constructor(ids: readonly Id[]) {
    this.ids = freezeArray(ids);
    this.#set = new Set(ids);
    Object.freeze(this);
  }

  public get size(): number {
    return this.ids.length;
  }

  public has(id: Id): boolean {
    return this.#set.has(id);
  }
}

class IndexedTree<Id extends StableId> implements Tree<Id> {
  public readonly size: number;
  public readonly roots: Sequence<Id>;
  readonly #parent: ReadonlyMap<Id, Id | null>;
  readonly #children: ReadonlyMap<Id, readonly Id[]>;
  readonly #depth: ReadonlyMap<Id, number>;
  readonly #preorder: readonly Id[];
  readonly #postorder: readonly Id[];

  public constructor(
    roots: readonly Id[],
    parent: ReadonlyMap<Id, Id | null>,
    children: ReadonlyMap<Id, readonly Id[]>,
    depth: ReadonlyMap<Id, number>,
    preorder: readonly Id[],
    postorder: readonly Id[],
  ) {
    this.size = preorder.length;
    this.roots = new IndexedSequence(roots) as SequenceView<Id>;
    this.#parent = parent;
    this.#children = children;
    this.#depth = depth;
    this.#preorder = freezeArray(preorder);
    this.#postorder = freezeArray(postorder);
    Object.freeze(this);
  }

  public has(id: Id): boolean {
    return this.#parent.has(id);
  }

  public parentOf(id: Id): Id | null {
    return this.#parent.get(id) ?? null;
  }

  public childrenOf(id: Id): Sequence<Id> | null {
    const children = this.#children.get(id);
    return children === undefined ? null : (new IndexedSequence(children) as SequenceView<Id>);
  }

  public isLeaf(id: Id): boolean | null {
    const children = this.#children.get(id);
    return children === undefined ? null : children.length === 0;
  }

  public depthOf(id: Id): number | null {
    return this.#depth.get(id) ?? null;
  }

  public ancestorsOf(id: Id): readonly Id[] | null {
    if (!this.#parent.has(id)) return null;
    const result: Id[] = [];
    let current = this.#parent.get(id) ?? null;
    while (current !== null) {
      result.push(current);
      current = this.#parent.get(current) ?? null;
    }
    return freezeArray(result);
  }

  public preorder(): Sequence<Id> {
    return new IndexedSequence(this.#preorder) as SequenceView<Id>;
  }

  public postorder(): Sequence<Id> {
    return new IndexedSequence(this.#postorder) as SequenceView<Id>;
  }

  public normalizeExpansion(expanded: Iterable<Id>): Expansion<Id> {
    const requested = new Set(expanded);
    const normalized = this.#preorder.filter(
      (id) => requested.has(id) && (this.#children.get(id)?.length ?? 0) > 0,
    );
    return new NormalizedExpansion(normalized);
  }

  public visible(expansion: Expansion<Id> | Iterable<Id>): Sequence<Id> {
    const normalized =
      expansion instanceof NormalizedExpansion
        ? expansion
        : this.normalizeExpansion(isExpansion(expansion) ? expansion.ids : expansion);
    const result: Id[] = [];
    const stack = [...this.roots.ids].reverse();
    while (stack.length > 0) {
      const id = stack.pop();
      if (id === undefined) continue;
      result.push(id);
      if (!normalized.has(id)) continue;
      const children = this.#children.get(id) ?? [];
      for (let index = children.length - 1; index >= 0; index -= 1) {
        const child = children[index];
        if (child !== undefined) stack.push(child);
      }
    }
    return new IndexedSequence(result) as SequenceView<Id>;
  }
}

interface TraversalFrame<Id extends StableId> {
  readonly id: Id;
  readonly depth: number;
  nextChild: number;
}

export function createTree<Id extends StableId>(
  nodes: readonly TreeNodeInput<Id>[],
  options: TreeOptions = {},
): Result<Tree<Id>> {
  const maxItems = options.maxItems ?? 100_000;
  const maxDepth = options.maxDepth ?? 1_024;
  const maxIdCodeUnits = options.maxIdCodeUnits ?? DEFAULT_MAX_ID_CODE_UNITS;
  for (const [value, name] of [
    [maxItems, 'maxItems'],
    [maxDepth, 'maxDepth'],
    [maxIdCodeUnits, 'maxIdCodeUnits'],
  ] as const) {
    const error = validateSafeCeiling(value, name);
    if (error !== null) return { ok: false, error };
  }
  if (maxIdCodeUnits < 1) {
    return fail('construction', 'invalid-max-id-code-units', 'maxIdCodeUnits must be a positive safe integer.', { maxIdCodeUnits });
  }
  if (nodes.length > maxItems) {
    return fail('resource-rejection', 'item-ceiling-exceeded', 'Tree exceeds maxItems.', {
      size: nodes.length,
      maxItems,
    });
  }

  const parent = new Map<Id, Id | null>();
  const ids: Id[] = [];
  for (let index = 0; index < nodes.length; index += 1) {
    const node = nodes[index];
    if (node === undefined) {
      return fail('construction', 'invalid-node', 'Tree input must not contain sparse or missing nodes.', { index });
    }
    const idError = validateStableId(node.id, maxIdCodeUnits);
    if (idError !== null) return { ok: false, error: idError };
    if (parent.has(node.id)) {
      return fail('construction', 'duplicate-id', 'Tree identities must be unique.', {
        id: node.id,
        index,
      });
    }
    if (node.parentId === node.id) {
      return fail('construction', 'self-parent', 'A tree node cannot be its own parent.', {
        id: node.id,
      });
    }
    parent.set(node.id, node.parentId);
    ids.push(node.id);
  }
  for (const id of ids) {
    const parentId = parent.get(id) ?? null;
    if (parentId !== null && !parent.has(parentId)) {
      return fail('construction', 'missing-parent', 'Every non-root parent must exist.', {
        id,
        parentId,
      });
    }
  }

  const childrenMutable = new Map<Id, Id[]>();
  for (const id of ids) childrenMutable.set(id, []);
  const roots: Id[] = [];
  for (const id of ids) {
    const parentId = parent.get(id) ?? null;
    if (parentId === null) roots.push(id);
    else childrenMutable.get(parentId)?.push(id);
  }

  const marks = new Map<Id, 0 | 1 | 2>();
  const depth = new Map<Id, number>();
  const preorder: Id[] = [];
  const postorder: Id[] = [];
  for (const root of roots) {
    const stack: TraversalFrame<Id>[] = [{ id: root, depth: 0, nextChild: 0 }];
    while (stack.length > 0) {
      const frame = stack[stack.length - 1];
      if (frame === undefined) break;
      if (frame.nextChild === 0) {
        const mark = marks.get(frame.id) ?? 0;
        if (mark === 1) {
          return fail('construction', 'cycle', 'Tree parent relation must be acyclic.', {
            id: frame.id,
          });
        }
        if (mark === 2) {
          stack.pop();
          continue;
        }
        if (frame.depth > maxDepth) {
          return fail('resource-rejection', 'depth-ceiling-exceeded', 'Tree exceeds maxDepth.', {
            id: frame.id,
            depth: frame.depth,
            maxDepth,
          });
        }
        marks.set(frame.id, 1);
        depth.set(frame.id, frame.depth);
        preorder.push(frame.id);
      }

      const children = childrenMutable.get(frame.id) ?? [];
      const child = children[frame.nextChild];
      if (child !== undefined) {
        frame.nextChild += 1;
        const childMark = marks.get(child) ?? 0;
        if (childMark === 1) {
          return fail('construction', 'cycle', 'Tree parent relation must be acyclic.', {
            id: child,
          });
        }
        if (childMark === 0) {
          stack.push({ id: child, depth: frame.depth + 1, nextChild: 0 });
        }
        continue;
      }

      marks.set(frame.id, 2);
      postorder.push(frame.id);
      stack.pop();
    }
  }

  if (preorder.length !== ids.length) {
    const unvisited = ids.find((id) => (marks.get(id) ?? 0) !== 2);
    return fail('construction', 'cycle', 'Every tree node must be reachable from a root.', {
      ...(unvisited === undefined ? {} : { id: unvisited }),
    });
  }

  const children = new Map<Id, readonly Id[]>();
  for (const [id, values] of childrenMutable) children.set(id, freezeArray(values));
  return ok(new IndexedTree(roots, parent, children, depth, preorder, postorder));
}

function isExpansion<Id extends StableId>(value: Expansion<Id> | Iterable<Id>): value is Expansion<Id> {
  return (
    typeof value === 'object' &&
    value !== null &&
    'ids' in value &&
    Array.isArray((value as Expansion<Id>).ids)
  );
}

export type { Result, StableId } from './shared.js';
