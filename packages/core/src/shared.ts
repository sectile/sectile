/** Shared public contracts for the canonical Sectile structures. */

import type { SectileErrorCode } from './error-code.js';

export type StableID = string;

export type ErrorClass =
  | 'construction'
  | 'transition-rejection'
  | 'resource-rejection'
  | 'internal-invariant';

export interface SectileError<Code extends SectileErrorCode = SectileErrorCode> {
  readonly class: ErrorClass;
  readonly code: Code;
  readonly message: string;
  readonly details?: Readonly<Record<string, unknown>>;
}

export type Result<T, Code extends SectileErrorCode = SectileErrorCode> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: SectileError<Code> };

export type BoundaryPolicy = 'stop' | 'wrap';
export type AxisBoundaryPolicy = 'stop' | 'wrap-axis';
export type Direction = -1 | 1;
export type GridDirection = 'left' | 'right' | 'up' | 'down';
export type TiePolicy = 'lower' | 'upper' | 'even-tick';

export interface ScanOptions<ID extends StableID> {
  readonly eligible?: (id: ID) => boolean;
  readonly maxScan?: number;
}

export type ScanEligiblePredicate<ID extends StableID> = NonNullable<ScanOptions<ID>['eligible']>;

export type MoveResult<ID extends StableID> =
  | { readonly kind: 'found'; readonly id: ID; readonly scanned: number }
  | { readonly kind: 'none'; readonly scanned: number }
  | {
      readonly kind: 'resource-rejected';
      readonly scanned: number;
      readonly error: SectileError;
    };

export interface ResourceCeilings {
  readonly maxIDCodeUnits?: number;
}

export const DEFAULT_MAX_ID_CODE_UNITS = 1_024;
