import assert from 'node:assert/strict';
import test from 'node:test';
import { createTestWindow } from './happy-dom.mjs';
const browserWindow = createTestWindow({ url: 'https://sectile.dev/' });
Object.assign(globalThis, { window: browserWindow, document: browserWindow.document, Node: browserWindow.Node, Element: browserWindow.Element, HTMLElement: browserWindow.HTMLElement, HTMLTableElement: browserWindow.HTMLTableElement, HTMLTableCellElement: browserWindow.HTMLTableCellElement, HTMLInputElement: browserWindow.HTMLInputElement, HTMLSelectElement: browserWindow.HTMLSelectElement, HTMLTextAreaElement: browserWindow.HTMLTextAreaElement, SVGElement: browserWindow.SVGElement, Event: browserWindow.Event, MutationObserver: browserWindow.MutationObserver, ResizeObserver: browserWindow.ResizeObserver });
const { createSSRApp, h, nextTick } = await import('vue');
const { renderToString } = await import('@vue/server-renderer');
const { useDataTable, createDataTableComponents } = await import('../.verification-dist/tabular/data-table.js');

test('[HYD-06] Vue Tabular SSR reserves source ownership and hydrates before resolver execution', async () => {
  let calls = 0;
  const component = { setup() { const columns = [{ id: 'name' }]; const controller = useDataTable({ source: (request) => { calls += 1; return { protocolVersion: 1, requestID: request.requestID, sourceGeneration: request.sourceGeneration, queryRevision: request.queryRevision, expansionRevision: request.expansionRevision, viewRevision: 1, access: request.access, matchingLeafCount: { kind: 'known', value: 0 }, visibleRowCount: { kind: 'known', value: 0 }, rows: [], columnSchema: { revision: request.columnSchemaRevision, columns, headers: [] }, removedRowIDs: [] }; } }); const DataTable = createDataTableComponents(controller); return () => h(DataTable.Provider, null, { default: () => h(DataTable.Root, null, () => 'Stable') }); } };
  const html = await renderToString(createSSRApp(component));
  assert.match(html, /<table/); assert.match(html, /Stable/); assert.equal(calls, 0);
  const host = document.createElement('div'); host.innerHTML = html; document.body.append(host);
  const warnings = []; const client = createSSRApp(component); client.config.warnHandler = (message) => warnings.push(message); client.mount(host); await nextTick();
  assert.deepEqual(warnings, []); assert.equal(calls, 1); client.unmount(); host.remove();
});

for (const [kind, name] of [['data-table', 'DataTable'], ['data-grid', 'DataGrid'], ['data-tree-grid', 'DataTreeGrid']]) {
  test(`${name} bulk and idle editors seed SSR semantics and retain native and adopted activation`, async () => {
    const api = await import(`../.verification-dist/tabular/${kind}.js`), controllers = [];
    const component = { setup() {
      const controller = api[`use${name}`]({ defaultRowSelection: { kind: 'explicit-rows', rowIDs: ['ada'] } });
      controllers.push(controller); assert.equal(controller.requestView().ok, true);
      const raw = controller.getSnapshot(), snapshot = raw.tabular ?? raw, request = snapshot.state.requestState.pendingRequest;
      assert.equal(controller.synchronizeView({ ...request, viewRevision: 1,
        matchingLeafCount: { kind: 'known', value: 2 }, visibleRowCount: { kind: 'known', value: 2 },
        rows: [{ kind: 'leaf', id: 'ada', cells: { name: 'Ada' } }, { kind: 'leaf', id: 'grace', cells: { name: 'Grace' } }],
        columnSchema: { revision: request.columnSchemaRevision, columns: [{ id: 'name' }], headers: [] }, removedRowIDs: [],
      }).ok, true);
      const Members = api[`create${name}Components`](controller), target = { kind: 'all-matching' };
      return () => h(Members.Provider, null, { default: () => h(Members.Root, null, { default: () => [
        h(Members.Header, null, { default: () => h(Members.HeaderRow, null, { default: () =>
          h(Members.ColumnHeader, { column: 'name' }, { default: () => [
        h(Members.BulkSelectionControl, { target, 'aria-label': 'All' }),
        h(Members.BulkSelectionControl, { target, as: 'input', 'aria-label': 'Native all' }),
        h(Members.BulkSelectionControl, { target, disabled: true, 'aria-label': 'Disabled all' }),
        h(Members.BulkSelectionControl, { target: { kind: 'group-leaves', groupID: 'team' }, 'aria-label': 'Group' }),
        h(Members.BulkSelectionControl, { target, asChild: true }, { default: () => h('input', { type: 'checkbox', 'aria-label': 'Adopted' }) }),
          ] }),
        }) }),
        h(Members.Body, null, { default: ({ row }) => h(Members.Cell, { column: 'name' }, { default: () =>
          row.id === 'ada' ? h(Members.Editor, { column: 'name', 'aria-label': 'Edit Ada' })
            : h(Members.Editor, { column: 'name', asChild: true }, { default: () => h('input', { 'aria-label': 'Edit Grace' }) }),
        }) }),
      ] }) });
    } };
    const host = document.createElement('div'); let client;
    try {
      host.innerHTML = await renderToString(createSSRApp(component)); document.body.append(host);
      for (const label of ['All', 'Native all', 'Disabled all', 'Adopted']) {
        const control = host.querySelector(`[aria-label="${label}"]`);
        assert.equal(control.getAttribute('role'), 'checkbox'); assert.equal(control.getAttribute('aria-checked'), 'mixed');
      }
      assert.equal(host.querySelector('[aria-label="All"]').type, 'button');
      assert.equal(host.querySelector('[aria-label="Native all"]').type, 'checkbox');
      assert.equal(host.querySelector('[aria-label="Adopted"]').type, 'checkbox');
      assert.equal(host.querySelector('[aria-label="Disabled all"]').disabled, true);
      assert.equal(host.querySelector('[aria-label="Group"]').getAttribute('aria-checked'), 'false');
      for (const label of ['Edit Ada', 'Edit Grace']) assert.equal(host.querySelector(`[aria-label="${label}"]`).hidden, kind !== 'data-table');
      const warnings = []; client = createSSRApp(component); client.config.warnHandler = message => warnings.push(message);
      client.mount(host); await nextTick(); await nextTick(); assert.deepEqual(warnings, []);
      for (const label of ['Edit Ada', 'Edit Grace']) assert.equal(host.querySelector(`[aria-label="${label}"]`).hidden, kind !== 'data-table');
      assert.equal(host.querySelector('[aria-label="Native all"]').indeterminate, true);
      host.querySelector('[aria-label="All"]').click(); await nextTick();
      assert.equal(host.querySelector('[aria-label="All"]').getAttribute('aria-checked'), 'true');
      host.querySelector('[aria-label="Native all"]').click(); await nextTick();
      assert.equal(host.querySelector('[aria-label="All"]').getAttribute('aria-checked'), 'false');
      host.querySelector('[aria-label="Adopted"]').click(); await nextTick();
      assert.equal(host.querySelector('[aria-label="All"]').getAttribute('aria-checked'), 'true');
    } finally { client?.unmount(); host.remove(); for (const controller of controllers) controller.dispose(); }
  });
}

