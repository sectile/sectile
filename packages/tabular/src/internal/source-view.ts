import { nextRevision, ok } from './foundation.js';
import type { TabularRequest, TabularResolvedRow, TabularResult, TabularRowID, TabularView, TabularViewResponse } from '../contracts.js';

export interface VisibleRowIndex {
  readonly indexes: ReadonlyMap<TabularRowID, number>;
}

export function nextClientViewRevision(
  currentSourceGeneration: number,
  sourceGeneration: number,
  currentViewRevision: number,
): TabularResult<number> {
  return sourceGeneration === currentSourceGeneration
    ? nextRevision(currentViewRevision)
    : ok(1);
}

const emptyVisibleRowIndex = Object.freeze({ indexes: new Map<TabularRowID, number>() });
const removedRowsByView = new WeakMap<object, readonly TabularRowID[]>();
const rowIndexesByView = new WeakMap<object, VisibleRowIndex>();
const preparedViews = new WeakMap<object, {
  readonly request: TabularRequest;
  readonly currentView: TabularView | null;
  readonly view: TabularView;
}>();

export function retainRemovedRowIDs<View extends TabularView>(
  view: View,
  removedRowIDs: readonly TabularRowID[],
  indexes?: ReadonlyMap<TabularRowID, number>,
): View {
  removedRowsByView.set(view, removedRowIDs);
  if (indexes !== undefined) rowIndexesByView.set(view, Object.freeze({ indexes }));
  return view;
}

export function removedRowIDsOf(view: TabularView): readonly TabularRowID[] {
  return removedRowsByView.get(view) ?? [];
}

export function visibleRowIndexOf(view: TabularView): VisibleRowIndex {
  const retained = rowIndexesByView.get(view);
  if (retained !== undefined) return retained;
  const indexes = new Map<TabularRowID, number>();
  for (let index = 0; index < view.rows.length; index += 1) indexes.set(view.rows[index]!.id, index);
  return indexes.size === 0 ? emptyVisibleRowIndex : Object.freeze({ indexes });
}

export function createContextParentIndexes(rows: readonly TabularResolvedRow[]): Int32Array {
  const parents = new Int32Array(rows.length);
  parents.fill(-1);
  const groups: number[] = [];
  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index]!;
    if (row.kind === 'group') {
      parents[index] = row.depth === 0 ? -1 : groups[row.depth - 1] ?? -1;
      groups.length = row.depth;
      groups[row.depth] = index;
    } else {
      parents[index] = groups.length === 0 ? -1 : groups[groups.length - 1] ?? -1;
    }
  }
  return parents;
}

export function sliceVisibleRows(
  projection: { readonly rows: readonly TabularResolvedRow[]; readonly contextParentIndexes: Int32Array | null },
  start: number,
  end: number,
): readonly TabularResolvedRow[] {
  const rows = projection.rows;
  if (start === 0 || start === end || projection.contextParentIndexes === null) {
    return Object.freeze(rows.slice(start, end));
  }
  const context: TabularResolvedRow[] = [];
  for (let index = projection.contextParentIndexes[start] ?? -1; index >= 0; index = projection.contextParentIndexes[index] ?? -1) {
    context.push(Object.freeze({ ...rows[index]!, contextOnly: true as const }));
  }
  context.reverse();
  return Object.freeze([...context, ...rows.slice(start, end)]);
}

export function createPreparedViewResponse(
  request: TabularRequest,
  currentView: TabularView | null,
  view: TabularView,
): TabularViewResponse {
  const response = Object.freeze({
    protocolVersion: 1 as const,
    requestID: view.requestID,
    sourceGeneration: view.sourceGeneration,
    queryRevision: view.queryRevision,
    expansionRevision: view.expansionRevision,
    viewRevision: view.viewRevision,
    access: view.access,
    matchingLeafCount: view.matchingLeafCount,
    visibleRowCount: view.visibleRowCount,
    rows: view.rows,
    columnSchema: view.columnSchema,
    removedRowIDs: removedRowIDsOf(view),
  });
  preparedViews.set(response, { request, currentView, view });
  return response;
}

export function preparedViewOf(
  response: TabularViewResponse,
  request: TabularRequest,
  currentView: TabularView | null,
): TabularView | undefined {
  const prepared = preparedViews.get(response);
  return prepared?.request === request && prepared.currentView === currentView ? prepared.view : undefined;
}
