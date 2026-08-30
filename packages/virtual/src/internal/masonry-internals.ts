export interface MasonryLayoutWork {
  readonly representation: 'uniform' | 'materialized';
  readonly copiedPlacements: number;
  readonly recomputedPlacements: number;
  readonly retainedPlacements: number;
}

const internalsByState = new WeakMap<object, object>();

export function registerMasonryInternals(state: object, value: object): void {
  internalsByState.set(state, value);
}

export function masonryInternals<Value extends object>(state: object): Value | undefined {
  return internalsByState.get(state) as Value | undefined;
}

export function masonryLayoutWork(state: object): MasonryLayoutWork | null {
  const value = internalsByState.get(state) as {
    readonly extent: number | null;
    readonly recomputeStart: number;
    readonly placements?: readonly unknown[];
  } | undefined;
  if (value === undefined) return null;
  const retained = value.placements?.length ?? 0;
  return Object.freeze({
    representation: value.extent === null ? 'materialized' : 'uniform',
    copiedPlacements: value.recomputeStart,
    recomputedPlacements: retained - value.recomputeStart,
    retainedPlacements: retained,
  });
}
