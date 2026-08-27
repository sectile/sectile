import assert from 'node:assert/strict';
import test from 'node:test';
import { createSSRApp, h } from 'vue';
import { renderToString } from '@vue/server-renderer';
import { DataTreeGridBody, DataTreeGridCell, DataTreeGridProvider, DataTreeGridRoot, DataTreeGridRow, DataTreeGridRowDisclosure, defineDataTreeGridColumns, useDataTreeGrid } from '../dist/data-tree-grid.js';

const columns = defineDataTreeGridColumns([{ id: 'name', capabilities: ['edit'] }]);

test('Vue DataTreeGrid keeps hierarchy and cell semantics in one injected profile', async () => {
  const app = createSSRApp({ setup() { const controller = useDataTreeGrid({ columns, defaultExpansion: ['g'] }); return () => h(DataTreeGridProvider, { controller }, { default: () => h(DataTreeGridRoot, null, { default: () => h(DataTreeGridBody, null, () => h(DataTreeGridRow, { rowID: 'g' }, () => [h(DataTreeGridRowDisclosure, { rowID: 'g' }, () => 'Toggle'), h(DataTreeGridCell, { rowID: 'g', columnID: 'name' }, () => 'Group')])) }) }); } });
  const html = await renderToString(app);
  assert.match(html, /role="treegrid"/);
  assert.match(html, /data-part="disclosure"/);
  assert.match(html, /role="gridcell"/);
});

test('Vue DataTreeGrid fixes controlled ownership for expansion', () => {
  assert.throws(() => useDataTreeGrid({ columns, expansion: { value: [] }, defaultExpansion: [] }), /mutually exclusive/);
});
