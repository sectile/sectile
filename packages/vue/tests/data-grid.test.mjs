import assert from 'node:assert/strict';
import test from 'node:test';
import { createSSRApp, h } from 'vue';
import { renderToString } from '@vue/server-renderer';
import { DataGridBody, DataGridCell, DataGridColumnHeader, DataGridHeader, DataGridHeaderRow, DataGridProvider, DataGridRoot, DataGridRow, defineDataGridColumns, useDataGrid } from '../dist/data-grid.js';

const columns = defineDataGridColumns([{ id: 'name', capabilities: ['edit'] }]);

test('Vue DataGrid owns ARIA grid composition without a repeated controller prop', async () => {
  const app = createSSRApp({ setup() { const controller = useDataGrid({ columns }); return () => h(DataGridProvider, { controller }, { default: () => h(DataGridRoot, null, { default: () => [h(DataGridHeader, null, () => h(DataGridHeaderRow, { depth: 0 }, () => h(DataGridColumnHeader, { headerNodeID: 'name' }, () => 'Name'))), h(DataGridBody, null, () => h(DataGridRow, { rowID: 'r1' }, () => h(DataGridCell, { rowID: 'r1', columnID: 'name' }, () => 'Ada')))] }) }); } });
  const html = await renderToString(app);
  assert.match(html, /role="grid"/);
  assert.match(html, /role="rowgroup"/);
  assert.match(html, /role="columnheader"/);
  assert.match(html, /role="gridcell"/);
});

test('Vue DataGrid rejects a hierarchical initial view', () => {
  const request = { protocolVersion: 1, requestID: 1, sourceGeneration: 0, queryRevision: 0, expansionRevision: 0, query: { sort: [], filters: [], groups: [], aggregates: [], pivots: [] }, expansion: [], access: { kind: 'page', page: 1, itemsPerPage: 25 }, columnSchemaRevision: 0 };
  const initialView = { ...request, viewRevision: 1, matchingLeafCount: { kind: 'known', value: 0 }, visibleRowCount: { kind: 'known', value: 1 }, rows: [{ kind: 'group', id: 'g', parentGroupID: null, depth: 0, expanded: false, cells: { name: 'Group' } }], columnSchema: { revision: 0, columns, headers: [] }, removedRowIDs: [] };
  assert.throws(() => useDataGrid({ columns, initialView }), /flat leaf-row views/);
});
