import {
  createSelectionExpression,
  subtractSelectionExpressions,
  toggleSelectionID,
  tryCreateSelectionExpression,
  unionSelectionExpressions,
  type SelectionExpression,
} from '@sectile/core/selection-expression';
import { fail, ok, validateID } from './foundation.js';
import type {
  TabularGroupID,
  TabularLimits,
  TabularResult,
  TabularRow,
  TabularRowID,
  TabularRowSelection,
  TabularSelectionTarget,
} from '../contracts.js';

const rowSelectionExpressions = new WeakMap<object, SelectionExpression<TabularRowID>>();
type CanonicalRowSelection = TabularRowSelection;

export function createExplicitRowSelection(
  rowIDs: readonly TabularRowID[],
  limits: TabularLimits,
): TabularResult<TabularRowSelection> {
  const expression = createExpression('explicit', rowIDs, limits);
  return expression.ok ? ok(wrapExpression(expression.value)) : expression;
}

export function canonicalizeRowSelection(
  selection: TabularRowSelection,
  limits: TabularLimits,
): TabularResult<TabularRowSelection> {
  if (selection.kind === 'all-matching'
    && (!validGeneration(selection.sourceGeneration) || !validGeneration(selection.queryRevision))) {
    return fail('construction', 'invalid-controlled-shape', 'Selection bindings must be non-negative safe integers.');
  }
  const current = rowSelectionExpressions.get(selection);
  if (current !== undefined
    && current.maxExceptions === limits.maxSelectionIDs
    && current.maxIDCodeUnits === limits.maxIDCodeUnits) return ok(selection);
  const exceptions = selection.kind === 'explicit-rows' ? selection.rowIDs : selection.excludedRowIDs;
  const expression = createExpression(selection.kind === 'explicit-rows' ? 'explicit' : 'complement', exceptions, limits);
  return expression.ok ? ok(wrapExpression(expression.value, selection)) : expression;
}

export function rowSelectionContains(selection: TabularRowSelection, rowID: TabularRowID): boolean {
  return expressionOf(selection).contains(rowID);
}

export function toggleExplicitRowSelection(
  selection: TabularRowSelection,
  rowID: TabularRowID,
  limits: TabularLimits,
): TabularResult<TabularRowSelection> {
  const error = validateID(rowID, 'rowID', limits);
  if (error !== null) return { ok: false, error };
  const canonical = canonicalizeIfNeeded(selection, limits);
  if (!canonical.ok) return canonical;
  try {
    return ok(wrapExpression(toggleSelectionID(expressionOf(canonical.value), rowID, expressionOptions(limits)), canonical.value));
  } catch (cause) {
    return expressionFailure(cause, limits);
  }
}

export function setVisibleRowSelectionRange(
  selection: TabularRowSelection,
  visibleRowIDs: readonly TabularRowID[],
  anchorRowID: TabularRowID,
  rowID: TabularRowID,
  selected: boolean,
  limits: TabularLimits,
): TabularResult<TabularRowSelection> {
  const valid = validateRangeInput(anchorRowID, rowID, selected, limits);
  if (!valid.ok) return valid;
  const anchorIndex = visibleRowIDs.indexOf(anchorRowID);
  const rowIndex = visibleRowIDs.indexOf(rowID);
  if (anchorIndex === -1 || rowIndex === -1) return invalidRange(anchorRowID, rowID);
  return applyRangeSelection(
    selection,
    visibleRowIDs.slice(Math.min(anchorIndex, rowIndex), Math.max(anchorIndex, rowIndex) + 1),
    selected,
    limits,
  );
}

