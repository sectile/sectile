import { unwrap } from '@sectile/core/result';
import { fail, ok, validateID } from './internal/foundation.js';
import type {
  TabularAggregate,
  TabularDescriptorID,
  TabularFilter,
  TabularGroup,
  TabularLimits,
  TabularPivot,
  TabularPolicyKey,
  TabularQuery,
  TabularQueryEvent,
  TabularQueryInput,
  TabularQueryValue,
  TabularResult,
  TabularSort,
} from './contracts.js';

const DEFAULT_QUERY_LIMITS: Pick<
  TabularLimits,
  | 'maxIDCodeUnits'
  | 'maxSortRules'
  | 'maxFilterRules'
  | 'maxGroupDescriptors'
  | 'maxAggregateDescriptors'
  | 'maxPivotDescriptors'
  | 'maxQueryValueDepth'
  | 'maxQueryValueCodeUnits'
  | 'maxQueryValueNodes'
> = Object.freeze({
  maxIDCodeUnits: 1_024,
  maxSortRules: 64,
  maxFilterRules: 256,
  maxGroupDescriptors: 64,
  maxAggregateDescriptors: 256,
  maxPivotDescriptors: 64,
  maxQueryValueDepth: 32,
  maxQueryValueCodeUnits: 1_048_576,
  maxQueryValueNodes: 100_000,
});

type QueryLimits = typeof DEFAULT_QUERY_LIMITS;
const QUERY_LIMITS = Symbol('sectile.tabular.query-limits');
type CanonicalQuery = TabularQuery & { readonly [QUERY_LIMITS]: QueryLimits };

export function createTabularQuery(
  input: TabularQueryInput = {},
  limits: QueryLimits = DEFAULT_QUERY_LIMITS,
): TabularQuery {
  return unwrap(tryCreateTabularQuery(input, limits));
}

export function tryCreateTabularQuery(
  input: TabularQueryInput = {},
  limits: QueryLimits = DEFAULT_QUERY_LIMITS,
): TabularResult<TabularQuery> {
  if (input === null || typeof input !== 'object' || Array.isArray(input)) {
    return fail('construction', 'invalid-query-descriptor', 'Tabular query input must be an object.');
  }
  if (QUERY_LIMITS in input && sameQueryLimits((input as CanonicalQuery)[QUERY_LIMITS], limits)) {
    return ok(input as CanonicalQuery);
  }
  const sort = normalizeSort(input.sort ?? [], limits);
  if (!sort.ok) return sort;
  const filters = normalizeFilters(input.filters ?? [], limits);
  if (!filters.ok) return filters;
  const groups = normalizeGroups(input.groups ?? [], limits);
  if (!groups.ok) return groups;
  const aggregates = normalizeAggregates(input.aggregates ?? [], limits);
  if (!aggregates.ok) return aggregates;
  const pivots = normalizePivots(input.pivots ?? [], aggregates.value, limits);
  if (!pivots.ok) return pivots;
  return ok(canonicalQuery({
    sort: sort.value,
    filters: filters.value,
    groups: groups.value,
    aggregates: aggregates.value,
    pivots: pivots.value,
  }, limits));
}

export function applyTabularQueryEvent(
  query: TabularQuery,
  event: TabularQueryEvent,
  limits: QueryLimits = DEFAULT_QUERY_LIMITS,
): TabularResult<TabularQuery> {
  const current = tryCreateTabularQuery(query, limits);
  if (!current.ok) return transitionFailure(current);
  if (event === null || typeof event !== 'object' || typeof event.type !== 'string') {
    return fail('transition-rejection', 'invalid-query-event', 'Tabular query event is invalid.');
  }
  switch (event.type) {
    case 'reset': return tryCreateTabularQuery({}, limits);
    case 'set-sort': return replaceQuerySlice(current.value, 'sort', normalizeSort(event.sort, limits), limits);
    case 'set-filters': return replaceQuerySlice(current.value, 'filters', normalizeFilters(event.filters, limits), limits);
    case 'set-groups': return replaceQuerySlice(current.value, 'groups', normalizeGroups(event.groups, limits), limits);
    case 'set-aggregates': {
      const aggregates = normalizeAggregates(event.aggregates, limits);
      if (!aggregates.ok) return asTransition(aggregates);
      const pivots = normalizePivots(current.value.pivots, aggregates.value, limits);
      if (!pivots.ok) return asTransition(pivots);
      return ok(canonicalQuery({ ...current.value, aggregates: aggregates.value, pivots: pivots.value }, limits));
    }
    case 'set-pivots': return replaceQuerySlice(
      current.value,
      'pivots',
      normalizePivots(event.pivots, current.value.aggregates, limits),
      limits,
    );
    default: return fail('transition-rejection', 'invalid-query-event', 'Tabular query event type is unknown.', { event });
  }
}

