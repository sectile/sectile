import assert from 'node:assert/strict';
import test from 'node:test';
import { Window } from 'happy-dom';

const browserWindow = new Window({ url: 'https://sectile.dev/' });
Object.assign(globalThis, { window: browserWindow, document: browserWindow.document, Node: browserWindow.Node, Element: browserWindow.Element, HTMLElement: browserWindow.HTMLElement, HTMLTableElement: browserWindow.HTMLTableElement, HTMLTableCellElement: browserWindow.HTMLTableCellElement, HTMLInputElement: browserWindow.HTMLInputElement, HTMLSelectElement: browserWindow.HTMLSelectElement, HTMLTextAreaElement: browserWindow.HTMLTextAreaElement, SVGElement: browserWindow.SVGElement, Event: browserWindow.Event, MouseEvent: browserWindow.MouseEvent, KeyboardEvent: browserWindow.KeyboardEvent, AbortController: browserWindow.AbortController, MutationObserver: browserWindow.MutationObserver, ResizeObserver: browserWindow.ResizeObserver });
const { createApp, h, nextTick } = await import('vue');
const { DataTableProvider, DataTableRoot, useDataTable, useDataTableSource } = await import('../dist/data-table.js');

const columns = [{ id: 'name', capabilities: ['edit'] }];
const response = (request, name = 'Ada') => ({ protocolVersion: 1, requestID: request.requestID, sourceGeneration: request.sourceGeneration, queryRevision: request.queryRevision, expansionRevision: request.expansionRevision, viewRevision: 1, access: request.access, matchingLeafCount: { kind: 'known', value: 1 }, visibleRowCount: { kind: 'known', value: 1 }, rows: [{ kind: 'leaf', id: 'r1', cells: { name } }], columnSchema: { revision: request.columnSchemaRevision, columns, headers: [] }, removedRowIDs: [] });
const waitFor = async (read, expected) => { for (let index = 0; index < 20; index += 1) { if (read() === expected) return; await new Promise((resolve) => setTimeout(resolve, 0)); } assert.equal(read(), expected); };

test('Vue Tabular source reserves one executor and starts only after mount', async () => {
  let calls = 0; let source;
  const app = createApp({ setup() { const controller = useDataTable({ columns }); source = useDataTableSource(controller, async (request) => { calls += 1; return response(request); }); assert.throws(() => useDataTableSource(controller, async (request) => response(request)), /executor/i); return () => h(DataTableProvider, { controller }, { default: () => h(DataTableRoot) }); } });
  const host = document.createElement('div'); document.body.append(host);
  assert.equal(calls, 0);
  app.mount(host); await nextTick(); await waitFor(() => source.status.value, 'success');
  assert.equal(calls, 1); assert.equal(source.status.value, 'success'); assert.equal(source.error.value, null);
  app.unmount(); host.remove();
});

test('Vue Tabular source cancels stale work and exposes resolver errors without rendering policy', async () => {
  let release; let source; let controller;
  const app = createApp({ setup() { controller = useDataTable({ columns }); source = useDataTableSource(controller, (request, { signal }) => new Promise((resolve) => { release = () => resolve(response(request, signal.aborted ? 'stale' : 'late')); })); return () => h(DataTableProvider, { controller }, { default: () => h(DataTableRoot) }); } });
  const host = document.createElement('div'); document.body.append(host); app.mount(host); await nextTick(); await Promise.resolve();
  source.replaceResolver(async () => { throw new Error('offline'); });
  release?.(); await waitFor(() => source.status.value, 'error'); await nextTick();
  assert.equal(source.status.value, 'error'); assert.match(String(source.error.value), /offline/); assert.equal(controller.acceptedViewState.value.kind, 'none');
  source.cancel(); assert.equal(source.status.value, 'idle');
  app.unmount(); host.remove();
});
