import assert from 'node:assert/strict';
import test from 'node:test';
import { createTestWindow } from './happy-dom.mjs';

const browserWindow = createTestWindow({ url: 'https://sectile.dev/' });
Object.assign(globalThis, { window: browserWindow, document: browserWindow.document, Node: browserWindow.Node, Element: browserWindow.Element, HTMLElement: browserWindow.HTMLElement, HTMLTableElement: browserWindow.HTMLTableElement, HTMLTableCellElement: browserWindow.HTMLTableCellElement, HTMLInputElement: browserWindow.HTMLInputElement, HTMLSelectElement: browserWindow.HTMLSelectElement, HTMLTextAreaElement: browserWindow.HTMLTextAreaElement, SVGElement: browserWindow.SVGElement, Event: browserWindow.Event, MouseEvent: browserWindow.MouseEvent, KeyboardEvent: browserWindow.KeyboardEvent, AbortController: browserWindow.AbortController, MutationObserver: browserWindow.MutationObserver, ResizeObserver: browserWindow.ResizeObserver });
const { createApp, h, nextTick, shallowRef } = await import('vue');
const {
  useDataTable,
  createDataTableComponents,
} = await import('../.verification-dist/tabular/data-table.js');
const { CheckboxIndicator, CheckboxRoot } = await import('../.verification-dist/checkbox.js');
const gridAPI = await import('../.verification-dist/tabular/data-grid.js');
const treeGridAPI = await import('../.verification-dist/tabular/data-tree-grid.js');

const columns = [{ id: 'name' }, { id: 'role' }];

test('automatic Body renders accepted rows and supplies row identity to nested parts', async () => {
  let source;
  const selection = shallowRef({ kind: 'explicit-rows', rowIDs: [] });
  const rowAttributes = shallowRef({ class: 'shipment-row', rowID: 'forged', 'data-row-id': 'forged', as: 'section', asChild: true });
  const app = createApp({
    setup() {
      const controller = useDataTable({ rowSelection: selection, source: async (request) => ({
        ...request,
        viewRevision: 1,
        matchingLeafCount: { kind: 'known', value: 2 },
        visibleRowCount: { kind: 'known', value: 2 },
        rows: [
          { kind: 'leaf', id: 'ada', cells: { name: 'Ada', role: 'Engineer' } },
          { kind: 'leaf', id: 'grace', cells: { name: 'Grace', role: 'Admiral' } },
        ],
        columnSchema: { revision: request.columnSchemaRevision, columns, headers: [] },
        removedRowIDs: [],
      }) });
      const DataTable = createDataTableComponents(controller);
      source = controller;
      return () => h(DataTable.Provider, null, {
        default: () => h(DataTable.Root, null, {
          default: () => [
            h(DataTable.Caption, null, () => 'People'),
            h(DataTable.Header, null, () => h(DataTable.HeaderRow, null, () => h(DataTable.ColumnHeader, { column: 'name' }, () => 'Name'))),
            h(DataTable.Body, { rowAttributes: rowAttributes.value }, {
              default: ({ row, rowIndex }) => [
                h(DataTable.Cell, { column: 'name' }, () => `${rowIndex}:${row.cells.name}`),
                h(DataTable.Cell, { column: 'role' }, () => row.cells.role),
                h('td', null, h(DataTable.SelectionControl, { name: 'people', 'aria-label': `Select ${row.cells.name}` })),
              ],
            }),
          ],
        }),
      });
    },
  });
  const host = document.createElement('div');
  document.body.append(host);
  app.mount(host);
  await waitFor(() => source.status.value, 'success');
  await nextTick();

  assert.equal(host.querySelector('caption')?.textContent, 'People');
  const header = host.querySelector('[data-part="column-header"]');
  assert.equal(host.querySelector('[data-part="header-row"]')?.hasAttribute('data-depth'), false);
  assert.equal(header?.getAttribute('data-header-node-id'), 'name');
  assert.equal(header?.id, 'sectile-tabular-header-s%3Aname');
  assert.deepEqual([...host.querySelectorAll('[data-part="row"]')].map((row) => row.getAttribute('data-row-id')), ['ada', 'grace']);
  const acceptedRows = [...host.querySelectorAll('[data-part="row"]')];
  assert.ok(acceptedRows.every(row => row.tagName === 'TR' && row.classList.contains('shipment-row')));
  rowAttributes.value = { class: 'compact-shipment-row' }; await nextTick();
  assert.ok(acceptedRows.every(row => row.classList.contains('compact-shipment-row') && !row.classList.contains('shipment-row')));
  assert.ok(acceptedRows.every(row => row.isConnected), 'attribute updates preserve canonical row hosts');
  assert.deepEqual([...host.querySelectorAll('[data-part="cell"]')].map((cell) => cell.textContent), ['0:Ada', 'Engineer', '1:Grace', 'Admiral']);
  assert.deepEqual([...host.querySelectorAll('input[name="people"]')].map((input) => input.value), ['ada', 'grace']);
  selection.value = { kind: 'explicit-rows', rowIDs: ['ada'] }; await nextTick();
  assert.deepEqual([...host.querySelectorAll('input[name="people"]')].map(input => input.checked), [true, false]);

  app.unmount();
  host.remove();
});

