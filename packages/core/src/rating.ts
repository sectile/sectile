import type { Result, StableID } from './shared.js';
import type { Sequence } from './structures/sequence.js';
import { createMachineUpdate } from './internal/kernel/machine.js';
import { clearSelection } from './internal/state/selection.js';
import { applyRadioGroupEvent, createRadioGroupState, type RadioGroupCommand, type RadioGroupPolicies, type RadioGroupState, type RadioGroupUpdate } from './radio-group.js';

export type RatingEvent<ID extends StableID = StableID> = 'increase' | 'decrease' | 'minimum' | 'maximum' | 'set' | 'clear' | { readonly type: 'focus'; readonly id: ID } | { readonly type: 'set'; readonly id: ID };
export type RatingCommand<ID extends StableID = StableID> = RadioGroupCommand<ID>;
export type RatingState<ID extends StableID = StableID> = RadioGroupState<ID>;
export type RatingPolicies<ID extends StableID = StableID> = RadioGroupPolicies<ID>;
export type RatingUpdate<ID extends StableID = StableID> = RadioGroupUpdate<ID>;

export function createRatingState<ID extends StableID>(domain: Sequence<ID>, value: ID | null = null): Result<RatingState<ID>> {
  return createRadioGroupState(domain, { current: value, selected: value === null ? [] : [value] });
}
export function applyRatingEvent<ID extends StableID>(domain: Sequence<ID>, state: RatingState<ID>, event: RatingEvent<ID>, policies: RatingPolicies<ID> = {}): Result<RatingUpdate<ID>> {
  if (event === 'clear') return createMachineUpdate(Object.freeze({ cursor: state.cursor, selection: clearSelection(state.selection) }));
  const mapped = typeof event === 'object' ? (event.type === 'set' ? { type: 'check' as const, id: event.id } : event)
    : event === 'increase' ? 'next' as const : event === 'decrease' ? 'previous' as const
      : event === 'minimum' ? 'first' as const : event === 'maximum' ? 'last' as const : 'check' as const;
  return applyRadioGroupEvent(domain, state, mapped, policies);
}
