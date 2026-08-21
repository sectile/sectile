import type { StableId } from '../shared.js';
import { assertNever } from './foundation.js';

export type CursorFallback = 'none' | 'first' | 'last';

export interface CursorDomain<Id extends StableId = StableId> {
  readonly size: number;
  at(index: number): Id | null;
  contains(id: Id): boolean;
}

export interface CursorState<Id extends StableId = StableId> {
  readonly current: Id | null;
}

export function createCursorState<Id extends StableId>(
  current: Id | null = null,
): CursorState<Id> {
  return Object.freeze({ current });
}

export function reconcileCursor<Id extends StableId>(
  state: CursorState<Id>,
  domain: CursorDomain<Id>,
  fallback: CursorFallback,
): CursorState<Id> {
  if (state.current !== null && domain.contains(state.current)) return state;

  let next: Id | null;
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
