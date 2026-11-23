import type {
  TabularRowSelection,
  TabularRowID,
} from '@sectile/tabular';
import {
  getAllMatchingSelectionState,
  getGroupSelectionState,
  rowSelectionContains,
  type DataTableEvent,
} from '@sectile/tabular/data-table';
import type { TabularSnapshot } from '@sectile/tabular';
import type {
  TabularDOMRowSelectionAnchor,
  TabularDOMRowSelectionActivation,
  TabularDOMBulkSelectionState,
  BulkSelectionBindingOptions,
} from '../contracts.js';
import {
  type BindingScope,
  bindEvent,
} from './scope.js';

export function rowSelected(selection: TabularRowSelection, rowID: TabularRowID): boolean {
  return rowSelectionContains(selection, rowID);
}

export function rowSelectionActivation(
  selection: TabularRowSelection,
  projectionGeneration: number,
  anchor: TabularDOMRowSelectionAnchor | null,
  rowID: TabularRowID,
  shiftKey: boolean,
): TabularDOMRowSelectionActivation {
  const current = Object.freeze({ rowID, projectionGeneration });
  if (!shiftKey || anchor === null || anchor.projectionGeneration !== projectionGeneration) {
    return Object.freeze({ event: Object.freeze({ type: 'toggle-row-selection' as const, rowID }), anchor: current });
  }
  return Object.freeze({
    event: Object.freeze({
      type: 'set-row-selection-range' as const,
      anchorRowID: anchor.rowID,
      rowID,
      selected: !rowSelected(selection, rowID),
    }),
    anchor,
  });
}

export function setRowSelectionControlAttributes(
  element: HTMLElement,
  checked: boolean,
  disabled: boolean,
): void {
  if (element.tagName === 'INPUT') {
    const input = element as HTMLInputElement;
    input.checked = checked;
    input.indeterminate = false;
    input.disabled = disabled;
    return;
  }
  if (element.tagName === 'BUTTON') (element as HTMLButtonElement).disabled = disabled;
  else element.tabIndex = disabled ? -1 : 0;
  element.setAttribute('role', 'checkbox');
  element.setAttribute('aria-checked', String(checked));
  element.setAttribute('aria-disabled', String(disabled));
  element.setAttribute('data-state', checked ? 'checked' : 'unchecked');
}

function setBulkSelectionControlAttributes(
  element: HTMLElement,
  state: TabularDOMBulkSelectionState | 'unavailable',
  disabled: boolean,
  pending: boolean,
): void {
  if (element.tagName === 'INPUT') {
    const input = element as HTMLInputElement;
    input.type = 'checkbox';
    input.checked = state === 'checked';
    input.indeterminate = state === 'indeterminate';
    input.disabled = disabled;
  } else if (element.tagName === 'BUTTON') {
    (element as HTMLButtonElement).disabled = disabled;
  } else {
    element.tabIndex = disabled ? -1 : 0;
  }
  element.setAttribute('role', 'checkbox');
  if (state === 'unavailable') element.removeAttribute('aria-checked');
  else element.setAttribute('aria-checked', state === 'indeterminate' ? 'mixed' : String(state === 'checked'));
  element.setAttribute('aria-disabled', String(disabled));
  element.setAttribute('data-state', state);
  if (pending) element.setAttribute('aria-busy', 'true');
  else element.removeAttribute('aria-busy');
}

type BulkSelectionEvent = Extract<DataTableEvent, { type: 'set-row-selection' | 'select-all-matching' | 'request-group-leaf-selection' }>;

export function prepareBulkSelectionBinding(
  scope: BindingScope, element: HTMLElement, options: BulkSelectionBindingOptions,
  snapshot: () => TabularSnapshot, dispatch: (event: BulkSelectionEvent) => boolean,
): { readonly update: () => void; readonly dispose: () => void } {
  element.setAttribute('data-part', 'bulk-selection-control');
  const target = options.target;
  const read = 'groupSelection' in options ? options.groupSelection : undefined;
  const disabled = options.disabled === true;
  const update = (): void => {
    if (target.kind === 'all-matching') {
      setBulkSelectionControlAttributes(element, getAllMatchingSelectionState(snapshot()), disabled, false);
    } else if (read === undefined) {
      setBulkSelectionControlAttributes(element, 'unchecked', disabled, false);
    } else {
      const group = getGroupSelectionState(snapshot(), target.groupID, read());
      setBulkSelectionControlAttributes(element, group.state, disabled || group.disabled, group.pending);
    }
  };
  const activate = (): void => {
    if (disabled) { update(); return; }
    if (target.kind === 'all-matching') {
      if (!dispatch(getAllMatchingSelectionState(snapshot()) === 'checked'
        ? { type: 'set-row-selection', selection: { kind: 'explicit-rows', rowIDs: [] } }
        : { type: 'select-all-matching' })) update();
      return;
    }
    const aggregate = read?.();
    if (read !== undefined && (aggregate == null || getGroupSelectionState(snapshot(), target.groupID, aggregate).disabled)) { update(); return; }
    if (!dispatch({ type: 'request-group-leaf-selection', groupID: target.groupID, ...(aggregate == null ? {} : { aggregate }) })) update();
  };
  const disposers = bindCheckboxActivation(scope, element, activate);
  return { update, dispose: () => { for (const dispose of disposers) dispose(); element.removeAttribute('aria-busy'); } };
}

export function bindRowSelectionActivation(
  scope: BindingScope,
  element: HTMLElement,
  activate: (shiftKey: boolean) => void,
): readonly (() => void)[] {
  return Object.freeze([
    bindEvent(scope, element, 'click', (event) => activate(event.shiftKey)),
    bindEvent(scope, element, 'keydown', (event) => {
      if (event.key !== ' ' || event.ctrlKey || event.metaKey || event.altKey || event.isComposing) return;
      const native = element.tagName === 'INPUT' || element.tagName === 'BUTTON';
      if (native && !event.shiftKey) return;
      activate(event.shiftKey);
      event.preventDefault();
    }),
  ]);
}

function bindCheckboxActivation(
  scope: BindingScope,
  element: HTMLElement,
  activate: () => void,
): readonly (() => void)[] {
  return Object.freeze([
    bindEvent(scope, element, 'click', activate),
    bindEvent(scope, element, 'keydown', (event) => {
      if (event.key !== ' ' || event.shiftKey || event.ctrlKey || event.metaKey || event.altKey || event.isComposing) return;
      if (element.tagName === 'INPUT' || element.tagName === 'BUTTON') return;
      activate();
      event.preventDefault();
    }),
  ]);
}
