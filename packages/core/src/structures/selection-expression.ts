import { unwrap } from '../result.js';
import {
  DEFAULT_MAX_ID_CODE_UNITS,
  type ResourceCeilings,
  type Result,
  type StableID,
} from '../shared.js';
import {
  fail,
  ok,
  validateSafeCeiling,
  validateStableID,
  validateUniqueIDs,
} from '../internal/kernel/foundation.js';
import type { Sequence } from './sequence.js';

export type SelectionExpressionKind = 'explicit' | 'complement';

export interface SelectionExpression<ID extends StableID = StableID> {
  readonly kind: SelectionExpressionKind;
  /** Canonical unique included IDs for explicit expressions, excluded IDs for complements. */
  readonly exceptions: readonly ID[];
  readonly exceptionCount: number;
  readonly maxExceptions: number;
  readonly maxIDCodeUnits: number;
  contains(id: ID): boolean;
}

export interface SelectionExpressionOptions extends ResourceCeilings {
  readonly maxExceptions?: number;
}

export const DEFAULT_MAX_SELECTION_EXCEPTIONS = 100_000;

export function createSelectionExpression<ID extends StableID>(
  kind: SelectionExpressionKind,
  exceptions: readonly ID[] = [],
  options: SelectionExpressionOptions = {},
): SelectionExpression<ID> {
  return unwrap(tryCreateSelectionExpression(kind, exceptions, options));
}

export function tryCreateSelectionExpression<ID extends StableID>(
  kind: SelectionExpressionKind,
  exceptions: readonly ID[] = [],
  options: SelectionExpressionOptions = {},
): Result<SelectionExpression<ID>> {
  if (kind !== 'explicit' && kind !== 'complement') {
    return fail('construction', 'invalid-selection-mode', 'Selection expression kind must be explicit or complement.', { kind });
  }
  const limits = tryLimits(options);
  if (!limits.ok) return limits;
  if (!Array.isArray(exceptions)) return fail('construction', 'invalid-boundary', 'Selection exceptions must be an array.');
  if (exceptions.length > limits.value.maxExceptions) return exceptionCeilingFailure(exceptions.length, limits.value.maxExceptions);
  const validated = validateUniqueIDs(exceptions, limits.value.maxIDCodeUnits);
  if (!validated.ok) return validated;
  return ok(createCanonicalExpression(kind, [...validated.value], limits.value));
}

export function containsSelectionID<ID extends StableID>(expression: SelectionExpression<ID>, id: ID): boolean {
  return expression.contains(id);
}

export function toggleSelectionID<ID extends StableID>(
  expression: SelectionExpression<ID>,
  id: ID,
  options: SelectionExpressionOptions = {},
): SelectionExpression<ID> {
  return setSelectionMembership(expression, id, !expression.contains(id), options);
}

export function includeSelectionID<ID extends StableID>(
  expression: SelectionExpression<ID>,
  id: ID,
  options: SelectionExpressionOptions = {},
): SelectionExpression<ID> {
  return setSelectionMembership(expression, id, true, options);
}

export function excludeSelectionID<ID extends StableID>(
  expression: SelectionExpression<ID>,
  id: ID,
  options: SelectionExpressionOptions = {},
): SelectionExpression<ID> {
  return setSelectionMembership(expression, id, false, options);
}

export function unionSelectionExpressions<ID extends StableID>(
  left: SelectionExpression<ID>,
  right: SelectionExpression<ID>,
  options: SelectionExpressionOptions = {},
): SelectionExpression<ID> {
  if (left === right) return left;
  if (left.kind === 'explicit' && right.kind === 'explicit') return algebraResult('explicit', merge(left.exceptions, right.exceptions, 'union'), left, right, options);
  if (left.kind === 'explicit') return algebraResult('complement', merge(right.exceptions, left.exceptions, 'subtract'), left, right, options);
  if (right.kind === 'explicit') return algebraResult('complement', merge(left.exceptions, right.exceptions, 'subtract'), left, right, options);
  return algebraResult('complement', merge(left.exceptions, right.exceptions, 'intersect'), left, right, options);
}

export function intersectSelectionExpressions<ID extends StableID>(
  left: SelectionExpression<ID>,
  right: SelectionExpression<ID>,
  options: SelectionExpressionOptions = {},
): SelectionExpression<ID> {
  if (left === right) return left;
  if (left.kind === 'explicit' && right.kind === 'explicit') return algebraResult('explicit', merge(left.exceptions, right.exceptions, 'intersect'), left, right, options);
  if (left.kind === 'explicit') return algebraResult('explicit', merge(left.exceptions, right.exceptions, 'subtract'), left, right, options);
  if (right.kind === 'explicit') return algebraResult('explicit', merge(right.exceptions, left.exceptions, 'subtract'), left, right, options);
  return algebraResult('complement', merge(left.exceptions, right.exceptions, 'union'), left, right, options);
}

