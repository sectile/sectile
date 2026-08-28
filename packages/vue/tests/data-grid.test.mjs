import assert from 'node:assert/strict';
import test from 'node:test';
import { createSSRApp, h } from 'vue';
import { renderToString } from '@vue/server-renderer';
import { defineDataGridColumns, useDataGrid, createDataGridComponents } from '../dist/data-grid.js';

const columns = defineDataGridColumns([{ id: 'name', capabilities: ['edit'] }]);

test('Vue DataGrid exposes only the bound grid component namespace', () => {
  const components = createDataGridComponents(useDataGrid({ columns }));
  assert.deepEqual(Object.keys(components).sort(), [
    'Body', 'BulkSelectionControl', 'Cell', 'ColumnHeader', 'ColumnResizeHandle',
    'Editor', 'FilterControl', 'Header', 'HeaderRow', 'Provider', 'Root', 'Row',
    'RowSelectionControl', 'SortTrigger',
  ]);
});

test('Vue DataGrid owns ARIA grid composition without a repeated controller prop', async () => {
  const app = createSSRApp({ setup() { const controller = useDataGrid({ columns }); const DataGrid = createDataGridComponents(controller); accept(controller, [{ kind: 'leaf', id: 'r1', cells: { name: 'Ada' } }]); return () => h(DataGrid.Provider, null, { default: () => h(DataGrid.Root, null, { default: () => [h(DataGrid.Header, null, () => h(DataGrid.HeaderRow, null, () => h(DataGrid.ColumnHeader, { column: 'name' }, () => 'Name'))), h(DataGrid.Body, null, { default: ({ row }) => h(DataGrid.Cell, { column: 'name' }, () => row.cells.name) })] }) }); } });
  const html = await renderToString(app);
  assert.match(html, /role="grid"/);
  assert.match(html, /role="rowgroup"/);
  assert.match(html, /role="columnheader"/);
  assert.match(html, /role="gridcell"/);
  assert.match(html, /data-row-id="r1"/);
});

function accept(controller, rows) {
  const request = controller.requestState.value.pendingRequest;
  assert.notEqual(request, null);
  const result = controller.synchronizeView({ ...request, viewRevision: 1, matchingLeafCount: { kind: 'known', value: rows.length }, visibleRowCount: { kind: 'known', value: rows.length }, rows, columnSchema: { revision: request.columnSchemaRevision, columns, headers: [] }, removedRowIDs: [] });
  assert.equal(result.ok, true);
}

test('Vue DataGrid rejects a hierarchical initial view', () => {
  const request = { protocolVersion: 1, requestID: 1, sourceGeneration: 0, queryRevision: 0, expansionRevision: 0, query: { sort: [], filters: [], groups: [], aggregates: [], pivots: [] }, expansion: [], access: { kind: 'page', page: 1, itemsPerPage: 25 }, columnSchemaRevision: 0 };
  const initialView = { ...request, viewRevision: 1, matchingLeafCount: { kind: 'known', value: 0 }, visibleRowCount: { kind: 'known', value: 1 }, rows: [{ kind: 'group', id: 'g', parentGroupID: null, depth: 0, expanded: false, cells: { name: 'Group' } }], columnSchema: { revision: 0, columns, headers: [] }, removedRowIDs: [] };
  assert.throws(() => useDataGrid({ columns, initialView }), /flat leaf-row views/);
});
