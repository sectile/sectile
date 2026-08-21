import {
  DEFAULT_MAX_ID_CODE_UNITS,
  type ResourceCeilings,
  type Result,
  type StableID,
} from './shared.js';
import {
  fail,
  freezeArray,
  ok,
  validateSafeCeiling,
  validateStableID,
} from './internal/foundation.js';
import { IndexedSequence, type SequenceView } from './internal/optimized-sequence.js';
import type { Sequence } from './sequence.js';

export interface TreeNodeInput<ID extends StableID = StableID> {
  readonly id: ID;
  readonly parentID: ID | null;
}

export interface TreeOptions extends ResourceCeilings {
  readonly maxItems?: number;
  readonly maxDepth?: number;
}

export interface Tree<ID extends StableID = StableID> {
  readonly size: number;
  readonly roots: Sequence<ID>;
  has(id: ID): boolean;
  parentOf(id: ID): ID | null;
  childrenOf(id: ID): Sequence<ID> | null;
  isLeaf(id: ID): boolean | null;
  depthOf(id: ID): number | null;
  ancestorsOf(id: ID): readonly ID[] | null;
  preorder(): Sequence<ID>;
  postorder(): Sequence<ID>;
  normalizeExpansion(expanded: Iterable<ID>): Expansion<ID>;
  visible(expansion: Expansion<ID> | Iterable<ID>): Sequence<ID>;
}

export interface Expansion<ID extends StableID = StableID> {
  readonly ids: readonly ID[];
  readonly size: number;
  has(id: ID): boolean;
}

class NormalizedExpansion<ID extends StableID> implements Expansion<ID> {
  public readonly ids: readonly ID[];
  readonly #set: ReadonlySet<ID>;

  public constructor(ids: readonly ID[]) {
    this.ids = freezeArray(ids);
    this.#set = new Set(ids);
    Object.freeze(this);
  }

  public get size(): number {
    return this.ids.length;
  }

  public has(id: ID): boolean {
    return this.#set.has(id);
  }
}

class IndexedTree<ID extends StableID> implements Tree<ID> {
  public readonly size: number;
  public readonly roots: Sequence<ID>;
  readonly #parent: ReadonlyMap<ID, ID | null>;
  readonly #children: ReadonlyMap<ID, readonly ID[]>;
  readonly #depth: ReadonlyMap<ID, number>;
  readonly #preorder: readonly ID[];
  readonly #postorder: readonly ID[];

  public constructor(
    roots: readonly ID[],
    parent: ReadonlyMap<ID, ID | null>,
    children: ReadonlyMap<ID, readonly ID[]>,
    depth: ReadonlyMap<ID, number>,
    preorder: readonly ID[],
    postorder: readonly ID[],
  ) {
    this.size = preorder.length;
    this.roots = new IndexedSequence(roots) as SequenceView<ID>;
    this.#parent = parent;
    this.#children = children;
    this.#depth = depth;
    this.#preorder = freezeArray(preorder);
    this.#postorder = freezeArray(postorder);
    Object.freeze(this);
  }

  public has(id: ID): boolean {
    return this.#parent.has(id);
  }

  public parentOf(id: ID): ID | null {
    return this.#parent.get(id) ?? null;
  }

  public childrenOf(id: ID): Sequence<ID> | null {
    const children = this.#children.get(id);
    return children === undefined ? null : (new IndexedSequence(children) as SequenceView<ID>);
  }

  public isLeaf(id: ID): boolean | null {
    const children = this.#children.get(id);
    return children === undefined ? null : children.length === 0;
  }

  public depthOf(id: ID): number | null {
    return this.#depth.get(id) ?? null;
  }

