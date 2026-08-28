import assert from 'node:assert/strict';
import test from 'node:test';
import { createSSRApp, h } from 'vue';
import { renderToString } from '@vue/server-renderer';
import {
  defineDataTableColumns,
  useDataTable,
  createDataTableComponents,
  useDataTableContext,
} from '../dist/data-table.js';

const columns = defineDataTableColumns([{ id: 'name', label: 'Name', capabilities: ['sort', 'edit'] }]);

test('Vue DataTable returns one stable, exact component namespace per controller', () => {
  const controller = useDataTable({ columns });
  const first = createDataTableComponents(controller);
  const second = createDataTableComponents(controller);
  assert.equal(first, second);
  assert.deepEqual(Object.keys(first).sort(), [
    'Body', 'BulkSelectionControl', 'Caption', 'Cell', 'ColumnHeader',
    'ColumnResizeHandle', 'Disclosure', 'Editor', 'FilterControl', 'Header',
    'HeaderRow', 'Provider', 'Root', 'Row', 'SelectionControl', 'SortTrigger',
  ]);
});

test('Vue DataTable renders one native table tree and propagates controller context', async () => {
  let injected;
  const Probe = { setup() { injected = useDataTableContext(); return () => null; } };
  let controller;
  const app = createSSRApp({
    setup() {
      controller = useDataTable({ columns });
      const DataTable = createDataTableComponents(controller);
      accept(controller, [{ kind: 'leaf', id: 'r1', cells: { name: 'Ada' } }]);
      return () => h(DataTable.Provider, null, { default: () => h(DataTable.Root, null, { default: () => [h(DataTable.Caption, null, () => 'Users'), h(DataTable.Header, null, () => h(DataTable.HeaderRow, null, () => h(DataTable.ColumnHeader, { headerNodeID: 'name' }, () => 'Name'))), h(DataTable.Body, null, { default: ({ row }) => h(DataTable.Cell, { column: 'name' }, () => row.cells.name) }), h(Probe)] }) });
    },
  });
  const html = await renderToString(app);
  assert.match(html, /<table/);
  assert.match(html, /<caption[^>]*>Users/);
  assert.match(html, /<thead/);
  assert.match(html, /<tbody/);
  assert.doesNotMatch(html, /data-depth=/);
  assert.match(html, /data-row-id="r1"/);
  assert.match(html, />Ada</);
  assert.equal(injected.controller, controller);
  assert.equal('connection' in injected, false);
});

function accept(controller, rows) {
  const request = controller.requestState.value.pendingRequest;
  assert.notEqual(request, null);
  const result = controller.synchronizeView({ ...request, viewRevision: 1, matchingLeafCount: { kind: 'known', value: rows.length }, visibleRowCount: { kind: 'known', value: rows.length }, rows, columnSchema: { revision: request.columnSchemaRevision, columns, headers: [] }, removedRowIDs: [] });
  assert.equal(result.ok, true);
}

test('Vue DataTable rejects missing providers and invalid asChild composition', async () => {
  await assert.rejects(() => renderToString(createSSRApp({ setup() { const controller = useDataTable({ columns }); const DataTable = createDataTableComponents(controller); return () => h(DataTable.Root); } })), /matching Provider/);
  const app = createSSRApp({ setup() { const controller = useDataTable({ columns }); const DataTable = createDataTableComponents(controller); return () => h(DataTable.Provider, null, { default: () => h(DataTable.Root, { asChild: true }, { default: () => [h('table'), h('table')] }) }); } });
  app.config.warnHandler = () => {};
  await assert.rejects(() => renderToString(app), /requires exactly one element child/);
});

test('Vue DataTable rejects controlled/default ownership conflicts atomically', () => {
  assert.throws(() => useDataTable({ columns, query: { value: { sort: [], filters: [], groups: [], aggregates: [], pivots: [] } }, defaultQuery: { sort: [], filters: [], groups: [], aggregates: [], pivots: [] } }), /mutually exclusive/);
});

test('Vue DataTable resolves the nearest nested Provider', async () => {
  let nearest; let inner;
  const Probe = { setup() { nearest = useDataTableContext().controller; return () => null; } };
  const app = createSSRApp({ setup() { const outer = useDataTable({ columns }); inner = useDataTable({ columns }); const OuterTable = createDataTableComponents(outer); const InnerTable = createDataTableComponents(inner); return () => h(OuterTable.Provider, null, { default: () => h(InnerTable.Provider, null, { default: () => h(InnerTable.Root, null, () => h(Probe)) }) }); } });
  await renderToString(app); assert.equal(nearest, inner);
});
