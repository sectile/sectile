/** Shared public contracts for the canonical Sectile structures. */

export type StableId = string;

export type ErrorClass =
  | 'construction'
  | 'transition-rejection'
  | 'resource-rejection'
  | 'internal-invariant';

export interface SectileError {
  readonly class: ErrorClass;
  readonly code: string;
  readonly message: string;
  readonly details?: Readonly<Record<string, unknown>>;
}

export type Result<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: SectileError };

export type BoundaryPolicy = 'stop' | 'wrap';
export type AxisBoundaryPolicy = 'stop' | 'wrap-axis';
export type Direction = -1 | 1;
export type GridDirection = 'left' | 'right' | 'up' | 'down';
export type TiePolicy = 'lower' | 'upper' | 'even-tick';

export interface ScanOptions<Id extends StableId> {
  readonly eligible?: (id: Id) => boolean;
  readonly maxScan?: number;
}

export type MoveResult<Id extends StableId> =
  | { readonly kind: 'found'; readonly id: Id; readonly scanned: number }
  | { readonly kind: 'none'; readonly scanned: number }
  | {
      readonly kind: 'resource-rejected';
      readonly scanned: number;
      readonly error: SectileError;
    };

export interface ResourceCeilings {
  readonly maxIdCodeUnits?: number;
}

export const DEFAULT_MAX_ID_CODE_UNITS = 1_024;
