import type { Result, StableID } from './shared.js';
import type { Sequence } from './structures/sequence.js';
import { fail, ok } from './internal/kernel/foundation.js';
import { createMachineUpdate } from './internal/kernel/machine.js';
import {
  applyLinearChoiceEvent,
  createLinearChoiceState,
  type LinearChoiceCommand,
  type LinearChoicePolicies,
  type LinearChoiceState,
} from './internal/composites/linear-choice.js';

export type SelectEvent<ID extends StableID = StableID> =
  | 'open' | 'close' | 'toggle' | 'next' | 'previous' | 'first' | 'last' | 'select'
  | { readonly type: 'focus'; readonly id: ID }
  | { readonly type: 'select'; readonly id: ID };
export type SelectCommand<ID extends StableID = StableID> = LinearChoiceCommand<ID> | { readonly type: 'close-popup' };
export interface SelectState<ID extends StableID = StableID> { readonly open: boolean; readonly choice: LinearChoiceState<ID> }
export interface SelectStateInput<ID extends StableID = StableID> { readonly open?: boolean; readonly value?: ID | null; readonly current?: ID | null }
export type SelectPolicies<ID extends StableID = StableID> = Omit<LinearChoicePolicies<ID>, 'selectionFollowsFocus'>;
export interface SelectUpdate<ID extends StableID = StableID> { readonly state: SelectState<ID>; readonly commands: readonly SelectCommand<ID>[] }

export function createSelectState<ID extends StableID>(domain: Sequence<ID>, input: SelectStateInput<ID> = {}): Result<SelectState<ID>> {
  if (input.open !== undefined && typeof input.open !== 'boolean') return fail('construction', 'invalid-select-open', 'Select open state must be boolean.');
  const choice = createLinearChoiceState(domain, { selected: input.value === undefined || input.value === null ? [] : [input.value], current: input.current ?? input.value ?? null });
  return choice.ok ? ok(Object.freeze({ open: input.open ?? false, choice: choice.value })) : choice;
}

export function applySelectEvent<ID extends StableID>(domain: Sequence<ID>, state: SelectState<ID>, event: SelectEvent<ID>, policies: SelectPolicies<ID> = {}): Result<SelectUpdate<ID>> {
  const valid = createSelectState(domain, { open: state.open, value: state.choice.selection.selected[0] ?? null, current: state.choice.cursor.current });
  if (!valid.ok) return { ok: false, error: { ...valid.error, class: 'transition-rejection' } };
  if (event === 'open' || event === 'close' || event === 'toggle') {
    const open = event === 'toggle' ? !state.open : event === 'open';
    return createMachineUpdate(open === state.open ? state : Object.freeze({ open, choice: state.choice }));
  }
  const mapped = event === 'select' ? 'select' : event;
  const result = applyLinearChoiceEvent(domain, state.choice, mapped, { ...policies, selectionFollowsFocus: false });
  if (!result.ok) return result;
  const selecting = event === 'select' || (typeof event === 'object' && event.type === 'select');
  const commands: SelectCommand<ID>[] = [...result.value.commands];
  if (selecting) commands.push({ type: 'close-popup' });
  return createMachineUpdate(Object.freeze({ open: selecting ? false : true, choice: result.value.state }), commands);
}