test('Tabular selection parts adopt the reusable Checkbox component', async () => {
  let source;
  const app = createApp({
    setup() {
      const controller = useDataTable({ source: async (request) => ({
        ...request,
        viewRevision: 1,
        matchingLeafCount: { kind: 'known', value: 4 },
        visibleRowCount: { kind: 'known', value: 4 },
        rows: [
          { kind: 'leaf', id: 'ada', cells: { name: 'Ada', role: 'Engineer' } },
          { kind: 'leaf', id: 'grace', cells: { name: 'Grace', role: 'Admiral' } },
          { kind: 'leaf', id: 'margaret', cells: { name: 'Margaret', role: 'Engineer' } },
          { kind: 'leaf', id: 'radia', cells: { name: 'Radia', role: 'Architect' } },
        ],
        columnSchema: { revision: request.columnSchemaRevision, columns, headers: [] },
        removedRowIDs: [],
      }) });
      const DataTable = createDataTableComponents(controller);
      source = controller;
      const selected = (selection, rowID) => selection.kind === 'explicit-rows'
        ? selection.rowIDs.includes(rowID)
        : !selection.excludedRowIDs.includes(rowID);
      const bulkValue = (selection, rows) => {
        const rowIDs = rows.filter((row) => row.kind === 'leaf').map((row) => row.id);
        const count = rowIDs.filter((rowID) => selected(selection, rowID)).length;
        return count === 0 ? false : count === rowIDs.length ? true : 'indeterminate';
      };
      const checkbox = (value, label, className) => h(CheckboxRoot, {
        modelValue: value,
        class: className,
        'aria-label': label,
      }, {
        default: ({ isIndeterminate }) => h(CheckboxIndicator, null, () => isIndeterminate ? '−' : '✓'),
      });
      return () => h(DataTable.Provider, null, {
        default: () => h(DataTable.Root, null, {
          default: () => [
            h(DataTable.Header, null, () => h(DataTable.HeaderRow, null, () => h('th', null,
              h(DataTable.BulkSelectionControl, { asChild: true, target: { kind: 'all-matching' } }, {
                default: ({ rowSelection, rows }) => checkbox(bulkValue(rowSelection, rows), 'Select all', 'bulk-checkbox'),
              }),
            ))),
            h(DataTable.Body, null, {
              default: ({ row }) => h('td', null,
                h(DataTable.SelectionControl, { asChild: true, name: 'people' }, {
                  default: ({ rowSelection }) => checkbox(selected(rowSelection, row.id), `Select ${row.cells.name}`, 'row-checkbox'),
                }),
              ),
            }),
          ],
        }),
      });
    },
  });
  const host = document.createElement('div');
  document.body.append(host);
  app.mount(host);
  await waitFor(() => source.status.value, 'success');
  await nextTick();

  const bulk = host.querySelector('.bulk-checkbox');
  const rows = [...host.querySelectorAll('.row-checkbox')];
  assert.equal(bulk?.getAttribute('aria-checked'), 'false');
  assert.deepEqual(rows.map((row) => row.getAttribute('aria-checked')), ['false', 'false', 'false', 'false']);

  rows[0].click();
  await nextTick();
  assert.equal(rows[0].getAttribute('aria-checked'), 'true');
  assert.equal(bulk?.getAttribute('aria-checked'), 'mixed');
  assert.equal(bulk?.textContent, '−');

  rows[3].dispatchEvent(new MouseEvent('click', { bubbles: true, shiftKey: true }));
  await nextTick();
  assert.deepEqual(rows.map((row) => row.getAttribute('aria-checked')), ['true', 'true', 'true', 'true']);
  assert.equal(bulk?.getAttribute('aria-checked'), 'true');

  rows[1].click();
  rows[3].dispatchEvent(new MouseEvent('click', { bubbles: true, shiftKey: true }));
  await nextTick();
  assert.deepEqual(rows.map((row) => row.getAttribute('aria-checked')), ['true', 'false', 'false', 'false']);
  assert.equal(bulk?.getAttribute('aria-checked'), 'mixed');

  bulk?.click();
  await nextTick();
  assert.deepEqual(rows.map((row) => row.getAttribute('aria-checked')), ['true', 'true', 'true', 'true']);
  assert.equal(bulk?.getAttribute('aria-checked'), 'true');

  app.unmount();
  host.remove();
});

