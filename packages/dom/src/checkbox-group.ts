import type { Result, StableID } from '@sectile/core';
import type { CheckboxGroupEvent, CheckboxGroupState } from '@sectile/core/checkbox-group';
import type { RevisionSnapshot } from '@sectile/core/revision';
import { createListbox, type ListboxConnection, type ListboxOptions } from './listbox.js';

export type CheckboxGroupOptions<ID extends StableID = StableID> = Omit<ListboxOptions<ID>, 'selectionMode'>;
export interface CheckboxGroupConnection<ID extends StableID = StableID> {
  getSnapshot(): RevisionSnapshot<CheckboxGroupState<ID>>;
  syncControlledValues(values: { readonly value?: readonly ID[]; readonly highlightedValue?: ID | null }): Result<RevisionSnapshot<CheckboxGroupState<ID>>>;
  setItemAttributes(element: HTMLElement, attributes: { readonly id: ID; readonly disabled?: boolean }): void;
  handleEvent(event: CheckboxGroupEvent<ID>): boolean;
  disconnect(): void;
}

export function createCheckboxGroup<ID extends StableID>(options: CheckboxGroupOptions<ID>): Result<CheckboxGroupConnection<ID>> {
  const result = createListbox({ ...options, selectionMode: 'multiple' });
  if (!result.ok) return result;
  options.root.setAttribute('role', 'group');
  options.root.removeAttribute('aria-multiselectable');
  return { ok: true, value: wrap(result.value, options.root) };
}

function wrap<ID extends StableID>(connection: ListboxConnection<ID>, root: HTMLElement): CheckboxGroupConnection<ID> {
  return Object.freeze({
    getSnapshot: () => connection.getSnapshot(),
    syncControlledValues: (values: { readonly value?: readonly ID[]; readonly highlightedValue?: ID | null }) => connection.syncControlledValues(values),
    setItemAttributes: (element: HTMLElement, attributes: { readonly id: ID; readonly disabled?: boolean }): void => {
      connection.setItemAttributes(element, attributes);
      element.setAttribute('role', 'checkbox');
      element.setAttribute('aria-checked', element.getAttribute('aria-selected') ?? 'false');
      element.removeAttribute('aria-selected');
    },
    handleEvent: (event: CheckboxGroupEvent<ID>) => connection.handleEvent(event),
    disconnect: (): void => { connection.disconnect(); root.removeAttribute('role'); },
  });
}
