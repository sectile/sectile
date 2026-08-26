import { createFacadeConnection, type FacadeConnection } from '@sectile/core/adapter-runtime';
import { unwrap } from '@sectile/core/result';
import type { Result, StableID } from '@sectile/core';
import type { ToggleGroupEvent, ToggleGroupState } from '@sectile/core/toggle-group';
import type { RevisionSnapshot } from '@sectile/core/revision';
import { tryCreateListbox, type ListboxConnection, type ListboxOptions } from './listbox.js';
import type { TerminalKeyboardInput } from './keyboard.js';

export type ToggleGroupOptions<ID extends StableID = StableID> =
  Omit<ListboxOptions<ID>, 'selectionMode' | 'activationMode' | 'clearOnEscape'>
  & { readonly multiple?: boolean; readonly deselectable?: boolean };

export interface ToggleGroupConnection<ID extends StableID = StableID> {
  getSnapshot(): RevisionSnapshot<ToggleGroupState<ID>>;
  syncControlledValues(values: { readonly value?: readonly ID[]; readonly highlightedValue?: ID | null }): Result<RevisionSnapshot<ToggleGroupState<ID>>>;
  handleEvent(event: ToggleGroupEvent<ID>): boolean;
  handleKeyboardInput(input: TerminalKeyboardInput): boolean;
}

export function createToggleGroup<ID extends StableID>(options: ToggleGroupOptions<ID>): FacadeConnection<ToggleGroupConnection<ID>> {
  return unwrap(tryCreateToggleGroup(options));
}

export function tryCreateToggleGroup<ID extends StableID>(options: ToggleGroupOptions<ID>): Result<FacadeConnection<ToggleGroupConnection<ID>>> {
  return createFacadeConnection(options, (options) => tryCreateToggleGroupConnection(options));
}

function tryCreateToggleGroupConnection<ID extends StableID>(options: ToggleGroupOptions<ID>): Result<ToggleGroupConnection<ID>> {
  const result = tryCreateListbox({
    ...options,
    activationMode: 'toggle', clearOnEscape: false,
    orientation: options.orientation ?? 'horizontal',
    selectionMode: options.multiple === true ? 'multiple' : 'single',
    policies: { ...options.policies, deselectable: options.deselectable ?? options.policies?.deselectable ?? true },
  });
  return result.ok ? { ok: true, value: wrap(result.value) } : result;
}

function wrap<ID extends StableID>(connection: ListboxConnection<ID>): ToggleGroupConnection<ID> {
  return Object.freeze({
    getSnapshot: () => connection.getSnapshot(),
    syncControlledValues: (values: { readonly value?: readonly ID[]; readonly highlightedValue?: ID | null }) => connection.syncControlledValues(values),
    handleEvent: (event: ToggleGroupEvent<ID>) => connection.handleEvent(mapEvent(event)),
    handleKeyboardInput: (input: TerminalKeyboardInput) => connection.handleKeyboardInput(input),
  });
}

function mapEvent<ID extends StableID>(event: ToggleGroupEvent<ID>) {
  return typeof event === 'object'
    ? event.type === 'press' ? { type: 'toggle' as const, id: event.id } : event
    : event === 'press' ? 'toggle' as const : event;
}
