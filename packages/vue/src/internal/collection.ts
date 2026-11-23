import {
  tryReconcileCollectionIdentities,
  type CollectionSelectionMode,
  type ReconciledCollectionIdentities,
} from '@sectile/core/adapter-runtime';
import { sameStableIDOrder } from '@sectile/core/identity';
import { tryCreateTree } from '@sectile/core/tree';
import { shallowReactive, watch } from 'vue';

export type { CollectionSelectionMode } from '@sectile/core/adapter-runtime';

export type ReconciledCollectionState = ReconciledCollectionIdentities<string>;
export type ItemProjection = Map<string, true>;

export interface ReconcileCollectionOptions {
  readonly preserveNullCurrent?: boolean;
}

/**
 * Reconciles a collection in O(n + s + d) time and O(n + s + d) auxiliary
 * space, where n is items, s is selected identities, and d is disabled items.
 */
export function reconcileCollectionState(
  items: readonly string[],
  selected: readonly string[],
  current: string | null,
  disabledItems: readonly string[],
  mode: CollectionSelectionMode,
  options: ReconcileCollectionOptions = {},
): ReconciledCollectionState {
  const result = tryReconcileCollectionIdentities(
    items,
    selected,
    current,
    disabledItems,
    mode,
    options,
  );
  if (!result.ok) throw new TypeError(result.error.message);
  return result.value;
}

export function sameIDs(left: readonly string[], right: readonly string[]): boolean {
  return sameStableIDOrder(left, right);
}

export function invalidateItemProjection(
  projection: ItemProjection,
  id: string | null | undefined,
): void {
  if (id === null || id === undefined) return;
  projection.set(id, true);
  projection.delete(id);
}

/** A retained slot argument reads the values of its own publication. Only
 * properties read by a consumer subscribe that consumer to later changes. */
export function captureCollectionSlot<Fields extends object>(read: () => Fields) {
  let published = read();
  const tracked = shallowReactive({ ...published });
  let descriptors: PropertyDescriptorMap | undefined;
  let root: Readonly<Fields> | undefined;
  let live: Readonly<Fields> | undefined;
  watch(read, (next) => {
    published = next;
    descriptors = undefined;
    root = undefined;
    Object.assign(tracked, next);
  }, { flush: 'sync' });

  const createProps = <Props extends object>(): Props => {
    if (descriptors === undefined) {
      const captured = published;
      descriptors = {};
      for (const key of Object.keys(captured) as (keyof Fields & string)[]) {
        descriptors[key] = {
          enumerable: true,
          configurable: true,
          get: () => {
            void Reflect.get(tracked, key);
            return captured[key];
          },
        };
      }
    }
    return Object.defineProperties({} as Props, descriptors);
  };
  return {
    get value(): Readonly<Fields> { return root ??= Object.freeze(createProps<Fields>()); },
    get live(): Readonly<Fields> {
      if (live === undefined) {
        const props = {} as Fields;
        for (const key of Object.keys(published)) {
          Object.defineProperty(props, key, { enumerable: true, get: () => Reflect.get(tracked, key) });
        }
        live = Object.freeze(props);
      }
      return live;
    },
    with<Local extends object>(local: Local): Readonly<Omit<Fields, keyof Local> & Local> {
      const props = createProps<Omit<Fields, keyof Local> & Local>();
      return Object.freeze(Object.defineProperties(props, Object.getOwnPropertyDescriptors(local)));
    },
  };
}

/** Publish only the old and new active identities and retain zero tokens. */
export function projectActiveItem(read: () => string | null | undefined): (id: string) => boolean {
  const projection = shallowReactive<ItemProjection>(new Map());
  let active = read();
  watch(read, (next) => {
    const previous = active;
    active = next;
    invalidateItemProjection(projection, previous);
    invalidateItemProjection(projection, next);
  }, { flush: 'sync' });
  return (id) => {
    projection.get(id);
    return active === id;
  };
}

/** Diff selected or expanded identity sets only when their owner replaces them. */
export function projectItemMembership(read: () => readonly string[]): (id: string) => boolean {
  const projection = shallowReactive<ItemProjection>(new Map());
  let members = new Set(read());
  watch(read, (ids) => {
    const previous = members;
    members = new Set(ids);
    for (const id of previous) if (!members.has(id)) invalidateItemProjection(projection, id);
    for (const id of members) if (!previous.has(id)) invalidateItemProjection(projection, id);
  }, { flush: 'sync' });
  return (id) => {
    projection.get(id);
    return members.has(id);
  };
}

export function collectionBranchIDs(
  nodes: readonly Readonly<{ id: string; parentID: string | null }>[],
): readonly string[] {
  const tree = tryCreateTree(nodes);
  if (!tree.ok) throw new TypeError(tree.error.message);
  return Object.freeze(nodes
    .filter((node) => tree.value.isLeaf(node.id) === false)
    .map((node) => node.id));
}
