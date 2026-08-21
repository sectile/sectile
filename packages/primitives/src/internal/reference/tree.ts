import type { Expansion, Tree } from '../../tree.js';
import type { StableId } from '../../shared.js';
import { freezeArray } from '../foundation.js';
import { ReferenceSequence } from './sequence.js';

interface ReferenceNode<Id extends StableId> {
  readonly id: Id;
  readonly parentId: Id | null;
}

class ReferenceExpansion<Id extends StableId> implements Expansion<Id> {
  public readonly ids: readonly Id[];
  public constructor(ids: readonly Id[]) {
    this.ids = freezeArray(ids);
    Object.freeze(this);
  }
  public get size(): number { return this.ids.length; }
  public has(id: Id): boolean { return this.ids.includes(id); }
}

/** Flat-array ordered-forest oracle. Every observation is recomputed by scans. */
export class ReferenceTree<Id extends StableId> implements Tree<Id> {
  readonly #nodes: readonly ReferenceNode<Id>[];
  public readonly roots: ReferenceSequence<Id>;

  public constructor(nodes: readonly ReferenceNode<Id>[]) {
    this.#nodes = freezeArray(nodes.map((node) => Object.freeze({ ...node })));
    this.roots = new ReferenceSequence(
      this.#nodes.filter((node) => node.parentId === null).map((node) => node.id),
    );
    Object.freeze(this);
  }

  public get size(): number { return this.#nodes.length; }
  public has(id: Id): boolean { return this.#nodes.some((node) => node.id === id); }
  public parentOf(id: Id): Id | null {
    return this.#nodes.find((node) => node.id === id)?.parentId ?? null;
  }
  public childrenOf(id: Id): ReferenceSequence<Id> | null {
    if (!this.has(id)) return null;
    return new ReferenceSequence(
      this.#nodes.filter((node) => node.parentId === id).map((node) => node.id),
    );
  }
  public isLeaf(id: Id): boolean | null {
    return this.has(id) ? (this.childrenOf(id)?.size ?? 0) === 0 : null;
  }
  public depthOf(id: Id): number | null {
    if (!this.has(id)) return null;
    let depth = 0;
    let parent = this.parentOf(id);
    while (parent !== null) { depth += 1; parent = this.parentOf(parent); }
    return depth;
  }
  public ancestorsOf(id: Id): readonly Id[] | null {
    if (!this.has(id)) return null;
    const result: Id[] = [];
    let parent = this.parentOf(id);
    while (parent !== null) { result.push(parent); parent = this.parentOf(parent); }
    return freezeArray(result);
  }
  public preorder(): ReferenceSequence<Id> {
    const children = this.childrenTable();
    const result: Id[] = [];
    const stack = [...this.roots.ids].reverse();
    while (stack.length > 0) {
      const id = stack.pop();
      if (id === undefined) continue;
      result.push(id);
      const childIds = children.get(id) ?? [];
      for (let index = childIds.length - 1; index >= 0; index -= 1) {
        const child = childIds[index];
        if (child !== undefined) stack.push(child);
      }
    }
    return new ReferenceSequence(result);
  }
  public postorder(): ReferenceSequence<Id> {
    const children = this.childrenTable();
    const result: Id[] = [];
    const stack = [...this.roots.ids].reverse().map((id) => ({ id, visited: false }));
    while (stack.length > 0) {
      const frame = stack.pop();
      if (frame === undefined) continue;
      if (frame.visited) {
        result.push(frame.id);
        continue;
      }
      stack.push({ id: frame.id, visited: true });
      const childIds = children.get(frame.id) ?? [];
      for (let index = childIds.length - 1; index >= 0; index -= 1) {
        const child = childIds[index];
        if (child !== undefined) stack.push({ id: child, visited: false });
      }
    }
    return new ReferenceSequence(result);
  }
  public normalizeExpansion(expanded: Iterable<Id>): Expansion<Id> {
    const requested = [...expanded];
    return new ReferenceExpansion(
      this.preorder().ids.filter(
        (id) => requested.includes(id) && (this.childrenOf(id)?.size ?? 0) > 0,
      ),
    );
  }

  private childrenTable(): ReadonlyMap<Id | null, readonly Id[]> {
    const result = new Map<Id | null, Id[]>();
    result.set(null, []);
    for (const node of this.#nodes) result.set(node.id, []);
    for (const node of this.#nodes) result.get(node.parentId)?.push(node.id);
    return result;
  }
  public visible(expansion: Expansion<Id> | Iterable<Id>): ReferenceSequence<Id> {
    const normalized =
      expansion instanceof ReferenceExpansion
        ? expansion
        : this.normalizeExpansion(isExpansion(expansion) ? expansion.ids : expansion);
    const children = this.childrenTable();
    const result: Id[] = [];
    const stack = [...this.roots.ids].reverse();
    while (stack.length > 0) {
      const id = stack.pop();
      if (id === undefined) continue;
      result.push(id);
      if (!normalized.has(id)) continue;
      const childIds = children.get(id) ?? [];
      for (let index = childIds.length - 1; index >= 0; index -= 1) {
        const child = childIds[index];
        if (child !== undefined) stack.push(child);
      }
    }
    return new ReferenceSequence(result);
  }
}

function isExpansion<Id extends StableId>(value: Expansion<Id> | Iterable<Id>): value is Expansion<Id> {
  return typeof value === 'object' && value !== null && 'ids' in value && 'has' in value;
}
