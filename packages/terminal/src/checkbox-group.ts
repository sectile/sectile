import type { Result, StableID } from '@sectile/primitives';
import type { CheckboxGroupEvent, CheckboxGroupState } from '@sectile/primitives/checkbox-group';
import type { RevisionSnapshot } from '@sectile/primitives/revision';
import { createListbox, type ListboxConnection, type ListboxOptions } from './listbox.js';
import type { TerminalKeyboardInput } from './keyboard.js';

export type CheckboxGroupOptions<ID extends StableID = StableID> = Omit<ListboxOptions<ID>, 'selectionMode'>;
export interface CheckboxGroupConnection<ID extends StableID = StableID> {
  getSnapshot(): RevisionSnapshot<CheckboxGroupState<ID>>;
  syncControlledValues(values: { readonly value?: readonly ID[]; readonly highlightedValue?: ID | null }): Result<RevisionSnapshot<CheckboxGroupState<ID>>>;
  handleEvent(event: CheckboxGroupEvent<ID>): boolean;
  handleKeyboardInput(input: TerminalKeyboardInput): boolean;
}
export function createCheckboxGroup<ID extends StableID>(options: CheckboxGroupOptions<ID>): Result<CheckboxGroupConnection<ID>> {
  const result = createListbox({ ...options, selectionMode: 'multiple' });
  return result.ok ? { ok: true, value: result.value as ListboxConnection<ID> as CheckboxGroupConnection<ID> } : result;
}
