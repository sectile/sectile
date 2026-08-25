import { createFacadeConnection, type FacadeConnection } from './internal/facade.js';
import { unwrap } from '@sectile/core/result';
import type { Result, StableID } from '@sectile/core';
import type { ToggleGroupEvent, ToggleGroupState } from '@sectile/core/toggle-group';
import type { RevisionSnapshot } from '@sectile/core/revision';
import { tryCreateListbox, type ListboxConnection, type ListboxOptions } from './listbox.js';
import type { ReadingDirection } from './internal/direction.js';

export type ToggleGroupOptions<ID extends StableID = StableID> =
  Omit<ListboxOptions<ID>, 'selectionMode' | 'activationMode' | 'clearOnEscape'>
  & { readonly multiple?: boolean; readonly deselectable?: boolean };

export interface ToggleGroupConnection<ID extends StableID = StableID> {
  getSnapshot(): RevisionSnapshot<ToggleGroupState<ID>>;
  syncControlledValues(values: { readonly value?: readonly ID[]; readonly highlightedValue?: ID | null }): Result<RevisionSnapshot<ToggleGroupState<ID>>>;
  setItemAttributes(element: HTMLElement, attributes: { readonly id: ID; readonly disabled?: boolean }): void;
  handleEvent(event: ToggleGroupEvent<ID>): boolean;
  handleKeyboardEvent(event: KeyboardEvent): boolean;
  disconnect(): void;
}

export interface ToggleGroupRootAttributesOptions {
  readonly orientation?: 'horizontal' | 'vertical';
  readonly direction?: ReadingDirection;
  readonly label?: string;
  readonly disabled?: boolean;
  readonly readOnly?: boolean;
}

export interface ToggleGroupItemAttributesOptions<ID extends StableID = StableID> {
  readonly id: ID;
  readonly pressed: boolean;
  readonly highlighted: boolean;
  readonly disabled?: boolean;
}

export function getToggleGroupRootAttributes(options: ToggleGroupRootAttributesOptions = {}): Readonly<Record<string, string | undefined>> {
  return Object.freeze({
    role: 'group',
    'aria-orientation': options.orientation ?? 'horizontal',
    dir: options.direction,
    'aria-label': options.label,
    'aria-disabled': options.disabled === true ? 'true' : undefined,
    'aria-readonly': options.readOnly === true ? 'true' : undefined,
    'data-scope': 'toggle-group',
    'data-part': 'root',
    'data-disabled': options.disabled === true ? '' : undefined,
    'data-readonly': options.readOnly === true ? '' : undefined,
  });
}

export function getToggleGroupItemAttributes<ID extends StableID>(options: ToggleGroupItemAttributesOptions<ID>): Readonly<Record<string, string | number | boolean | undefined>> {
  return Object.freeze({
    role: 'button', type: 'button',
    tabindex: options.disabled === true ? -1 : options.highlighted ? 0 : -1,
    'aria-pressed': String(options.pressed),
    'aria-disabled': options.disabled === true ? 'true' : undefined,
    disabled: options.disabled === true ? true : undefined,
    'data-toggle-group-id': String(options.id),
    'data-scope': 'toggle-group', 'data-part': 'item',
    'data-state': options.pressed ? 'on' : 'off',
    'data-highlighted': options.highlighted ? '' : undefined,
    'data-disabled': options.disabled === true ? '' : undefined,
  });
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
  if (!result.ok) return result;
  setRootAttributes(options.root, options);
  return { ok: true, value: wrap(result.value, options.root) };
}

function wrap<ID extends StableID>(connection: ListboxConnection<ID>, root: HTMLElement): ToggleGroupConnection<ID> {
  return Object.freeze({
    getSnapshot: () => connection.getSnapshot(),
    syncControlledValues: (values: { readonly value?: readonly ID[]; readonly highlightedValue?: ID | null }) => connection.syncControlledValues(values),
    setItemAttributes: (element: HTMLElement, attributes: { readonly id: ID; readonly disabled?: boolean }): void => {
      connection.setItemAttributes(element, attributes);
      const pressed = element.getAttribute('aria-selected') ?? 'false';
      element.setAttribute('role', 'button');
      if (element.tagName === 'BUTTON') element.setAttribute('type', 'button');
      element.setAttribute('aria-pressed', pressed);
      element.setAttribute('data-scope', 'toggle-group');
      element.setAttribute('data-part', 'item');
      element.setAttribute('data-state', pressed === 'true' ? 'on' : 'off');
      element.setAttribute('data-toggle-group-id', String(attributes.id));
      element.removeAttribute('aria-selected');
    },
    handleEvent: (event: ToggleGroupEvent<ID>) => connection.handleEvent(mapEvent(event)),
    handleKeyboardEvent: (event: KeyboardEvent) => connection.handleKeyboardEvent(event),
    disconnect: (): void => { connection.disconnect(); clearRootAttributes(root); },
  });
}

function mapEvent<ID extends StableID>(event: ToggleGroupEvent<ID>) {
  return typeof event === 'object'
    ? event.type === 'press' ? { type: 'toggle' as const, id: event.id } : event
    : event === 'press' ? 'toggle' as const : event;
}

function setRootAttributes<ID extends StableID>(root: HTMLElement, options: ToggleGroupOptions<ID>): void {
  for (const [name, value] of Object.entries(getToggleGroupRootAttributes(options))) {
    if (value === undefined) root.removeAttribute(name); else root.setAttribute(name, value);
  }
  root.removeAttribute('aria-multiselectable');
}

function clearRootAttributes(root: HTMLElement): void {
  for (const name of ['role', 'aria-orientation', 'aria-label', 'data-scope', 'data-part']) root.removeAttribute(name);
}
