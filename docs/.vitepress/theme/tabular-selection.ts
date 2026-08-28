import type { TabularRowSelection } from '@sectile/tabular';
import type { CheckboxValue } from '@sectile/vue/checkbox';

interface SelectableRow {
  readonly id: string;
  readonly kind: 'leaf' | 'group';
}

export function rowSelectionValue(selection: TabularRowSelection, rowID: string): boolean {
  return selection.kind === 'explicit-rows'
    ? selection.rowIDs.includes(rowID)
    : !selection.excludedRowIDs.includes(rowID);
}

export function bulkSelectionValue(
  selection: TabularRowSelection,
  rows: readonly SelectableRow[],
): CheckboxValue {
  const rowIDs = rows.filter((row) => row.kind === 'leaf').map((row) => row.id);
  if (rowIDs.length === 0) return false;
  if (selection.kind === 'all-matching') {
    const excludedCount = rowIDs.filter((rowID) => selection.excludedRowIDs.includes(rowID)).length;
    if (excludedCount === 0) return true;
    return excludedCount === rowIDs.length ? false : 'indeterminate';
  }
  const selectedCount = rowIDs.filter((rowID) => selection.rowIDs.includes(rowID)).length;
  if (selectedCount === 0) return false;
  return selectedCount === rowIDs.length ? true : 'indeterminate';
}
