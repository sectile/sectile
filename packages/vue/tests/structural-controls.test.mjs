import assert from 'node:assert/strict';
import test from 'node:test';
import { renderToString } from '@vue/server-renderer';
import { createSSRApp, h } from 'vue';
import { CarouselIndicator, CarouselIndicatorGroup, CarouselNext, CarouselPrevious, CarouselRoot, CarouselSlide, CarouselTrack } from '../.verification-dist/carousel.js';
import { FeedItem, FeedLoadEarlier, FeedLoadNewer, FeedRoot } from '../.verification-dist/feed.js';
import { GridCell, GridRoot, GridRow } from '../.verification-dist/grid.js';
import { SequenceReorderHandle, SequenceReorderItem, SequenceReorderRoot, TreeReorderHandle, TreeReorderItem, TreeReorderRoot, TreeReorderDropTarget } from '../.verification-dist/reorder.js';
import { TreeGridCell, TreeGridDisclosure, TreeGridEditor, TreeGridGroup, TreeGridHeader, TreeGridRoot, TreeGridRow } from '../.verification-dist/tree-grid.js';
import { TreeViewDisclosure, TreeViewGroup, TreeViewItem, TreeViewRoot } from '../.verification-dist/tree-view.js';

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

test('Vue reorder roots expose sequence and tree compound boundaries', async () => {
  const sequence = await render(() => h(SequenceReorderRoot, { items: ['a', 'b'] }, {
    default: () => [h(SequenceReorderItem, { value: 'a' }, { default: () => h(SequenceReorderHandle, { label: 'Move A' }) }), h(SequenceReorderItem, { value: 'b' })],
  }));
  const tree = await render(() => h(TreeReorderRoot, { controlled: true, nodes: [{ id: 'root', parentID: null }, { id: 'a', parentID: 'root' }, { id: 'b', parentID: 'root' }] }, {
    default: () => h(TreeReorderItem, { value: 'b' }, { default: ({ position, level, setSize }) => [h(TreeReorderHandle, { label: 'Move B' }), `Sibling ${position}, level ${level}, size ${setSize}`] }),
  }));
  assert.match(sequence, /data-scope="sequence-reorder"/);
  assert.equal((sequence.match(/data-part="item"/g) ?? []).length, 2);
  assert.match(tree, /role="tree"/);
  assert.match(tree, /role="treeitem"/);
  assert.match(tree, /Sibling 2, level 2, size 2/);
  assert.match(tree, /aria-level="2"/);
  assert.match(tree, /aria-posinset="2" aria-setsize="2"/);
  for (const html of [sequence, tree]) assert.match(html, /<button[^>]+type="button"[^>]+aria-label="Move [AB]"/);
});

test('Vue grid and tree view expose their semantic compound parts', async () => {
  const grid = await render(() => h(GridRoot, { rows: [['a', 'b']] }, { default: () => h(GridRow, null, { default: () => [h(GridCell, { value: 'a' }), h(GridCell, { value: 'b' })] }) }));
  const nodes = [{ id: 'root', parentID: null }, { id: 'leaf', parentID: 'root' }];
  const tree = await render(() => h(TreeViewRoot, { nodes, defaultExpandedValues: ['root'] }, { default: () => [h(TreeViewItem, { value: 'root' }, { default: () => h(TreeViewDisclosure, { for: 'root' }) }), h(TreeViewGroup, { for: 'root' }, { default: () => h(TreeViewItem, { value: 'leaf' }) })] }));
  const collapsedTree = await render(() => h(TreeViewRoot, { nodes }, { default: () => [h(TreeViewItem, { value: 'root' }), h(TreeViewGroup, { for: 'root' }, { default: () => h(TreeViewItem, { value: 'leaf' }) })] }));
  assert.match(grid, /role="row"/);
  assert.equal((grid.match(/data-part="cell"/g) ?? []).length, 2);
  assert.match(tree, /data-part="disclosure"/);
  assert.match(tree, /<span[^>]+data-part="disclosure"/);
  assert.match(tree, /role="group"/);
  assert.match(tree, /data-part="group" data-state="open"/);
  assert.doesNotMatch(tree, /data-part="group"[^>]*hidden/);
  assert.match(collapsedTree, /role="group" hidden[^>]+data-state="closed"/);
});

test('Vue column Reorder SSR exposes named empty lists and canonical sibling metadata', async () => {
  const html = await render(() => h(TreeReorderRoot, { layout: 'columns', nodes: [{ id: 'left', parentID: null }, { id: 'right', parentID: null }, { id: 'a', parentID: 'left' }] }, {
    default: state => state.getChildren(null).map(id => h(TreeReorderItem, { value: id }, { default: () => [id,
      h(TreeReorderDropTarget, { parentID: id, label: `${id} cards` }, { default: () => state.getChildren(id).map(value => h(TreeReorderItem, { value })) }),
    ] })),
  }));
  assert.equal((html.match(/role="list"/g) ?? []).length, 3);
  assert.equal((html.match(/role="listitem"/g) ?? []).length, 3);
  assert.match(html, /aria-label="right cards"[^>]*><\/div>/);
  assert.match(html, /data-value="a"[^>]*aria-level="2"[^>]*aria-posinset="1" aria-setsize="1"/);
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

test('Vue tree grid headers expose complete columns and shifted data rows in SSR', async () => {
  const headers = ['Name', 'Status'], getCellValue = () => '', setCellValue = () => {};
  const empty = await render(() => h(TreeGridRoot, { rows: [], headers, getCellValue, setCellValue }, { default: () => h(TreeGridHeader) }));
  assert.match(empty, /aria-rowcount="1"/); assert.match(empty, /aria-colcount="2"/);
  assert.equal((empty.match(/role="columnheader"/g) ?? []).length, 2);
  assert.match(empty, /aria-colindex="1"[^>]*>Name/); assert.match(empty, /aria-colindex="2"[^>]*>Status/);
  const rows = [{ id: 'root', parentID: null, cells: ['name', 'status'] }];
  const html = await render(() => h(TreeGridRoot, { rows, headers, getCellValue, setCellValue }, { default: () => [
    h(TreeGridHeader), h(TreeGridRow, { value: 'root', rowIndex: 1 }, { default: () => h(TreeGridCell, { value: 'name', columnIndex: 1 }) }),
  ] }));
  assert.match(html, /role="row" aria-rowindex="2" aria-level="1"/);
  assert.match(html, /role="gridcell" aria-colindex="1" aria-selected="false"/);
  await assert.rejects(render(() => h(TreeGridRoot, { rows, headers: ['Name'], getCellValue, setCellValue })), /label every data column/);
});

test('Vue tree grid projects empty and ragged column counts and retained rowgroups in SSR', async () => {
  for (const [rows, count] of [[[], 0], [[{ id: 'root', parentID: null, cells: ['a', 'b', null] }, { id: 'child', parentID: 'root', cells: ['c'] }], 3]]) {
    const html = await render(() => h(TreeGridRoot, { rows, getCellValue: () => '', setCellValue: () => {} }, {
      default: () => h(TreeGridGroup, { for: 'root', forcePresent: true }),
    }));
    assert.match(html, new RegExp(`aria-colcount="${count}"`)); assert.match(html, new RegExp(`data-column-count="${count}"`));
    assert.match(html, /role="treegrid"/); assert.match(html, /role="rowgroup"[^>]*inert[^>]*aria-hidden="true"/);
    assert.doesNotMatch(html, /style=/);
  }
});
