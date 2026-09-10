import assert from 'node:assert/strict';
import test from 'node:test';
import { applyDataTableEvent, createDataTable, tryCreateDataTable } from '../../.verification-dist/data-table.js';
import { prepareControlledDataTableState } from '../../.verification-dist/internal/data-table-state.js';
import { createTabularModel, tryCreateTabularState } from '../../.verification-dist/model.js';
import { createClientTabularSource, resolveClientTabularRequest } from '../../.verification-dist/source.js';

const columns = [{ id: 'name', capabilities: ['sort', 'edit'] }, { id: 'score' }];
const source = createClientTabularSource({
  records: [{ id: 'a', name: 'Alpha', score: 1 }, { id: 'b', name: 'Beta', score: 2 }],
  columnSchema: { revision: 0, columns, headers: [] },
  getRowID: (record) => record.id,
  getValue: (record, columnID) => record[columnID],
});

test('TAB-TBL-01: controller begins pending and one executor resolves the current native-table projection', () => {
  const table = createDataTable({ columns });
  assert.equal(table.getSnapshot().state.requestState.kind, 'pending');
  assert.deepEqual(table.getProjection().rows, []);
  let executions = 0;
  const attached = table.attachRequestExecutor((command) => {
    executions += 1;
    const response = resolveClientTabularRequest(source, command.request);
    assert.equal(response.ok, true);
    assert.equal(table.synchronizeView(response.value).ok, true);
  });
  assert.equal(attached.ok, true);
  assert.equal(executions, 1);
  assert.deepEqual(table.getProjection().rows.map((row) => row.id), ['a', 'b']);
  assert.equal(table.getSnapshot().state.requestState.kind, 'ready');
  assert.equal(table.getProjection().generation, 1);
});

test('TAB-TBL-02: observer and sole executor channels remain distinct and disposable', () => {
  const table = createDataTable({ columns });
  const observed = [];
  const stop = table.subscribeCommands((command) => observed.push(command.type));
  const first = table.attachRequestExecutor(() => undefined);
  const duplicate = table.attachRequestExecutor(() => undefined);
  assert.equal(first.ok, true);
  assert.equal(duplicate.ok, false);
  assert.equal(duplicate.error.code, 'duplicate-source-executor');
  const update = table.dispatch({ type: 'request-view' });
  assert.equal(update.ok, true);
  assert.deepEqual(observed, ['request-view']);
  stop();
  first.value();
  assert.equal(table.attachRequestExecutor(() => undefined).ok, true);
});

test('TAB-TBL-03: response envelopes, abandonment, and stale requests are failure-atomic', () => {
  const table = createDataTable({ columns });
  const pending = table.getSnapshot().state.requestState.pendingRequest;
  const wrong = resolveClientTabularRequest(source, { ...pending, requestID: pending.requestID + 1 });
  assert.equal(wrong.ok, true);
  const rejected = table.synchronizeView(wrong.value);
  assert.equal(rejected.ok, false);
  assert.equal(rejected.error.code, 'response-envelope-mismatch');
  assert.equal(table.getSnapshot().state.requestState.pendingRequest, pending);
  assert.equal(table.abandonRequest(pending.requestID + 1).ok, false);
  assert.equal(table.abandonRequest(pending.requestID).ok, true);
  assert.equal(table.getSnapshot().state.requestState.kind, 'idle');
});

test('ISSUE-051: DataTable reconciles selection from the validated removal snapshot exactly once', () => {
  const table = createDataTable({
    columns,
    initialValues: { rowSelection: { kind: 'explicit-rows', rowIDs: ['a'] } },
  });
  const pending = table.getSnapshot().state.requestState.pendingRequest;
  const resolved = resolveClientTabularRequest(source, pending);
  assert.equal(resolved.ok, true);
  let reads = 0;
  const response = { ...resolved.value };
  Object.defineProperty(response, 'removedRowIDs', {
    enumerable: true,
    get() { reads += 1; return reads === 1 ? [] : ['a']; },
  });
  const synchronized = table.synchronizeView(response);
  assert.equal(synchronized.ok, true);
  assert.equal(reads, 1);
  assert.deepEqual(table.getSnapshot().state.rowSelection, { kind: 'explicit-rows', rowIDs: ['a'] });
});

