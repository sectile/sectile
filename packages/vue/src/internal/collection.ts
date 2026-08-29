import {
  tryReconcileCollectionIdentities,
  type CollectionSelectionMode,
  type ReconciledCollectionIdentities,
} from '@sectile/core/adapter-runtime';
import { sameStableIDOrder } from '@sectile/core/identity';
import { tryCreateTree } from '@sectile/core/tree';

export type { CollectionSelectionMode } from '@sectile/core/adapter-runtime';

export type ReconciledCollectionState = ReconciledCollectionIdentities<string>;

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

export function collectionBranchIDs(
  nodes: readonly Readonly<{ id: string; parentID: string | null }>[],
): readonly string[] {
  const tree = tryCreateTree(nodes);
  if (!tree.ok) throw new TypeError(tree.error.message);
  return Object.freeze(nodes
    .filter((node) => tree.value.isLeaf(node.id) === false)
    .map((node) => node.id));
}
