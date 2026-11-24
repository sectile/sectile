import { unwrap } from '@sectile/core/result';
import { deriveSafeTabularPageStart } from '../model/access.js';
import { fail, ok, validateID } from '../foundation.js';
import { checkResponseRowBudget, createClientWindowReader, createContextParentIndexes, nextClientViewRevision, preparedViewOf, retainRemovedRowIDs } from './view.js';
import { tryCreateTabularModel } from '../model/state.js';
import { tryCreateTabularQuery } from './query.js';
import type {
  TabularAccessRange,
  TabularAggregationPolicy,
  TabularClientSourceOptions,
  TabularColumnDefinition,
  TabularColumnSchema,
  TabularComparisonPolicy,
  TabularCount,
  TabularGroupID,
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
} from '../contracts.js';

const EMPTY_ROW_IDS: readonly string[] = Object.freeze([]);
const VISITED_ROW = Object.freeze(ok(true as const));

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
  readonly prepared: ClientPreparedProjection<RecordValue>;
}

interface ClientProjectionStage<RecordValue> {
  readonly query: ClientQueryStage<RecordValue>;
  readonly expansionRevision: number;
  readonly rowCount: number;
  readonly matchingLeafCount: TabularCount;
  readonly visibleRowCount: TabularCount;
  readonly readRows: (start: number, end: number) => TabularResult<readonly TabularResolvedRow[]>;
}

class ClientSourceRuntime<RecordValue> implements ClientSource<RecordValue> {
  // sourceGeneration covers records, row/value accessors, and callback-policy observations.
  public readonly options: TabularClientSourceOptions<RecordValue>;
  public readonly limits: TabularLimits;
  public readonly staticColumnIDs: ReadonlySet<string>;
  #s: ClientSourceStage<RecordValue> | null = null;
  #q: ClientQueryStage<RecordValue> | null = null;
  #p: ClientProjectionStage<RecordValue> | null = null;
  #g = -1;
  #r = 0;
  #b = false;

  public constructor(options: TabularClientSourceOptions<RecordValue>, limits: TabularLimits) {
    this.options = options;
    this.limits = limits;
    this.staticColumnIDs = new Set(options.columnSchema.columns.map((column) => column.id));
  }

