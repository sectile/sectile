import type { CollectionWindowState } from '@sectile/core/collection-window';
import type { PaginationState } from '@sectile/core/pagination';
import type { ErrorClass, Result, SectileError } from '@sectile/core/result';

export type TabularRowID = string;
export type TabularGroupID = string;
export type TabularColumnID = string;
export type TabularHeaderNodeID = string;
export type TabularCellID = string;
export type TabularDescriptorID = string;
export type TabularPolicyKey = string;
export type TabularProjectionGeneration = number;

export type TabularQueryValue =
  | null
  | boolean
  | number
  | string
  | readonly TabularQueryValue[]
  | { readonly [key: string]: TabularQueryValue };

export type TabularWireValue = TabularQueryValue;

export type TabularCellRecord = Readonly<Record<TabularColumnID, TabularWireValue>>;
export type TabularWireCells<Cells extends object> = Readonly<{
  [Column in keyof Cells]: Extract<Cells[Column], TabularWireValue>;
}>;

export interface TabularCellAddress {
  readonly rowID: TabularRowID;
  readonly columnID: TabularColumnID;
}

export type TabularColumnCapability =
  | 'sort'
  | 'filter'
  | 'group'
  | 'aggregate'
  | 'pivot'
  | 'edit';

export type TabularPinRegion = 'start' | 'center' | 'end';

export interface TabularColumnDefinition {
  readonly id: TabularColumnID;
  readonly label?: string;
  readonly capabilities?: readonly TabularColumnCapability[];
  readonly initialVisible?: boolean;
  readonly initialPin?: TabularPinRegion;
  readonly headerNodeID?: TabularHeaderNodeID;
}

export type TabularHeaderNode =
  | {
      readonly kind: 'column';
      readonly id: TabularHeaderNodeID;
      readonly columnID: TabularColumnID;
      readonly label?: string;
    }
  | {
      readonly kind: 'group';
      readonly id: TabularHeaderNodeID;
      readonly label?: string;
      readonly children: readonly TabularHeaderNode[];
    };

export interface TabularLeafRow<Cells extends object = TabularCellRecord> {
  readonly kind: 'leaf';
  readonly id: TabularRowID;
  readonly cells: TabularWireCells<Cells>;
  readonly contextOnly?: boolean;
}

export interface TabularGroupRow<Cells extends object = TabularCellRecord> {
  readonly kind: 'group';
  readonly id: TabularGroupID;
  readonly parentGroupID: TabularGroupID | null;
  readonly depth: number;
  readonly expanded: boolean;
  readonly cells: TabularWireCells<Cells>;
  readonly contextOnly?: boolean;
}

export type TabularRow<
  LeafCells extends object = TabularCellRecord,
  GroupCells extends object = LeafCells,
> = TabularLeafRow<LeafCells> | TabularGroupRow<GroupCells>;

export interface TabularLimits {
  readonly maxIDCodeUnits: number;
  readonly maxRows: number;
  readonly maxColumns: number;
  readonly maxProjectedCells: number;
  readonly maxGroupDepth: number;
  readonly maxSortRules: number;
  readonly maxFilterRules: number;
  readonly maxGroupDescriptors: number;
  readonly maxAggregateDescriptors: number;
  readonly maxPivotDescriptors: number;
  readonly maxPivotColumns: number;
  readonly maxSelectionIDs: number;
  readonly maxScanRecords: number;
  readonly maxQueryValueDepth: number;
  readonly maxQueryValueCodeUnits: number;
  readonly maxQueryValueNodes: number;
}

export interface TabularSort {
  readonly id: TabularDescriptorID;
  readonly columnID: TabularColumnID;
  readonly direction: 'ascending' | 'descending';
  readonly comparator: TabularPolicyKey;
}

export interface TabularFilter {
  readonly id: TabularDescriptorID;
  readonly scope: 'global' | 'column';
  readonly columnID?: TabularColumnID;
  readonly predicate: TabularPolicyKey;
  readonly value: TabularQueryValue;
  readonly enabled?: boolean;
}

export interface TabularGroup {
  readonly id: TabularDescriptorID;
  readonly columnID: TabularColumnID;
  readonly policy: TabularPolicyKey;
}

