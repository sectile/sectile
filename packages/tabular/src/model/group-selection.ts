import type {
  TabularCommand, TabularGroupID, TabularGroupSelectionAggregate, TabularGroupSelectionIntent,
  TabularGroupSelectionProjection, TabularGroupSelectionScope, TabularLimits, TabularResult,
  TabularRowID, TabularRowSelection, TabularSnapshot, TabularState,
} from '../contracts.js';
import { fail, nextRevision, ok, validateID } from '../foundation.js';
import { applyRowSelectionIDs, createGroupLeafSelectionTarget, rowSelectionContains } from './selection.js';

export type GroupSelectionEvent =
  | { readonly type: 'sync-group-membership-revision'; readonly sourceGeneration: number; readonly queryRevision: number; readonly membershipRevision: number }
  | { readonly type: 'resolve-group-leaf-selection'; readonly requestID: number; readonly scope: TabularGroupSelectionScope; readonly changedRowIDs: readonly TabularRowID[] }
  | { readonly type: 'fail-group-leaf-selection'; readonly requestID: number; readonly scope: TabularGroupSelectionScope };

function isCurrentScope(state: TabularState, groupID: TabularGroupID, scope: TabularGroupSelectionScope): boolean {
  return scope?.groupID === groupID && scope.sourceGeneration === state.sourceGeneration
    && scope.queryRevision === state.queryRevision && scope.rowSelectionRevision === state.rowSelectionRevision
    && state.groupSelection.membershipRevision !== null && scope.membershipRevision === state.groupSelection.membershipRevision;
}

function validAggregate(state: TabularState, groupID: TabularGroupID, aggregate: TabularGroupSelectionAggregate | null): aggregate is TabularGroupSelectionAggregate {
  return aggregate != null && isCurrentScope(state, groupID, aggregate.scope)
    && Number.isSafeInteger(aggregate.totalLeafCount) && Number.isSafeInteger(aggregate.selectedLeafCount)
    && aggregate.selectedLeafCount >= 0 && aggregate.selectedLeafCount <= aggregate.totalLeafCount;
}

export function getGroupSelectionState(snapshot: TabularSnapshot, groupID: TabularGroupID, aggregate: TabularGroupSelectionAggregate | null): TabularGroupSelectionProjection {
  const state = snapshot.state;
  const pending = state.groupSelection.pending !== null;
  if (!validAggregate(state, groupID, aggregate)) return { state: 'unavailable', pending, disabled: true };
  return {
    state: aggregate.selectedLeafCount === 0 ? 'unchecked' : aggregate.selectedLeafCount === aggregate.totalLeafCount ? 'checked' : 'indeterminate',
    pending, disabled: pending || aggregate.totalLeafCount === 0,
  };
}

export function requestGroupSelection(
  state: TabularState, groupID: TabularGroupID, aggregate: TabularGroupSelectionAggregate, limits: TabularLimits,
): TabularResult<{ readonly state: TabularState; readonly commands: readonly TabularCommand[] }> {
  if (state.groupSelection.pending !== null) return fail('transition-rejection', 'group-selection-pending', 'A group selection request is already pending.');
  if (!validAggregate(state, groupID, aggregate) || aggregate.totalLeafCount === 0) {
    return fail('transition-rejection', 'group-selection-unavailable', 'Group selection requires a current nonempty aggregate.');
  }
  const target = createGroupLeafSelectionTarget(state.rowSelection, groupID, state.sourceGeneration, state.queryRevision, limits);
  if (!target.ok) return target;
  const selected = aggregate.selectedLeafCount !== aggregate.totalLeafCount;
  const changedRowCount = selected ? aggregate.totalLeafCount - aggregate.selectedLeafCount : aggregate.selectedLeafCount;
  if (changedRowCount > limits.maxSelectionIDs) return selectionCeiling();
  const revision = nextRevision(state.groupSelection.requestRevision);
  if (!revision.ok) return revision;
  const scope = Object.freeze({ groupID, sourceGeneration: state.sourceGeneration, queryRevision: state.queryRevision,
    rowSelectionRevision: state.rowSelectionRevision, membershipRevision: aggregate.scope.membershipRevision });
  const intent = Object.freeze({ requestID: revision.value, scope, selected, rowSelection: state.rowSelection, changedRowCount });
  const groupSelection = Object.freeze({ ...state.groupSelection, requestRevision: revision.value, pending: intent, error: null });
  return ok({ state: Object.freeze({ ...state, groupSelection }), commands: Object.freeze([
    { type: 'request-bulk-selection' as const, target: Object.freeze({ ...target.value, intent }) },
  ]) });
}