  public resolve(request: TabularRequest): TabularResult<TabularViewResponse> {
    if (this.#b) return fail('transition-rejection', 'source-policy-failed', 'Client source reentrancy.');
    this.#b = true;
    try {
      const normalized = normalizeRequest(request, this.limits);
      if (!normalized.ok) return normalized;
      request = normalized.value;
      if (this.#g >= 0 && request.sourceGeneration < this.#g) {
        return fail('transition-rejection', 'stale-source-generation', 'Client source generation cannot move backward.');
      }
      const viewRevision = nextClientViewRevision(this.#g, request.sourceGeneration, this.#r);
      if (!viewRevision.ok) return viewRevision;
      const response = resolveClient(this, request, viewRevision.value);
      if (response.ok) {
        this.#g = request.sourceGeneration;
        this.#r = response.value.viewRevision;
      }
      return response;
    } finally {
      this.#b = false;
    }
  }

  public resolveProjection(request: TabularRequest): TabularResult<ClientProjectionStage<RecordValue>> {
    let source = this.#s;
    if (source === null || source.sourceGeneration !== request.sourceGeneration) {
      const normalized = normalizeClientRecords(this, request.sourceGeneration);
      if (!normalized.ok) return normalized;
      source = normalized.value;
      this.#s = source;
      this.#q = null;
      this.#p = null;
    }
    let query = this.#q;
    if (query === null
      || query.source !== source
      || query.queryRevision !== request.queryRevision
      || query.prepared.schema.revision < request.columnSchemaRevision) {
      const filtered = filterAndSortClientRecords(this, source.records, request.query);
      if (!filtered.ok) return filtered;
      const prepared = prepareClientProjection(this, filtered.value, request.query, request);
      if (!prepared.ok) return prepared;
      query = Object.freeze({
        source,
        queryRevision: request.queryRevision,
        prepared: prepared.value,
      });
      this.#q = query;
      this.#p = null;
    }
    const retained = this.#p;
    if (retained !== null
      && retained.query === query
      && retained.expansionRevision === request.expansionRevision) {
      return ok(retained);
    }
    const projection = projectClientExpansion(query.prepared, request.expansion);
    if (!projection.ok) return projection;
    const { rowCount, readRows } = projection.value;
    const stage = Object.freeze({
      query,
      expansionRevision: request.expansionRevision,
      rowCount,
      matchingLeafCount: Object.freeze({ kind: 'known' as const, value: query.prepared.records.length }),
      visibleRowCount: Object.freeze({ kind: 'known' as const, value: rowCount }),
      readRows,
    });
    this.#p = stage;
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
  if (options === null || typeof options !== 'object') {
    return fail('construction', 'invalid-source', 'Client source options require records, getRowID, and getValue.');
  }
  let recordsInput: readonly RecordValue[];
  let recordCount: number;
  let columnSchema: TabularColumnSchema;
  let getRowID: TabularClientSourceOptions<RecordValue>['getRowID'];
  let getValue: TabularClientSourceOptions<RecordValue>['getValue'];
  let cellMaterialization: TabularClientSourceOptions<RecordValue>['cellMaterialization'];
  let policies: TabularClientSourceOptions<RecordValue>['policies'];
  let limitsInput: TabularClientSourceOptions<RecordValue>['limits'];
  try {
    recordsInput = options.records;
    columnSchema = options.columnSchema;
    getRowID = options.getRowID;
    getValue = options.getValue;
    cellMaterialization = options.cellMaterialization;
    policies = options.policies;
    limitsInput = options.limits;
    if (!Array.isArray(recordsInput) || typeof getRowID !== 'function' || typeof getValue !== 'function') {
      return fail('construction', 'invalid-source', 'Client source options require records, getRowID, and getValue.');
    }
    recordCount = recordsInput.length;
  } catch {
    return fail('construction', 'invalid-source', 'Client source options must be readable.');
  }
  if (cellMaterialization !== undefined && cellMaterialization !== 'eager' && cellMaterialization !== 'access-range') {
    return fail('construction', 'invalid-source', 'Client source cell materialization must be eager or access-range.');
  }
  const schema = validateColumnSchema(columnSchema, limitsInput);
  if (!schema.ok) return schema;
  const limits = schema.value.limits;
  if (recordCount > limits.maxScanRecords) {
    return fail('resource-rejection', 'scan-record-ceiling-exceeded', 'Client records exceed the scan ceiling.', {
      actual: recordCount,
      ceiling: limits.maxScanRecords,
    });
  }
  const records = new Array<RecordValue>(recordCount);
  try {
    for (let index = 0; index < recordCount; index += 1) records[index] = recordsInput[index]!;
  } catch {
    return fail('construction', 'invalid-source', 'Client records must be readable.');
  }
  const source = new ClientSourceRuntime(Object.freeze({
    records: Object.freeze(records),
    columnSchema: schema.value.schema,
    getRowID,
    getValue,
    ...(cellMaterialization === undefined ? {} : { cellMaterialization }),
    ...(policies === undefined ? {} : { policies }),
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
  if (response === null || typeof response !== 'object') {
    return fail('transition-rejection', 'response-envelope-mismatch', 'Tabular response must be an object.');
  }
  const prepared = preparedViewOf(response, request, currentView);
  if (prepared !== undefined) return ok(prepared);
  let protocolVersion: unknown;
  let requestID: unknown;
  let sourceGeneration: unknown;
  let queryRevision: unknown;
  let expansionRevision: unknown;
  let viewRevision: unknown;
  let accessInput: unknown;
  let matchingLeafCountInput: unknown;
  let visibleRowCountInput: unknown;
  let rowsInput: unknown;
  let rowCount: number;
  let removedRowIDsInput: unknown;
  let columnSchemaInput: unknown;
  try {
    protocolVersion = response.protocolVersion;
    requestID = response.requestID;
    sourceGeneration = response.sourceGeneration;
    queryRevision = response.queryRevision;
    expansionRevision = response.expansionRevision;
    viewRevision = response.viewRevision;
    accessInput = response.access;
    matchingLeafCountInput = response.matchingLeafCount;
    visibleRowCountInput = response.visibleRowCount;
    rowsInput = response.rows;
    if (Array.isArray(rowsInput)) {
      rowCount = rowsInput.length;
      if (!isNonNegativeSafeInteger(rowCount)) return fail('transition-rejection', 'response-envelope-mismatch', 'Response rows require a safe array length.');
    } else rowCount = Infinity;
    removedRowIDsInput = response.removedRowIDs;
    columnSchemaInput = response.columnSchema;
  } catch {
    return fail('transition-rejection', 'response-envelope-mismatch', 'Tabular response properties must be readable.');
  }
  const schema = validateColumnSchema(columnSchemaInput as TabularColumnSchema, limitsInput);
  if (!schema.ok) return transitionFailure(schema);
  const limits = schema.value.limits;
  const requestInput = normalizeRequest(request, limits);
  if (!requestInput.ok) return transitionFailure(requestInput);
  request = requestInput.value;
  const access = normalizeAccess(accessInput);
  if (!access.ok) return access;
  if (protocolVersion !== 1
    || requestID !== request.requestID
    || sourceGeneration !== request.sourceGeneration
    || queryRevision !== request.queryRevision
    || expansionRevision !== request.expansionRevision
    || !sameAccess(access.value, request.access)) {
    return fail('transition-rejection', 'response-envelope-mismatch', 'Response does not echo the active request envelope.');
  }
  if (typeof viewRevision !== 'number' || !isNonNegativeSafeInteger(viewRevision)
    || (currentView !== null
      && currentView.sourceGeneration === sourceGeneration
      && viewRevision <= currentView.viewRevision)) {
    return fail('transition-rejection', 'stale-view-revision', 'Response view revision must be strictly newer in its source generation.', {
      viewRevision,
      currentViewRevision: currentView?.viewRevision ?? null,
    });
  }
  if (schema.value.schema.revision < request.columnSchemaRevision) {
    return fail('transition-rejection', 'response-envelope-mismatch', 'Response column schema revision predates the request.');
  }
  const matchingLeafCount = validateCount(matchingLeafCountInput, 'matchingLeafCount');
  if (!matchingLeafCount.ok) return matchingLeafCount;
  const visibleRowCount = validateCount(visibleRowCountInput, 'visibleRowCount');
  if (!visibleRowCount.ok) return visibleRowCount;
  if (request.access.kind === 'page' && visibleRowCount.value.kind !== 'known') {
    return fail('transition-rejection', 'response-envelope-mismatch', 'Page responses require a known visible row count.');
  }
  const exceeded = checkResponseRowBudget(rowCount, schema.value.schema.columns.length, limits);
  if (exceeded !== null) return exceeded;
  const rows = normalizeRows(rowsInput as readonly TabularRow[], rowCount, schema.value.schema.columns, limits);
  if (!rows.ok) return rows;
  let removed: ReturnType<typeof normalizeIDs>;
  try {
    removed = normalizeIDs(removedRowIDsInput as readonly string[], 'removedRowID', limits, limits.maxScanRecords);
  } catch {
    return fail('transition-rejection', 'response-envelope-mismatch', 'Removed row identities must be readable.');
  }
  if (!removed.ok) return removed;
  const crossInvariant = validateResponseCrossInvariants(
    request,
    rows.value.rows,
    removed.value,
    matchingLeafCount.value,
    visibleRowCount.value,
  );
  if (crossInvariant !== null) return crossInvariant;
  const view = Object.freeze({
    requestID: requestID as number,
    sourceGeneration: sourceGeneration as number,
    queryRevision: queryRevision as number,
    expansionRevision: expansionRevision as number,
    viewRevision: viewRevision as number,
    access: access.value,
    matchingLeafCount: matchingLeafCount.value,
    visibleRowCount: visibleRowCount.value,
    rows: rows.value.rows,
    columnSchema: schema.value.schema,
  });
  return ok(retainRemovedRowIDs(view, removed.value, rows.value.indexes));
}

function resolveClient<RecordValue>(
  source: ClientSource<RecordValue>,
  request: TabularRequest,
  viewRevision: number,
): TabularResult<TabularViewResponse> {
  if (request.columnSchemaRevision !== 0
    && request.columnSchemaRevision < source.options.columnSchema.revision) {
    return fail('transition-rejection', 'response-envelope-mismatch', 'Request column schema revision predates the client source.');
  }
  const projected = source.resolveProjection(request);
  if (!projected.ok) return projected;
  const access = request.access;
  const total = projected.value.rowCount;
  const start = access.kind === 'page' ? deriveSafeTabularPageStart(access.page, access.itemsPerPage) : access.start;
  const count = access.kind === 'page' ? access.itemsPerPage : access.count;
  if (start === null || start > total || (access.kind === 'page' && access.page !== 1 && start >= total)) {
    return fail('transition-rejection', 'response-envelope-mismatch', 'Requested access range starts outside the resolved projection.', { start, total });
  }
  const rows = projected.value.readRows(start, Math.min(total, start + count));
  if (!rows.ok) return rows;
  return ok(Object.freeze({
    protocolVersion: 1,
    requestID: request.requestID,
    sourceGeneration: request.sourceGeneration,
    queryRevision: request.queryRevision,
    expansionRevision: request.expansionRevision,
    viewRevision,
    access: request.access,
    matchingLeafCount: projected.value.matchingLeafCount,
    visibleRowCount: projected.value.visibleRowCount,
    rows: rows.value,
    columnSchema: projected.value.query.prepared.schema,
    removedRowIDs: EMPTY_ROW_IDS,
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
    const policy = getOwnPolicy(source.options.policies?.predicates, descriptor.predicate);
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
    const policy = getOwnPolicy(source.options.policies?.comparators, descriptor.comparator);
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

type ClientIndexedRow<RecordValue> =
  | { readonly kind: 'leaf'; readonly item: ClientRecordItem<RecordValue> }
  | {
      readonly kind: 'group';
      readonly group: ClientGroupNode<RecordValue>;
      readonly depth: number;
      readonly parentGroupID: string | null;
      readonly expanded: boolean;
    };

function prepareClientProjection<RecordValue>(
  source: ClientSource<RecordValue>,
  records: readonly ClientRecordItem<RecordValue>[],
  query: TabularQuery,
  request: TabularRequest,
): TabularResult<ClientPreparedProjection<RecordValue>> {
  const pivotProjection = resolveClientPivots(source, records, query, request);
  if (!pivotProjection.ok) return pivotProjection;
  const grouped = query.groups.length !== 0;
  if (!grouped && pivotProjection.value.pivots.length > 0) {
    return fail('transition-rejection', 'invalid-query-descriptor', 'Client pivot projection requires at least one grouping descriptor.');
  }
  if (grouped && source.options.cellMaterialization === 'access-range') {
    for (const descriptor of query.aggregates) {
      if (getOwnPolicy(source.options.policies?.aggregation, descriptor.policy) === undefined) {
        return fail('construction', 'missing-policy-key', 'Aggregation policy is not registered.', { policy: descriptor.policy });
      }
    }
  }
  const groupIDs = new Set<string>();
  let groups: readonly ClientGroupNode<RecordValue>[] = [];
  if (grouped) {
    const built = buildClientGroups(source, records, query, 0, groupIDs, new Set(records.map((item) => item.rowID)));
    if (!built.ok) return built;
    groups = built.value;
  }
  return ok(Object.freeze({
    source,
    records,
    query,
    schema: pivotProjection.value.schema,
    pivots: pivotProjection.value.pivots,
    groups,
    groupIDs,
    leafRows: new Map<string, TabularResolvedRow>(),
    groupCells: new Map<string, Readonly<Record<string, TabularWireValue>>>(),
  }));
}

function projectClientExpansion<RecordValue>(
  prepared: ClientPreparedProjection<RecordValue>,
  expansion: readonly string[],
): TabularResult<Pick<ClientProjectionStage<RecordValue>, 'rowCount' | 'readRows'>> {
  const { source, records, schema, groups } = prepared;
  const grouped = groups.length !== 0;
  if (source.options.cellMaterialization === 'access-range') {
    const bounds = { limits: source.limits, columns: schema.columns.length };
    const leaf = (item: ClientRecordItem<RecordValue>) => createClientLeafRow(source, item, schema.columns);
    if (!grouped) return ok({
      rowCount: records.length,
      readRows: createClientWindowReader((index) => leaf(records[index]!), null, bounds),
    });
    const indexed = buildClientExpansion<ClientIndexedRow<RecordValue>, RecordValue>(prepared, expansion,
      (group, parentGroupID, expanded) => ok({ kind: 'group', group, parentGroupID, expanded, depth: group.depth }),
      (item) => ok({ kind: 'leaf', item }),
    );
    if (!indexed.ok) return indexed;
    const rows = indexed.value;
    return ok({
      rowCount: rows.length,
      readRows: createClientWindowReader((index) => {
        const row = rows[index]!;
        return row.kind === 'leaf' ? leaf(row.item) : materializeClientGroup(prepared, row.group, row.parentGroupID, row.expanded);
      }, createContextParentIndexes(rows), bounds),
    });
  }

  const pendingLeaves = grouped ? new Map<string, TabularResolvedRow>() : undefined;
  const pendingGroups = grouped ? new Map<string, Readonly<Record<string, TabularWireValue>>>() : undefined;
  const eager = buildClientExpansion(prepared, expansion,
    (group, parentID, expanded) => materializeClientGroup(prepared, group, parentID, expanded, pendingGroups),
    (item) => clientLeafRow(prepared, item, pendingLeaves),
  );
  if (!eager.ok) return eager;
  pendingLeaves?.forEach((row, id) => prepared.leafRows.set(id, row));
  pendingGroups?.forEach((cells, id) => prepared.groupCells.set(id, cells));
  const rows = eager.value;
  return ok({
    rowCount: rows.length,
    readRows: createClientWindowReader(rows, grouped ? createContextParentIndexes(rows) : null),
  });
}

function resolveClientPivots<RecordValue>(
  source: ClientSource<RecordValue>,
  records: readonly ClientRecordItem<RecordValue>[],
  query: TabularQuery,
  request: TabularRequest,
): TabularResult<{ readonly schema: TabularColumnSchema; readonly pivots: readonly ClientPivotRuntime<RecordValue>[] }> {
  const columns = [...source.options.columnSchema.columns];
  const headers = source.options.columnSchema.headers.length > 0
    ? [...source.options.columnSchema.headers]
    : columns.map((column) => Object.freeze({
        kind: 'column' as const,
        id: column.headerNodeID ?? column.id,
        columnID: column.id,
        ...(column.label === undefined ? {} : { label: column.label }),
      }));
  const columnIDs = new Set(columns.map((column) => column.id));
  const aggregateByID = new Map(query.aggregates.map((aggregate) => [aggregate.id, aggregate]));
  const pivots: ClientPivotRuntime<RecordValue>[] = [];
  const policyRecords = query.pivots.length === 0
    ? null
    : Object.freeze(records.map((item) => item.record));
  for (const descriptor of query.pivots) {
    const policy = getOwnPolicy(source.options.policies?.pivot, descriptor.valuePolicy);
    if (policy === undefined) return fail('construction', 'missing-policy-key', 'Pivot value policy is not registered.', { policy: descriptor.valuePolicy });
    let values: readonly TabularPivotValue<RecordValue>[];
    try {
      values = policy(policyRecords!, descriptor, source.options.getValue);
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
  const policy = getOwnPolicy(source.options.policies?.grouping, descriptor.policy);
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

function buildClientExpansion<Row, RecordValue>(
  prepared: ClientPreparedProjection<RecordValue>,
  expansion: readonly string[],
  groupRow: (group: ClientGroupNode<RecordValue>, parent: string | null, expanded: boolean) => TabularResult<Row>,
  leafRow: (item: ClientRecordItem<RecordValue>) => TabularResult<Row>,
): TabularResult<readonly Row[]> {
  const rows: Row[] = [];
  if (prepared.groups.length === 0) {
    for (const item of prepared.records) {
      const row = leafRow(item);
      if (!row.ok) return row;
      rows.push(row.value);
    }
    return ok(rows);
  }
  const expandedIDs = new Set(expansion);
  for (const groupID of expandedIDs) {
    if (!prepared.groupIDs.has(groupID)) {
      return fail('transition-rejection', 'response-envelope-mismatch', 'Expansion identifies an unknown group.', { groupID });
    }
  }
  const { maxRows } = prepared.source.limits;
  const ceiling = () => fail('resource-rejection', 'row-ceiling-exceeded', 'Grouped visible rows exceed the configured ceiling.');
  const visitGroup = (group: ClientGroupNode<RecordValue>, parentID: string | null): TabularResult<true> => {
    if (rows.length >= maxRows) return ceiling();
    const expanded = expandedIDs.has(group.id);
    const head = groupRow(group, parentID, expanded);
    if (!head.ok) return head;
    rows.push(head.value);
    if (!expanded) return VISITED_ROW;
    if (group.children.length > 0) {
      for (const child of group.children) {
        const nested = visitGroup(child, group.id);
        if (!nested.ok) return nested;
      }
    } else {
      for (const item of group.records) {
        if (rows.length >= maxRows) return ceiling();
        const leaf = leafRow(item);
        if (!leaf.ok) return leaf;
        rows.push(leaf.value);
      }
    }
    return VISITED_ROW;
  };
  for (const group of prepared.groups) {
    const result = visitGroup(group, null);
    if (!result.ok) return result;
  }
  return ok(rows);
}

function materializeClientGroup<RecordValue>(
  prepared: ClientPreparedProjection<RecordValue>,
  group: ClientGroupNode<RecordValue>,
  parentGroupID: string | null,
  expanded: boolean,
  pending?: Map<string, Readonly<Record<string, TabularWireValue>>>,
): TabularResult<TabularResolvedRow> {
  const cells = clientGroupCells(prepared, group, pending);
  if (!cells.ok) return cells;
  return ok(Object.freeze({
    kind: 'group', id: group.id, parentGroupID, depth: group.depth, expanded, cells: cells.value,
  }));
}

function clientGroupCells<RecordValue>(
  prepared: ClientPreparedProjection<RecordValue>,
  group: ClientGroupNode<RecordValue>,
  pending?: Map<string, Readonly<Record<string, TabularWireValue>>>,
): TabularResult<Readonly<Record<string, TabularWireValue>>> {
  const cached = pending === undefined ? undefined : prepared.groupCells.get(group.id) ?? pending.get(group.id);
  if (cached !== undefined) return ok(cached);
  const source = prepared.source;
  const cells: Record<string, TabularWireValue> = {};
  for (const column of prepared.schema.columns) defineCell(cells, column.id, null);
  const aggregate = (records: readonly RecordValue[], descriptor: TabularQuery['aggregates'][number],
    policy: TabularAggregationPolicy<RecordValue>,
    columnID: string,
  ): TabularResult<true> => {
    let value: TabularWireValue;
    try {
      value = policy(records, descriptor, source.options.getValue);
    } catch (error) {
      return policyFailure(descriptor.policy, error);
    }
    const normalized = normalizeWireValue(value, source.limits);
    if (!normalized.ok) return normalized;
    defineCell(cells, columnID, normalized.value);
    return VISITED_ROW;
  };
  for (const pivot of prepared.pivots) {
    const policy = getOwnPolicy(source.options.policies?.aggregation, pivot.aggregate.policy);
    if (policy === undefined) return fail('construction', 'missing-policy-key', 'Pivot aggregation policy is not registered.', { policy: pivot.aggregate.policy });
    const matchingRecords: RecordValue[] = [];
    try {
      for (const item of group.records) if (pivot.value.matches(item.record)) matchingRecords.push(item.record);
    } catch (error) {
      return policyFailure(`pivot:${pivot.value.column.id}`, error);
    }
    const result = aggregate(matchingRecords, pivot.aggregate, policy, pivot.value.column.id);
    if (!result.ok) return result;
  }
  const aggregateRecords = prepared.query.aggregates.length === 0
    ? null
    : Object.freeze(group.records.map((item) => item.record));
  for (const descriptor of prepared.query.aggregates) {
    const policy = getOwnPolicy(source.options.policies?.aggregation, descriptor.policy);
    if (policy === undefined) return fail('construction', 'missing-policy-key', 'Aggregation policy is not registered.', { policy: descriptor.policy });
    const result = aggregate(aggregateRecords!, descriptor, policy, descriptor.columnID);
    if (!result.ok) return result;
  }
  const groupDescriptor = prepared.query.groups[group.depth]!;
  defineCell(cells, groupDescriptor.columnID, group.label);
  Object.freeze(cells);
  pending?.set(group.id, cells);
  return ok(cells);
}

function clientLeafRow<RecordValue>(
  prepared: ClientPreparedProjection<RecordValue>,
  item: ClientRecordItem<RecordValue>,
  pending?: Map<string, TabularResolvedRow>,
): TabularResult<TabularResolvedRow> {
  const cached = prepared.leafRows.get(item.rowID) ?? pending?.get(item.rowID);
  if (cached !== undefined) return ok(cached);
  const row = createClientLeafRow(prepared.source, item, prepared.schema.columns);
  if (row.ok) (pending ?? prepared.leafRows).set(item.rowID, row.value);
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
    defineCell(cells, column.id, normalized.value);
  }
  return ok(Object.freeze({ kind: 'leaf', id: item.rowID, cells: Object.freeze(cells) }));
}

function defineCell(cells: Record<string, TabularWireValue>, id: string, value: TabularWireValue): void {
  Object.defineProperty(cells, id, { value, enumerable: true, configurable: true });
}

function normalizeRequest(request: TabularRequest, limits: TabularLimits): TabularResult<TabularRequest> {
  if (request === null || typeof request !== 'object') return fail(
    'transition-rejection', 'response-envelope-mismatch', 'Tabular request must be an object.',
  );
  try {
    const captured = {
      protocolVersion: request.protocolVersion,
      requestID: request.requestID,
      sourceGeneration: request.sourceGeneration,
      queryRevision: request.queryRevision,
      expansionRevision: request.expansionRevision,
      columnSchemaRevision: request.columnSchemaRevision,
      query: request.query,
      expansion: request.expansion,
      access: request.access,
    };
    const access = normalizeAccess(captured.access);
    if (!access.ok) return access;
    if (captured.protocolVersion !== 1) {
      return fail('transition-rejection', 'response-envelope-mismatch', 'Tabular request protocolVersion must be 1.');
    }
    for (const key of ['requestID', 'sourceGeneration', 'queryRevision', 'expansionRevision', 'columnSchemaRevision'] as const) {
      if (!isNonNegativeSafeInteger(captured[key])) {
        return fail('transition-rejection', 'response-envelope-mismatch', `${key} must be a non-negative safe integer.`);
      }
    }
    const query = tryCreateTabularQuery(captured.query, limits);
    if (!query.ok) return transitionFailure(query);
    if (!Array.isArray(captured.expansion) || captured.expansion.length > limits.maxRows) {
      return fail('resource-rejection', 'row-ceiling-exceeded', 'Request expansion exceeds the row ceiling.');
    }
    const expansion = normalizeIDs(captured.expansion, 'groupID', limits);
    if (!expansion.ok) return expansion;
    return ok(Object.freeze({ ...captured, access: access.value, query: query.value, expansion: expansion.value }));
  } catch {
    return fail('transition-rejection', 'response-envelope-mismatch', 'Tabular request properties must be readable.');
  }
}

function validateColumnSchema(
  input: TabularColumnSchema,
  limitsInput?: Partial<TabularLimits>,
): TabularResult<{ readonly schema: TabularColumnSchema; readonly limits: TabularLimits }> {
  if (input === null || typeof input !== 'object') return fail('construction', 'invalid-source', 'Column schema requires a non-negative revision.');
  try {
    const revision = input.revision;
    const columns = input.columns;
    const headers = input.headers;
    if (!isNonNegativeSafeInteger(revision)) return fail('construction', 'invalid-source', 'Column schema requires a non-negative revision.');
    const model = tryCreateTabularModel({
      columns,
      headers,
      ...(limitsInput === undefined ? {} : { limits: limitsInput }),
    });
    if (!model.ok) return model;
    return ok(Object.freeze({
      schema: Object.freeze({ revision, columns: model.value.columns, headers: model.value.headers }),
      limits: model.value.limits,
    }));
  } catch {
    return fail('construction', 'invalid-source', 'Column schema properties must be readable.');
  }
}

function normalizeRows(
  input: readonly TabularRow[],
  rowCount: number,
  columns: readonly TabularColumnDefinition[],
  limits: TabularLimits,
): TabularResult<{ readonly rows: readonly TabularResolvedRow[]; readonly indexes: ReadonlyMap<TabularRowID | TabularGroupID, number> }> {
  const columnPaths = columns.map((column) => Object.freeze({
    id: column.id,
    segments: parseCellPath(column.id, limits.maxQueryValueDepth),
  }));
  const indexes = new Map<TabularRowID | TabularGroupID, number>();
  const result: TabularResolvedRow[] = [];
  for (let index = 0; index < rowCount; index += 1) {
    try {
      const row = input[index];
      if (row === null || typeof row !== 'object') {
        return fail('transition-rejection', 'response-envelope-mismatch', 'Every response row must be a leaf or group.');
      }
      const kind = row.kind;
      if (kind !== 'leaf' && kind !== 'group') {
        return fail('transition-rejection', 'response-envelope-mismatch', 'Every response row must be a leaf or group.');
      }
      const id = row.id;
      const cellsInput = row.cells;
      const contextOnly = (row as { readonly contextOnly?: unknown }).contextOnly;
      if (contextOnly !== undefined && (kind === 'leaf' || typeof contextOnly !== 'boolean')) {
        return fail('transition-rejection', 'response-envelope-mismatch', 'contextOnly requires a group row.', { id });
      }
      const idError = validateID(id, kind === 'leaf' ? 'rowID' : 'groupID', limits);
      if (idError !== null) return { ok: false, error: { ...idError, class: 'transition-rejection' } };
      if (indexes.has(id)) return fail('transition-rejection', 'duplicate-identity', 'Response row identities must be unique.', { id });
      indexes.set(id, result.length);
      let parentGroupID: string | null = null;
      let depth = 0;
      let expanded = false;
      if (kind === 'group') {
        const group = row as Extract<TabularRow, { readonly kind: 'group' }>;
        parentGroupID = group.parentGroupID;
        depth = group.depth;
        expanded = group.expanded;
        if (!isNonNegativeSafeInteger(depth) || depth > limits.maxGroupDepth) {
          return fail('resource-rejection', 'group-depth-ceiling-exceeded', 'Response group depth exceeds the configured ceiling.');
        }
      }
      if (cellsInput === null || typeof cellsInput !== 'object' || Array.isArray(cellsInput)) {
        return fail('transition-rejection', 'response-envelope-mismatch', 'Response row cells must be a record.');
      }
      const normalized = normalizeWireValue(cellsInput, limits);
      if (!normalized.ok) return normalized;
      const cells = normalized.value as Readonly<Record<string, TabularWireValue>>;
      for (const column of columnPaths) {
        if (!hasCellValue(cells, column.id, column.segments)) {
          return fail('transition-rejection', 'response-envelope-mismatch', 'Every response row requires one value for every schema column.', { rowID: id, columnID: column.id });
        }
      }
      result.push(kind === 'leaf'
        ? Object.freeze({ kind, id, cells })
        : Object.freeze({ kind, id, parentGroupID, depth, expanded, cells, ...(contextOnly === undefined ? {} : { contextOnly: contextOnly as boolean }) }));
    } catch {
      return fail('transition-rejection', 'response-envelope-mismatch', 'Response row properties must be readable.');
    }
  }
  return ok(Object.freeze({ rows: Object.freeze(result), indexes }));
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
      if (current.length > limits.maxQueryValueNodes - nodes) {
        stack.delete(current);
        return fail('resource-rejection', 'query-value-node-ceiling-exceeded', 'Wire value exceeds its node ceiling.');
      }
      const output: TabularWireValue[] = [];
      for (let index = 0; index < current.length; index += 1) {
        const descriptor = Object.getOwnPropertyDescriptor(current, index);
        if (descriptor === undefined) return fail('construction', 'invalid-query-value', 'Sparse wire arrays are invalid.');
        if (!('value' in descriptor)) return fail('construction', 'invalid-query-value', 'Wire arrays cannot contain accessors.');
        const item = visit(descriptor.value, depth + 1);
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

function normalizeIDs(
  input: readonly string[],
  label: string,
  limits: TabularLimits,
  ceiling?: number,
): TabularResult<readonly string[]> {
  if (!Array.isArray(input)) return fail('transition-rejection', 'response-envelope-mismatch', `${label} list must be an array.`);
  const length = input.length;
  if (!isNonNegativeSafeInteger(length)) return fail('transition-rejection', 'response-envelope-mismatch', `${label} list requires a safe array length.`);
  if (ceiling !== undefined && length > ceiling) {
    return fail('resource-rejection', 'scan-record-ceiling-exceeded', `${label} list exceeds the configured source cardinality ceiling.`, { actual: length, ceiling });
  }
  if (length === 0) return ok(EMPTY_ROW_IDS);
  const ids = new Set<string>();
  const output: string[] = [];
  for (let index = 0; index < length; index += 1) {
    const descriptor = Object.getOwnPropertyDescriptor(input, index);
    if (descriptor === undefined || !('value' in descriptor)) {
      return fail('transition-rejection', 'response-envelope-mismatch', `${label} list must contain readable data elements.`);
    }
    const id = descriptor.value;
    const error = validateID(id, label, limits);
    if (error !== null) return { ok: false, error: { ...error, class: 'transition-rejection' } };
    if (ids.has(id)) return fail('transition-rejection', 'duplicate-identity', `${label} list must be unique.`, { id });
    ids.add(id);
    output.push(id);
  }
  return ok(Object.freeze(output));
}

function normalizeAccess(access: unknown): TabularResult<TabularAccessRange> {
  if (access === null || typeof access !== 'object' || Array.isArray(access)) {
    return fail('transition-rejection', 'response-envelope-mismatch', 'Tabular access kind is invalid.');
  }
  try {
    const value = access as TabularAccessRange;
    const kind = value.kind;
    if (kind === 'page') {
      const page = value.page;
      const itemsPerPage = value.itemsPerPage;
      if (!Number.isSafeInteger(page) || page < 1 || !Number.isSafeInteger(itemsPerPage) || itemsPerPage < 1) {
        return fail('transition-rejection', 'response-envelope-mismatch', 'Page access requires positive safe page and itemsPerPage values.');
      }
      return deriveSafeTabularPageStart(page, itemsPerPage) === null
        ? fail('transition-rejection', 'response-envelope-mismatch', 'Page access requires a safe derived start.')
        : ok(Object.freeze({ kind, page, itemsPerPage }));
    }
    if (kind === 'window') {
      const start = value.start;
      const count = value.count;
      return isNonNegativeSafeInteger(start) && isNonNegativeSafeInteger(count) && start <= Number.MAX_SAFE_INTEGER - count
        ? ok(Object.freeze({ kind, start, count }))
        : fail('transition-rejection', 'response-envelope-mismatch', 'Window access requires a safe non-negative range.');
    }
  } catch {
    return fail('transition-rejection', 'response-envelope-mismatch', 'Tabular access properties must be readable.');
  }
  return fail('transition-rejection', 'response-envelope-mismatch', 'Tabular access kind is invalid.');
}

function validateCount(count: unknown, label: string): TabularResult<TabularCount> {
  if (count === null || typeof count !== 'object' || Array.isArray(count)) {
    return fail('transition-rejection', 'response-envelope-mismatch', `${label} must be a known non-negative safe count or unknown.`);
  }
  try {
    const value = count as TabularCount;
    const kind = value.kind;
    if (kind === 'unknown') return ok(Object.freeze({ kind }));
    if (kind === 'known') {
      const numeric = value.value;
      if (isNonNegativeSafeInteger(numeric)) return ok(Object.freeze({ kind, value: numeric }));
    }
  } catch {
    return fail('transition-rejection', 'response-envelope-mismatch', `${label} properties must be readable.`);
  }
  return fail('transition-rejection', 'response-envelope-mismatch', `${label} must be a known non-negative safe count or unknown.`);
}

function validateResponseCrossInvariants(
  request: TabularRequest,
  rows: readonly TabularResolvedRow[],
  removedRowIDs: readonly string[],
  matchingLeafCount: TabularCount,
  visibleRowCount: TabularCount,
): TabularResult<never> | null {
  const rowIDs = new Set(rows.map((row) => row.id));
  const overlap = removedRowIDs.find((id) => rowIDs.has(id));
  if (overlap !== undefined) {
    return fail('transition-rejection', 'response-envelope-mismatch', 'Returned and removed row identities must be disjoint.', { rowID: overlap });
  }
  const start = request.access.kind === 'page'
    ? deriveSafeTabularPageStart(request.access.page, request.access.itemsPerPage)
    : request.access.start;
  const capacity = request.access.kind === 'page' ? request.access.itemsPerPage : request.access.count;
  if (start === null) return fail('transition-rejection', 'response-envelope-mismatch', 'Returned rows exceed the requested access range.');
  let contextCount = 0;
  let contextParent: TabularGroupID | null = null;
  let observable = false;
  let leafCount = 0;
  for (const row of rows) {
    if ((row as { readonly contextOnly?: boolean }).contextOnly === true) {
      if (observable || contextCount >= start || contextCount >= request.query.groups.length
        || (row as Extract<TabularResolvedRow, { readonly kind: 'group' }>).depth !== contextCount
        || (row as Extract<TabularResolvedRow, { readonly kind: 'group' }>).parentGroupID !== contextParent) {
        return fail('transition-rejection', 'response-envelope-mismatch', 'Invalid context-only ancestry.');
      }
      contextParent = row.id;
      contextCount += 1;
      continue;
    }
    if (!observable && contextCount > 0 && row.kind === 'group'
      && (row.depth !== contextCount || row.parentGroupID !== contextParent)) {
      return fail('transition-rejection', 'response-envelope-mismatch', 'Invalid context-only ancestry.');
    }
    observable = true;
    if (row.kind === 'leaf') leafCount += 1;
  }
  const observableLength = rows.length - contextCount;
  if (matchingLeafCount.kind === 'known' && leafCount > matchingLeafCount.value) {
    return fail('transition-rejection', 'response-envelope-mismatch', 'Returned leaf rows exceed the matching leaf count.', {
      returnedLeafRows: leafCount,
      matchingLeafCount: matchingLeafCount.value,
    });
  }
  if (visibleRowCount.kind === 'known' && observableLength > visibleRowCount.value) {
    return fail('transition-rejection', 'response-envelope-mismatch', 'Returned visible rows exceed the visible row count.', {
      returnedVisibleRows: observableLength,
      visibleRowCount: visibleRowCount.value,
    });
  }
  if (observableLength > capacity) {
    return fail('transition-rejection', 'response-envelope-mismatch', 'Returned rows exceed the requested access range.');
  }
  if (visibleRowCount.kind === 'known') {
    const expected = start <= visibleRowCount.value
      ? Math.min(capacity, visibleRowCount.value - start)
      : -1;
    if (observableLength !== expected) {
      return fail('transition-rejection', 'response-envelope-mismatch', 'Returned rows do not fill the requested range within the known visible count.', {
        start,
        capacity,
        expected,
        actual: observableLength,
        visibleRowCount: visibleRowCount.value,
      });
    }
  }
  return null;
}

function sameAccess(left: TabularAccessRange, right: TabularAccessRange): boolean {
  return left.kind === 'page'
    ? right.kind === 'page' && left.page === right.page && left.itemsPerPage === right.itemsPerPage
    : right.kind === 'window' && left.start === right.start && left.count === right.count;
}

function isNonNegativeSafeInteger(value: number): boolean {
  return Number.isSafeInteger(value) && value >= 0;
}

function getOwnPolicy<Policy>(registry: Readonly<Record<string, Policy>> | undefined, key: string): Policy | undefined {
  return registry !== undefined && Object.hasOwn(registry, key) ? registry[key] : undefined;
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
} from '../contracts.js';