test('TAB-TBL-04: DataTable value commit is application intent without cell cursor or edit authority', () => {
  const table = createDataTable({ columns });
  const commands = [];
  table.subscribeCommands((command) => commands.push(command));
  const result = table.dispatch({
    type: 'request-value-commit',
    cell: { rowID: 'a', columnID: 'name' },
    value: 'Renamed',
  });
  assert.equal(result.ok, true);
  assert.deepEqual(commands, [{
    type: 'request-value-commit', cell: { rowID: 'a', columnID: 'name' }, value: 'Renamed',
  }]);
  assert.equal('cursor' in table.getSnapshot().state, false);
  assert.equal('editState' in table.getSnapshot().state, false);
});

test('TAB-TBL-05: controlled query proposes once and requests only after external synchronization', () => {
  const proposals = [];
  const query = { sort: [], filters: [], groups: [], aggregates: [], pivots: [] };
  const tableResult = tryCreateDataTable({
    columns,
    controlled: { query: true },
    initialValues: { query },
    onQueryChange: (next) => proposals.push(next),
  });
  assert.equal(tableResult.ok, true);
  const table = tableResult.value;
  const commands = [];
  table.subscribeCommands((command) => commands.push(command.type));
  const next = { ...query, sort: [{ id: 'name', columnID: 'name', direction: 'ascending', comparator: 'text' }] };
  const proposed = table.dispatch({ type: 'set-query', query: next });
  assert.equal(proposed.ok, true);
  assert.equal(proposals.length, 1);
  assert.deepEqual(table.getSnapshot().state.query, query);
  assert.deepEqual(commands, []);
  const synchronized = table.syncControlledValues({ query: next });
  assert.equal(synchronized.ok, true);
  assert.equal(table.getSnapshot().state.query.sort[0].id, 'name');
  assert.deepEqual(commands, ['request-view']);
});

test('TAB-TBL-09: unchanged projection reads retain column partitions across domain sizes', () => {
  const filter = Array.prototype.filter;
  for (const size of [100, 1_000, 10_000]) {
    const largeColumns = Array.from({ length: size }, (_, index) => ({ id: `c${index}` }));
    const table = createDataTable({ columns: largeColumns, limits: { maxColumns: size } });
    const first = table.getProjection();
    const order = table.getSnapshot().state.columnState.order;
    let orderScans = 0;
    Array.prototype.filter = function(...args) {
      if (this === order) orderScans += 1;
      return filter.apply(this, args);
    };
    try {
      const second = table.getProjection();
      const third = table.getProjection();
      assert.equal(second.columns, first.columns);
      assert.equal(third.columns, first.columns);
      assert.equal(second.rows, first.rows);
      assert.equal(third.rows, first.rows);
    } finally {
      Array.prototype.filter = filter;
    }
    assert.equal(orderScans, 0, `${size} unchanged columns rescanned`);
  }

  const table = createDataTable({ columns });
  const initial = table.getProjection();
  const changed = table.dispatch({
    type: 'set-column-state',
    columnState: { order: ['score', 'name'], hidden: [], pinnedStart: ['score'], pinnedEnd: [] },
  });
  assert.equal(changed.ok, true);
  const changedOrder = table.getSnapshot().state.columnState.order;
  let rebuildScans = 0;
  Array.prototype.filter = function(...args) {
    if (this === changedOrder) rebuildScans += 1;
    return filter.apply(this, args);
  };
  try {
    const rebuilt = table.getProjection();
    const retained = table.getProjection();
    assert.notEqual(rebuilt.columns, initial.columns);
    assert.equal(retained.columns, rebuilt.columns);
    assert.deepEqual(rebuilt.columns, { start: ['score'], center: ['name'], end: [] });
  } finally {
    Array.prototype.filter = filter;
  }
  assert.equal(rebuildScans, 3);
});