export function updateGroupSelection(state: TabularState, event: GroupSelectionEvent, limits: TabularLimits): TabularState {
  const current = state.groupSelection;
  if (event.type === 'sync-group-membership-revision') {
    if (event.sourceGeneration !== state.sourceGeneration || event.queryRevision !== state.queryRevision
      || !Number.isSafeInteger(event.membershipRevision) || event.membershipRevision < (current.membershipRevision ?? 0)
      || event.membershipRevision === current.membershipRevision) return state;
    return Object.freeze({ ...state, groupSelection: Object.freeze({ ...current,
      membershipRevision: event.membershipRevision, pending: null, error: null }) });
  }
  const pending = current.pending;
  if (pending === null || pending.requestID !== event.requestID || !isCurrentScope(state, pending.scope.groupID, event.scope)) return state;
  const result = event.type === 'fail-group-leaf-selection'
    ? fail('transition-rejection', 'group-selection-failed', 'The group selection request did not complete.')
    : applyGroupDelta(state, pending, event.changedRowIDs, limits);
  const groupSelection = Object.freeze({ ...current, pending: null, error: result.ok ? null : result.error });
  return Object.freeze({ ...state, rowSelection: result.ok ? result.value : state.rowSelection, groupSelection });
}

function invalidDelta(): TabularResult<never> {
  return fail('transition-rejection', 'invalid-group-selection-delta', 'The group delta must contain the exact changed row IDs.');
}

function selectionCeiling(): TabularResult<never> {
  return fail('resource-rejection', 'selection-id-ceiling-exceeded', 'Group selection exceeds the configured selection ceiling.');
}

function applyGroupDelta(
  state: TabularState, pending: TabularGroupSelectionIntent, rowIDs: readonly TabularRowID[], limits: TabularLimits,
): TabularResult<TabularRowSelection> {
  if (!Array.isArray(rowIDs)) return invalidDelta();
  if (rowIDs.length > limits.maxSelectionIDs) return selectionCeiling();
  if (rowIDs.length !== pending.changedRowCount) return invalidDelta();
  const ids = new Set<TabularRowID>();
  try {
    for (let index = 0; index < pending.changedRowCount; index++) {
      const id = rowIDs[index]!;
      const error = validateID(id, 'changedRowID', limits);
      if (error !== null) return { ok: false, error };
      if (ids.has(id) || rowSelectionContains(state.rowSelection, id) === pending.selected) return invalidDelta();
      ids.add(id);
    }
  } catch { return invalidDelta(); }
  return applyRowSelectionIDs(state.rowSelection, [...ids], pending.selected, limits);
}

/** Reconcile only accepted selection changes, independently of paging and view revisions. */
export function reconcileGroupSelection(previous: TabularState, next: TabularState, reset = false): TabularResult<TabularState> {
  const changedSelection = reset || previous.rowSelection !== next.rowSelection;
  const changedSource = reset || previous.sourceGeneration !== next.sourceGeneration || previous.queryRevision !== next.queryRevision;
  const revision = changedSelection ? nextRevision(previous.rowSelectionRevision) : ok(previous.rowSelectionRevision);
  if (!revision.ok) return revision;
  const group = next.groupSelection;
  const membershipRevision = changedSource ? null : group.membershipRevision;
  const requestRevision = reset ? previous.groupSelection.requestRevision : group.requestRevision;
  const pending = changedSelection || changedSource ? null : group.pending;
  if (revision.value === next.rowSelectionRevision && membershipRevision === group.membershipRevision
    && requestRevision === group.requestRevision && pending === group.pending && (!changedSource || group.error === null)) return ok(next);
  return ok(Object.freeze({ ...next, rowSelectionRevision: revision.value,
    groupSelection: Object.freeze({ membershipRevision, requestRevision, pending, error: changedSource ? null : group.error }) }));
}
