import type {
  TabularSnapshot,
  TabularView,
  TabularColumnID,
  TabularHeaderNodeID,
} from '@sectile/tabular';
import { projectTabularHeaders } from '@sectile/tabular/model';
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
  return projectTabularHeaders(view?.columnSchema ?? { columns: [], headers: [] }, columnIndexes);
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