test('TAB-TBL-08: request-basis and projection counters stop at the safe-integer ceiling', () => {
  const maximum = Number.MAX_SAFE_INTEGER;
  const query = { sort: [], filters: [], groups: [], aggregates: [], pivots: [] };
  const model = createTabularModel({ columns });
  const initial = tryCreateTabularState(model);
  assert.equal(initial.ok, true);
  const eventCases = [
    ['queryRevision', { type: 'set-query', query }],
    ['expansionRevision', { type: 'set-expansion', expansion: [] }],
    ['sourceGeneration', { type: 'replace-source' }],
    ['projectionGeneration', {
      type: 'set-column-state',
      columnState: { order: ['score', 'name'], hidden: [], pinnedStart: [], pinnedEnd: [] },
    }],
  ];
  for (const [counter, event] of eventCases) {
    const state = Object.freeze({ ...initial.value, [counter]: maximum });
    const snapshot = Object.freeze({ revision: 0, state });
    const rejected = applyDataTableEvent(model, snapshot, event, 0);
    assert.equal(rejected.ok, false, `${counter} exhaustion was accepted`);
    assert.equal(rejected.error.class, 'resource-rejection');
    assert.equal(rejected.error.code, 'revision-ceiling-reached');
    assert.equal(snapshot.state[counter], maximum);
    assert.equal(snapshot.state.requestRevision, 0);
  }

  for (const [counter, event] of eventCases) {
    const state = Object.freeze({ ...initial.value, [counter]: maximum - 1 });
    const accepted = applyDataTableEvent(model, Object.freeze({ revision: 0, state }), event, 0);
    assert.equal(accepted.ok, true, `${counter} final safe increment was rejected`);
    assert.equal(accepted.value.snapshot.state[counter], maximum);
    assert.equal(Number.isSafeInteger(accepted.value.snapshot.state[counter]), true);
    const request = accepted.value.commands.find((command) => command.type === 'request-view')?.request;
    if (request === undefined) continue;
    for (const value of [request.requestID, request.sourceGeneration, request.queryRevision, request.expansionRevision]) {
      assert.equal(Number.isSafeInteger(value), true);
    }
    const freshSource = createClientTabularSource({
      records: [{ id: 'a', name: 'Alpha', score: 1 }, { id: 'b', name: 'Beta', score: 2 }],
      columnSchema: { revision: 0, columns, headers: [] },
      getRowID: (record) => record.id,
      getValue: (record, columnID) => record[columnID],
    });
    assert.equal(resolveClientTabularRequest(freshSource, request).ok, true);
  }

  const controlledCases = [
    {
      counter: 'queryRevision',
      model: createTabularModel({ columns, controlled: { query: true }, initialValues: { query } }),
      values: { query: { ...query } },
    },
    {
      counter: 'expansionRevision',
      model: createTabularModel({ columns, controlled: { expansion: true }, initialValues: { expansion: [] } }),
      values: { expansion: ['group'] },
    },
    {
      counter: 'projectionGeneration',
      model: createTabularModel({
        columns,
        controlled: { columnState: true },
        initialValues: { columnState: { order: ['name', 'score'], hidden: [], pinnedStart: [], pinnedEnd: [] } },
      }),
      values: { columnState: { order: ['score', 'name'], hidden: [], pinnedStart: [], pinnedEnd: [] } },
    },
  ];
  for (const { counter, model: controlledModel, values } of controlledCases) {
    const state = tryCreateTabularState(controlledModel);
    assert.equal(state.ok, true);
    const rejected = prepareControlledDataTableState(
      controlledModel,
      Object.freeze({ ...state.value, [counter]: maximum }),
      values,
    );
    assert.equal(rejected.ok, false, `controlled ${counter} exhaustion was accepted`);
    assert.equal(rejected.error.code, 'revision-ceiling-reached');
  }
});