export function setIndexedVisibleRowSelectionRange(
  selection: TabularRowSelection,
  rows: readonly TabularRow[],
  indexes: ReadonlyMap<TabularRowID, number>,
  anchorRowID: TabularRowID,
  rowID: TabularRowID,
  selected: boolean,
  limits: TabularLimits,
): TabularResult<TabularRowSelection> {
  const valid = validateRangeInput(anchorRowID, rowID, selected, limits);
  if (!valid.ok) return valid;
  const anchorIndex = indexes.get(anchorRowID) ?? -1;
  const rowIndex = indexes.get(rowID) ?? -1;
  if (anchorIndex === -1 || rowIndex === -1
    || rows[anchorIndex]?.kind !== 'leaf' || rows[anchorIndex]?.id !== anchorRowID
    || rows[rowIndex]?.kind !== 'leaf' || rows[rowIndex]?.id !== rowID) return invalidRange(anchorRowID, rowID);
  const start = Math.min(anchorIndex, rowIndex);
  const end = Math.max(anchorIndex, rowIndex);
  const range: TabularRowID[] = [];
  for (let index = start; index <= end; index += 1) {
    const row = rows[index]!;
    if (row.kind === 'leaf') range.push(row.id);
  }
  return applyRangeSelection(selection, range, selected, limits);
}

function validateRangeInput(
  anchorRowID: TabularRowID,
  rowID: TabularRowID,
  selected: boolean,
  limits: TabularLimits,
): TabularResult<true> {
  const anchorError = validateID(anchorRowID, 'anchorRowID', limits);
  if (anchorError !== null) return { ok: false, error: anchorError };
  const rowError = validateID(rowID, 'rowID', limits);
  if (rowError !== null) return { ok: false, error: rowError };
  return typeof selected === 'boolean'
    ? ok(true)
    : fail('transition-rejection', 'invalid-selection-range', 'Range selection requires a boolean selected state.');
}

function invalidRange(anchorRowID: TabularRowID, rowID: TabularRowID): TabularResult<never> {
  return fail('transition-rejection', 'invalid-selection-range', 'Range selection endpoints must be visible leaf rows.', { anchorRowID, rowID });
}

function applyRangeSelection(
  selection: TabularRowSelection,
  rangeIDs: readonly TabularRowID[],
  selected: boolean,
  limits: TabularLimits,
): TabularResult<TabularRowSelection> {
  const canonical = canonicalizeIfNeeded(selection, limits);
  if (!canonical.ok) return canonical;
  const range = createExpression('explicit', rangeIDs, limits);
  if (!range.ok) return range;
  try {
    const current = expressionOf(canonical.value);
    const next = selected
      ? unionSelectionExpressions(current, range.value, expressionOptions(limits))
      : subtractSelectionExpressions(current, range.value, expressionOptions(limits));
    return ok(wrapExpression(next, canonical.value));
  } catch (cause) {
    return expressionFailure(cause, limits);
  }
}

export function selectAllMatchingRows(
  sourceGeneration: number,
  queryRevision: number,
  limits: TabularLimits,
): TabularResult<TabularRowSelection> {
  if (!validGeneration(sourceGeneration) || !validGeneration(queryRevision)) {
    return fail('transition-rejection', 'invalid-controlled-shape', 'Selection bindings must be non-negative safe integers.');
  }
  return ok(wrapExpression(createSelectionExpression('complement', [], expressionOptions(limits)), { sourceGeneration, queryRevision }));
}

export function reconcileRowSelectionBinding(
  selection: TabularRowSelection,
  sourceGeneration: number,
  queryRevision: number,
  sourceReplaced: boolean,
): TabularRowSelection {
  const current = expressionOf(selection);
  if (sourceReplaced) return wrapExpression(createSelectionExpression('explicit', [], current));
  if (selection.kind === 'all-matching'
    && (selection.sourceGeneration !== sourceGeneration || selection.queryRevision !== queryRevision)) {
    return wrapExpression(createSelectionExpression('explicit', [], current));
  }
  return selection;
}