function replaceQuerySlice<Key extends keyof TabularQuery>(
  query: TabularQuery,
  key: Key,
  value: TabularResult<TabularQuery[Key]>,
  limits: QueryLimits,
): TabularResult<TabularQuery> {
  return value.ok
    ? ok(canonicalQuery({ ...query, [key]: value.value }, limits))
    : asTransition(value);
}

function canonicalQuery(query: TabularQuery, limits: QueryLimits): CanonicalQuery {
  const result = { ...query } as TabularQuery & { [QUERY_LIMITS]?: QueryLimits };
  Object.defineProperty(result, QUERY_LIMITS, { value: limits, enumerable: false });
  return Object.freeze(result) as CanonicalQuery;
}

function sameQueryLimits(left: QueryLimits, right: QueryLimits): boolean {
  return Object.keys(DEFAULT_QUERY_LIMITS).every((key) => (
    left[key as keyof QueryLimits] === right[key as keyof QueryLimits]
  ));
}

function normalizeSort(input: readonly TabularSort[], limits: QueryLimits): TabularResult<readonly TabularSort[]> {
  const array = requireArray(input, 'sort');
  if (!array.ok) return array;
  if (input.length > limits.maxSortRules) return ceiling('sort-rule-ceiling-exceeded', input.length, limits.maxSortRules);
  const ids = new Set<string>();
  const result: TabularSort[] = [];
  for (const descriptor of input) {
    const base = validateDescriptorBase(descriptor, ids, limits);
    if (!base.ok) return base;
    const column = validateID(descriptor.columnID, 'sort.columnID', limits);
    if (column !== null) return { ok: false, error: column };
    const policy = validatePolicy(descriptor.comparator, 'sort.comparator', limits);
    if (!policy.ok) return policy;
    if (descriptor.direction !== 'ascending' && descriptor.direction !== 'descending') {
      return fail('construction', 'invalid-query-descriptor', 'Sort direction must be ascending or descending.', { id: descriptor.id });
    }
    result.push(Object.freeze({ ...descriptor }));
  }
  return ok(Object.freeze(result));
}

function normalizeFilters(input: readonly TabularFilter[], limits: QueryLimits): TabularResult<readonly TabularFilter[]> {
  const array = requireArray(input, 'filters');
  if (!array.ok) return array;
  if (input.length > limits.maxFilterRules) return ceiling('filter-rule-ceiling-exceeded', input.length, limits.maxFilterRules);
  const ids = new Set<string>();
  const result: TabularFilter[] = [];
  for (const descriptor of input) {
    const base = validateDescriptorBase(descriptor, ids, limits);
    if (!base.ok) return base;
    if (descriptor.scope !== 'global' && descriptor.scope !== 'column') {
      return fail('construction', 'invalid-query-descriptor', 'Filter scope must be global or column.', { id: descriptor.id });
    }
    if (descriptor.scope === 'column') {
      const column = validateID(descriptor.columnID, 'filter.columnID', limits);
      if (column !== null) return { ok: false, error: column };
    } else if (descriptor.columnID !== undefined) {
      return fail('construction', 'invalid-query-descriptor', 'Global filters cannot identify one column.', { id: descriptor.id });
    }
    const policy = validatePolicy(descriptor.predicate, 'filter.predicate', limits);
    if (!policy.ok) return policy;
    if (descriptor.enabled !== undefined && typeof descriptor.enabled !== 'boolean') {
      return fail('construction', 'invalid-query-descriptor', 'Filter enabled must be boolean.', { id: descriptor.id });
    }
    const value = normalizeQueryValue(descriptor.value, limits);
    if (!value.ok) return value;
    result.push(Object.freeze({ ...descriptor, value: value.value, enabled: descriptor.enabled ?? true }));
  }
  return ok(Object.freeze(result));
}