test('native Tabular selection has successful form controls before and after hydration', async () => {
  const controllers = [];
  const component = { setup() {
    const controller = useDataTable({ defaultRowSelection: { kind: 'explicit-rows', rowIDs: ['ada', 'grace'] } });
    controllers.push(controller);
    assert.equal(controller.requestView().ok, true);
    const request = controller.getSnapshot().state.requestState.pendingRequest;
    assert.notEqual(request, null);
    assert.equal(controller.synchronizeView({ ...request, viewRevision: 1,
      matchingLeafCount: { kind: 'known', value: 2 }, visibleRowCount: { kind: 'known', value: 2 },
      rows: [{ kind: 'leaf', id: 'ada', cells: { name: 'Ada' } }, { kind: 'leaf', id: 'grace', cells: { name: 'Grace' } }],
      columnSchema: { revision: request.columnSchemaRevision, columns: [{ id: 'name' }], headers: [] }, removedRowIDs: [],
    }).ok, true);
    const Members = createDataTableComponents(controller);
    return () => h('form', null, [h(Members.Provider, null, { default: () => h(Members.Root, null, {
      default: () => h(Members.Body, null, { default: ({ row }) => h(Members.Cell, { column: 'name' }, {
        default: () => h(Members.SelectionControl, { name: 'members', value: `member-${row.id}`, disabled: row.id === 'grace' }),
      }) }),
    }) })]);
  } };
  const host = document.createElement('div'); let client;
  const assertValues = () => {
    const inputs = [...host.querySelectorAll('input')];
    assert.deepEqual(inputs.map(input => [input.type, input.checked, input.disabled, input.name, input.value]), [
      ['checkbox', true, false, 'members', 'member-ada'], ['checkbox', true, true, 'members', 'member-grace'],
    ]);
    assert.deepEqual(new browserWindow.FormData(host.querySelector('form')).getAll('members'), ['member-ada']);
  };
  try {
    host.innerHTML = await renderToString(createSSRApp(component)); document.body.append(host);
    assertValues();
    const warnings = []; client = createSSRApp(component); client.config.warnHandler = message => warnings.push(message);
    client.mount(host); await nextTick(); await nextTick();
    assert.deepEqual(warnings, []); assertValues();
    host.querySelector('input').click(); await nextTick();
    assert.deepEqual(controllers.at(-1).getSnapshot().state.rowSelection.rowIDs, ['grace']);
    assert.deepEqual(new browserWindow.FormData(host.querySelector('form')).getAll('members'), []);
  } finally { client?.unmount(); host.remove(); for (const controller of controllers) controller.dispose(); }
});
