import { createFacadeConnection, type FacadeConnection } from '@sectile/core/adapter-runtime';
import { unwrap } from '@sectile/core/result';
import type { Result, StableID } from '@sectile/core';
import type { CheckboxGroupEvent, CheckboxGroupState } from '@sectile/core/checkbox-group';
import type { RevisionSnapshot } from '@sectile/core/revision';
import { tryCreateListbox, type ListboxConnection, type ListboxOptions } from './listbox.js';
import type { TerminalKeyboardInput } from './keyboard.js';

export type CheckboxGroupOptions<ID extends StableID = StableID> = Omit<ListboxOptions<ID>, 'selectionMode'>;
export interface CheckboxGroupConnection<ID extends StableID = StableID> {
  getSnapshot(): RevisionSnapshot<CheckboxGroupState<ID>>;
  syncControlledValues(values: { readonly value?: readonly ID[]; readonly highlightedValue?: ID | null }): Result<RevisionSnapshot<CheckboxGroupState<ID>>>;
  handleEvent(event: CheckboxGroupEvent<ID>): boolean;
  handleKeyboardInput(input: TerminalKeyboardInput): boolean;
}
export function createCheckboxGroup<ID extends StableID>(options: CheckboxGroupOptions<ID>): FacadeConnection<CheckboxGroupConnection<ID>> {
  return unwrap(tryCreateCheckboxGroup(options));
}

export function tryCreateCheckboxGroup<ID extends StableID>(options: CheckboxGroupOptions<ID>): Result<FacadeConnection<CheckboxGroupConnection<ID>>> {
  return createFacadeConnection(options, (options) => tryCreateCheckboxGroupConnection(options));
}

function tryCreateCheckboxGroupConnection<ID extends StableID>(options: CheckboxGroupOptions<ID>): Result<CheckboxGroupConnection<ID>> {
  const result = tryCreateListbox({ ...options, selectionMode: 'multiple' });
  return result.ok ? { ok: true, value: result.value as ListboxConnection<ID> as CheckboxGroupConnection<ID> } : result;
}
