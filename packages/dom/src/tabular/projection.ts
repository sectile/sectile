import type {
  TabularSnapshot,
  TabularView,
  TabularColumnID,
  TabularHeaderNode,
  TabularHeaderNodeID,
} from '@sectile/tabular';
import type {
  TabularHeaderMetrics,
  TabularDOMHeaderReference,
  ResolvedTabularHeaderReference,
} from './contracts.js';
import {
  stableIDElementToken,
} from '../identity.js';

export function currentView(snapshot: TabularSnapshot): TabularView | null {
  return snapshot.state.acceptedViewState.kind === 'none' ? null : snapshot.state.acceptedViewState.view;
}

export function orderedColumnIDs(snapshot: TabularSnapshot): readonly TabularColumnID[] {
  const state = snapshot.state.columnState;
  const hidden = new Set(state.hidden);
  const start = new Set(state.pinnedStart);
  const end = new Set(state.pinnedEnd);
  const visible = state.order.filter((id) => !hidden.has(id));
  return Object.freeze([
    ...visible.filter((id) => start.has(id)),
    ...visible.filter((id) => !start.has(id) && !end.has(id)),
    ...visible.filter((id) => end.has(id)),
  ]);
}

export function headerMetrics(snapshot: TabularSnapshot): readonly TabularHeaderMetrics[] {
  const columns = orderedColumnIDs(snapshot);
  const columnIndexes = new Map<TabularColumnID, number>();
  for (let index = 0; index < columns.length; index += 1) columnIndexes.set(columns[index]!, index + 1);
  return headerMetricsFromColumnIndexes(snapshot, columnIndexes);
}

export function headerMetricsFromColumnIndexes(
  snapshot: TabularSnapshot,
  columnIndexes: ReadonlyMap<TabularColumnID, number>,
): readonly TabularHeaderMetrics[] {
  const view = currentView(snapshot);
  const source: readonly TabularHeaderNode[] = view?.columnSchema.headers.length
    ? view.columnSchema.headers
    : (view?.columnSchema.columns ?? []).map((column) => ({
        kind: 'column' as const,
        id: column.headerNodeID ?? column.id,
        columnID: column.id,
        ...(column.label === undefined ? {} : { label: column.label }),
      }));
  const maximumDepth = Math.max(0, ...source.map(nodeDepth));
  const output: TabularHeaderMetrics[] = [];
  type Interval = { readonly start: number; readonly end: number; readonly count: number };
  const visit = (node: TabularHeaderNode, depth: number): Interval | null => {
    if (node.kind === 'column') {
      const index = columnIndexes.get(node.columnID);
      if (index === undefined) return null;
      output.push(Object.freeze({ headerNodeID: node.id, columnID: node.columnID, columnIndex: index, colSpan: 1, rowSpan: maximumDepth - depth + 1, depth }));
      return { start: index, end: index, count: 1 };
    }
    let start = Number.MAX_SAFE_INTEGER;
    let end = -1;
    let count = 0;
    for (const child of node.children) {
      const interval = visit(child, depth + 1);
      if (interval === null) continue;
      start = Math.min(start, interval.start);
      end = Math.max(end, interval.end);
      count += interval.count;
    }
    if (count === 0) return null;
    const span = end - start + 1;
    output.push(Object.freeze({ headerNodeID: node.id, columnID: null, columnIndex: start, colSpan: span, rowSpan: 1, depth }));
    return { start, end, count };
  };
  for (const node of source) visit(node, 0);
  return Object.freeze(output);
}

export function resolveHeaderReference(
  snapshot: TabularSnapshot,
  reference: TabularDOMHeaderReference,
): ResolvedTabularHeaderReference {
  const metrics = headerMetrics(snapshot);
  const metric = reference.columnID === undefined
    ? metrics.find((entry) => entry.headerNodeID === reference.headerNodeID)
    : metrics.find((entry) => entry.columnID === reference.columnID);
  const fallback = reference.columnID === undefined ? reference.headerNodeID : reference.columnID;
  return Object.freeze({
    headerNodeID: metric?.headerNodeID ?? fallback,
    metric,
  });
}

export function headerElementID(headerNodeID: TabularHeaderNodeID): string {
  return `sectile-tabular-header-${stableIDElementToken(headerNodeID)}`;
}

function nodeDepth(node: TabularHeaderNode): number {
  return node.kind === 'column' ? 0 : 1 + Math.max(0, ...node.children.map(nodeDepth));
}
