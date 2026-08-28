import assert from 'node:assert/strict';
import test from 'node:test';
import { Window } from 'happy-dom';

const browserWindow = new Window({ url: 'https://sectile.dev/' });
Object.assign(globalThis, { window: browserWindow, document: browserWindow.document, Node: browserWindow.Node, Element: browserWindow.Element, HTMLElement: browserWindow.HTMLElement, HTMLTableElement: browserWindow.HTMLTableElement, HTMLTableCellElement: browserWindow.HTMLTableCellElement, HTMLInputElement: browserWindow.HTMLInputElement, HTMLSelectElement: browserWindow.HTMLSelectElement, HTMLTextAreaElement: browserWindow.HTMLTextAreaElement, SVGElement: browserWindow.SVGElement, Event: browserWindow.Event, MouseEvent: browserWindow.MouseEvent, KeyboardEvent: browserWindow.KeyboardEvent, AbortController: browserWindow.AbortController, MutationObserver: browserWindow.MutationObserver, ResizeObserver: browserWindow.ResizeObserver });
const { createApp, h, nextTick } = await import('vue');
const {
  useDataTable,
  createDataTableComponents,
  useDataTableSource,
} = await import('../dist/data-table.js');
const { CheckboxIndicator, CheckboxRoot } = await import('../dist/checkbox.js');

const columns = [{ id: 'name' }, { id: 'role' }];

test('automatic Body renders accepted rows and supplies row identity to nested parts', async () => {
  let source;
  const app = createApp({
    setup() {
      const controller = useDataTable({ columns });
      const DataTable = createDataTableComponents(controller);
      source = useDataTableSource(controller, async (request) => ({
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
      }));
      return () => h(DataTable.Provider, null, {
        default: () => h(DataTable.Root, null, {
          default: () => [
            h(DataTable.Caption, null, () => 'People'),
            h(DataTable.Header, null, () => h(DataTable.HeaderRow, null, () => h(DataTable.ColumnHeader, { column: 'name' }, () => 'Name'))),
            h(DataTable.Body, null, {
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
  assert.equal(header?.id, 'sectile-tabular-header-name');
  assert.deepEqual([...host.querySelectorAll('[data-part="row"]')].map((row) => row.getAttribute('data-row-id')), ['ada', 'grace']);
  assert.deepEqual([...host.querySelectorAll('[data-part="cell"]')].map((cell) => cell.textContent), ['0:Ada', 'Engineer', '1:Grace', 'Admiral']);
  assert.deepEqual([...host.querySelectorAll('input[name="people"]')].map((input) => input.value), ['ada', 'grace']);

  app.unmount();
  host.remove();
});

test('Tabular selection parts adopt the reusable Checkbox component', async () => {
  let source;
  const app = createApp({
    setup() {
      const controller = useDataTable({ columns });
      const DataTable = createDataTableComponents(controller);
      source = useDataTableSource(controller, async (request) => ({
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
      }));
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

const waitFor = async (read, expected) => {
  for (let index = 0; index < 30; index += 1) {
    if (read() === expected) return;
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  assert.equal(read(), expected);
};
