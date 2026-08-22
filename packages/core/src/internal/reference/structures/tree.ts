import type { Expansion, Tree } from '../../../structures/tree.js';
import type { StableID } from '../../../shared.js';
import { freezeArray } from '../../kernel/foundation.js';
import { ReferenceSequence } from './sequence.js';

interface ReferenceNode<ID extends StableID> {
  readonly id: ID;
  readonly parentID: ID | null;
}

class ReferenceExpansion<ID extends StableID> implements Expansion<ID> {
  public readonly ids: readonly ID[];
  public constructor(ids: readonly ID[]) {
    this.ids = freezeArray(ids);
    Object.freeze(this);
  }
  public get size(): number { return this.ids.length; }
  public has(id: ID): boolean { return this.ids.includes(id); }
}

/** Flat-array ordered-forest oracle. Every observation is recomputed by scans. */
export class ReferenceTree<ID extends StableID> implements Tree<ID> {
  readonly #nodes: readonly ReferenceNode<ID>[];
  public readonly roots: ReferenceSequence<ID>;

  public constructor(nodes: readonly ReferenceNode<ID>[]) {
    this.#nodes = freezeArray(nodes.map((node) => Object.freeze({ ...node })));
    this.roots = new ReferenceSequence(
      this.#nodes.filter((node) => node.parentID === null).map((node) => node.id),
    );
    Object.freeze(this);
  }

  public get size(): number { return this.#nodes.length; }
  public has(id: ID): boolean { return this.#nodes.some((node) => node.id === id); }
  public parentOf(id: ID): ID | null {
    return this.#nodes.find((node) => node.id === id)?.parentID ?? null;
  }
  public childrenOf(id: ID): ReferenceSequence<ID> | null {
    if (!this.has(id)) return null;
    return new ReferenceSequence(
      this.#nodes.filter((node) => node.parentID === id).map((node) => node.id),
    );
  }
  public isLeaf(id: ID): boolean | null {
    return this.has(id) ? (this.childrenOf(id)?.size ?? 0) === 0 : null;
  }
  public depthOf(id: ID): number | null {
    if (!this.has(id)) return null;
    let depth = 0;
    let parent = this.parentOf(id);
    while (parent !== null) { depth += 1; parent = this.parentOf(parent); }
    return depth;
  }
  public ancestorsOf(id: ID): readonly ID[] | null {
    if (!this.has(id)) return null;
    const result: ID[] = [];
    let parent = this.parentOf(id);
    while (parent !== null) { result.push(parent); parent = this.parentOf(parent); }
    return freezeArray(result);
  }
  public preorder(): ReferenceSequence<ID> {
    const children = this.childrenTable();
    const result: ID[] = [];
    const stack = [...this.roots.ids].reverse();
    while (stack.length > 0) {
      const id = stack.pop();
      if (id === undefined) continue;
      result.push(id);
      const childIDs = children.get(id) ?? [];
      for (let index = childIDs.length - 1; index >= 0; index -= 1) {
        const child = childIDs[index];
        if (child !== undefined) stack.push(child);
      }
    }
    return new ReferenceSequence(result);
  }
  public postorder(): ReferenceSequence<ID> {
    const children = this.childrenTable();
    const result: ID[] = [];
    const stack = [...this.roots.ids].reverse().map((id) => ({ id, visited: false }));
    while (stack.length > 0) {
      const frame = stack.pop();
      if (frame === undefined) continue;
      if (frame.visited) {
        result.push(frame.id);
        continue;
      }
      stack.push({ id: frame.id, visited: true });
      const childIDs = children.get(frame.id) ?? [];
      for (let index = childIDs.length - 1; index >= 0; index -= 1) {
        const child = childIDs[index];
        if (child !== undefined) stack.push({ id: child, visited: false });
      }
    }
    return new ReferenceSequence(result);
  }
  public normalizeExpansion(expanded: Iterable<ID>): Expansion<ID> {
    const requested = [...expanded];
    return new ReferenceExpansion(
      this.preorder().ids.filter(
        (id) => requested.includes(id) && (this.childrenOf(id)?.size ?? 0) > 0,
      ),
    );
  }

  private childrenTable(): ReadonlyMap<ID | null, readonly ID[]> {
    const result = new Map<ID | null, ID[]>();
    result.set(null, []);
    for (const node of this.#nodes) result.set(node.id, []);
    for (const node of this.#nodes) result.get(node.parentID)?.push(node.id);
    return result;
  }
  public visible(expansion: Expansion<ID> | Iterable<ID>): ReferenceSequence<ID> {
    const normalized =
      expansion instanceof ReferenceExpansion
        ? expansion
        : this.normalizeExpansion(isExpansion(expansion) ? expansion.ids : expansion);
    const children = this.childrenTable();
    const result: ID[] = [];
    const stack = [...this.roots.ids].reverse();
    while (stack.length > 0) {
      const id = stack.pop();
      if (id === undefined) continue;
      result.push(id);
      if (!normalized.has(id)) continue;
      const childIDs = children.get(id) ?? [];
      for (let index = childIDs.length - 1; index >= 0; index -= 1) {
        const child = childIDs[index];
        if (child !== undefined) stack.push(child);
      }
    }
    return new ReferenceSequence(result);
  }
}

function isExpansion<ID extends StableID>(value: Expansion<ID> | Iterable<ID>): value is Expansion<ID> {
  return typeof value === 'object' && value !== null && 'ids' in value && 'has' in value;
}
