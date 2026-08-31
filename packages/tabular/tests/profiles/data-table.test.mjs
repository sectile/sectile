import assert from 'node:assert/strict';
import test from 'node:test';
import { createDataTable, tryCreateDataTable } from '../../.verification-dist/data-table.js';
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

test('TAB-TBL-06: row range events use accepted leaf order and reject stale endpoints', () => {
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