export interface TabularAggregate {
  readonly id: TabularDescriptorID;
  readonly columnID: TabularColumnID;
  readonly policy: TabularPolicyKey;
}

export interface TabularPivot {
  readonly id: TabularDescriptorID;
  readonly columnID: TabularColumnID;
  readonly valuePolicy: TabularPolicyKey;
  readonly aggregateIDs: readonly TabularDescriptorID[];
}

export interface TabularQuery {
  readonly sort: readonly TabularSort[];
  readonly filters: readonly TabularFilter[];
  readonly groups: readonly TabularGroup[];
  readonly aggregates: readonly TabularAggregate[];
  readonly pivots: readonly TabularPivot[];
}

export interface TabularQueryInput {
  readonly sort?: readonly TabularSort[];
  readonly filters?: readonly TabularFilter[];
  readonly groups?: readonly TabularGroup[];
  readonly aggregates?: readonly TabularAggregate[];
  readonly pivots?: readonly TabularPivot[];
}

export type TabularQueryEvent =
  | { readonly type: 'set-sort'; readonly sort: readonly TabularSort[] }
  | { readonly type: 'set-filters'; readonly filters: readonly TabularFilter[] }
  | { readonly type: 'set-groups'; readonly groups: readonly TabularGroup[] }
  | { readonly type: 'set-aggregates'; readonly aggregates: readonly TabularAggregate[] }
  | { readonly type: 'set-pivots'; readonly pivots: readonly TabularPivot[] }
  | { readonly type: 'reset' };

export type TabularRowSelection =
  | { readonly kind: 'explicit-rows'; readonly rowIDs: readonly TabularRowID[] }
  | {
      readonly kind: 'all-matching';
      readonly sourceGeneration: number;
      readonly queryRevision: number;
      readonly excludedRowIDs: readonly TabularRowID[];
    };

export interface TabularColumnState {
  readonly order: readonly TabularColumnID[];
  readonly hidden: readonly TabularColumnID[];
  readonly pinnedStart: readonly TabularColumnID[];
  readonly pinnedEnd: readonly TabularColumnID[];
}

export type TabularAccessState =
  | {
      readonly kind: 'page';
      readonly page: number;
      readonly itemsPerPage: number;
      readonly visibleRowCount: number | null;
      readonly pagination: PaginationState | null;
    }
  | { readonly kind: 'window'; readonly window: CollectionWindowState<TabularRowID> };

export type TabularRequestState =
  | { readonly kind: 'idle'; readonly pendingRequest: null }
  | { readonly kind: 'pending'; readonly pendingRequest: TabularRequest }
  | { readonly kind: 'ready'; readonly pendingRequest: null };

export type TabularCount =
  | { readonly kind: 'known'; readonly value: number }
  | { readonly kind: 'unknown' };

export type TabularAccessRange =
  | { readonly kind: 'page'; readonly page: number; readonly itemsPerPage: number }
  | { readonly kind: 'window'; readonly start: number; readonly count: number };

export interface TabularRequest {
  readonly protocolVersion: 1;
  readonly requestID: number;
  readonly sourceGeneration: number;
  readonly queryRevision: number;
  readonly expansionRevision: number;
  readonly query: TabularQuery;
  readonly expansion: readonly TabularGroupID[];
  readonly access: TabularAccessRange;
  readonly columnSchemaRevision: number;
}

export interface TabularColumnSchema {
  readonly revision: number;
  readonly columns: readonly TabularColumnDefinition[];
  readonly headers: readonly TabularHeaderNode[];
}

export interface TabularView<Row extends TabularRow = TabularRow> {
  readonly requestID: number;
  readonly sourceGeneration: number;
  readonly queryRevision: number;
  readonly expansionRevision: number;
  readonly viewRevision: number;
  readonly access: TabularAccessRange;
  readonly matchingLeafCount: TabularCount;
  readonly visibleRowCount: TabularCount;
  readonly rows: readonly Row[];
  readonly columnSchema: TabularColumnSchema;
}

export type TabularResolvedRow<
  LeafCells extends object = TabularCellRecord,
  GroupCells extends object = LeafCells,