export function reconcileAuthoritativeRowRemoval(
  selection: TabularRowSelection,
  removedRowIDs: readonly TabularRowID[],
): TabularRowSelection {
  if (removedRowIDs.length === 0) return selection;
  const current = expressionOf(selection);
  const removed = new Set(removedRowIDs);
  const retained = current.exceptions.filter((id) => !removed.has(id));
  if (retained.length === current.exceptionCount) return selection;
  return wrapExpression(createSelectionExpression(current.kind, retained, current), selection);
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
    ? expressionOf(selection).exceptions
    : Object.freeze([]);
  return ok(Object.freeze({ kind: 'group-leaves', sourceGeneration, queryRevision, groupID, excludedRowIDs: exclusions }));
}

function canonicalizeIfNeeded(selection: TabularRowSelection, limits: TabularLimits): TabularResult<TabularRowSelection> {
  return rowSelectionExpressions.has(selection) ? ok(selection) : canonicalizeRowSelection(selection, limits);
}

function expressionOf(selection: TabularRowSelection): SelectionExpression<TabularRowID> {
  const canonical = rowSelectionExpressions.get(selection);
  if (canonical !== undefined) return canonical;
  const exceptions = selection.kind === 'explicit-rows' ? selection.rowIDs : selection.excludedRowIDs;
  return createSelectionExpression(selection.kind === 'explicit-rows' ? 'explicit' : 'complement', exceptions, {
    maxExceptions: Math.max(100_000, exceptions.length),
  });
}

function createExpression(
  kind: 'explicit' | 'complement',
  exceptions: readonly TabularRowID[],
  limits: TabularLimits,
): TabularResult<SelectionExpression<TabularRowID>> {
  const result = tryCreateSelectionExpression(kind, exceptions, {
    maxExceptions: limits.maxSelectionIDs,
    maxIDCodeUnits: limits.maxIDCodeUnits,
  });
  if (result.ok) return ok(result.value);
  if (result.error.code === 'item-ceiling-exceeded') {
    return fail('resource-rejection', 'selection-id-ceiling-exceeded', 'Row selection exceeds the configured ceiling.', {
      actual: exceptions.length,
      ceiling: limits.maxSelectionIDs,
    });
  }
  if (result.error.code === 'duplicate-id') {
    return fail('construction', 'duplicate-identity', 'Row selection identities must be unique.', result.error.details);
  }
  return fail(result.error.class, 'invalid-controlled-shape', result.error.message, result.error.details);
}

function expressionOptions(limits: TabularLimits): { readonly maxExceptions: number; readonly maxIDCodeUnits: number } {
  return { maxExceptions: limits.maxSelectionIDs, maxIDCodeUnits: limits.maxIDCodeUnits };
}

function wrapExpression(
  expression: SelectionExpression<TabularRowID>,
  binding: Pick<Extract<TabularRowSelection, { kind: 'all-matching' }>, 'sourceGeneration' | 'queryRevision'> | TabularRowSelection | undefined = undefined,
): TabularRowSelection {
  const output: Record<PropertyKey, unknown> = expression.kind === 'explicit'
    ? { kind: 'explicit-rows', rowIDs: expression.exceptions }
    : {
        kind: 'all-matching',
        sourceGeneration: binding !== undefined && 'sourceGeneration' in binding ? binding.sourceGeneration : 0,
        queryRevision: binding !== undefined && 'queryRevision' in binding ? binding.queryRevision : 0,
        excludedRowIDs: expression.exceptions,
      };
  const selection = Object.freeze(output) as unknown as TabularRowSelection;
  rowSelectionExpressions.set(selection, expression);
  return selection;
}

function expressionFailure(cause: unknown, limits: TabularLimits): TabularResult<never> {
  if (cause instanceof Error && 'code' in cause && cause.code === 'item-ceiling-exceeded') {
    return fail('resource-rejection', 'selection-id-ceiling-exceeded', 'Row selection exceeds the configured ceiling.', {
      ceiling: limits.maxSelectionIDs,
    });
  }
  throw cause;
}

function validGeneration(value: number): boolean {
  return Number.isSafeInteger(value) && value >= 0;
}
