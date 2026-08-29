import { unwrap } from '@sectile/core/result';
import { fail, ok, validateID } from './internal/foundation.js';
import { tryCreateTabularModel } from './model.js';
import { tryCreateTabularQuery } from './query.js';
import type {
  TabularAccessRange,
  TabularClientSourceOptions,
  TabularColumnDefinition,
  TabularColumnSchema,
  TabularComparisonPolicy,
  TabularCount,
  TabularLimits,
  TabularRequest,
  TabularResolvedRow,
  TabularResult,
  TabularRow,
  TabularRowID,
  TabularSource,
  TabularSort,
  TabularQuery,
  TabularPivotValue,
  TabularView,
  TabularViewResponse,
  TabularWireValue,
} from './contracts.js';

interface ClientSource<RecordValue> extends TabularSource {
  readonly options: TabularClientSourceOptions<RecordValue>;
  readonly limits: TabularLimits;
  readonly staticColumnIDs: ReadonlySet<string>;
  resolveProjection(request: TabularRequest): TabularResult<ClientProjectionStage<RecordValue>>;
}

interface ClientSourceStage<RecordValue> {
  readonly sourceGeneration: number;
  readonly records: readonly ClientRecordItem<RecordValue>[];
}

interface ClientQueryStage<RecordValue> {
  readonly source: ClientSourceStage<RecordValue>;
  readonly queryRevision: number;
  readonly query: TabularQuery;
  readonly filtered: readonly ClientRecordItem<RecordValue>[];
  readonly prepared: ClientPreparedProjection<RecordValue>;
}

interface ClientProjectionStage<RecordValue> {
  readonly query: ClientQueryStage<RecordValue>;
  readonly expansionRevision: number;
  readonly projection: ClientProjection;
}

class ClientSourceRuntime<RecordValue> implements ClientSource<RecordValue> {
  // sourceGeneration covers records, row/value accessors, and callback-policy observations.
  public readonly options: TabularClientSourceOptions<RecordValue>;
  public readonly limits: TabularLimits;
  public readonly staticColumnIDs: ReadonlySet<string>;
  #sourceStage: ClientSourceStage<RecordValue> | null = null;
  #queryStage: ClientQueryStage<RecordValue> | null = null;
  #projectionStage: ClientProjectionStage<RecordValue> | null = null;
  #viewSourceGeneration = -1;
  #viewRevision = 0;

  public constructor(options: TabularClientSourceOptions<RecordValue>, limits: TabularLimits) {
    this.options = options;
    this.limits = limits;
    this.staticColumnIDs = new Set(options.columnSchema.columns.map((column) => column.id));
  }

  public resolve(request: TabularRequest): TabularResult<TabularViewResponse> {
    if (this.#viewSourceGeneration >= 0 && request.sourceGeneration < this.#viewSourceGeneration) {
      return fail('transition-rejection', 'stale-source-generation', 'Client source generation cannot move backward.');
    }
    const viewRevision = request.sourceGeneration === this.#viewSourceGeneration ? this.#viewRevision + 1 : 1;
    const response = resolveClient(this, request, viewRevision);
    if (response.ok) {
      this.#viewSourceGeneration = request.sourceGeneration;
      this.#viewRevision = response.value.viewRevision;
    }
    return response;
  }

  public resolveProjection(request: TabularRequest): TabularResult<ClientProjectionStage<RecordValue>> {
    let source = this.#sourceStage;
    if (source === null || source.sourceGeneration !== request.sourceGeneration) {
      const normalized = normalizeClientRecords(this, request.sourceGeneration);
      if (!normalized.ok) return normalized;
      source = normalized.value;
      this.#sourceStage = source;
      this.#queryStage = null;
      this.#projectionStage = null;
    }
    let query = this.#queryStage;
    if (query === null
      || query.source !== source
      || query.queryRevision !== request.queryRevision
      || query.prepared.schema.revision < request.columnSchemaRevision) {
      const normalized = tryCreateTabularQuery(request.query, this.limits);
      if (!normalized.ok) return transitionFailure(normalized);
      const filtered = filterAndSortClientRecords(this, source.records, normalized.value);
      if (!filtered.ok) return filtered;
      const prepared = prepareClientProjection(this, filtered.value, normalized.value, request);
      if (!prepared.ok) return prepared;
      query = Object.freeze({
        source,
        queryRevision: request.queryRevision,
        query: normalized.value,
        filtered: filtered.value,
        prepared: prepared.value,
      });
      this.#queryStage = query;
      this.#projectionStage = null;
    }
    const retained = this.#projectionStage;
    if (retained !== null
      && retained.query === query
      && retained.expansionRevision === request.expansionRevision
      && retained.projection.schema.revision >= request.columnSchemaRevision) {
      return ok(retained);
    }
    if (!Array.isArray(request.expansion) || request.expansion.length > this.limits.maxRows) {
      return fail('resource-rejection', 'row-ceiling-exceeded', 'Request expansion exceeds the row ceiling.');
    }
    const expansion = normalizeIDs(request.expansion, 'groupID', this.limits);
    if (!expansion.ok) return expansion;
    const projection = projectClientExpansion(query.prepared, request.expansion, this.limits);
    if (!projection.ok) return projection;
    const stage = Object.freeze({
      query,
      expansionRevision: request.expansionRevision,
      projection: projection.value,
    });
    this.#projectionStage = stage;
    return ok(stage);
  }
}

export function createClientTabularSource<RecordValue>(
  options: TabularClientSourceOptions<RecordValue>,
): TabularSource {
  return unwrap(tryCreateClientTabularSource(options));
}

