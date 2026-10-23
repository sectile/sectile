import type {
  TabularRowSelection,
  TabularRowID,
} from '@sectile/tabular';
import {
  rowSelectionContains,
} from '@sectile/tabular/data-table';
import type {
  TabularDOMRowSelectionAnchor,
  TabularDOMRowSelectionActivation,
  TabularDOMBulkSelectionState,
} from '../contracts.js';
import {
  type BindingScope,
  bindEvent,
} from './scope.js';

export { getAllMatchingSelectionState as allMatchingSelectionState } from '@sectile/tabular/data-table';

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

export function setBulkSelectionControlAttributes(
  element: HTMLElement,
  state: TabularDOMBulkSelectionState,
  disabled: boolean,
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
  element.setAttribute('aria-checked', state === 'indeterminate' ? 'mixed' : String(state === 'checked'));
  element.setAttribute('aria-disabled', String(disabled));
  element.setAttribute('data-state', state);
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

export function bindCheckboxActivation(
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
