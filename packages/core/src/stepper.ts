import { unwrap } from './result.js';
import type { Result, StableID } from './shared.js';
import type { Sequence } from './structures/sequence.js';
import { applyLinearChoiceEvent, createLinearChoiceState, type LinearChoiceCommand, type LinearChoicePolicies, type LinearChoiceState, type LinearChoiceUpdate } from './internal/composites/linear-choice.js';

export type StepperEvent<ID extends StableID = StableID> = 'next-step' | 'previous-step' | 'first-step' | 'last-step' | 'activate-step' | { readonly type: 'focus-step'; readonly id: ID } | { readonly type: 'activate-step'; readonly id: ID };
export type StepperCommand<ID extends StableID = StableID> = LinearChoiceCommand<ID>;
export type StepperState<ID extends StableID = StableID> = LinearChoiceState<ID>;
export type StepperPolicies<ID extends StableID = StableID> = Omit<LinearChoicePolicies<ID>, 'selectionFollowsFocus'>;
export type StepperUpdate<ID extends StableID = StableID> = LinearChoiceUpdate<ID>;

export function createStepperState<ID extends StableID>(domain: Sequence<ID>, value: ID | null = null, current: ID | null = value): StepperState<ID> {
  return unwrap(tryCreateStepperState(domain, value, current));
}

export function tryCreateStepperState<ID extends StableID>(domain: Sequence<ID>, value: ID | null = null, current: ID | null = value): Result<StepperState<ID>> {
  return createLinearChoiceState(domain, { current, selected: value === null ? [] : [value] });
}
export function applyStepperEvent<ID extends StableID>(domain: Sequence<ID>, state: StepperState<ID>, event: StepperEvent<ID>, policies: StepperPolicies<ID> = {}): Result<StepperUpdate<ID>> {
  const mapped = typeof event === 'object'
    ? { type: event.type === 'focus-step' ? 'focus' as const : 'select' as const, id: event.id }
    : event === 'next-step' ? 'next' as const : event === 'previous-step' ? 'previous' as const
      : event === 'first-step' ? 'first' as const : event === 'last-step' ? 'last' as const : 'select' as const;
  return applyLinearChoiceEvent(domain, state, mapped, { ...policies, selectionFollowsFocus: false });
}
