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
  DataTableRow,
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
    setup() { controller = useDataTable({ columns }); return () => h(DataTableProvider, { controller }, { default: () => h(DataTableRoot, null, { default: () => [h(DataTableCaption, null, () => 'Users'), h(DataTableHeader, null, () => h(DataTableHeaderRow, { depth: 0 }, () => h(DataTableColumnHeader, { headerNodeID: 'name' }, () => 'Name'))), h(DataTableBody, null, () => h(DataTableRow, { rowID: 'r1' }, () => h(DataTableCell, { rowID: 'r1', columnID: 'name' }, () => 'Ada'))), h(Probe)] }) }); },
  });
  const html = await renderToString(app);
  assert.match(html, /<table/);
  assert.match(html, /<caption[^>]*>Users/);
  assert.match(html, /<thead/);
  assert.match(html, /<tbody/);
  assert.equal(injected.controller, controller);
  assert.equal('connection' in injected, false);
});

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
