import { unwrap } from './result.js';
import type { Result, StableID } from './shared.js';
import type { Sequence } from './structures/sequence.js';
import {
  applyListboxEvent,
  createListboxState,
  type ListboxCommand,
  type ListboxEvent,
  type ListboxPolicies,
  type ListboxState,
  type ListboxStateInput,
  type ListboxUpdate,
  tryCreateListboxState,
} from './internal/composites/listbox.js';

export type CheckboxGroupEvent<ID extends StableID = StableID> = Exclude<ListboxEvent<ID>, 'activate'>;
export type CheckboxGroupCommand<ID extends StableID = StableID> = ListboxCommand<ID>;
export type CheckboxGroupState<ID extends StableID = StableID> = ListboxState<ID>;
export type CheckboxGroupStateInput<ID extends StableID = StableID> = ListboxStateInput<ID>;
export type CheckboxGroupPolicies<ID extends StableID = StableID> = Omit<ListboxPolicies<ID>, 'selectionMode' | 'selectionFollowsFocus'>;
export type CheckboxGroupUpdate<ID extends StableID = StableID> = ListboxUpdate<ID>;

export function createCheckboxGroupState<ID extends StableID>(
  domain: Sequence<ID>,
  input: CheckboxGroupStateInput<ID> = {},
): CheckboxGroupState<ID> {
  return unwrap(tryCreateCheckboxGroupState(domain, input));
}

export function tryCreateCheckboxGroupState<ID extends StableID>(
  domain: Sequence<ID>,
  input: CheckboxGroupStateInput<ID> = {},
): Result<CheckboxGroupState<ID>> {
  return tryCreateListboxState(domain, input, 'multiple');
}

export function applyCheckboxGroupEvent<ID extends StableID>(
  domain: Sequence<ID>,
  state: CheckboxGroupState<ID>,
  event: CheckboxGroupEvent<ID>,
  policies: CheckboxGroupPolicies<ID> = {},
): Result<CheckboxGroupUpdate<ID>> {
  return applyListboxEvent(domain, state, event, {
    ...policies,
    selectionMode: 'multiple',
    selectionFollowsFocus: false,
  });
}