test('ISSUE-073: unsafe page starts reject before request publication and the last safe boundary remains publishable', () => {
  const itemsPerPage = 2;
  const lastSafePage = Math.floor(Number.MAX_SAFE_INTEGER / itemsPerPage) + 1;
  const unsafePage = lastSafePage + 1;
  const unsafeAccess = { kind: 'page', page: unsafePage, itemsPerPage, visibleRowCount: null, pagination: null };

  const constructed = tryCreateDataTable({ columns, initialValues: { accessState: unsafeAccess } });
  assert.equal(constructed.ok, false);
  assert.equal(constructed.error.code, 'invalid-controlled-shape');

  const table = createDataTable({ columns });
  const commands = [];
  table.subscribeCommands((command) => commands.push(command));
  const before = table.getSnapshot();
  const rejected = table.dispatch({ type: 'set-access', accessState: unsafeAccess });
  assert.equal(rejected.ok, false);
  assert.equal(rejected.error.code, 'invalid-controlled-shape');
  assert.equal(table.getSnapshot(), before);
  assert.deepEqual(commands, []);

  const accepted = table.dispatch({
    type: 'set-access',
    accessState: { kind: 'page', page: lastSafePage, itemsPerPage, visibleRowCount: null, pagination: null },
  });
  assert.equal(accepted.ok, true);
  const request = table.getSnapshot().state.requestState.pendingRequest;
  assert.equal(request.access.kind, 'page');
  assert.equal(request.access.page, lastSafePage);
  assert.equal((request.access.page - 1) * request.access.itemsPerPage, Number.MAX_SAFE_INTEGER - 1);
  assert.equal(Number.isSafeInteger((request.access.page - 1) * request.access.itemsPerPage), true);
  assert.equal(commands.length, 1);
  assert.equal(commands[0].type, 'request-view');
});

test('ISSUE-049: committed query changes reset page and window access across ownership modes', () => {
  const query = { sort: [], filters: [], groups: [], aggregates: [], pivots: [] };
  const next = { ...query, sort: [{ id: 'name', columnID: 'name', direction: 'ascending', comparator: 'text' }] };
  const page = { kind: 'page', page: 3, itemsPerPage: 10, visibleRowCount: null, pagination: null };
  const window = {
    kind: 'window',
    window: { revision: 0, requestGeneration: 0, start: 90, size: 10, total: null, pending: null },
  };

  for (const accessState of [page, window]) {
    const uncontrolled = createDataTable({ columns, initialValues: { accessState } });
    const changed = uncontrolled.dispatch({ type: 'set-query', query: next });
    assert.equal(changed.ok, true);
    const request = uncontrolled.getSnapshot().state.requestState.pendingRequest;
    assert.equal(request.access.kind, accessState.kind);
    if (request.access.kind === 'page') assert.equal(request.access.page, 1);
    else assert.equal(request.access.start, 0);

    const controlled = createDataTable({
      columns,
      controlled: { query: true },
      initialValues: { query, accessState },
    });
    const before = controlled.getSnapshot();
    const proposed = controlled.dispatch({ type: 'set-query', query: next });
    assert.equal(proposed.ok, true);
    assert.equal(controlled.getSnapshot().state.query, before.state.query);
    assert.deepEqual(controlled.getSnapshot().state.accessState, before.state.accessState);
    assert.equal(controlled.getSnapshot().state.requestState.pendingRequest?.requestID, before.state.requestState.pendingRequest?.requestID);

    const synchronized = controlled.syncControlledValues({ query: next });
    assert.equal(synchronized.ok, true);
    const synchronizedRequest = controlled.getSnapshot().state.requestState.pendingRequest;
    assert.equal(synchronizedRequest.access.kind, accessState.kind);
    if (synchronizedRequest.access.kind === 'page') assert.equal(synchronizedRequest.access.page, 1);
    else assert.equal(synchronizedRequest.access.start, 0);
  }
});