export function subtractSelectionExpressions<ID extends StableID>(
  left: SelectionExpression<ID>,
  right: SelectionExpression<ID>,
  options: SelectionExpressionOptions = {},
): SelectionExpression<ID> {
  if (left === right) return createSelectionExpression('explicit', [], limitsFor(left, right, options));
  if (left.kind === 'explicit' && right.kind === 'explicit') return algebraResult('explicit', merge(left.exceptions, right.exceptions, 'subtract'), left, right, options);
  if (left.kind === 'explicit') return algebraResult('explicit', merge(left.exceptions, right.exceptions, 'intersect'), left, right, options);
  if (right.kind === 'explicit') return algebraResult('complement', merge(left.exceptions, right.exceptions, 'union'), left, right, options);
  return algebraResult('explicit', merge(right.exceptions, left.exceptions, 'subtract'), left, right, options);
}

export function materializeSelectionExpression<ID extends StableID>(
  expression: SelectionExpression<ID>,
  sequence: Sequence<ID>,
): readonly ID[] {
  const selected: ID[] = [];
  for (const id of sequence.ids) if (expression.contains(id)) selected.push(id);
  return Object.freeze(selected);
}

function setSelectionMembership<ID extends StableID>(
  expression: SelectionExpression<ID>,
  id: ID,
  selected: boolean,
  options: SelectionExpressionOptions,
): SelectionExpression<ID> {
  const limits = unwrap(tryLimits(limitsFor(expression, undefined, options)));
  const idError = validateStableID(id, limits.maxIDCodeUnits);
  if (idError !== null) return unwrap({ ok: false, error: idError });
  if (expression.contains(id) === selected) return expression;
  const shouldBeException = expression.kind === 'explicit' ? selected : !selected;
  const index = expression.exceptions.indexOf(id);
  const next = [...expression.exceptions];
  if (shouldBeException) {
    if (next.length >= limits.maxExceptions) return unwrap(exceptionCeilingFailure(next.length + 1, limits.maxExceptions));
    next.push(id);
  } else {
    next.splice(index, 1);
  }
  return createCanonicalExpression(expression.kind, next, limits);
}

interface SelectionLimits {
  readonly maxExceptions: number;
  readonly maxIDCodeUnits: number;
}

function tryLimits(options: SelectionExpressionOptions): Result<SelectionLimits> {
  const maxExceptions = options.maxExceptions ?? DEFAULT_MAX_SELECTION_EXCEPTIONS;
  const countError = validateSafeCeiling(maxExceptions, 'maxItems');
  if (countError !== null) return { ok: false, error: countError };
  const maxIDCodeUnits = options.maxIDCodeUnits ?? DEFAULT_MAX_ID_CODE_UNITS;
  const idError = validateSafeCeiling(maxIDCodeUnits, 'maxIDCodeUnits', 1);
  if (idError !== null) return { ok: false, error: idError };
  return ok(Object.freeze({ maxExceptions, maxIDCodeUnits }));
}

function limitsFor<ID extends StableID>(
  left: SelectionExpression<ID>,
  right: SelectionExpression<ID> | undefined,
  options: SelectionExpressionOptions,
): SelectionExpressionOptions {
  return {
    maxExceptions: options.maxExceptions ?? Math.max(left.maxExceptions, right?.maxExceptions ?? 0),
    maxIDCodeUnits: options.maxIDCodeUnits ?? Math.max(left.maxIDCodeUnits, right?.maxIDCodeUnits ?? 0),
  };
}

function createCanonicalExpression<ID extends StableID>(kind: SelectionExpressionKind, exceptions: ID[], limits: SelectionLimits): SelectionExpression<ID> {
  const frozenExceptions = Object.freeze(exceptions);
  const index = new Set(frozenExceptions);
  return Object.freeze({
    kind,
    exceptions: frozenExceptions,
    exceptionCount: frozenExceptions.length,
    maxExceptions: limits.maxExceptions,
    maxIDCodeUnits: limits.maxIDCodeUnits,
    contains(id: ID): boolean {
      const exception = index.has(id);
      return kind === 'explicit' ? exception : !exception;
    },
  });
}

function algebraResult<ID extends StableID>(
  kind: SelectionExpressionKind,
  exceptions: ID[],
  left: SelectionExpression<ID>,
  right: SelectionExpression<ID>,
  options: SelectionExpressionOptions,
): SelectionExpression<ID> {
  if (kind === left.kind && sameIDs(exceptions, left.exceptions)) return left;
  if (kind === right.kind && sameIDs(exceptions, right.exceptions)) return right;
  const limits = unwrap(tryLimits(limitsFor(left, right, options)));
  if (exceptions.length > limits.maxExceptions) return unwrap(exceptionCeilingFailure(exceptions.length, limits.maxExceptions));
  return createCanonicalExpression(kind, exceptions, limits);
}

function merge<ID extends StableID>(left: readonly ID[], right: readonly ID[], operation: 'union' | 'intersect' | 'subtract'): ID[] {
  const rightSet = new Set(right);
  if (operation === 'intersect') return left.filter((id) => rightSet.has(id));
  if (operation === 'subtract') return left.filter((id) => !rightSet.has(id));
  const output = [...left];
  const seen = new Set(left);
  for (const id of right) if (!seen.has(id)) output.push(id);
  return output;
}

function sameIDs<ID extends StableID>(left: readonly ID[], right: readonly ID[]): boolean {
  return left.length === right.length && left.every((id, index) => id === right[index]);
}

function exceptionCeilingFailure(count: number, maxExceptions: number): Result<never> {
  return fail('resource-rejection', 'item-ceiling-exceeded', 'Selection exceptions exceed maxExceptions.', { count, maxExceptions });
}
