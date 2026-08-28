import { fail, ok, validateID } from './foundation.js';
import type {
  TabularGroupID,
  TabularLimits,
  TabularResult,
  TabularRowID,
  TabularRowSelection,
  TabularSelectionTarget,
} from '../contracts.js';

export function createExplicitRowSelection(
  rowIDs: readonly TabularRowID[],
  limits: TabularLimits,
): TabularResult<TabularRowSelection> {
  const ids = normalizeIDs(rowIDs, limits);
  return ids.ok ? ok(Object.freeze({ kind: 'explicit-rows', rowIDs: ids.value })) : ids;
}

export function toggleExplicitRowSelection(
  selection: TabularRowSelection,
  rowID: TabularRowID,
  limits: TabularLimits,
): TabularResult<TabularRowSelection> {
  const error = validateID(rowID, 'rowID', limits);
  if (error !== null) return { ok: false, error };
  const current = selection.kind === 'explicit-rows'
    ? [...selection.rowIDs]
    : [...selection.excludedRowIDs];
  const index = current.indexOf(rowID);
  if (index === -1) current.push(rowID);
  else current.splice(index, 1);
  const ids = normalizeIDs(current, limits);
  if (!ids.ok) return ids;
  return selection.kind === 'explicit-rows'
    ? ok(Object.freeze({ kind: 'explicit-rows', rowIDs: ids.value }))
    : ok(Object.freeze({ ...selection, excludedRowIDs: ids.value }));
}

export function setVisibleRowSelectionRange(
  selection: TabularRowSelection,
  visibleRowIDs: readonly TabularRowID[],
  anchorRowID: TabularRowID,
  rowID: TabularRowID,
  selected: boolean,
  limits: TabularLimits,
): TabularResult<TabularRowSelection> {
  const anchorError = validateID(anchorRowID, 'anchorRowID', limits);
  if (anchorError !== null) return { ok: false, error: anchorError };
  const rowError = validateID(rowID, 'rowID', limits);
  if (rowError !== null) return { ok: false, error: rowError };
  if (typeof selected !== 'boolean') {
    return fail('transition-rejection', 'invalid-selection-range', 'Range selection requires a boolean selected state.');
  }
  const anchorIndex = visibleRowIDs.indexOf(anchorRowID);
  const rowIndex = visibleRowIDs.indexOf(rowID);
  if (anchorIndex === -1 || rowIndex === -1) {
    return fail('transition-rejection', 'invalid-selection-range', 'Range selection endpoints must be visible leaf rows.', {
      anchorRowID,
      rowID,
    });
  }
  const start = Math.min(anchorIndex, rowIndex);
  const end = Math.max(anchorIndex, rowIndex);
  const range = new Set(visibleRowIDs.slice(start, end + 1));
  const current = selection.kind === 'explicit-rows'
    ? [...selection.rowIDs]
    : [...selection.excludedRowIDs];
  const next = new Set(current);
  const addRange = selection.kind === 'explicit-rows' ? selected : !selected;
  for (const candidate of range) {
    if (addRange) next.add(candidate);
    else next.delete(candidate);
  }
  const ids = normalizeIDs([...next], limits);
  if (!ids.ok) return ids;
  return selection.kind === 'explicit-rows'
    ? ok(Object.freeze({ kind: 'explicit-rows', rowIDs: ids.value }))
    : ok(Object.freeze({ ...selection, excludedRowIDs: ids.value }));
}

export function selectAllMatchingRows(
  sourceGeneration: number,
  queryRevision: number,
): TabularResult<TabularRowSelection> {
  if (!validGeneration(sourceGeneration) || !validGeneration(queryRevision)) {
    return fail('transition-rejection', 'invalid-controlled-shape', 'Selection bindings must be non-negative safe integers.');
  }
  return ok(Object.freeze({
    kind: 'all-matching',
    sourceGeneration,
    queryRevision,
    excludedRowIDs: Object.freeze([]),
  }));
}

export function reconcileRowSelectionBinding(
  selection: TabularRowSelection,
  sourceGeneration: number,
  queryRevision: number,
  sourceReplaced: boolean,
): TabularRowSelection {
  if (sourceReplaced) return Object.freeze({ kind: 'explicit-rows', rowIDs: Object.freeze([]) });
  if (selection.kind === 'all-matching'
    && (selection.sourceGeneration !== sourceGeneration || selection.queryRevision !== queryRevision)) {
    return Object.freeze({ kind: 'explicit-rows', rowIDs: Object.freeze([]) });
  }
  return selection;
}

export function reconcileAuthoritativeRowRemoval(
  selection: TabularRowSelection,
  removedRowIDs: readonly TabularRowID[],
): TabularRowSelection {
  if (removedRowIDs.length === 0) return selection;
  const removed = new Set(removedRowIDs);
  if (selection.kind === 'explicit-rows') {
    const rowIDs = selection.rowIDs.filter((id) => !removed.has(id));
    return rowIDs.length === selection.rowIDs.length
      ? selection
      : Object.freeze({ kind: 'explicit-rows', rowIDs: Object.freeze(rowIDs) });
  }
  const excludedRowIDs = selection.excludedRowIDs.filter((id) => !removed.has(id));
  return excludedRowIDs.length === selection.excludedRowIDs.length
    ? selection
    : Object.freeze({ ...selection, excludedRowIDs: Object.freeze(excludedRowIDs) });
}

export function createGroupLeafSelectionTarget(
  selection: TabularRowSelection,
  groupID: TabularGroupID,
  sourceGeneration: number,
  queryRevision: number,
  limits: TabularLimits,
): TabularResult<TabularSelectionTarget> {
  const error = validateID(groupID, 'groupID', limits);
  if (error !== null) return { ok: false, error };
  if (!validGeneration(sourceGeneration) || !validGeneration(queryRevision)) {
    return fail('transition-rejection', 'invalid-controlled-shape', 'Group selection bindings must be non-negative safe integers.');
  }
  const exclusions = selection.kind === 'all-matching'
    && selection.sourceGeneration === sourceGeneration
    && selection.queryRevision === queryRevision
    ? selection.excludedRowIDs
    : Object.freeze([]);
  return ok(Object.freeze({
    kind: 'group-leaves',
    sourceGeneration,
    queryRevision,
    groupID,
    excludedRowIDs: exclusions,
  }));
}

function normalizeIDs(
  input: readonly TabularRowID[],
  limits: TabularLimits,
): TabularResult<readonly TabularRowID[]> {
  if (!Array.isArray(input)) return fail('construction', 'invalid-controlled-shape', 'Row selection must be an array.');
  if (input.length > limits.maxSelectionIDs) {
    return fail('resource-rejection', 'selection-id-ceiling-exceeded', 'Row selection exceeds the configured ceiling.', {
      actual: input.length,
      ceiling: limits.maxSelectionIDs,
    });
  }
  const seen = new Set<string>();
  for (const id of input) {
    const error = validateID(id, 'rowID', limits);
    if (error !== null) return { ok: false, error };
    if (seen.has(id)) return fail('construction', 'duplicate-identity', 'Row selection identities must be unique.', { id });
    seen.add(id);
  }
  return ok(Object.freeze([...input]));
}

function validGeneration(value: number): boolean {
  return Number.isSafeInteger(value) && value >= 0;
}