test('TAB-TBL-07: command delivery snapshots observers, completes channels, and rolls back failed attachment', () => {
  const rollback = createDataTable({ columns });
  assert.throws(
    () => rollback.attachRequestExecutor(() => { throw new Error('initial executor failed'); }),
    /initial executor failed/,
  );
  assert.equal(rollback.attachRequestExecutor(() => undefined).ok, true);

  const table = createDataTable({ columns });
  const delivered = [];
  let stopSecond = () => undefined;
  table.subscribeCommands(() => {
    delivered.push('first');
    stopSecond();
    table.subscribeCommands(() => delivered.push('late'));
    throw new Error('observer failed');
  });
  stopSecond = table.subscribeCommands(() => delivered.push('second'));
  table.subscribeCommands(() => delivered.push('third'));
  const attached = table.attachRequestExecutor(() => delivered.push('executor'));
  assert.equal(attached.ok, true);
  delivered.length = 0;
  const beforeRequestID = table.getSnapshot().state.requestState.pendingRequest.requestID;

  assert.throws(() => table.requestView(), /observer failed/);
  assert.deepEqual(delivered, ['first', 'second', 'third', 'executor']);
  assert.equal(table.getSnapshot().state.requestState.pendingRequest.requestID, beforeRequestID + 1);
});

test('DataTable publishes requests before callbacks and preserves the first publication error', () => {
  const trace = [];
  const listenerError = new Error('request listener failed');
  const callbackError = new Error('query callback failed');
  const table = createDataTable({
    columns,
    onQueryChange: () => {
      trace.push('callback');
      throw callbackError;
    },
  });
  table.subscribeCommands((command) => {
    if (command.type !== 'request-view') return;
    trace.push('listener');
    throw listenerError;
  });
  assert.equal(table.attachRequestExecutor(() => trace.push('executor')).ok, true);
  trace.length = 0;
  const beforeRequestID = table.getSnapshot().state.requestState.pendingRequest.requestID;
  const next = {
    sort: [{ id: 'name', columnID: 'name', direction: 'ascending', comparator: 'text' }],
    filters: [],
    groups: [],
    aggregates: [],
    pivots: [],
  };

  assert.throws(
    () => table.dispatch({ type: 'set-query', query: next }),
    (error) => error === listenerError,
  );
  assert.deepEqual(trace, ['listener', 'executor', 'callback']);
  assert.equal(table.getSnapshot().state.requestState.pendingRequest.requestID, beforeRequestID + 1);
  assert.equal(table.getSnapshot().state.query.sort[0].id, 'name');
});

test('controlled DataTable callbacks preserve synchronous owner revisions and active requests', () => {
  const query = { sort: [], filters: [], groups: [], aggregates: [], pivots: [] };
  const next = { ...query, sort: [{ id: 'name', columnID: 'name', direction: 'ascending', comparator: 'text' }] };
  let table;
  const created = tryCreateDataTable({
    columns,
    controlled: { query: true },
    initialValues: { query },
    onQueryChange(value) {
      const synchronized = table.syncControlledValues({ query: value });
      assert.equal(synchronized.ok, true);
    },
  });
  assert.equal(created.ok, true);
  table = created.value;
  const requests = [];
  table.subscribeCommands((command) => {
    if (command.type === 'request-view') requests.push(command.request);
  });

  const outer = table.dispatch({ type: 'set-query', query: next });
  assert.equal(outer.ok, true);
  assert.deepEqual(outer.value.snapshot.state.query, query);
  assert.deepEqual(table.getSnapshot().state.query, next);
  assert.equal(table.getSnapshot().revision, 2);
  assert.equal(requests.length, 1);
  assert.equal(requests[0].requestID, table.getSnapshot().state.requestState.pendingRequest.requestID);
});

