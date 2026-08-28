import assert from 'node:assert/strict';
import test from 'node:test';
import { createSSRApp, h } from 'vue';
import { renderToString } from '@vue/server-renderer';
import { DataTreeGridBody, DataTreeGridCell, DataTreeGridProvider, DataTreeGridRoot, DataTreeGridRowDisclosure, defineDataTreeGridColumns, useDataTreeGrid } from '../dist/data-tree-grid.js';

const columns = defineDataTreeGridColumns([{ id: 'name', capabilities: ['edit'] }]);

test('Vue DataTreeGrid keeps hierarchy and cell semantics in one injected profile', async () => {
  const app = createSSRApp({ setup() { const controller = useDataTreeGrid({ columns, defaultExpansion: ['g'] }); accept(controller, [{ kind: 'group', id: 'g', parentGroupID: null, depth: 0, expanded: true, cells: { name: 'Group' } }]); return () => h(DataTreeGridProvider, { controller }, { default: () => h(DataTreeGridRoot, null, { default: () => h(DataTreeGridBody, null, { default: ({ row }) => [h(DataTreeGridRowDisclosure, null, () => 'Toggle'), h(DataTreeGridCell, { column: 'name' }, () => row.cells.name)] }) }) }); } });
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
  assert.throws(() => useDataTreeGrid({ columns, expansion: { value: [] }, defaultExpansion: [] }), /mutually exclusive/);
});