  public ancestorsOf(id: ID): readonly ID[] | null {
    if (!this.#parent.has(id)) return null;
    const result: ID[] = [];
    let current = this.#parent.get(id) ?? null;
    while (current !== null) {
      result.push(current);
      current = this.#parent.get(current) ?? null;
    }
    return freezeArray(result);
  }

  public preorder(): Sequence<ID> {
    return new IndexedSequence(this.#preorder) as SequenceView<ID>;
  }

  public postorder(): Sequence<ID> {
    return new IndexedSequence(this.#postorder) as SequenceView<ID>;
  }

  public normalizeExpansion(expanded: Iterable<ID>): Expansion<ID> {
    const requested = new Set(expanded);
    const normalized = this.#preorder.filter(
      (id) => requested.has(id) && (this.#children.get(id)?.length ?? 0) > 0,
    );
    return new NormalizedExpansion(normalized);
  }

  public visible(expansion: Expansion<ID> | Iterable<ID>): Sequence<ID> {
    const normalized =
      expansion instanceof NormalizedExpansion
        ? expansion
        : this.normalizeExpansion(isExpansion(expansion) ? expansion.ids : expansion);
    const result: ID[] = [];
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
    return new IndexedSequence(result) as SequenceView<ID>;
  }
}

interface TraversalFrame<ID extends StableID> {
  readonly id: ID;
  readonly depth: number;
  nextChild: number;
}

export function createTree<ID extends StableID>(
  nodes: readonly TreeNodeInput<ID>[],
  options: TreeOptions = {},
): Result<Tree<ID>> {
  const maxItems = options.maxItems ?? 100_000;
  const maxDepth = options.maxDepth ?? 1_024;
  const maxIDCodeUnits = options.maxIDCodeUnits ?? DEFAULT_MAX_ID_CODE_UNITS;
  for (const [value, name] of [
    [maxItems, 'maxItems'],
    [maxDepth, 'maxDepth'],
    [maxIDCodeUnits, 'maxIDCodeUnits'],
  ] as const) {
    const error = validateSafeCeiling(value, name);
    if (error !== null) return { ok: false, error };
  }
  if (maxIDCodeUnits < 1) {
    return fail('construction', 'invalid-max-id-code-units', 'maxIDCodeUnits must be a positive safe integer.', { maxIDCodeUnits });
  }
  if (nodes.length > maxItems) {
    return fail('resource-rejection', 'item-ceiling-exceeded', 'Tree exceeds maxItems.', {
      size: nodes.length,
      maxItems,
    });
  }

  const parent = new Map<ID, ID | null>();
  const ids: ID[] = [];
  for (let index = 0; index < nodes.length; index += 1) {
    const node = nodes[index];
    if (node === undefined) {
      return fail('construction', 'invalid-node', 'Tree input must not contain sparse or missing nodes.', { index });
    }
    const idError = validateStableID(node.id, maxIDCodeUnits);
    if (idError !== null) return { ok: false, error: idError };
    if (parent.has(node.id)) {
      return fail('construction', 'duplicate-id', 'Tree identities must be unique.', {
        id: node.id,
        index,
      });
    }
    if (node.parentID === node.id) {
      return fail('construction', 'self-parent', 'A tree node cannot be its own parent.', {
        id: node.id,
      });
    }
    parent.set(node.id, node.parentID);
    ids.push(node.id);
  }
  for (const id of ids) {
    const parentID = parent.get(id) ?? null;
    if (parentID !== null && !parent.has(parentID)) {
      return fail('construction', 'missing-parent', 'Every non-root parent must exist.', {
        id,
        parentID,
      });
    }
  }

  const childrenMutable = new Map<ID, ID[]>();
  for (const id of ids) childrenMutable.set(id, []);
  const roots: ID[] = [];
  for (const id of ids) {
    const parentID = parent.get(id) ?? null;
    if (parentID === null) roots.push(id);
    else childrenMutable.get(parentID)?.push(id);
  }

  const marks = new Map<ID, 0 | 1 | 2>();
  const depth = new Map<ID, number>();
  const preorder: ID[] = [];
  const postorder: ID[] = [];
  for (const root of roots) {
    const stack: TraversalFrame<ID>[] = [{ id: root, depth: 0, nextChild: 0 }];
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

  const children = new Map<ID, readonly ID[]>();
  for (const [id, values] of childrenMutable) children.set(id, freezeArray(values));
  return ok(new IndexedTree(roots, parent, children, depth, preorder, postorder));
}

function isExpansion<ID extends StableID>(value: Expansion<ID> | Iterable<ID>): value is Expansion<ID> {
  return (
    typeof value === 'object' &&
    value !== null &&
    'ids' in value &&
    Array.isArray((value as Expansion<ID>).ids)
  );
}

export type { Result, StableID } from './shared.js';