> = TabularRow<LeafCells, GroupCells>;

export interface TabularViewResponse<Row extends TabularRow = TabularRow> {
  readonly protocolVersion: 1;
  readonly requestID: number;
  readonly sourceGeneration: number;
  readonly queryRevision: number;
  readonly expansionRevision: number;
  readonly viewRevision: number;
  readonly access: TabularAccessRange;
  readonly matchingLeafCount: TabularCount;
  readonly visibleRowCount: TabularCount;
  readonly rows: readonly Row[];
  readonly columnSchema: TabularColumnSchema;
  readonly removedRowIDs: readonly TabularRowID[];
}

export type TabularAccessorPolicy<RecordValue> = (
  record: RecordValue,
  columnID: TabularColumnID,
) => TabularWireValue;

export type TabularComparisonPolicy<RecordValue> = (
  left: RecordValue,
  right: RecordValue,
  descriptor: TabularSort,
  getValue: TabularAccessorPolicy<RecordValue>,
) => number;

export type TabularPredicatePolicy<RecordValue> = (
  record: RecordValue,
  descriptor: TabularFilter,
  getValue: TabularAccessorPolicy<RecordValue>,
) => boolean;

export interface TabularGroupingValue {
  readonly groupID: TabularGroupID;
  readonly label: TabularWireValue;
}

export type TabularGroupingPolicy<RecordValue> = (
  record: RecordValue,
  descriptor: TabularGroup,
  depth: number,
  getValue: TabularAccessorPolicy<RecordValue>,
) => TabularGroupingValue;

export type TabularAggregationPolicy<RecordValue> = (
  records: readonly RecordValue[],
  descriptor: TabularAggregate,
  getValue: TabularAccessorPolicy<RecordValue>,
) => TabularWireValue;

export interface TabularPivotValue<RecordValue = unknown> {
  readonly column: TabularColumnDefinition;
  readonly header: TabularHeaderNode;
  readonly aggregateID: TabularDescriptorID;
  matches(record: RecordValue): boolean;
}

export type TabularPivotPolicy<RecordValue> = (
  records: readonly RecordValue[],
  descriptor: TabularPivot,
  getValue: TabularAccessorPolicy<RecordValue>,
) => readonly TabularPivotValue<RecordValue>[];

export interface TabularClientPolicies<RecordValue> {
  readonly comparators?: Readonly<Record<TabularPolicyKey, TabularComparisonPolicy<RecordValue>>>;
  readonly predicates?: Readonly<Record<TabularPolicyKey, TabularPredicatePolicy<RecordValue>>>;
  readonly grouping?: Readonly<Record<TabularPolicyKey, TabularGroupingPolicy<RecordValue>>>;
  readonly aggregation?: Readonly<Record<TabularPolicyKey, TabularAggregationPolicy<RecordValue>>>;
  readonly pivot?: Readonly<Record<TabularPolicyKey, TabularPivotPolicy<RecordValue>>>;
}

export interface TabularClientSourceOptions<RecordValue> {
  readonly records: readonly RecordValue[];
  readonly columnSchema: TabularColumnSchema;
  readonly getRowID: (record: RecordValue, index: number) => TabularRowID;
  readonly getValue: TabularAccessorPolicy<RecordValue>;
  readonly policies?: TabularClientPolicies<RecordValue>;
  readonly limits?: Partial<TabularLimits>;
}

export interface TabularSource {
  resolve(request: TabularRequest): TabularResult<TabularViewResponse>;
}

export type TabularAcceptedViewState<Row extends TabularRow = TabularRow> =
  | { readonly kind: 'none' }
  | { readonly kind: 'stale'; readonly view: TabularView<Row> }
  | { readonly kind: 'current'; readonly view: TabularView<Row> };

export interface TabularState {
  readonly query: TabularQuery;
  readonly rowSelection: TabularRowSelection;
  readonly columnState: TabularColumnState;
  readonly accessState: TabularAccessState;
  readonly expansion: readonly TabularGroupID[];
  readonly queryRevision: number;
  readonly expansionRevision: number;
  readonly sourceGeneration: number;
  readonly requestRevision: number;
  readonly columnSchemaRevision: number;
  readonly projectionGeneration: TabularProjectionGeneration;
  readonly requestState: TabularRequestState;
  readonly acceptedViewState: TabularAcceptedViewState;
}

