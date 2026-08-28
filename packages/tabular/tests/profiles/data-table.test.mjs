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
  assert.equal(table.getSnapshot().state.query, query);
  assert.deepEqual(commands, []);
  const synchronized = table.syncControlledValues({ query: next });
  assert.equal(synchronized.ok, true);
  assert.equal(table.getSnapshot().state.query.sort[0].id, 'name');
  assert.deepEqual(commands, ['request-view']);
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
