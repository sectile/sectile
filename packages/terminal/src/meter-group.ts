import type { Result, StableID } from '@sectile/core';
import {
  tryCreateMeterGroupState,
  type MeterGroupInput,
  type MeterGroupState,
} from '@sectile/core/meter-group';
import type { MeterZone } from '@sectile/core/meter';
import { createRevisionSnapshot, type RevisionSnapshot } from '@sectile/core/revision';
import { unwrap } from '@sectile/core/result';

export interface MeterGroupControlledValues<ID extends StableID = StableID> extends MeterGroupInput<ID> {}
export interface MeterGroupOptions<ID extends StableID = StableID>
  extends MeterGroupControlledValues<ID> { readonly onUpdate?: () => void }
export interface MeterGroupRenderSegment<ID extends StableID = StableID> {
  readonly id: ID;
  readonly startCell: number;
  readonly cellCount: number;
}
export interface MeterGroupRenderPlan<ID extends StableID = StableID> {
  readonly width: number;
  readonly segments: readonly MeterGroupRenderSegment<ID>[];
  readonly remainingStartCell: number;
  readonly remainingCells: number;
  readonly zone: MeterZone;
}
export interface MeterGroupConnection<ID extends StableID = StableID> {
  getSnapshot(): RevisionSnapshot<MeterGroupState<ID>>;
  syncControlledValues(values: MeterGroupControlledValues<ID>): Result<RevisionSnapshot<MeterGroupState<ID>>>;
  getRenderPlan(width: number): Result<MeterGroupRenderPlan<ID>>;
}

export function createMeterGroup<ID extends StableID>(options: MeterGroupOptions<ID>): MeterGroupConnection<ID> {
  return unwrap(tryCreateMeterGroup(options));
}

export function tryCreateMeterGroup<ID extends StableID>(
  options: MeterGroupOptions<ID>,
): Result<MeterGroupConnection<ID>> {
  const initial = tryCreateMeterGroupState(options);
  if (!initial.ok) return initial;
  return { ok: true, value: new TerminalMeterGroup(options, createRevisionSnapshot(initial.value)) };
}

class TerminalMeterGroup<ID extends StableID> implements MeterGroupConnection<ID> {
  readonly #onUpdate: (() => void) | undefined;
  #snapshot: RevisionSnapshot<MeterGroupState<ID>>;

  public constructor(options: MeterGroupOptions<ID>, snapshot: RevisionSnapshot<MeterGroupState<ID>>) {
    this.#onUpdate = options.onUpdate;
    this.#snapshot = snapshot;
  }

  public getSnapshot(): RevisionSnapshot<MeterGroupState<ID>> {
    return this.#snapshot;
  }

  public syncControlledValues(
    values: MeterGroupControlledValues<ID>,
  ): Result<RevisionSnapshot<MeterGroupState<ID>>> {
    const next = tryCreateMeterGroupState(values);
    if (!next.ok) return next;
    if (this.#snapshot.revision === Number.MAX_SAFE_INTEGER) return revisionCeiling();
    this.#snapshot = createRevisionSnapshot(next.value, this.#snapshot.revision + 1);
    this.#onUpdate?.();
    return { ok: true, value: this.#snapshot };
  }

  public getRenderPlan(width: number): Result<MeterGroupRenderPlan<ID>> {
    const widthError = validateWidth(width);
    if (widthError !== null) return widthError;
    const state = this.#snapshot.state;
    const buckets = [
      ...state.segments.map((segment) => ({
        id: segment.id,
        numerator: segment.valueRatio.numerator,
        denominator: segment.valueRatio.denominator,
      })),
      { id: null, numerator: state.max === state.remaining ? 1n : remainingNumerator(state), denominator: state.ratio.denominator },
    ];
    const counts = allocateLargestRemainder(buckets, width);
    const segments: MeterGroupRenderSegment<ID>[] = [];
    let startCell = 0;
    for (let index = 0; index < state.segments.length; index += 1) {
      const segment = state.segments[index];
      if (segment === undefined) throw new Error('Internal invariant breach: MeterGroup segment allocation failed.');
      const cellCount = counts[index] ?? 0;
      segments.push(Object.freeze({ id: segment.id, startCell, cellCount }));
      startCell += cellCount;
    }
    return {
      ok: true,
      value: Object.freeze({
        width,
        segments: Object.freeze(segments),
        remainingStartCell: startCell,
        remainingCells: counts[counts.length - 1] ?? width,
        zone: state.zone,
      }),
    };
  }
}

interface AllocationBucket<ID extends StableID> {
  readonly id: ID | null;
  readonly numerator: bigint;
  readonly denominator: bigint;
}

function remainingNumerator<ID extends StableID>(state: MeterGroupState<ID>): bigint {
  return state.ratio.denominator - state.ratio.numerator;
}

function allocateLargestRemainder<ID extends StableID>(
  buckets: readonly AllocationBucket<ID>[],
  width: number,
): readonly number[] {
  const allocations = buckets.map((bucket, index) => {
    const scaled = bucket.numerator * BigInt(width);
    return {
      index,
      floor: scaled / bucket.denominator,
      remainderNumerator: scaled % bucket.denominator,
      remainderDenominator: bucket.denominator,
    };
  });
  const counts = allocations.map((allocation) => Number(allocation.floor));
  let remaining = width - counts.reduce((sum, count) => sum + count, 0);
  const order = [...allocations].sort((left, right) => {
    const comparison = left.remainderNumerator * right.remainderDenominator
      - right.remainderNumerator * left.remainderDenominator;
    return comparison === 0n ? left.index - right.index : comparison > 0n ? -1 : 1;
  });
  for (let index = 0; index < remaining; index += 1) {
    const allocation = order[index];
    if (allocation === undefined) throw new Error('Internal invariant breach: cell remainder exceeds bucket count.');
    counts[allocation.index] = (counts[allocation.index] ?? 0) + 1;
  }
  return Object.freeze(counts);
}

function validateWidth(width: number): Result<never> | null {
  if (Number.isSafeInteger(width) && width >= 0) return null;
  return {
    ok: false,
    error: {
      class: 'construction',
      code: 'invalid-count',
      message: 'MeterGroup render width must be a non-negative safe integer.',
      details: { width },
    },
  };
}

function revisionCeiling(): Result<never> {
  return {
    ok: false,
    error: {
      class: 'resource-rejection',
      code: 'revision-ceiling-reached',
      message: 'MeterGroup revision cannot advance beyond the safe-integer ceiling.',
    },
  };
}
