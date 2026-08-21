import type { StableId } from '../../shared.js';
import {
  type CursorDomain,
  type CursorFallback,
  type CursorState,
} from '../cursor.js';

export function reconcileReferenceCursor<Id extends StableId>(
  state: CursorState<Id>,
  domain: CursorDomain<Id>,
  fallback: CursorFallback,
): CursorState<Id> {
  let currentExists = false;
  if (state.current !== null) {
    for (let index = 0; index < domain.size; index += 1) {
      if (domain.at(index) === state.current) {
        currentExists = true;
        break;
      }
    }
  }
  if (currentExists) return state;

  const next =
    fallback === 'none'
      ? null
      : fallback === 'first'
        ? domain.at(0)
        : domain.at(domain.size - 1);
  return state.current === next ? state : Object.freeze({ current: next });
}