export interface TabularSnapshot {
  readonly revision: number;
  readonly state: TabularState;
}

export interface TabularControlledValues {
  readonly query?: TabularQuery;
  readonly rowSelection?: TabularRowSelection;
  readonly columnState?: TabularColumnState;
  readonly accessState?: TabularAccessState;
  readonly expansion?: readonly TabularGroupID[];
}

export interface TabularControlledOwnership {
  readonly query?: boolean;
  readonly rowSelection?: boolean;
  readonly columnState?: boolean;
  readonly accessState?: boolean;
  readonly expansion?: boolean;
}

export interface TabularOptions {
  readonly columns: readonly TabularColumnDefinition[];
  readonly headers?: readonly TabularHeaderNode[];
  readonly limits?: Partial<TabularLimits>;
  readonly controlled?: TabularControlledOwnership;
  readonly initialValues?: TabularControlledValues;
}

export interface TabularModel {
  readonly columns: readonly TabularColumnDefinition[];
  readonly headers: readonly TabularHeaderNode[];
  readonly limits: TabularLimits;
  readonly controlled: Required<TabularControlledOwnership>;
  readonly initialValues: TabularControlledValues;
}

export type TabularEvent =
  | { readonly type: 'reset' }
  | { readonly type: 'sync-controlled'; readonly values: TabularControlledValues };

export type TabularSelectionTarget =
  | TabularRowSelection
  | {
      readonly kind: 'group-leaves';
      readonly sourceGeneration: number;
      readonly queryRevision: number;
      readonly groupID: TabularGroupID;
      readonly excludedRowIDs: readonly TabularRowID[];
    };

export type TabularCommand =
  | { readonly type: 'request-view'; readonly request: TabularRequest }
  | { readonly type: 'request-bulk-selection'; readonly target: TabularSelectionTarget };

export interface TabularUpdate {
  readonly snapshot: TabularSnapshot;
  readonly commands: readonly TabularCommand[];
}

export type TabularLimitErrorCode =
  | 'id-code-unit-ceiling-exceeded'
  | 'row-ceiling-exceeded'
  | 'column-ceiling-exceeded'
  | 'projected-cell-ceiling-exceeded'
  | 'group-depth-ceiling-exceeded'
  | 'sort-rule-ceiling-exceeded'
  | 'filter-rule-ceiling-exceeded'
  | 'group-descriptor-ceiling-exceeded'
  | 'aggregate-descriptor-ceiling-exceeded'
  | 'pivot-descriptor-ceiling-exceeded'
  | 'pivot-column-ceiling-exceeded'
  | 'selection-id-ceiling-exceeded'
  | 'scan-record-ceiling-exceeded'
  | 'query-value-depth-ceiling-exceeded'
  | 'query-value-code-unit-ceiling-exceeded'
  | 'query-value-node-ceiling-exceeded';

export type TabularErrorCode =
  | TabularLimitErrorCode
  | 'invalid-limit'
  | 'invalid-id'
  | 'invalid-cell-codec'
  | 'invalid-column-definition'
  | 'invalid-header-node'
  | 'invalid-query-value'
  | 'invalid-query-descriptor'
  | 'invalid-query-event'
  | 'invalid-data-table-event'
  | 'invalid-source'
  | 'source-policy-failed'
  | 'missing-policy-key'
  | 'duplicate-identity'
  | 'invalid-controlled-shape'
  | 'controlled-value-required'
  | 'controller-disposed'
  | 'uncontrolled-value-update'
  | 'stale-revision'
  | 'revision-ceiling-reached'
  | 'profile-view-mismatch'
  | 'response-envelope-mismatch'
  | 'stale-request'
  | 'stale-source-generation'
  | 'stale-query-revision'
  | 'stale-view-revision'
  | 'invalid-selection-range'
  | 'invalid-edit-target'
  | 'duplicate-source-executor';

export type TabularResult<T> = Result<T, TabularErrorCode>;
export type TabularError = SectileError<TabularErrorCode>;
export type { ErrorClass };
