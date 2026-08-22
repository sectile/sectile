import type { StableID } from '../../shared.js';
import { assertNever } from '../kernel/foundation.js';

export type CursorFallback = 'none' | 'first' | 'last';

export interface CursorDomain<ID extends StableID = StableID> {
  readonly size: number;
  at(index: number): ID | null;
  contains(id: ID): boolean;
}

export interface CursorState<ID extends StableID = StableID> {
  readonly current: ID | null;
}

export function createCursorState<ID extends StableID>(
  current: ID | null = null,
): CursorState<ID> {
  return Object.freeze({ current });
}

export function reconcileCursor<ID extends StableID>(
  state: CursorState<ID>,
  domain: CursorDomain<ID>,
  fallback: CursorFallback,
): CursorState<ID> {
  if (state.current !== null && domain.contains(state.current)) return state;

  let next: ID | null;
  switch (fallback) {
    case 'none':
      next = null;
      break;
    case 'first':
      next = domain.at(0);
      break;
    case 'last':
      next = domain.at(domain.size - 1);
      break;
    default:
      return assertNever(fallback);
  }

  return state.current === next ? state : createCursorState(next);
}
