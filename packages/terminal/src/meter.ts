import type { Result, TiePolicy } from '@sectile/core';
import { tryCreateMeterState, type MeterInput, type MeterState, type MeterZone } from '@sectile/core/meter';
import { createRevisionSnapshot, type RevisionSnapshot } from '@sectile/core/revision';
import { unwrap } from '@sectile/core/result';

export interface MeterControlledValues extends MeterInput {}
export interface MeterOptions extends MeterControlledValues { readonly onUpdate?: () => void }
export interface MeterRenderPlan {
  readonly width: number;
  readonly filledCells: number;
  readonly emptyCells: number;
  readonly zone: MeterZone;
}
export interface MeterConnection {
  getSnapshot(): RevisionSnapshot<MeterState>;
  syncControlledValues(values: MeterControlledValues): Result<RevisionSnapshot<MeterState>>;
  getRenderPlan(width: number, tiePolicy?: TiePolicy): Result<MeterRenderPlan>;
}

export function createMeter(options: MeterOptions): MeterConnection {
  return unwrap(tryCreateMeter(options));
}

export function tryCreateMeter(options: MeterOptions): Result<MeterConnection> {
  const initial = tryCreateMeterState(options);
  if (!initial.ok) return initial;
  return { ok: true, value: new TerminalMeter(options, createRevisionSnapshot(initial.value)) };
}

class TerminalMeter implements MeterConnection {
  readonly #onUpdate: (() => void) | undefined;
  #snapshot: RevisionSnapshot<MeterState>;

  public constructor(options: MeterOptions, snapshot: RevisionSnapshot<MeterState>) {
    this.#onUpdate = options.onUpdate;
    this.#snapshot = snapshot;
  }

  public getSnapshot(): RevisionSnapshot<MeterState> {
    return this.#snapshot;
  }

  public syncControlledValues(values: MeterControlledValues): Result<RevisionSnapshot<MeterState>> {
    const next = tryCreateMeterState(values);
    if (!next.ok) return next;
    if (this.#snapshot.revision === Number.MAX_SAFE_INTEGER) return revisionCeiling();
    this.#snapshot = createRevisionSnapshot(next.value, this.#snapshot.revision + 1);
    this.#onUpdate?.();
    return { ok: true, value: this.#snapshot };
  }

  public getRenderPlan(width: number, tiePolicy: TiePolicy = 'lower'): Result<MeterRenderPlan> {
    const widthError = validateWidth(width);
    if (widthError !== null) return widthError;
    if (tiePolicy !== 'lower' && tiePolicy !== 'upper' && tiePolicy !== 'even-tick') {
      return invalidTiePolicy();
    }
    const state = this.#snapshot.state;
    const filledCells = allocateCells(state.ratio.numerator, state.ratio.denominator, width, tiePolicy);
    return {
      ok: true,
      value: Object.freeze({ width, filledCells, emptyCells: width - filledCells, zone: state.zone }),
    };
  }
}

function allocateCells(numerator: bigint, denominator: bigint, width: number, tiePolicy: TiePolicy): number {
  const scaled = numerator * BigInt(width);
  const floor = scaled / denominator;
  const remainder = scaled % denominator;
  if (remainder === 0n) return Number(floor);
  const comparison = remainder * 2n - denominator;
  if (comparison < 0n) return Number(floor);
  if (comparison > 0n) return Number(floor + 1n);
  if (tiePolicy === 'lower') return Number(floor);
  if (tiePolicy === 'upper') return Number(floor + 1n);
  return Number(floor % 2n === 0n ? floor : floor + 1n);
}

function validateWidth(width: number): Result<never> | null {
  if (Number.isSafeInteger(width) && width >= 0) return null;
  return {
    ok: false,
    error: {
      class: 'construction',
      code: 'invalid-count',
      message: 'Meter render width must be a non-negative safe integer.',
      details: { width },
    },
  };
}

function invalidTiePolicy(): Result<never> {
  return {
    ok: false,
    error: {
      class: 'construction',
      code: 'invalid-boundary',
      message: 'Meter render tie policy must be lower, upper, or even-tick.',
    },
  };
}

function revisionCeiling(): Result<never> {
  return {
    ok: false,
    error: {
      class: 'resource-rejection',
      code: 'revision-ceiling-reached',
      message: 'Meter revision cannot advance beyond the safe-integer ceiling.',
    },
  };
}
