import type { Result, StableID } from './shared.js';
import type { Sequence } from './structures/sequence.js';
import { applyLinearChoiceEvent, createLinearChoiceState, type LinearChoiceCommand, type LinearChoicePolicies, type LinearChoiceState, type LinearChoiceUpdate } from './internal/composites/linear-choice.js';

export type PaginationEvent<ID extends StableID = StableID> = 'next-page' | 'previous-page' | 'first-page' | 'last-page' | { readonly type: 'go-to-page'; readonly id: ID };
export type PaginationCommand<ID extends StableID = StableID> = LinearChoiceCommand<ID>;
export type PaginationState<ID extends StableID = StableID> = LinearChoiceState<ID>;
export type PaginationPolicies<ID extends StableID = StableID> = Omit<LinearChoicePolicies<ID>, 'selectionFollowsFocus'>;
export type PaginationUpdate<ID extends StableID = StableID> = LinearChoiceUpdate<ID>;

export function createPaginationState<ID extends StableID>(domain: Sequence<ID>, page: ID | null = null): Result<PaginationState<ID>> {
  return createLinearChoiceState(domain, { current: page, selected: page === null ? [] : [page] });
}

export function applyPaginationEvent<ID extends StableID>(domain: Sequence<ID>, state: PaginationState<ID>, event: PaginationEvent<ID>, policies: PaginationPolicies<ID> = {}): Result<PaginationUpdate<ID>> {
  const mapped = typeof event === 'object' ? { type: 'select' as const, id: event.id }
    : event === 'next-page' ? 'next' as const : event === 'previous-page' ? 'previous' as const
      : event === 'first-page' ? 'first' as const : 'last' as const;
  return applyLinearChoiceEvent(domain, state, mapped, { ...policies, selectionFollowsFocus: true });
}
