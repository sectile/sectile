import { unwrap } from './result.js';
import type { Result, StableID } from './shared.js';
import type { Sequence } from './structures/sequence.js';
import { fail } from './internal/kernel/foundation.js';
import {
  applyListboxEvent,
  createListboxState,
  type ListboxCommand,
  type ListboxPolicies,
  type ListboxState,
  type ListboxStateInput,
  type ListboxUpdate,
  tryCreateListboxState,
} from './internal/composites/listbox.js';

export type ToggleGroupEvent<ID extends StableID = StableID> =
  | 'next'
  | 'previous'
  | 'first'
  | 'last'
  | 'press'
  | { readonly type: 'focus'; readonly id: ID }
  | { readonly type: 'press'; readonly id: ID };
export type ToggleGroupCommand<ID extends StableID = StableID> =
  Extract<ListboxCommand<ID>, { readonly type: 'focus' }>;
export type ToggleGroupState<ID extends StableID = StableID> = ListboxState<ID>;
export type ToggleGroupStateInput<ID extends StableID = StableID> = ListboxStateInput<ID>;
export type ToggleGroupUpdate<ID extends StableID = StableID> =
  Omit<ListboxUpdate<ID>, 'commands'>
  & { readonly commands: readonly ToggleGroupCommand<ID>[] };
export type ToggleGroupPolicies<ID extends StableID = StableID> =
  Omit<ListboxPolicies<ID>, 'selectionMode' | 'selectionFollowsFocus'>
  & { readonly multiple?: boolean };

export function createToggleGroupState<ID extends StableID>(
  domain: Sequence<ID>,
  input: ToggleGroupStateInput<ID> = {},
  multiple = false,
): ToggleGroupState<ID> {
  return unwrap(tryCreateToggleGroupState(domain, input, multiple));
}

export function tryCreateToggleGroupState<ID extends StableID>(
  domain: Sequence<ID>,
  input: ToggleGroupStateInput<ID> = {},
  multiple = false,
): Result<ToggleGroupState<ID>> {
  if (typeof multiple !== 'boolean') {
    return fail('construction', 'invalid-toggle-group-multiple', 'Toggle group multiple must be boolean.');
  }
  return tryCreateListboxState(domain, input, multiple ? 'multiple' : 'single');
}

export function applyToggleGroupEvent<ID extends StableID>(
  domain: Sequence<ID>,
  state: ToggleGroupState<ID>,
  event: ToggleGroupEvent<ID>,
  policies: ToggleGroupPolicies<ID> = {},
): Result<ToggleGroupUpdate<ID>> {
  const { multiple = false, ...listboxPolicies } = policies;
  if (typeof multiple !== 'boolean') {
    return fail('transition-rejection', 'invalid-toggle-group-multiple', 'Toggle group multiple must be boolean.');
  }
  const mapped = typeof event === 'object'
    ? event.type === 'press' ? { type: 'toggle' as const, id: event.id } : event
    : event === 'press' ? 'toggle' as const : event;
  const result = applyListboxEvent(domain, state, mapped, {
    ...listboxPolicies,
    boundary: policies.boundary ?? 'wrap',
    deselectable: policies.deselectable ?? true,
    selectionMode: multiple ? 'multiple' : 'single',
    selectionFollowsFocus: false,
  });
  return result as Result<ToggleGroupUpdate<ID>>;
}