test('ISSUE-062: range selection uses the retained visible leaf index instead of rebuilding the view', () => {
  const size = 10_000;
  const records = Array.from({ length: size }, (_, index) => ({ id: `row-${index}`, name: `Row ${index}` }));
  const largeSource = createClientTabularSource({
    records,
    columnSchema: { revision: 0, columns: [{ id: 'name' }], headers: [] },
    getRowID: (record) => record.id,
    getValue: (record) => record.name,
    limits: { maxScanRecords: size, maxRows: size },
  });
  const table = createDataTable({
    columns: [{ id: 'name' }],
    limits: { maxRows: size },
    initialValues: {
      accessState: { kind: 'page', page: 1, itemsPerPage: size, visibleRowCount: null, pagination: null },
    },
  });
  const pending = table.getSnapshot().state.requestState.pendingRequest;
  const response = resolveClientTabularRequest(largeSource, pending);
  assert.equal(response.ok, true);
  assert.equal(table.synchronizeView(response.value).ok, true);
  const acceptedRows = table.getSnapshot().state.acceptedViewState.view.rows;
  const filter = Array.prototype.filter;
  const indexOf = Array.prototype.indexOf;
  let fullViewFilters = 0;
  let fullArraySearches = 0;
  Array.prototype.filter = function(...args) {
    if (this === acceptedRows) fullViewFilters += 1;
    return filter.apply(this, args);
  };
  Array.prototype.indexOf = function(...args) {
    if (this.length === size) fullArraySearches += 1;
    return indexOf.apply(this, args);
  };
  try {
    const selected = table.dispatch({
      type: 'set-row-selection-range',
      anchorRowID: `row-${size - 2}`,
      rowID: `row-${size - 1}`,
      selected: true,
    });
    assert.equal(selected.ok, true);
    assert.deepEqual(table.getSnapshot().state.rowSelection.rowIDs, [`row-${size - 2}`, `row-${size - 1}`]);
    const stale = table.dispatch({
      type: 'set-row-selection-range', anchorRowID: 'missing', rowID: `row-${size - 1}`, selected: true,
    });
    assert.equal(stale.ok, false);
    assert.equal(stale.error.code, 'invalid-selection-range');
  } finally {
    Array.prototype.filter = filter;
    Array.prototype.indexOf = indexOf;
  }
  assert.equal(fullViewFilters, 0);
  assert.equal(fullArraySearches, 0);
});

test('TAB-TBL-10: row range events use accepted leaf order and reject stale endpoints', () => {
  const table = createDataTable({ columns });
  const pending = table.getSnapshot().state.requestState.pendingRequest;
  const response = resolveClientTabularRequest(source, pending);
  assert.equal(response.ok, true);
  assert.equal(table.synchronizeView(response.value).ok, true);
  assert.equal(table.dispatch({ type: 'toggle-row-selection', rowID: 'a' }).ok, true);
  assert.equal(table.dispatch({
    type: 'set-row-selection-range', anchorRowID: 'a', rowID: 'b', selected: true,
  }).ok, true);
  assert.deepEqual(table.getSnapshot().state.rowSelection, { kind: 'explicit-rows', rowIDs: ['a', 'b'] });
  const before = table.getSnapshot();
  const rejected = table.dispatch({
    type: 'set-row-selection-range', anchorRowID: 'missing', rowID: 'b', selected: false,
  });
  assert.equal(rejected.ok, false);
  assert.equal(rejected.error.code, 'invalid-selection-range');
  assert.equal(table.getSnapshot(), before);
});