function normalizeGroups(input: readonly TabularGroup[], limits: QueryLimits): TabularResult<readonly TabularGroup[]> {
  const array = requireArray(input, 'groups');
  if (!array.ok) return array;
  if (input.length > limits.maxGroupDescriptors) return ceiling('group-descriptor-ceiling-exceeded', input.length, limits.maxGroupDescriptors);
  const ids = new Set<string>();
  const result: TabularGroup[] = [];
  for (const descriptor of input) {
    const base = validateDescriptorBase(descriptor, ids, limits);
    if (!base.ok) return base;
    const column = validateID(descriptor.columnID, 'group.columnID', limits);
    if (column !== null) return { ok: false, error: column };
    const policy = validatePolicy(descriptor.policy, 'group.policy', limits);
    if (!policy.ok) return policy;
    result.push(Object.freeze({ ...descriptor }));
  }
  return ok(Object.freeze(result));
}

function normalizeAggregates(input: readonly TabularAggregate[], limits: QueryLimits): TabularResult<readonly TabularAggregate[]> {
  const array = requireArray(input, 'aggregates');
  if (!array.ok) return array;
  if (input.length > limits.maxAggregateDescriptors) return ceiling('aggregate-descriptor-ceiling-exceeded', input.length, limits.maxAggregateDescriptors);
  const ids = new Set<string>();
  const result: TabularAggregate[] = [];
  for (const descriptor of input) {
    const base = validateDescriptorBase(descriptor, ids, limits);
    if (!base.ok) return base;
    const column = validateID(descriptor.columnID, 'aggregate.columnID', limits);
    if (column !== null) return { ok: false, error: column };
    const policy = validatePolicy(descriptor.policy, 'aggregate.policy', limits);
    if (!policy.ok) return policy;
    result.push(Object.freeze({ ...descriptor }));
  }
  return ok(Object.freeze(result));
}

function normalizePivots(
  input: readonly TabularPivot[],
  aggregates: readonly TabularAggregate[],
  limits: QueryLimits,
): TabularResult<readonly TabularPivot[]> {
  const array = requireArray(input, 'pivots');
  if (!array.ok) return array;
  if (input.length > limits.maxPivotDescriptors) return ceiling('pivot-descriptor-ceiling-exceeded', input.length, limits.maxPivotDescriptors);
  const ids = new Set<string>();
  const aggregateDomain = new Set(aggregates.map((aggregate) => aggregate.id));
  const result: TabularPivot[] = [];
  for (const descriptor of input) {
    const base = validateDescriptorBase(descriptor, ids, limits);
    if (!base.ok) return base;
    const column = validateID(descriptor.columnID, 'pivot.columnID', limits);
    if (column !== null) return { ok: false, error: column };
    const policy = validatePolicy(descriptor.valuePolicy, 'pivot.valuePolicy', limits);
    if (!policy.ok) return policy;
    if (!Array.isArray(descriptor.aggregateIDs) || descriptor.aggregateIDs.length === 0
      || new Set(descriptor.aggregateIDs).size !== descriptor.aggregateIDs.length
      || descriptor.aggregateIDs.some((id) => !aggregateDomain.has(id))) {
      return fail('construction', 'invalid-query-descriptor', 'Pivot aggregate IDs must be unique existing aggregate descriptors.', { id: descriptor.id });
    }
    result.push(Object.freeze({ ...descriptor, aggregateIDs: Object.freeze([...descriptor.aggregateIDs]) }));
  }
  return ok(Object.freeze(result));
}

function validateDescriptorBase(
  descriptor: { readonly id: TabularDescriptorID } | null,
  ids: Set<string>,
  limits: QueryLimits,
): TabularResult<true> {
  if (descriptor === null || typeof descriptor !== 'object' || Array.isArray(descriptor)) {
    return fail('construction', 'invalid-query-descriptor', 'Every query descriptor must be an object.');
  }
  const id = validateID(descriptor.id, 'descriptor.id', limits);
  if (id !== null) return { ok: false, error: id };
  if (ids.has(descriptor.id)) return fail('construction', 'duplicate-identity', 'Descriptor IDs must be unique within their ordered list.', { id: descriptor.id });
  ids.add(descriptor.id);
  return ok(true);
}

function validatePolicy(value: TabularPolicyKey, label: string, limits: QueryLimits): TabularResult<true> {
  if (typeof value !== 'string' || value.length === 0) {
    return fail('construction', 'missing-policy-key', `${label} requires a stable policy key.`);
  }
  const error = validateID(value, label, limits);
  return error === null ? ok(true) : { ok: false, error };
}

