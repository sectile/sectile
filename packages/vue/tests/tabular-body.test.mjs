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
            h(DataTable.Header, null, () => h(DataTable.HeaderRow, null, () => h(DataTable.ColumnHeader, { headerNodeID: 'name' }, () => 'Name'))),
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
  assert.equal(host.querySelector('[data-part="header-row"]')?.hasAttribute('data-depth'), false);
  assert.deepEqual([...host.querySelectorAll('[data-part="row"]')].map((row) => row.getAttribute('data-row-id')), ['ada', 'grace']);
  assert.deepEqual([...host.querySelectorAll('[data-part="cell"]')].map((cell) => cell.textContent), ['0:Ada', 'Engineer', '1:Grace', 'Admiral']);
  assert.deepEqual([...host.querySelectorAll('input[name="people"]')].map((input) => input.value), ['ada', 'grace']);

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
