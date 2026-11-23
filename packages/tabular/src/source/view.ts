import { fail, nextRevision, ok } from '../foundation.js';
import type { TabularLimits, TabularRequest, TabularResolvedRow, TabularResult, TabularRowID, TabularView, TabularViewResponse } from '../contracts.js';

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
  const base = removedRowsByView.get(view) ?? [];
  let ids: TabularRowID[] | undefined;
  for (const row of view.rows) {
    if (!(row as { readonly contextOnly?: boolean }).contextOnly) break;
    (ids ??= [...base]).push(row.id);
  }
  return ids ?? base;
}

export function visibleRowIndexOf(view: TabularView): VisibleRowIndex {
  const retained = rowIndexesByView.get(view);
  if (retained !== undefined) return retained;
  const indexes = new Map<TabularRowID, number>();
  for (let index = 0; index < view.rows.length; index += 1) indexes.set(view.rows[index]!.id, index);
  return indexes.size === 0 ? emptyVisibleRowIndex : Object.freeze({ indexes });
}

export function createContextParentIndexes(rows: readonly ({ readonly kind: 'leaf' } | {
  readonly kind: 'group';
  readonly depth: number;
})[]): Int32Array {
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

/** Retain only the last successful access and its context ancestors. */
export function createClientWindowReader(
  source: readonly TabularResolvedRow[] | ((index: number) => TabularResult<TabularResolvedRow>),
  parents: Int32Array | null,
  bounds?: { readonly limits: TabularLimits; readonly columns: number },
): (start: number, end: number) => TabularResult<readonly TabularResolvedRow[]> {
  let previous: {
    readonly start: number;
    readonly end: number;
    readonly context: ReadonlyMap<number, TabularResolvedRow> | null;
    readonly rows: readonly TabularResolvedRow[];
  } | null = null;
  const read = (index: number): TabularResult<TabularResolvedRow> => {
    if (typeof source !== 'function') return ok(source[index]!);
    if (previous !== null) {
      if (index >= previous.start && index < previous.end) {
        return ok(previous.rows[(previous.context?.size ?? 0) + index - previous.start]!);
      }
      const contextRow = previous.context?.get(index);
      if (contextRow !== undefined) return ok(contextRow);
    }
    return source(index);
  };
  return (start, end) => {
    if (previous?.start === start && previous.end === end) return ok(previous.rows);
    const ancestors: number[] = [];
    if (parents !== null && start < end) {
      for (let index = parents[start] ?? -1; index >= 0; index = parents[index] ?? -1) ancestors.push(index);
    }
    if (typeof source !== 'function') {
      const range = source.slice(start, end);
      const context = ancestors.reverse().map<TabularResolvedRow>((index) => Object.freeze({ ...source[index]!, contextOnly: true as const }));
      const rows = Object.freeze(context.length === 0 ? range : context.concat(range));
      previous = { start, end, context: null, rows };
      return ok(rows);
    }
    if (bounds !== undefined) {
      const exceeded = checkResponseRowBudget(end - start + ancestors.length, bounds.columns, bounds.limits);
      if (exceeded !== null) return exceeded;
    }
    const rows: TabularResolvedRow[] = [];
    const context = ancestors.length === 0 ? null : new Map<number, TabularResolvedRow>();
    for (let i = ancestors.length - 1; i >= 0; i -= 1) {
      const index = ancestors[i]!;
      const row = read(index);
      if (!row.ok) return row;
      context?.set(index, row.value);
      rows.push(Object.freeze({ ...row.value, contextOnly: true as const }));
    }
    for (let index = start; index < end; index += 1) {
      const row = read(index);
      if (!row.ok) return row;
      rows.push(row.value);
    }
    const frozen = Object.freeze(rows);
    previous = { start, end, context, rows: frozen };
    return ok(frozen);
  };
}

export function checkResponseRowBudget(rows: number, columns: number, limits: TabularLimits): TabularResult<never> | null {
  if (rows > limits.maxRows) return fail('resource-rejection', 'row-ceiling-exceeded', 'Response rows exceed the configured ceiling.');
  if (rows * columns > limits.maxProjectedCells) return fail('resource-rejection', 'projected-cell-ceiling-exceeded', 'Response projected cells exceed the configured ceiling.');
  return null;
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
    removedRowIDs: removedRowsByView.get(view) ?? [],
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