function normalizeQueryValue(value: unknown, limits: QueryLimits): TabularResult<TabularQueryValue> {
  const stack = new WeakSet<object>();
  let nodes = 0;
  let codeUnits = 0;
  const visit = (current: unknown, depth: number): TabularResult<TabularQueryValue> => {
    nodes += 1;
    if (nodes > limits.maxQueryValueNodes) return ceiling('query-value-node-ceiling-exceeded', nodes, limits.maxQueryValueNodes);
    if (depth > limits.maxQueryValueDepth) return ceiling('query-value-depth-ceiling-exceeded', depth, limits.maxQueryValueDepth);
    if (current === null || typeof current === 'boolean') return ok(current);
    if (typeof current === 'number') {
      return Number.isFinite(current)
        ? ok(current)
        : fail('construction', 'invalid-query-value', 'Query numbers must be finite.');
    }
    if (typeof current === 'string') {
      codeUnits += current.length;
      return codeUnits > limits.maxQueryValueCodeUnits
        ? ceiling('query-value-code-unit-ceiling-exceeded', codeUnits, limits.maxQueryValueCodeUnits)
        : ok(current);
    }
    if (typeof current !== 'object') {
      return fail('construction', 'invalid-query-value', 'Query values must use the bounded JSON-like value algebra.');
    }
    if (stack.has(current)) return fail('construction', 'invalid-query-value', 'Cyclic query values are invalid.');
    stack.add(current);
    if (Array.isArray(current)) {
      for (let index = 0; index < current.length; index += 1) {
        if (!Object.hasOwn(current, index)) {
          stack.delete(current);
          return fail('construction', 'invalid-query-value', 'Sparse query arrays are invalid.');
        }
      }
      const result: TabularQueryValue[] = [];
      for (const item of current) {
        const normalized = visit(item, depth + 1);
        if (!normalized.ok) {
          stack.delete(current);
          return normalized;
        }
        result.push(normalized.value);
      }
      stack.delete(current);
      return ok(Object.freeze(result));
    }
    const prototype = Object.getPrototypeOf(current);
    if (prototype !== Object.prototype && prototype !== null) {
      stack.delete(current);
      return fail('construction', 'invalid-query-value', 'Query records must have an ordinary or null prototype.');
    }
    if (Object.getOwnPropertySymbols(current).length > 0) {
      stack.delete(current);
      return fail('construction', 'invalid-query-value', 'Query records cannot have symbol keys.');
    }
    const descriptors = Object.getOwnPropertyDescriptors(current);
    const entries: [string, TabularQueryValue][] = [];
    for (const key of Object.keys(descriptors).sort()) {
      const descriptor = descriptors[key];
      if (descriptor === undefined || !('value' in descriptor) || descriptor.get !== undefined || descriptor.set !== undefined) {
        stack.delete(current);
        return fail('construction', 'invalid-query-value', 'Query records cannot contain accessors.');
      }
      codeUnits += key.length;
      if (codeUnits > limits.maxQueryValueCodeUnits) {
        stack.delete(current);
        return ceiling('query-value-code-unit-ceiling-exceeded', codeUnits, limits.maxQueryValueCodeUnits);
      }
      const normalized = visit(descriptor.value, depth + 1);
      if (!normalized.ok) {
        stack.delete(current);
        return normalized;
      }
      entries.push([key, normalized.value]);
    }
    stack.delete(current);
    return ok(Object.freeze(Object.fromEntries(entries)) as Readonly<Record<string, TabularQueryValue>>);
  };
  return visit(value, 0);
}

function requireArray<T>(value: readonly T[], label: string): TabularResult<true> {
  return Array.isArray(value)
    ? ok(true)
    : fail('construction', 'invalid-query-descriptor', `${label} must be an array.`);
}

function ceiling<T>(code: Parameters<typeof fail<T>>[1], actual: number, limit: number): TabularResult<T> {
  return fail('resource-rejection', code, 'Query input exceeds its configured ceiling.', { actual, ceiling: limit });
}

function transitionFailure<T>(result: TabularResult<T>): TabularResult<never> {
  if (result.ok) throw new Error('Expected a failed result.');
  return fail('transition-rejection', result.error.code, result.error.message, result.error.details);
}

function asTransition<T>(result: TabularResult<T>): TabularResult<T> {
  return result.ok ? result : transitionFailure(result);
}

export type {
  TabularAggregate,
  TabularDescriptorID,
  TabularFilter,
  TabularGroup,
  TabularPivot,
  TabularPolicyKey,
  TabularQuery,
  TabularQueryEvent,
  TabularQueryInput,
  TabularQueryValue,
  TabularSort,
} from './contracts.js';