function tryCreateClientTabularSource<RecordValue>(
  options: TabularClientSourceOptions<RecordValue>,
): TabularResult<ClientSource<RecordValue>> {
  if (options === null || typeof options !== 'object' || !Array.isArray(options.records)
    || typeof options.getRowID !== 'function' || typeof options.getValue !== 'function') {
    return fail('construction', 'invalid-source', 'Client source options require records, getRowID, and getValue.');
  }
  const schema = validateColumnSchema(options.columnSchema, options.limits);
  if (!schema.ok) return schema;
  const limits = schema.value.limits;
  if (options.records.length > limits.maxScanRecords) {
    return fail('resource-rejection', 'scan-record-ceiling-exceeded', 'Client records exceed the scan ceiling.', {
      actual: options.records.length,
      ceiling: limits.maxScanRecords,
    });
  }
  const source = new ClientSourceRuntime(Object.freeze({
    ...options,
    records: Object.freeze([...options.records]),
    columnSchema: schema.value.schema,
  }), limits);
  return ok(source);
}

export function resolveClientTabularRequest(
  source: TabularSource,
  request: TabularRequest,
): TabularResult<TabularViewResponse> {
  if (source === null || typeof source !== 'object' || typeof source.resolve !== 'function') {
    return fail('construction', 'invalid-source', 'Tabular source must expose a synchronous resolve function.');
  }
  try {
    const result = source.resolve(request);
    if (result === null || typeof result !== 'object' || typeof result.ok !== 'boolean') {
      return fail('transition-rejection', 'invalid-source', 'Tabular source returned an invalid Result.');
    }
    return result;
  } catch (error) {
    return fail('transition-rejection', 'source-policy-failed', 'Tabular source execution threw.', {
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

export function synchronizeTabularView(
  request: TabularRequest,
  response: TabularViewResponse,
  currentView: TabularView | null = null,
  limitsInput?: Partial<TabularLimits>,
): TabularResult<TabularView> {
  const schema = validateColumnSchema(response?.columnSchema, limitsInput);
  if (!schema.ok) return transitionFailure(schema);
  const limits = schema.value.limits;
  const requestError = validateRequest(request, limits);
  if (requestError !== null) return transitionFailure(requestError);
  if (response.protocolVersion !== 1
    || response.requestID !== request.requestID
    || response.sourceGeneration !== request.sourceGeneration
    || response.queryRevision !== request.queryRevision
    || response.expansionRevision !== request.expansionRevision
    || !sameAccess(response.access, request.access)) {
    return fail('transition-rejection', 'response-envelope-mismatch', 'Response does not echo the active request envelope.');
  }
  if (!isNonNegativeSafeInteger(response.viewRevision)
    || (currentView !== null
      && currentView.sourceGeneration === response.sourceGeneration
      && response.viewRevision <= currentView.viewRevision)) {
    return fail('transition-rejection', 'stale-view-revision', 'Response view revision must be strictly newer in its source generation.', {
      viewRevision: response.viewRevision,
      currentViewRevision: currentView?.viewRevision ?? null,
    });
  }
  if (schema.value.schema.revision < request.columnSchemaRevision) {
    return fail('transition-rejection', 'response-envelope-mismatch', 'Response column schema revision predates the request.');
  }
  const matchingLeafCount = validateCount(response.matchingLeafCount, 'matchingLeafCount');
  if (!matchingLeafCount.ok) return matchingLeafCount;
  const visibleRowCount = validateCount(response.visibleRowCount, 'visibleRowCount');
  if (!visibleRowCount.ok) return visibleRowCount;
  if (request.access.kind === 'page' && response.visibleRowCount.kind !== 'known') {
    return fail('transition-rejection', 'response-envelope-mismatch', 'Page responses require a known visible row count.');
  }
  if (!Array.isArray(response.rows) || response.rows.length > limits.maxRows) {
    return fail('resource-rejection', 'row-ceiling-exceeded', 'Response rows exceed the configured ceiling.');
  }
  if (response.rows.length * schema.value.schema.columns.length > limits.maxProjectedCells) {
    return fail('resource-rejection', 'projected-cell-ceiling-exceeded', 'Response projected cells exceed the configured ceiling.');
  }
  const rows = normalizeRows(response.rows, schema.value.schema.columns, limits);
  if (!rows.ok) return rows;
  const removed = normalizeIDs(response.removedRowIDs, 'removedRowID', limits);
  if (!removed.ok) return removed;
  return ok(Object.freeze({
    requestID: response.requestID,
    sourceGeneration: response.sourceGeneration,
    queryRevision: response.queryRevision,
    expansionRevision: response.expansionRevision,
    viewRevision: response.viewRevision,
    access: Object.freeze({ ...response.access }),
    matchingLeafCount: matchingLeafCount.value,
    visibleRowCount: visibleRowCount.value,
    rows: rows.value,
    columnSchema: schema.value.schema,
  }));
}

function resolveClient<RecordValue>(
  source: ClientSource<RecordValue>,
  request: TabularRequest,
  viewRevision: number,
): TabularResult<TabularViewResponse> {
  const invalid = validateRequestEnvelope(request);
  if (invalid !== null) return invalid;
  if (request.columnSchemaRevision < source.options.columnSchema.revision) {
    return fail('transition-rejection', 'response-envelope-mismatch', 'Request column schema revision predates the client source.');
  }
  const projected = source.resolveProjection(request);
  if (!projected.ok) return projected;
  const projection = projected.value.projection;
  const matchingLeafCount = projected.value.query.filtered.length;
  const range = sliceRange(request.access, projection.rows.length);
  if (!range.ok) return range;
  const rows = sliceVisibleRows(projection.rows, range.value.start, range.value.end);
  return ok(Object.freeze({
    protocolVersion: 1,
    requestID: request.requestID,
    sourceGeneration: request.sourceGeneration,
    queryRevision: request.queryRevision,
    expansionRevision: request.expansionRevision,
    viewRevision,
    access: Object.freeze({ ...request.access }),
    matchingLeafCount: Object.freeze({ kind: 'known', value: matchingLeafCount }),
    visibleRowCount: Object.freeze({ kind: 'known', value: projection.rows.length }),
    rows,
    columnSchema: projection.schema,
    removedRowIDs: Object.freeze([]),
  }));
}

function normalizeClientRecords<RecordValue>(
  source: ClientSource<RecordValue>,
  sourceGeneration: number,
): TabularResult<ClientSourceStage<RecordValue>> {
  const records: ClientRecordItem<RecordValue>[] = [];
  const rowIDs = new Set<string>();
  for (let index = 0; index < source.options.records.length; index += 1) {
    const record = source.options.records[index]!;
    let rowID: TabularRowID;
    try {
      rowID = source.options.getRowID(record, index);
    } catch (error) {
      return policyFailure('getRowID', error);
    }
    const idError = validateID(rowID, 'rowID', source.limits);
    if (idError !== null) return { ok: false, error: idError };
    if (rowIDs.has(rowID)) return fail('construction', 'duplicate-identity', 'Client row IDs must be unique.', { rowID });
    rowIDs.add(rowID);
    records.push(Object.freeze({ record, rowID, inputIndex: index }));
  }
  return ok(Object.freeze({ sourceGeneration, records: Object.freeze(records) }));
}

function filterAndSortClientRecords<RecordValue>(
  source: ClientSource<RecordValue>,
  records: readonly ClientRecordItem<RecordValue>[],
  query: TabularQuery,
): TabularResult<readonly ClientRecordItem<RecordValue>[]> {
  let filtered = records;
  for (const descriptor of query.filters) {
    if (descriptor.enabled === false) continue;
    const policy = source.options.policies?.predicates?.[descriptor.predicate];
    if (policy === undefined) return fail('construction', 'missing-policy-key', 'Filter predicate policy is not registered.', { policy: descriptor.predicate });
    const next: ClientRecordItem<RecordValue>[] = [];
    for (const item of filtered) {
      try {
        if (policy(item.record, descriptor, source.options.getValue)) next.push(item);
      } catch (error) {
        return policyFailure(descriptor.predicate, error);
      }
    }
    filtered = next;
  }
  if (query.sort.length === 0) return ok(filtered);
  const comparatorPolicies: {
    readonly descriptor: TabularSort;
    readonly policy: TabularComparisonPolicy<RecordValue>;
  }[] = [];
  for (const descriptor of query.sort) {
    const policy = source.options.policies?.comparators?.[descriptor.comparator];
    if (policy === undefined) return fail('construction', 'missing-policy-key', 'Sort comparator policy is not registered.', { policy: descriptor.comparator });
    comparatorPolicies.push(Object.freeze({ descriptor, policy }));
  }
  let comparisonFailure: TabularResult<never> | null = null;
  const sorted = [...filtered].sort((left, right) => {
    if (comparisonFailure !== null) return 0;
    for (const entry of comparatorPolicies) {
      let value: number;
      try {
        value = entry.policy(left.record, right.record, entry.descriptor, source.options.getValue);
      } catch (error) {
        comparisonFailure = policyFailure(entry.descriptor.comparator, error);
        return 0;
      }
      if (!Number.isFinite(value)) {
        comparisonFailure = fail('transition-rejection', 'source-policy-failed', 'Comparator policies must return finite numbers.');
        return 0;
      }
      if (value !== 0) return entry.descriptor.direction === 'ascending' ? Math.sign(value) : -Math.sign(value);
    }
    return left.inputIndex - right.inputIndex;
  });
  return comparisonFailure === null ? ok(Object.freeze(sorted)) : comparisonFailure;
}

interface ClientRecordItem<RecordValue> {
  readonly record: RecordValue;
  readonly rowID: TabularRowID;
  readonly inputIndex: number;
}

interface ClientGroupNode<RecordValue> {
  readonly id: string;
  readonly label: TabularWireValue;
  readonly depth: number;
  readonly records: readonly ClientRecordItem<RecordValue>[];
  readonly children: readonly ClientGroupNode<RecordValue>[];
}

interface ClientPivotRuntime<RecordValue> {
  readonly value: TabularPivotValue<RecordValue>;
  readonly aggregate: TabularQuery['aggregates'][number];
}

interface ClientProjection {
  readonly rows: readonly TabularResolvedRow[];
  readonly schema: TabularColumnSchema;
}

interface ClientPreparedProjection<RecordValue> {
  readonly source: ClientSource<RecordValue>;
  readonly records: readonly ClientRecordItem<RecordValue>[];
  readonly query: TabularQuery;
  readonly schema: TabularColumnSchema;
  readonly pivots: readonly ClientPivotRuntime<RecordValue>[];
  readonly groups: readonly ClientGroupNode<RecordValue>[];
  readonly groupIDs: ReadonlySet<string>;
  readonly leafRows: Map<string, TabularResolvedRow>;
  readonly groupCells: Map<string, Readonly<Record<string, TabularWireValue>>>;
}

function prepareClientProjection<RecordValue>(
  source: ClientSource<RecordValue>,
  records: readonly ClientRecordItem<RecordValue>[],
  query: TabularQuery,
  request: TabularRequest,
): TabularResult<ClientPreparedProjection<RecordValue>> {
  const pivotProjection = resolveClientPivots(source, records, query, request);
  if (!pivotProjection.ok) return pivotProjection;
  if (query.groups.length === 0) {
    if (pivotProjection.value.pivots.length > 0) {
      return fail('transition-rejection', 'invalid-query-descriptor', 'Client pivot projection requires at least one grouping descriptor.');
    }
    return ok(Object.freeze({
      source,
      records,
      query,
      schema: pivotProjection.value.schema,
      pivots: pivotProjection.value.pivots,
      groups: Object.freeze([]),
      groupIDs: new Set<string>(),
      leafRows: new Map<string, TabularResolvedRow>(),
      groupCells: new Map<string, Readonly<Record<string, TabularWireValue>>>(),
    }));
  }
  const groupIDs = new Set<string>();
  const leafIDs = new Set(records.map((item) => item.rowID));
  const groups = buildClientGroups(source, records, query, 0, groupIDs, leafIDs);
  if (!groups.ok) return groups;
  return ok(Object.freeze({
    source,
    records,
    query,
    schema: pivotProjection.value.schema,
    pivots: pivotProjection.value.pivots,
    groups: groups.value,
    groupIDs,
    leafRows: new Map<string, TabularResolvedRow>(),
    groupCells: new Map<string, Readonly<Record<string, TabularWireValue>>>(),
  }));
}

function projectClientExpansion<RecordValue>(
  prepared: ClientPreparedProjection<RecordValue>,
  expansion: readonly string[],
  limits: TabularLimits,
): TabularResult<ClientProjection> {
  if (prepared.groups.length === 0) {
    const rows: TabularResolvedRow[] = [];
    for (const item of prepared.records) {
      const row = clientLeafRow(prepared, item);
      if (!row.ok) return row;
      rows.push(row.value);
    }
    return ok(Object.freeze({ rows: Object.freeze(rows), schema: prepared.schema }));
  }
  const requestedExpansion = new Set(expansion);
  for (const groupID of requestedExpansion) {
    if (!prepared.groupIDs.has(groupID)) {
      return fail('transition-rejection', 'response-envelope-mismatch', 'Expansion identifies an unknown group.', { groupID });
    }
  }
  const rows: TabularResolvedRow[] = [];
  for (const group of prepared.groups) {
    const flattened = flattenClientGroup(prepared, group, requestedExpansion, null);
    if (!flattened.ok) return flattened;
    rows.push(...flattened.value);
    if (rows.length > limits.maxRows) {
      return fail('resource-rejection', 'row-ceiling-exceeded', 'Grouped visible rows exceed the configured ceiling.');
    }
  }
  return ok(Object.freeze({ rows: Object.freeze(rows), schema: prepared.schema }));
}

function resolveClientPivots<RecordValue>(
  source: ClientSource<RecordValue>,
  records: readonly ClientRecordItem<RecordValue>[],
  query: TabularQuery,
  request: TabularRequest,
): TabularResult<{ readonly schema: TabularColumnSchema; readonly pivots: readonly ClientPivotRuntime<RecordValue>[] }> {
  const columns = [...source.options.columnSchema.columns];
  const headers = [...source.options.columnSchema.headers];
  const columnIDs = new Set(columns.map((column) => column.id));
  const aggregateByID = new Map(query.aggregates.map((aggregate) => [aggregate.id, aggregate]));
  const pivots: ClientPivotRuntime<RecordValue>[] = [];
  for (const descriptor of query.pivots) {
    const policy = source.options.policies?.pivot?.[descriptor.valuePolicy];
    if (policy === undefined) return fail('construction', 'missing-policy-key', 'Pivot value policy is not registered.', { policy: descriptor.valuePolicy });
    let values: readonly TabularPivotValue<RecordValue>[];
    try {
      values = policy(records.map((item) => item.record), descriptor, source.options.getValue);
    } catch (error) {
      return policyFailure(descriptor.valuePolicy, error);
    }
    if (!Array.isArray(values)) return fail('transition-rejection', 'source-policy-failed', 'Pivot policies must return an ordered array.');
    for (const value of values) {
      if (value === null || typeof value !== 'object' || typeof value.matches !== 'function') {
        return fail('transition-rejection', 'source-policy-failed', 'Pivot values require a column, header, aggregate ID, and matcher.');
      }
      const aggregate = aggregateByID.get(value.aggregateID);
      if (aggregate === undefined || !descriptor.aggregateIDs.includes(value.aggregateID)) {
        return fail('transition-rejection', 'invalid-query-descriptor', 'Pivot value references an aggregate outside its descriptor.', { aggregateID: value.aggregateID });
      }
      if (columnIDs.has(value.column.id)) return fail('transition-rejection', 'duplicate-identity', 'Pivot columns cannot collide with static or prior dynamic columns.', { columnID: value.column.id });
      columnIDs.add(value.column.id);
      columns.push(Object.freeze({ ...value.column }));
      headers.push(value.header);
      pivots.push(Object.freeze({ value, aggregate }));
      if (pivots.length > source.limits.maxPivotColumns) {
        return fail('resource-rejection', 'pivot-column-ceiling-exceeded', 'Pivot columns exceed the configured ceiling.');
      }
    }
  }
  const revision = pivots.length === 0
    ? Math.max(source.options.columnSchema.revision, request.columnSchemaRevision)
    : Math.max(source.options.columnSchema.revision, request.columnSchemaRevision, request.queryRevision);
  const validated = validateColumnSchema(Object.freeze({
    revision,
    columns: Object.freeze(columns),
    headers: Object.freeze(headers),
  }), source.limits);
  if (!validated.ok) return validated;
  return ok(Object.freeze({ schema: validated.value.schema, pivots: Object.freeze(pivots) }));
}

function buildClientGroups<RecordValue>(
  source: ClientSource<RecordValue>,
  records: readonly ClientRecordItem<RecordValue>[],
  query: TabularQuery,
  depth: number,
  groupIDs: Set<string>,
  leafIDs: ReadonlySet<string>,
): TabularResult<readonly ClientGroupNode<RecordValue>[]> {
  const descriptor = query.groups[depth];
  if (descriptor === undefined) return ok(Object.freeze([]));
  const policy = source.options.policies?.grouping?.[descriptor.policy];
  if (policy === undefined) {
    return fail('construction', 'missing-policy-key', 'Grouping policy is not registered.', { policy: descriptor.policy });
  }
  const ordered = new Map<string, { label: TabularWireValue; records: ClientRecordItem<RecordValue>[] }>();
  for (const item of records) {
    let grouped;
    try {
      grouped = policy(item.record, descriptor, depth, source.options.getValue);
    } catch (error) {
      return policyFailure(descriptor.policy, error);
    }
    const idError = validateID(grouped?.groupID, 'groupID', source.limits);
    if (idError !== null) return { ok: false, error: idError };
    if (leafIDs.has(grouped.groupID)) {
      return fail('construction', 'duplicate-identity', 'Synthetic group IDs cannot collide with leaf row IDs.', { groupID: grouped.groupID });
    }
    const label = normalizeWireValue(grouped.label, source.limits);
    if (!label.ok) return label;
    const existing = ordered.get(grouped.groupID);
    if (existing === undefined) {
      if (groupIDs.has(grouped.groupID)) {
        return fail('construction', 'duplicate-identity', 'Grouping policies must return globally unique path IDs.', { groupID: grouped.groupID });
      }
      groupIDs.add(grouped.groupID);
      ordered.set(grouped.groupID, { label: label.value, records: [item] });
    } else {
      existing.records.push(item);
    }
  }
  const result: ClientGroupNode<RecordValue>[] = [];
  for (const [id, group] of ordered) {
    const children = depth + 1 < query.groups.length
      ? buildClientGroups(source, group.records, query, depth + 1, groupIDs, leafIDs)
      : ok(Object.freeze([]) as readonly ClientGroupNode<RecordValue>[]);
    if (!children.ok) return children;
    result.push(Object.freeze({
      id,
      label: group.label,
      depth,
      records: Object.freeze(group.records),
      children: children.value,
    }));
  }
  return ok(Object.freeze(result));
}

function flattenClientGroup<RecordValue>(
  prepared: ClientPreparedProjection<RecordValue>,
  group: ClientGroupNode<RecordValue>,
  expansion: ReadonlySet<string>,
  parentGroupID: string | null,
): TabularResult<readonly TabularResolvedRow[]> {
  const cells = clientGroupCells(prepared, group);
  if (!cells.ok) return cells;
  const expanded = expansion.has(group.id);
  const rows: TabularResolvedRow[] = [Object.freeze({
    kind: 'group',
    id: group.id,
    parentGroupID,
    depth: group.depth,
    expanded,
    cells: cells.value,
  })];
  if (!expanded) return ok(Object.freeze(rows));
  if (group.children.length > 0) {
    for (const child of group.children) {
      const flattened = flattenClientGroup(prepared, child, expansion, group.id);
      if (!flattened.ok) return flattened;
      rows.push(...flattened.value);
    }
  } else {
    for (const item of group.records) {
      const leaf = clientLeafRow(prepared, item);
      if (!leaf.ok) return leaf;
      rows.push(leaf.value);
    }
  }
  return ok(Object.freeze(rows));
}

function clientGroupCells<RecordValue>(
  prepared: ClientPreparedProjection<RecordValue>,
  group: ClientGroupNode<RecordValue>,
): TabularResult<Readonly<Record<string, TabularWireValue>>> {
  const cached = prepared.groupCells.get(group.id);
  if (cached !== undefined) return ok(cached);
  const source = prepared.source;
  const cells: Record<string, TabularWireValue> = {};
  for (const column of prepared.schema.columns) {
    Object.defineProperty(cells, column.id, { value: null, enumerable: true, writable: false, configurable: true });
  }
  for (const pivot of prepared.pivots) {
    const policy = source.options.policies?.aggregation?.[pivot.aggregate.policy];
    if (policy === undefined) return fail('construction', 'missing-policy-key', 'Pivot aggregation policy is not registered.', { policy: pivot.aggregate.policy });
    const matchingRecords: RecordValue[] = [];
    try {
      for (const item of group.records) if (pivot.value.matches(item.record)) matchingRecords.push(item.record);
    } catch (error) {
      return policyFailure(`pivot:${pivot.value.column.id}`, error);
    }
    let value: TabularWireValue;
    try {
      value = policy(matchingRecords, pivot.aggregate, source.options.getValue);
    } catch (error) {
      return policyFailure(pivot.aggregate.policy, error);
    }
    const normalized = normalizeWireValue(value, source.limits);
    if (!normalized.ok) return normalized;
    Object.defineProperty(cells, pivot.value.column.id, { value: normalized.value, enumerable: true, writable: false, configurable: true });
  }
  for (const descriptor of prepared.query.aggregates) {
    const policy = source.options.policies?.aggregation?.[descriptor.policy];
    if (policy === undefined) return fail('construction', 'missing-policy-key', 'Aggregation policy is not registered.', { policy: descriptor.policy });
    let value: TabularWireValue;
    try {
      value = policy(group.records.map((item) => item.record), descriptor, source.options.getValue);
    } catch (error) {
      return policyFailure(descriptor.policy, error);
    }
    const normalized = normalizeWireValue(value, source.limits);
    if (!normalized.ok) return normalized;
    Object.defineProperty(cells, descriptor.columnID, { value: normalized.value, enumerable: true, writable: false, configurable: true });
  }
  const groupDescriptor = prepared.query.groups[group.depth]!;
  Object.defineProperty(cells, groupDescriptor.columnID, { value: group.label, enumerable: true, writable: false, configurable: true });
  Object.freeze(cells);
  prepared.groupCells.set(group.id, cells);
  return ok(cells);
}

function clientLeafRow<RecordValue>(
  prepared: ClientPreparedProjection<RecordValue>,
  item: ClientRecordItem<RecordValue>,
): TabularResult<TabularResolvedRow> {
  const cached = prepared.leafRows.get(item.rowID);
  if (cached !== undefined) return ok(cached);
  const row = createClientLeafRow(prepared.source, item, prepared.schema.columns);
  if (row.ok) prepared.leafRows.set(item.rowID, row.value);
  return row;
}

function createClientLeafRow<RecordValue>(
  source: ClientSource<RecordValue>,
  item: ClientRecordItem<RecordValue>,
  columns: readonly TabularColumnDefinition[],
): TabularResult<TabularResolvedRow> {
  const cells: Record<string, TabularWireValue> = {};
  for (const column of columns) {
    let value: TabularWireValue;
    if (!source.staticColumnIDs.has(column.id)) value = null;
    else try {
        value = source.options.getValue(item.record, column.id);
      } catch (error) {
        return policyFailure(`accessor:${column.id}`, error);
      }
    const normalized = normalizeWireValue(value, source.limits);
    if (!normalized.ok) return normalized;
    Object.defineProperty(cells, column.id, { value: normalized.value, enumerable: true, writable: false, configurable: false });
  }
  return ok(Object.freeze({ kind: 'leaf', id: item.rowID, cells: Object.freeze(cells) }));
}

function validateRequest(request: TabularRequest, limits: TabularLimits): TabularResult<never> | null {
  const envelope = validateRequestEnvelope(request);
  if (envelope !== null) return envelope;
  const query = tryCreateTabularQuery(request.query, limits);
  if (!query.ok) return transitionFailure(query);
  if (!Array.isArray(request.expansion) || request.expansion.length > limits.maxRows) {
    return fail('resource-rejection', 'row-ceiling-exceeded', 'Request expansion exceeds the row ceiling.');
  }
  const expansion = normalizeIDs(request.expansion, 'groupID', limits);
  return expansion.ok ? validateAccess(request.access) : expansion;
}

function validateRequestEnvelope(request: TabularRequest): TabularResult<never> | null {
  if (request === null || typeof request !== 'object' || request.protocolVersion !== 1) {
    return fail('transition-rejection', 'response-envelope-mismatch', 'Tabular request protocolVersion must be 1.');
  }
  for (const [label, value] of [
    ['requestID', request.requestID], ['sourceGeneration', request.sourceGeneration],
    ['queryRevision', request.queryRevision], ['expansionRevision', request.expansionRevision],
    ['columnSchemaRevision', request.columnSchemaRevision],
  ] as const) {
    if (!isNonNegativeSafeInteger(value)) return fail('transition-rejection', 'response-envelope-mismatch', `${label} must be a non-negative safe integer.`);
  }
  return validateAccess(request.access);
}

function validateColumnSchema(
  input: TabularColumnSchema,
  limitsInput?: Partial<TabularLimits>,
): TabularResult<{ readonly schema: TabularColumnSchema; readonly limits: TabularLimits }> {
  if (input === null || typeof input !== 'object' || !isNonNegativeSafeInteger(input.revision)) {
    return fail('construction', 'invalid-source', 'Column schema requires a non-negative revision.');
  }
  const model = tryCreateTabularModel({
    columns: input.columns,
    headers: input.headers,
    ...(limitsInput === undefined ? {} : { limits: limitsInput }),
  });
  if (!model.ok) return model;
  return ok(Object.freeze({
    schema: Object.freeze({ revision: input.revision, columns: model.value.columns, headers: model.value.headers }),
    limits: model.value.limits,
  }));
}

function normalizeRows(
  input: readonly TabularRow[],
  columns: readonly TabularColumnDefinition[],
  limits: TabularLimits,
): TabularResult<readonly TabularResolvedRow[]> {
  const columnPaths = columns.map((column) => Object.freeze({
    id: column.id,
    segments: parseCellPath(column.id, limits.maxQueryValueDepth),
  }));
  const ids = new Set<string>();
  const result: TabularResolvedRow[] = [];
  for (const row of input) {
    if (row === null || typeof row !== 'object' || (row.kind !== 'leaf' && row.kind !== 'group')) {
      return fail('transition-rejection', 'response-envelope-mismatch', 'Every response row must be a leaf or group.');
    }
    const idError = validateID(row.id, row.kind === 'leaf' ? 'rowID' : 'groupID', limits);
    if (idError !== null) return { ok: false, error: { ...idError, class: 'transition-rejection' } };
    if (ids.has(row.id)) return fail('transition-rejection', 'duplicate-identity', 'Response row identities must be unique.', { id: row.id });
    ids.add(row.id);
    if (row.kind === 'group' && (!isNonNegativeSafeInteger(row.depth) || row.depth > limits.maxGroupDepth)) {
      return fail('resource-rejection', 'group-depth-ceiling-exceeded', 'Response group depth exceeds the configured ceiling.');
    }
    if (row.cells === null || typeof row.cells !== 'object' || Array.isArray(row.cells)) {
      return fail('transition-rejection', 'response-envelope-mismatch', 'Response row cells must be a record.');
    }
    const normalized = normalizeWireValue(row.cells, limits);
    if (!normalized.ok) return normalized;
    const cells = normalized.value as Readonly<Record<string, TabularWireValue>>;
    for (const column of columnPaths) {
      if (!hasCellValue(cells, column.id, column.segments)) {
        return fail('transition-rejection', 'response-envelope-mismatch', 'Every response row requires one value for every schema column.', { rowID: row.id, columnID: column.id });
      }
    }
    result.push(Object.freeze({ ...row, cells }));
  }
  return ok(Object.freeze(result));
}

type CellPathSegment = string | number;

function parseCellPath(path: string, maxDepth: number): readonly CellPathSegment[] | null {
  if (path.length === 0) return null;
  const segments: CellPathSegment[] = [];
  let index = 0;
  while (index < path.length) {
    const propertyStart = index;
    while (index < path.length && path[index] !== '.' && path[index] !== '[' && path[index] !== ']') index += 1;
    if (propertyStart === index) return null;
    segments.push(path.slice(propertyStart, index));
    while (path[index] === '[') {
      const end = path.indexOf(']', index + 1);
      if (end < 0) return null;
      const value = path.slice(index + 1, end);
      if (!/^\d+$/u.test(value)) return null;
      const numeric = Number(value);
      if (!Number.isSafeInteger(numeric)) return null;
      segments.push(numeric);
      index = end + 1;
    }
    if (index === path.length) break;
    if (path[index] !== '.') return null;
    index += 1;
    if (index === path.length) return null;
  }
  if (segments.length > maxDepth) return null;
  return Object.freeze(segments);
}

function hasCellValue(
  cells: Readonly<Record<string, TabularWireValue>>,
  columnID: string,
  path: readonly CellPathSegment[] | null,
): boolean {
  if (Object.hasOwn(cells, columnID)) return true;
  if (path === null) return false;
  let current: TabularWireValue = cells;
  for (const segment of path) {
    if (current === null || typeof current !== 'object') return false;
    if (Array.isArray(current)) {
      if (typeof segment !== 'number' || !Object.hasOwn(current, segment)) return false;
      current = current[segment]!;
      continue;
    }
    const record = current as Readonly<Record<string, TabularWireValue>>;
    if (typeof segment !== 'string' || !Object.hasOwn(record, segment)) return false;
    current = record[segment]!;
  }
  return true;
}

function normalizeWireValue(value: unknown, limits: TabularLimits): TabularResult<TabularWireValue> {
  let nodes = 0;
  let codeUnits = 0;
  const stack = new WeakSet<object>();
  const visit = (current: unknown, depth: number): TabularResult<TabularWireValue> => {
    nodes += 1;
    if (nodes > limits.maxQueryValueNodes) return fail('resource-rejection', 'query-value-node-ceiling-exceeded', 'Wire value exceeds its node ceiling.');
    if (depth > limits.maxQueryValueDepth) return fail('resource-rejection', 'query-value-depth-ceiling-exceeded', 'Wire value exceeds its depth ceiling.');
    if (current === null || typeof current === 'boolean') return ok(current);
    if (typeof current === 'number') return Number.isFinite(current) ? ok(current) : fail('construction', 'invalid-query-value', 'Wire numbers must be finite.');
    if (typeof current === 'string') {
      codeUnits += current.length;
      return codeUnits <= limits.maxQueryValueCodeUnits ? ok(current) : fail('resource-rejection', 'query-value-code-unit-ceiling-exceeded', 'Wire value exceeds its code-unit ceiling.');
    }
    if (typeof current !== 'object' || stack.has(current)) return fail('construction', 'invalid-query-value', 'Wire value is outside the JSON-like algebra.');
    stack.add(current);
    if (Array.isArray(current)) {
      const output: TabularWireValue[] = [];
      for (let index = 0; index < current.length; index += 1) {
        if (!Object.hasOwn(current, index)) return fail('construction', 'invalid-query-value', 'Sparse wire arrays are invalid.');
        const item = visit(current[index], depth + 1);
        if (!item.ok) return item;
        output.push(item.value);
      }
      stack.delete(current);
      return ok(Object.freeze(output));
    }
    const prototype = Object.getPrototypeOf(current);
    if ((prototype !== Object.prototype && prototype !== null) || Object.getOwnPropertySymbols(current).length > 0) {
      return fail('construction', 'invalid-query-value', 'Wire records require an ordinary prototype and string keys.');
    }
    const descriptors = Object.getOwnPropertyDescriptors(current);
    const entries: [string, TabularWireValue][] = [];
    for (const key of Object.keys(descriptors).sort()) {
      const descriptor = descriptors[key];
      if (descriptor === undefined || !('value' in descriptor)) return fail('construction', 'invalid-query-value', 'Wire records cannot contain accessors.');
      codeUnits += key.length;
      if (codeUnits > limits.maxQueryValueCodeUnits) return fail('resource-rejection', 'query-value-code-unit-ceiling-exceeded', 'Wire value exceeds its code-unit ceiling.');
      const item = visit(descriptor.value, depth + 1);
      if (!item.ok) return item;
      entries.push([key, item.value]);
    }
    stack.delete(current);
    return ok(Object.freeze(Object.fromEntries(entries)) as Readonly<Record<string, TabularWireValue>>);
  };
  return visit(value, 0);
}

function normalizeIDs(input: readonly string[], label: string, limits: TabularLimits): TabularResult<readonly string[]> {
  if (!Array.isArray(input)) return fail('transition-rejection', 'response-envelope-mismatch', `${label} list must be an array.`);
  const ids = new Set<string>();
  for (const id of input) {
    const error = validateID(id, label, limits);
    if (error !== null) return { ok: false, error: { ...error, class: 'transition-rejection' } };
    if (ids.has(id)) return fail('transition-rejection', 'duplicate-identity', `${label} list must be unique.`, { id });
    ids.add(id);
  }
  return ok(Object.freeze([...input]));
}

function validateAccess(access: TabularAccessRange): TabularResult<never> | null {
  if (access?.kind === 'page') {
    return Number.isSafeInteger(access.page) && access.page >= 1 && Number.isSafeInteger(access.itemsPerPage) && access.itemsPerPage >= 1
      ? null
      : fail('transition-rejection', 'response-envelope-mismatch', 'Page access requires positive safe page and itemsPerPage values.');
  }
  if (access?.kind === 'window') {
    return isNonNegativeSafeInteger(access.start) && isNonNegativeSafeInteger(access.count)
      && access.start <= Number.MAX_SAFE_INTEGER - access.count
      ? null
      : fail('transition-rejection', 'response-envelope-mismatch', 'Window access requires a safe non-negative range.');
  }
  return fail('transition-rejection', 'response-envelope-mismatch', 'Tabular access kind is invalid.');
}

function sliceRange(access: TabularAccessRange, total: number): TabularResult<{ readonly start: number; readonly end: number }> {
  const invalid = validateAccess(access);
  if (invalid !== null) return invalid;
  const start = access.kind === 'page' ? (access.page - 1) * access.itemsPerPage : access.start;
  const count = access.kind === 'page' ? access.itemsPerPage : access.count;
  if (!Number.isSafeInteger(start) || start > total || (access.kind === 'page' && access.page !== 1 && start >= total)) {
    return fail('transition-rejection', 'response-envelope-mismatch', 'Requested access range starts outside the resolved projection.', { start, total });
  }
  return ok(Object.freeze({ start, end: Math.min(total, start + count) }));
}

function sliceVisibleRows(
  rows: readonly TabularResolvedRow[],
  start: number,
  end: number,
): readonly TabularResolvedRow[] {
  if (start === 0 || start === end) return Object.freeze(rows.slice(start, end));
  const ancestors: TabularResolvedRow[] = [];
  for (let index = 0; index < start; index += 1) {
    const row = rows[index]!;
    if (row.kind !== 'group') continue;
    ancestors.length = row.depth;
    ancestors[row.depth] = row;
  }
  const first = rows[start];
  const requiredDepth = first?.kind === 'group' ? first.depth : ancestors.length;
  const context = ancestors.slice(0, requiredDepth).map((row) => Object.freeze({ ...row, contextOnly: true as const }));
  return Object.freeze([...context, ...rows.slice(start, end)]);
}

function validateCount(count: TabularCount, label: string): TabularResult<TabularCount> {
  if (count?.kind === 'unknown') return ok(Object.freeze({ kind: 'unknown' }));
  if (count?.kind === 'known' && isNonNegativeSafeInteger(count.value)) return ok(Object.freeze({ kind: 'known', value: count.value }));
  return fail('transition-rejection', 'response-envelope-mismatch', `${label} must be a known non-negative safe count or unknown.`);
}

function sameAccess(left: TabularAccessRange, right: TabularAccessRange): boolean {
  return left.kind === right.kind && (left.kind === 'page'
    ? left.page === (right.kind === 'page' ? right.page : -1) && left.itemsPerPage === (right.kind === 'page' ? right.itemsPerPage : -1)
    : left.start === (right.kind === 'window' ? right.start : -1) && left.count === (right.kind === 'window' ? right.count : -1));
}

function isNonNegativeSafeInteger(value: number): boolean {
  return Number.isSafeInteger(value) && value >= 0;
}

function policyFailure<T>(policy: string, error: unknown): TabularResult<T> {
  return fail('transition-rejection', 'source-policy-failed', 'Client source policy threw.', {
    policy,
    message: error instanceof Error ? error.message : String(error),
  });
}

function transitionFailure<T>(result: TabularResult<T>): TabularResult<never> {
  if (result.ok) throw new Error('Expected a failed result.');
  return fail('transition-rejection', result.error.code, result.error.message, result.error.details);
}

export type {
  TabularAccessRange,
  TabularAccessorPolicy,
  TabularAggregationPolicy,
  TabularClientPolicies,
  TabularClientSourceOptions,
  TabularColumnSchema,
  TabularComparisonPolicy,
  TabularCount,
  TabularGroupingPolicy,
  TabularGroupingValue,
  TabularPivotPolicy,
  TabularPivotValue,
  TabularPredicatePolicy,
  TabularRequest,
  TabularResolvedRow,
  TabularSelectionTarget,
  TabularSource,
  TabularView,
  TabularViewResponse,
} from './contracts.js';
