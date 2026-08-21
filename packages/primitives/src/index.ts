/**
 * The root is intentionally type-only. Runtime consumers import one canonical
 * structure from @sectile/primitives/sequence, /range, /grid, or /tree.
 */
export type {
  AxisBoundaryPolicy,
  BoundaryPolicy,
  Direction,
  ErrorClass,
  GridDirection,
  MoveResult,
  ResourceCeilings,
  Result,
  ScanOptions,
  SectileError,
  StableId,
  TiePolicy,
} from './shared.js';
