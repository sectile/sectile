import type { Result, TiePolicy } from '@sectile/core';
import { tryCreateProgressState, type ProgressInput, type ProgressState, type ProgressStatus } from '@sectile/core/progress';
import { createRevisionSnapshot, type RevisionSnapshot } from '@sectile/core/revision';
import { unwrap } from '@sectile/core/result';

export interface ProgressControlledValues extends ProgressInput {}
export interface ProgressOptions extends ProgressControlledValues { readonly onUpdate?: () => void }
export interface ProgressRenderPlan {
  readonly mode: 'determinate' | 'indeterminate';
  readonly width: number;
  readonly filledCells: number | null;
  readonly emptyCells: number | null;
  readonly status: ProgressStatus;
}
export interface ProgressConnection {
  getSnapshot(): RevisionSnapshot<ProgressState>;
  syncControlledValues(values: ProgressControlledValues): Result<RevisionSnapshot<ProgressState>>;
  getRenderPlan(width: number, tiePolicy?: TiePolicy): Result<ProgressRenderPlan>;
}

export function createProgress(options: ProgressOptions = {}): ProgressConnection {
  return unwrap(tryCreateProgress(options));
}

export function tryCreateProgress(options: ProgressOptions = {}): Result<ProgressConnection> {
  const initial = tryCreateProgressState(options);
  if (!initial.ok) return initial;
  return { ok: true, value: new TerminalProgress(options, createRevisionSnapshot(initial.value)) };
}

class TerminalProgress implements ProgressConnection {
  readonly #onUpdate: (() => void) | undefined;
  #snapshot: RevisionSnapshot<ProgressState>;

  public constructor(options: ProgressOptions, snapshot: RevisionSnapshot<ProgressState>) {
    this.#onUpdate = options.onUpdate;
    this.#snapshot = snapshot;
  }

  public getSnapshot(): RevisionSnapshot<ProgressState> { return this.#snapshot; }

  public syncControlledValues(values: ProgressControlledValues): Result<RevisionSnapshot<ProgressState>> {
    const next = tryCreateProgressState(values);
    if (!next.ok) return next;
    if (this.#snapshot.revision === Number.MAX_SAFE_INTEGER) return revisionCeiling();
    this.#snapshot = createRevisionSnapshot(next.value, this.#snapshot.revision + 1);
    this.#onUpdate?.();
    return { ok: true, value: this.#snapshot };
  }

  public getRenderPlan(width: number, tiePolicy: TiePolicy = 'lower'): Result<ProgressRenderPlan> {
    const widthError = validateWidth(width);
    if (widthError !== null) return widthError;
    if (tiePolicy !== 'lower' && tiePolicy !== 'upper' && tiePolicy !== 'even-tick') return invalidTiePolicy();
    const state = this.#snapshot.state;
    if (state.ratio === null) {
      return { ok: true, value: Object.freeze({ mode: 'indeterminate', width, filledCells: null, emptyCells: null, status: state.status }) };
    }
    const filledCells = allocateCells(state.ratio.numerator, state.ratio.denominator, width, tiePolicy);
    return {
      ok: true,
      value: Object.freeze({ mode: 'determinate', width, filledCells, emptyCells: width - filledCells, status: state.status }),
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
  return { ok: false, error: { class: 'construction', code: 'invalid-count', message: 'Progress render width must be a non-negative safe integer.', details: { width } } };
}

function invalidTiePolicy(): Result<never> {
  return { ok: false, error: { class: 'construction', code: 'invalid-boundary', message: 'Progress render tie policy must be lower, upper, or even-tick.' } };
}

function revisionCeiling(): Result<never> {
  return { ok: false, error: { class: 'resource-rejection', code: 'revision-ceiling-reached', message: 'Progress revision cannot advance beyond the safe-integer ceiling.' } };
}
