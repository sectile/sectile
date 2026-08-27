import assert from 'node:assert/strict';
import test from 'node:test';
import { createDataGrid } from '../../../dom/dist/data-grid.js';
import { createVirtualizer } from '../../../dom/dist/virtual.js';
import { createDataGridVirtualAdapter } from '../../.verification-dist/virtual.js';

const columns = [
  { id: 'name', capabilities: ['edit'] },
  { id: 'score', capabilities: [] },
];
const rows = [
  { kind: 'leaf', id: 'r1', cells: { name: 'Alpha', score: 1 } },
  { kind: 'leaf', id: 'r2', cells: { name: 'Beta', score: 2 } },
];

class FakeElement {
  attributes = new Map();
  listeners = new Map();
  children = [];
  parent = null;
  tabIndex = -1;
  scrollLeft = 0;
  scrollTop = 0;
  clientWidth = 100;
  clientHeight = 30;
  ownerDocument = { defaultView: null };
  style = { setProperty() {}, removeProperty() {} };
  append(element) { element.parent = this; this.children.push(element); }
  setAttribute(name, value) { this.attributes.set(name, String(value)); }
  getAttribute(name) { return this.attributes.get(name) ?? null; }
  removeAttribute(name) { this.attributes.delete(name); }
  hasAttribute(name) { return this.attributes.has(name); }
  addEventListener(type, listener) { const set = this.listeners.get(type) ?? new Set(); set.add(listener); this.listeners.set(type, set); }
  removeEventListener(type, listener) { this.listeners.get(type)?.delete(listener); }
  contains(target) { for (let node = target; node !== null; node = node.parent) if (node === this) return true; return false; }
  focus() { focused = this; timeline.push('focus'); }
  getBoundingClientRect() { return { x: 0, y: 0, width: this.clientWidth, height: this.clientHeight, top: 0, left: 0, right: this.clientWidth, bottom: this.clientHeight }; }
}

class FakeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

let focused = null;
let timeline = [];

function response(controller) {
  const request = controller.getSnapshot().tabular.state.requestState.pendingRequest;
  return {
    protocolVersion: 1,
    requestID: request.requestID,
    sourceGeneration: request.sourceGeneration,
    queryRevision: request.queryRevision,
    expansionRevision: request.expansionRevision,
    viewRevision: 1,
    access: request.access,
    matchingLeafCount: { kind: 'known', value: 2 },
    visibleRowCount: { kind: 'known', value: 2 },
    rows,
    columnSchema: { revision: 0, columns, headers: [] },
    removedRowIDs: [],
  };
}

test('TAB-VIW-01: raw Virtual consumes adapter state strategy and locators without an application mapper', () => {
  const projection = {
    generation: 17,
    rows: rows.map((row) => ({ row, rowID: row.id, parentRowID: null, depth: 0, cells: columns.map((column) => ({ rowID: row.id, columnID: column.id })) })),
    columns: { start: [], center: ['name', 'score'], end: [] },
    cursor: { current: null }, edit: { kind: 'navigation' },
    rowSelection: { kind: 'explicit-rows', rowIDs: [] }, expansion: { expandedRowIDs: [] },
  };
  const adapter = createDataGridVirtualAdapter({ projection, rowExtents: { kind: 'uniform', extent: { kind: 'estimated', value: 30 } }, columnExtents: { kind: 'uniform', extent: { kind: 'estimated', value: 100 } } });
  const root = new FakeElement();
  const virtualizer = createVirtualizer({
    root,
    state: adapter.state,
    strategy: adapter.strategy,
    readViewport: () => ({ x: 0, y: 0, width: 100, height: 30 }),
    writeScroll: (_root, point) => { root.scrollLeft = point.x; root.scrollTop = point.y; },
    environment: { requestFrame: (callback) => { callback(0); return 1; }, cancelFrame() {}, createResizeObserver: () => new FakeObserver() },
  });
  assert.equal(adapter.projectionGeneration, 17);
  assert.equal(adapter.locateRow('r2').index, 1);
  const located = adapter.locateCell({ rowID: 'r2', columnID: 'name' });
  assert.notEqual(located, null);
  assert.equal(virtualizer.scrollTo(located.id).ok, true);
  assert.equal(root.scrollTop > 0, true);
  virtualizer.disconnect();
});

test('TAB-VIW-02: off-window reveal uses adapter locator then registration completes DOM focus', async () => {
  focused = null;
  timeline = [];
  const root = new FakeElement();
  let adapter;
  let connection;
  let virtualizer;
  const second = new FakeElement();
  connection = createDataGrid({
    columns,
    root,
    onCommand: (command) => {
      if (command.type !== 'request-reveal-cell') return;
      timeline.push('reveal');
      const located = adapter.locateCell(command.cell);
      assert.notEqual(located, null);
      assert.equal(virtualizer.scrollTo(located.id).ok, true);
      timeline.push('scroll');
      root.append(second);
      assert.equal(connection.registerCell(second, { cell: command.cell, expectedProjectionGeneration: command.expectedProjectionGeneration }).ok, true);
      timeline.push('register');
    },
  });
  assert.equal(connection.synchronizeView(response(connection.controller)).ok, true);
  adapter = createDataGridVirtualAdapter({ projection: connection.getProjection(), rowExtents: { kind: 'uniform', extent: { kind: 'estimated', value: 30 } }, columnExtents: { kind: 'uniform', extent: { kind: 'estimated', value: 100 } } });
  virtualizer = createVirtualizer({
    root,
    state: adapter.state,
    strategy: adapter.strategy,
    readViewport: () => ({ x: 0, y: 0, width: 100, height: 30 }),
    writeScroll: (_root, point) => { root.scrollLeft = point.x; root.scrollTop = point.y; },
    environment: { requestFrame: (callback) => { callback(0); return 1; }, cancelFrame() {}, createResizeObserver: () => new FakeObserver() },
  });
  const first = new FakeElement();
  root.append(first);
  assert.equal(connection.registerCell(first, { cell: { rowID: 'r1', columnID: 'name' } }).ok, true);
  connection.handleEvent({ type: 'focus-cell', cell: { rowID: 'r1', columnID: 'name' } });
  timeline = [];
  connection.handleEvent({ type: 'move-cell', direction: 'down' });
  await Promise.resolve();
  assert.deepEqual(timeline.slice(0, 3), ['reveal', 'scroll', 'register']);
  assert.equal(timeline.at(-1), 'focus');
  assert.equal(focused, second);
  virtualizer.disconnect();
  connection.disconnect();
});