for (const profile of ['data-table', 'data-grid', 'data-tree-grid']) {
  const name = profile.split('-').map(part => part[0].toUpperCase() + part.slice(1)).join('');
  const api = profile === 'data-table' ? { useDataTable, createDataTableComponents } : profile === 'data-grid' ? gridAPI : treeGridAPI;
  for (const controlled of [false, true]) test(`${name} publishes accepted column sizes across connection churn (${controlled ? 'controlled' : 'default'})`, async () => {
    const sizes = shallowRef({ name: 100 });
    const visible = shallowRef(true);
    const proposals = [];
    let controller;
    let root;
    const app = createApp({ setup() {
      controller = api[`use${name}`]({
        ...(controlled ? { columnSizeState: sizes } : { defaultColumnSizeState: sizes.value }),
        onColumnSizeStateChange: state => proposals.push(state),
        source: async request => ({ ...request, viewRevision: 1, matchingLeafCount: { kind: 'known', value: 0 }, visibleRowCount: { kind: 'known', value: 0 }, rows: [], columnSchema: { revision: request.columnSchemaRevision, columns, headers: [] }, removedRowIDs: [] }),
      });
      assert.equal(controller.columnSizes.value.name, 100, 'authored sizes are readable before DOM connection');
      const parts = api[`create${name}Components`](controller);
      return () => h(parts.Provider, null, { default: () => visible.value ? h(parts.Root, { ref: value => { root = value; } }, {
        default: () => h(parts.Header, null, () => h(parts.HeaderRow, null, () => h(parts.ColumnHeader, { column: 'name' }, () => h(parts.ColumnResizeHandle, { column: 'name' })))),
      }) : null });
    } });
    const host = document.createElement('div'); document.body.append(host);
    try {
      app.mount(host); await waitFor(() => controller.status.value, 'success'); await nextTick();
      const handle = host.querySelector('[data-part="column-resize-handle"]');
      assert.ok(handle);
      const accepted = controller.columnSizes.value;
      assert.equal(Object.isFrozen(accepted), true);
      root.refresh(); assert.equal(controller.columnSizes.value, accepted, 'refresh preserves immutable size identity');
      handle.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true })); await nextTick();
      assert.equal(proposals.at(-1)?.values.name, 108);
      assert.equal(controller.columnSizes.value.name, controlled ? 100 : 108, 'only accepted values are published');
      if (controlled) {
        sizes.value = { name: 200 }; await nextTick();
        assert.equal(controller.columnSizes.value.name, 200);
        assert.equal(handle.getAttribute('aria-valuenow'), '200');
      }
      visible.value = false; await nextTick();
      const disconnected = controller.columnSizes.value;
      const count = proposals.length;
      handle.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
      assert.equal(proposals.length, count, 'disconnected handles release their listeners');
      assert.equal(controller.columnSizes.value, disconnected);
      if (controlled) { sizes.value = { name: 240 }; await nextTick(); }
      visible.value = true; await nextTick();
      assert.equal(controller.columnSizes.value.name, controlled ? 240 : 100, 'reconnected host consumes current construction options');
      assert.equal(host.querySelector('[data-part="column-resize-handle"]')?.getAttribute('aria-valuenow'), String(controlled ? 240 : 100));
    } finally { app.unmount(); host.remove(); }
    const disposed = controller.columnSizes.value;
    sizes.value = { name: 272 }; await nextTick();
    assert.equal(controller.columnSizes.value, disposed, 'scope disposal stops the controlled watcher');
  });
}

const waitFor = async (read, expected) => {
  for (let index = 0; index < 30; index += 1) {
    if (read() === expected) return;
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  assert.equal(read(), expected);
};
