import assert from 'node:assert/strict';
import test from 'node:test';
import { createSSRApp, h } from 'vue';
import { renderToString } from '@vue/server-renderer';
import {
  DataTableBody,
  DataTableCaption,
  DataTableCell,
  DataTableColumnHeader,
  DataTableHeader,
  DataTableHeaderRow,
  DataTableProvider,
  DataTableRoot,
  defineDataTableColumns,
  useDataTable,
  useDataTableContext,
} from '../dist/data-table.js';

const columns = defineDataTableColumns([{ id: 'name', label: 'Name', capabilities: ['sort', 'edit'] }]);

test('Vue DataTable renders one native table tree and propagates controller context', async () => {
  let injected;
  const Probe = { setup() { injected = useDataTableContext(); return () => null; } };
  let controller;
  const app = createSSRApp({
    setup() {
      controller = useDataTable({ columns });
      accept(controller, [{ kind: 'leaf', id: 'r1', cells: { name: 'Ada' } }]);
      return () => h(DataTableProvider, { controller }, { default: () => h(DataTableRoot, null, { default: () => [h(DataTableCaption, null, () => 'Users'), h(DataTableHeader, null, () => h(DataTableHeaderRow, null, () => h(DataTableColumnHeader, { headerNodeID: 'name' }, () => 'Name'))), h(DataTableBody, null, { default: ({ row }) => h(DataTableCell, { column: 'name' }, () => row.cells.name) }), h(Probe)] }) });
    },
  });
  const html = await renderToString(app);
  assert.match(html, /<table/);
  assert.match(html, /<caption[^>]*>Users/);
  assert.match(html, /<thead/);
  assert.match(html, /<tbody/);
  assert.match(html, /data-depth="0"/);
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
  await assert.rejects(() => renderToString(createSSRApp({ render: () => h(DataTableRoot) })), /matching Provider/);
  const app = createSSRApp({ setup() { const controller = useDataTable({ columns }); return () => h(DataTableProvider, { controller }, { default: () => h(DataTableRoot, { asChild: true }, { default: () => [h('table'), h('table')] }) }); } });
  app.config.warnHandler = () => {};
  await assert.rejects(() => renderToString(app), /requires exactly one element child/);
});

test('Vue DataTable rejects controlled/default ownership conflicts atomically', () => {
  assert.throws(() => useDataTable({ columns, query: { value: { sort: [], filters: [], groups: [], aggregates: [], pivots: [] } }, defaultQuery: { sort: [], filters: [], groups: [], aggregates: [], pivots: [] } }), /mutually exclusive/);
});

test('Vue DataTable resolves the nearest nested Provider', async () => {
  let nearest; let inner;
  const Probe = { setup() { nearest = useDataTableContext().controller; return () => null; } };
  const app = createSSRApp({ setup() { const outer = useDataTable({ columns }); inner = useDataTable({ columns }); return () => h(DataTableProvider, { controller: outer }, { default: () => h(DataTableProvider, { controller: inner }, { default: () => h(DataTableRoot, null, () => h(Probe)) }) }); } });
  await renderToString(app); assert.equal(nearest, inner);
});
