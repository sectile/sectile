import assert from 'node:assert/strict';
import test from 'node:test';
import { createSSRApp, h } from 'vue';
import { renderToString } from '@vue/server-renderer';
import { useDataTreeGrid, createDataTreeGridComponents } from '../.verification-dist/data-tree-grid.js';

const columns = [{ id: 'name', capabilities: ['edit'] }];
const source = async (request) => ({ ...request, viewRevision: 1, matchingLeafCount: { kind: 'known', value: 0 }, visibleRowCount: { kind: 'known', value: 0 }, rows: [], columnSchema: { revision: request.columnSchemaRevision, columns, headers: [] }, removedRowIDs: [] });

test('Vue DataTreeGrid exposes only the bound tree-grid component namespace', () => {
  const components = createDataTreeGridComponents(useDataTreeGrid({ source }));
  assert.deepEqual(Object.keys(components).sort(), [
    'Body', 'BulkSelectionControl', 'Cell', 'ColumnHeader', 'ColumnResizeHandle',
    'Editor', 'FilterControl', 'Header', 'HeaderRow', 'Provider', 'Root', 'Row',
    'RowDisclosure', 'RowSelectionControl', 'SortTrigger',
  ]);
});

test('Vue DataTreeGrid keeps hierarchy and cell semantics in one injected profile', async () => {
  const app = createSSRApp({ setup() { const controller = useDataTreeGrid({ source, defaultExpansion: ['g'] }); const DataTreeGrid = createDataTreeGridComponents(controller); accept(controller, [{ kind: 'group', id: 'g', parentGroupID: null, depth: 0, expanded: true, cells: { name: 'Group' } }]); return () => h(DataTreeGrid.Provider, null, { default: () => h(DataTreeGrid.Root, null, { default: () => h(DataTreeGrid.Body, null, { default: ({ row }) => [h(DataTreeGrid.RowDisclosure, null, () => 'Toggle'), h(DataTreeGrid.Cell, { column: 'name' }, () => row.cells.name)] }) }) }); } });
  const html = await renderToString(app);
  assert.match(html, /role="treegrid"/);
  assert.match(html, /data-part="disclosure"/);
  assert.match(html, /role="gridcell"/);
  assert.match(html, /data-row-kind="group"/);
});

function accept(controller, rows) {
  const request = controller.requestState.value.pendingRequest;
  assert.notEqual(request, null);
  const result = controller.synchronizeView({ ...request, viewRevision: 1, matchingLeafCount: { kind: 'known', value: 0 }, visibleRowCount: { kind: 'known', value: rows.length }, rows, columnSchema: { revision: request.columnSchemaRevision, columns, headers: [] }, removedRowIDs: [] });
  assert.equal(result.ok, true);
}

test('Vue DataTreeGrid fixes controlled ownership for expansion', () => {
  assert.throws(() => useDataTreeGrid({ source, expansion: { value: [] }, defaultExpansion: [] }), /mutually exclusive/);
});