test('unknown DataTable events reject without advancing or issuing a request', () => {
  const table = createDataTable({ columns });
  const commands = [];
  table.subscribeCommands((command) => commands.push(command));
  const before = table.getSnapshot();

  for (const event of [{ type: 'unknown' }, null, 'request-view']) {
    const result = table.dispatch(event);
    assert.equal(result.ok, false);
    assert.equal(result.error.code, 'invalid-data-table-event');
    assert.equal(table.getSnapshot(), before);
    assert.deepEqual(commands, []);
  }
});

test('TAB-TBL-06: DataTable events and controlled sync share slice canonicalization failures', () => {
  const valid = {
    query: { sort: [], filters: [], groups: [], aggregates: [], pivots: [] },
    rowSelection: { kind: 'explicit-rows', rowIDs: [] },
    columnState: { order: ['name', 'score'], hidden: [], pinnedStart: [], pinnedEnd: [] },
    accessState: { kind: 'page', page: 1, itemsPerPage: 25, visibleRowCount: null, pagination: null },
    expansion: [],
  };
  const cases = [
    ['query', { ...valid.query, sort: [{ id: 'bad', columnID: 'missing', direction: 'ascending', comparator: 'text' }] }, 'set-query', 'invalid-query-descriptor'],
    ['rowSelection', { kind: 'explicit-rows', rowIDs: ['same', 'same'] }, 'set-row-selection', 'duplicate-identity'],
    ['columnState', { ...valid.columnState, order: ['name', 'missing'] }, 'set-column-state', 'invalid-controlled-shape'],
    ['accessState', { ...valid.accessState, page: 0 }, 'set-access', 'invalid-controlled-shape'],
    ['expansion', ['same', 'same'], 'set-expansion', 'duplicate-identity'],
  ];

  for (const [key, invalid, eventType, code] of cases) {
    const uncontrolled = createDataTable({ columns });
    const before = uncontrolled.getSnapshot();
    const event = eventType === 'set-row-selection'
      ? { type: eventType, selection: invalid }
      : eventType === 'set-column-state'
        ? { type: eventType, columnState: invalid }
        : eventType === 'set-access'
          ? { type: eventType, accessState: invalid }
          : eventType === 'set-expansion'
            ? { type: eventType, expansion: invalid }
            : { type: eventType, query: invalid };
    const dispatched = uncontrolled.dispatch(event);
    assert.equal(dispatched.ok, false, `${key} event accepted invalid input`);
    assert.equal(dispatched.error.code, code);
    assert.equal(uncontrolled.getSnapshot(), before);

    const controlled = createDataTable({
      columns,
      controlled: { [key]: true },
      initialValues: { [key]: valid[key] },
    });
    const synchronized = controlled.syncControlledValues({ [key]: invalid });
    assert.equal(synchronized.ok, false, `${key} sync accepted invalid input`);
    assert.equal(synchronized.error.code, code);
  }
});

test('disposed DataTable rejects every mutation and attachment path atomically', () => {
  const table = createDataTable({ columns });
  const pending = table.getSnapshot().state.requestState.pendingRequest;
  const response = resolveClientTabularRequest(source, pending);
  assert.equal(response.ok, true);
  const attached = table.attachRequestExecutor(() => undefined);
  assert.equal(attached.ok, true);
  const before = table.getSnapshot();

  table.dispose();
  table.dispose();
  attached.value();

  const failures = [
    table.dispatch({ type: 'request-view' }),
    table.synchronizeView(response.value),
    table.syncControlledValues({}),
    table.requestView(),
    table.abandonRequest(pending.requestID),
    table.attachRequestExecutor(() => assert.fail('disposed executor attached')),
  ];
  for (const result of failures) {
    assert.equal(result.ok, false);
    assert.equal(result.error.code, 'controller-disposed');
    assert.equal(table.getSnapshot(), before);
  }
  table.subscribeCommands(() => assert.fail('disposed observer attached'))();
  assert.doesNotThrow(() => table.getProjection());
});
