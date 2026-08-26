export type CollectionSelectionMode = 'single' | 'multiple';

export interface ReconciledCollectionState {
  readonly selected: readonly string[];
  readonly current: string | null;
  readonly selectionChanged: boolean;
  readonly currentChanged: boolean;
}

export function reconcileCollectionState(
  items: readonly string[],
  selected: readonly string[],
  current: string | null,
  disabledItems: readonly string[],
  mode: CollectionSelectionMode,
): ReconciledCollectionState {
  const selectedSet = new Set(selected);
  const selectedInDomain = items.filter((id) => selectedSet.has(id));
  const nextSelected = mode === 'single' ? selectedInDomain.slice(0, 1) : selectedInDomain;
  const disabled = new Set(disabledItems);
  const nextCurrent = current !== null && items.includes(current) && !disabled.has(current)
    ? current
    : nextSelected.find((id) => !disabled.has(id))
      ?? items.find((id) => !disabled.has(id))
      ?? null;
  return Object.freeze({
    selected: Object.freeze(nextSelected),
    current: nextCurrent,
    selectionChanged: !sameIDs(selected, nextSelected),
    currentChanged: current !== nextCurrent,
  });
}

export function sameIDs(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((id, index) => id === right[index]);
}
