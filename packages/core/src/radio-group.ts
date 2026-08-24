import { unwrap } from './result.js';
import type { Result, StableID } from './shared.js';
import type { Sequence } from './structures/sequence.js';
import {
  applyLinearChoiceEvent,
  createLinearChoiceState,
  type LinearChoiceCommand,
  type LinearChoicePolicies,
  type LinearChoiceState,
  type LinearChoiceStateInput,
  type LinearChoiceUpdate,
} from './internal/composites/linear-choice.js';

export type RadioGroupEvent<ID extends StableID = StableID> =
  | 'next'
  | 'previous'
  | 'first'
  | 'last'
  | 'check'
  | { readonly type: 'focus'; readonly id: ID }
  | { readonly type: 'check'; readonly id: ID };

export type RadioGroupCommand<ID extends StableID = StableID> =
  Extract<LinearChoiceCommand<ID>, { readonly type: 'focus' }>;
export type RadioGroupState<ID extends StableID = StableID> = LinearChoiceState<ID>;
export type RadioGroupStateInput<ID extends StableID = StableID> = LinearChoiceStateInput<ID>;
export type RadioGroupUpdate<ID extends StableID = StableID> =
  Omit<LinearChoiceUpdate<ID>, 'commands'>
  & { readonly commands: readonly RadioGroupCommand<ID>[] };
export type RadioGroupPolicies<ID extends StableID = StableID> =
  Omit<LinearChoicePolicies<ID>, 'selectionFollowsFocus'>;

export function createRadioGroupState<ID extends StableID>(
  domain: Sequence<ID>,
  input: RadioGroupStateInput<ID> = {},
): RadioGroupState<ID> {
  return unwrap(tryCreateRadioGroupState(domain, input));
}

export function tryCreateRadioGroupState<ID extends StableID>(
  domain: Sequence<ID>,
  input: RadioGroupStateInput<ID> = {},
): Result<RadioGroupState<ID>> {
  return createLinearChoiceState(domain, input);
}

export function applyRadioGroupEvent<ID extends StableID>(
  domain: Sequence<ID>,
  state: RadioGroupState<ID>,
  event: RadioGroupEvent<ID>,
  policies: RadioGroupPolicies<ID> = {},
): Result<RadioGroupUpdate<ID>> {
  const mapped = typeof event === 'object'
    ? event.type === 'check' ? { type: 'select' as const, id: event.id } : event
    : event === 'check' ? 'select' as const : event;
  const result = applyLinearChoiceEvent(domain, state, mapped, {
    boundary: 'wrap',
    ...policies,
    selectionFollowsFocus: true,
  });
  return result as Result<RadioGroupUpdate<ID>>;
}
