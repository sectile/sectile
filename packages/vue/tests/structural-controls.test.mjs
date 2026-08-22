import assert from 'node:assert/strict';
import test from 'node:test';
import { renderToString } from '@vue/server-renderer';
import { createSSRApp, h } from 'vue';
import { CarouselIndicator, CarouselIndicatorGroup, CarouselNext, CarouselPrevious, CarouselRoot, CarouselSlide, CarouselTrack } from '../dist/carousel.js';
import { FeedItem, FeedLoadEarlier, FeedLoadNewer, FeedRoot } from '../dist/feed.js';
import { GridCell, GridRoot, GridRow } from '../dist/grid.js';
import { TreeGridCell, TreeGridDisclosure, TreeGridEditor, TreeGridRoot, TreeGridRow } from '../dist/tree-grid.js';
import { TreeViewDisclosure, TreeViewGroup, TreeViewItem, TreeViewRoot } from '../dist/tree-view.js';

async function render(component) { return renderToString(createSSRApp({ render: component })); }

test('Vue carousel composes slides, controls, and direct indicators', async () => {
  const html = await render(() => h(CarouselRoot, { slides: ['one', 'two'], defaultValue: 'one' }, { default: () => [
    h(CarouselPrevious), h(CarouselTrack, null, { default: () => [h(CarouselSlide, { value: 'one' }), h(CarouselSlide, { value: 'two' })] }),
    h(CarouselNext), h(CarouselIndicatorGroup, null, { default: () => [h(CarouselIndicator, { value: 'one' }), h(CarouselIndicator, { value: 'two' })] }),
  ] }));
  assert.match(html, /data-part="previous"/);
  assert.match(html, /data-part="next"/);
  assert.match(html, /data-part="indicator"/);
  assert.match(html, /data-state="active"/);
});

test('Vue feed exposes native articles and explicit window requests', async () => {
  const html = await render(() => h(FeedRoot, { items: ['one', 'two'] }, { default: () => [h(FeedLoadEarlier), h(FeedItem, { value: 'one' }), h(FeedItem, { value: 'two' }), h(FeedLoadNewer)] }));
  assert.match(html, /data-part="load-earlier"/);
  assert.equal((html.match(/<article/g) ?? []).length, 2);
  assert.match(html, /data-part="load-newer"/);
});

test('Vue grid and tree view expose their semantic compound parts', async () => {
  const grid = await render(() => h(GridRoot, { rows: [['a', 'b']] }, { default: () => h(GridRow, null, { default: () => [h(GridCell, { value: 'a' }), h(GridCell, { value: 'b' })] }) }));
  const nodes = [{ id: 'root', parentID: null }, { id: 'leaf', parentID: 'root' }];
  const tree = await render(() => h(TreeViewRoot, { nodes, defaultExpandedValue: ['root'] }, { default: () => [h(TreeViewItem, { value: 'root' }, { default: () => h(TreeViewDisclosure, { for: 'root' }) }), h(TreeViewGroup, null, { default: () => h(TreeViewItem, { value: 'leaf' }) })] }));
  assert.match(grid, /role="row"/);
  assert.equal((grid.match(/data-part="cell"/g) ?? []).length, 2);
  assert.match(tree, /data-part="disclosure"/);
  assert.match(tree, /<span[^>]+data-part="disclosure"/);
  assert.match(tree, /role="group"/);
});

test('Vue tree grid keeps editor mounted while navigation mode owns visibility', async () => {
  const rows = [{ id: 'root', parentID: null, cells: ['name', 'status'] }];
  const values = new Map([['name', 'Root'], ['status', 'Ready']]);
  const html = await render(() => h(TreeGridRoot, { rows, getCellValue: (id) => values.get(id) ?? '', setCellValue: (id, value) => values.set(id, value) }, { default: () => h(TreeGridRow, { value: 'root', rowIndex: 1, expandable: true }, { default: () => [
    h(TreeGridDisclosure, { for: 'root' }), h(TreeGridCell, { value: 'name', columnIndex: 1 }, { default: () => h(TreeGridEditor, { for: 'name' }) }), h(TreeGridCell, { value: 'status', columnIndex: 2 }),
  ] }) }));
  assert.match(html, /data-part="row"/);
  assert.match(html, /<span[^>]+data-part="disclosure"/);
  assert.match(html, /data-part="editor"/);
  assert.match(html, /hidden/);
});
