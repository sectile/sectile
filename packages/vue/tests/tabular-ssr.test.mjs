import assert from 'node:assert/strict';
import test from 'node:test';
import { createTestWindow } from './happy-dom.mjs';
const browserWindow = createTestWindow({ url: 'https://sectile.dev/' });
Object.assign(globalThis, { window: browserWindow, document: browserWindow.document, Node: browserWindow.Node, Element: browserWindow.Element, HTMLElement: browserWindow.HTMLElement, HTMLTableElement: browserWindow.HTMLTableElement, HTMLTableCellElement: browserWindow.HTMLTableCellElement, HTMLInputElement: browserWindow.HTMLInputElement, HTMLSelectElement: browserWindow.HTMLSelectElement, HTMLTextAreaElement: browserWindow.HTMLTextAreaElement, SVGElement: browserWindow.SVGElement, Event: browserWindow.Event, MutationObserver: browserWindow.MutationObserver, ResizeObserver: browserWindow.ResizeObserver });
const { createSSRApp, h, nextTick } = await import('vue');
const { renderToString } = await import('@vue/server-renderer');
const { useDataTable, createDataTableComponents, useDataTableSource } = await import('../.verification-dist/data-table.js');

test('[HYD-06] Vue Tabular SSR reserves source ownership and hydrates before resolver execution', async () => {
  let calls = 0;
  const component = { setup() { const columns = [{ id: 'name' }]; const controller = useDataTable({ columns }); const DataTable = createDataTableComponents(controller); useDataTableSource(controller, (request) => { calls += 1; return { protocolVersion: 1, requestID: request.requestID, sourceGeneration: request.sourceGeneration, queryRevision: request.queryRevision, expansionRevision: request.expansionRevision, viewRevision: 1, access: request.access, matchingLeafCount: { kind: 'known', value: 0 }, visibleRowCount: { kind: 'known', value: 0 }, rows: [], columnSchema: { revision: request.columnSchemaRevision, columns, headers: [] }, removedRowIDs: [] }; }); return () => h(DataTable.Provider, null, { default: () => h(DataTable.Root, null, () => 'Stable') }); } };
  const html = await renderToString(createSSRApp(component));
  assert.match(html, /<table/); assert.match(html, /Stable/); assert.equal(calls, 0);
  const host = document.createElement('div'); host.innerHTML = html; document.body.append(host);
  const warnings = []; const client = createSSRApp(component); client.config.warnHandler = (message) => warnings.push(message); client.mount(host); await nextTick();
  assert.deepEqual(warnings, []); assert.equal(calls, 1); client.unmount(); host.remove();
});
