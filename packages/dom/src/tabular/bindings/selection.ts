import type {
  TabularRowSelection,
  TabularRowID,
  TabularSnapshot,
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
  currentView,
} from '../projection.js';
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

export function allMatchingSelectionState(snapshot: TabularSnapshot): TabularDOMBulkSelectionState {
  const selection = snapshot.state.rowSelection;
  const view = currentView(snapshot);
  const count = view?.matchingLeafCount;
  const total = count?.kind === 'known' ? count.value : null;
  if (total === 0) return 'unchecked';
  if (selection.kind === 'explicit-rows') {
    const visibleLeafIDs = view?.rows.filter((row) => row.kind === 'leaf').map((row) => row.id) ?? [];
    const selectedVisibleCount = visibleLeafIDs.filter((rowID) => rowSelected(selection, rowID)).length;
    if (selectedVisibleCount === 0) return 'unchecked';
    return total !== null && visibleLeafIDs.length === total && selectedVisibleCount === total ? 'checked' : 'indeterminate';
  }
  if (selection.excludedRowIDs.length === 0) return 'checked';
  return total !== null && selection.excludedRowIDs.length >= total ? 'unchecked' : 'indeterminate';
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
