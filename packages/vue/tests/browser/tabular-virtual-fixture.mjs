import { createApp, h, nextTick, ref, shallowRef } from 'vue';
import { createDataGridVirtualAdapter, createDataTableVirtualAdapter, reconcileDataGridVirtualAdapter } from '@sectile/tabular/virtual';
import { useDataGrid, createDataGridComponents } from '../../.verification-dist/data-grid.js';
import { useDataTable, createDataTableComponents } from '../../.verification-dist/data-table.js';
import { VirtualList } from '../../.verification-dist/virtual-list.js';
import { VirtualizerFooter, VirtualizerHeader, VirtualizerItem, VirtualizerRoot, VirtualizerSurface } from '../../.verification-dist/virtual-core.js';

const exact = (value) => ({ kind: 'exact', value });
const estimated = (value) => ({ kind: 'estimated', value });
const flatViewport = Object.freeze({ x: 0, y: 0, width: 320, height: 96 });
const nativeViewport = Object.freeze({ x: 0, y: 0, width: 320, height: 104 });
const pinnedViewport = Object.freeze({ x: 0, y: 0, width: 220, height: 84 });
const columns = [{ id: 'id' }, { id: 'name', capabilities: ['edit'] }, { id: 'score' }];
const rows = Array.from({ length: 80 }, (_, index) => ({ kind: 'leaf', id: `r${index}`, cells: { id: index, name: `Row ${index}`, score: index * 2 } }));

export async function runTabularVirtualScenarios() {
  return Object.freeze({
    'tabular-virtual-flat': await flatScenario(),
    'tabular-virtual-native': await nativeScenario(),
    'tabular-virtual-pinned': await pinnedScenario(),
    'tabular-controlled-contracts': await controlledContractScenario(),
  });
}

async function flatScenario() {
  const host = fixtureHost('flat');
  const list = ref();
  let controller;
  const app = createApp({ setup() { controller = readyGrid(); const DataGrid = createDataGridComponents(controller); return () => h(DataGrid.Provider, null, { default: () => h(DataGrid.Root, { 'aria-label': 'Flat virtual grid' }, { default: () => h(VirtualList, { ref: list, items: controller.getProjection().rows, getID: (entry) => entry.rowID, sizePolicy: { kind: 'fixed', extent: 24 }, overscan: 0, initialViewport: flatViewport, style: { width: '320px', height: '96px', overflow: 'auto' }, itemAttributes: (entry) => ({ role: 'row', 'data-flat-row': entry.rowID }) }, { item: ({ value }) => h('span', { role: 'gridcell' }, value.row.cells.name) }) }) }); } });
  try {
    app.mount(host); await settle(); list.value.flush(); await settle();
    const rendered = host.querySelectorAll('[data-flat-row]').length;
    return Object.freeze({ ok: rendered > 0 && rendered < rows.length && host.querySelector('[role="grid"]') !== null, rendered, total: rows.length, rawVirtualList: true });
  } finally { app.unmount(); host.remove(); }
}

async function nativeScenario() {
  const host = fixtureHost('native'); const root = ref(); let controller; let adapter; const errors = [];
  const app = createApp({
    setup() {
      controller = readyTable();
      const DataTable = createDataTableComponents(controller);
      adapter = createDataTableVirtualAdapter({ projection: controller.getProjection(), rowExtents: { kind: 'uniform', extent: estimated(26) }, crossExtent: nativeViewport.width });
      return () => h(DataTable.Provider, null, {
        default: () => h(VirtualizerRoot, { ref: root, defaultState: adapter.state, strategy: adapter.strategy, initialViewport: nativeViewport, overscan: 0, style: { width: '320px', height: '104px', overflow: 'auto' }, onError: (error) => errors.push(`${error.code}:${error.message}`) }, {
          default: ({ placements }) => h(VirtualizerSurface, { asChild: true }, {
            default: () => h(DataTable.Root, { 'aria-label': 'Native virtual table' }, {
              default: () => h(DataTable.Body, { manual: true }, {
                default: () => placements.map((placement) => h(VirtualizerItem, { key: placement.id, placement, asChild: true }, {
                  default: () => h(DataTable.Row, { rowID: placement.id }, {
                    default: () => h(DataTable.Cell, { rowID: placement.id, column: 'name' }, () => rows[placement.index]?.cells.name),
                  }),
                })),
              }),
            }),
          }),
        }),
      });
    },
  });
  try {
    app.mount(host); await settle(); root.value.flush(); await settle();
    root.value.measure([{ index: 0, extent: exact(41) }]); root.value.flush(); await settle();
    const rendered = host.querySelectorAll('[data-part="row"]').length;
    const measured = root.value.state.extents.extentAt(0)?.value;
    const wrappers = host.querySelectorAll('table > tbody > [data-scope="virtualizer"][data-part="item"]').length;
    const placementCount = root.value.plan?.placements.length ?? 0;
    return Object.freeze({ ok: rendered > 0 && rendered < rows.length && measured === 41 && wrappers === 0 && host.querySelector('table > tbody') !== null, rendered, placementCount, domainSize: root.value.state.domain.size, viewport: root.value.plan?.viewport ?? null, errors, total: rows.length, measured, nativeTable: host.querySelector('table > tbody') !== null, extraItemWrappers: wrappers });
  } finally { app.unmount(); host.remove(); }
}

async function pinnedScenario() {
  const host = fixtureHost('pinned'); const root = ref(); const adapter = shallowRef(); let controller; let revealCount = 0; let strategy;
  const cells = new Map();
  const rebuildCells = () => { cells.clear(); for (const row of controller.getProjection().rows) for (const cell of row.cells) { const located = adapter.value.locateCell(cell); if (located !== null) cells.set(located.id, cell); } };
  const app = createApp({
    setup() {
      controller = readyGrid();
      const DataGrid = createDataGridComponents(controller);
      adapter.value = createDataGridVirtualAdapter({ projection: controller.getProjection(), rowExtents: { kind: 'uniform', extent: estimated(28) }, columnExtents: { kind: 'uniform', extent: estimated(110) } });
      strategy = adapter.value.strategy;
      rebuildCells();
      const onCommand = (command) => { if (command.type !== 'request-reveal-cell') return; revealCount += 1; const located = adapter.value.locateCell(command.cell); if (located !== null) root.value?.scrollTo(located.id, 'nearest'); };
      return () => h(DataGrid.Provider, null, {
        default: () => h(DataGrid.Root, { 'aria-label': 'Pinned virtual grid', onCommand }, {
          default: () => h(VirtualizerRoot, { ref: root, defaultState: adapter.value.state, strategy: adapter.value.strategy, initialViewport: pinnedViewport, overscan: 0, style: { width: '220px', height: '84px', overflow: 'auto' } }, {
            default: ({ placements }) => [
              h(VirtualizerHeader, null, { default: () => h('div', { 'data-tabular-outer-header': '', style: { height: '24px' } }, 'Outer header') }),
              h(VirtualizerSurface, null, {
                default: () => placements.map((placement) => {
                  const cell = cells.get(placement.id);
                  return cell === undefined ? null : h(VirtualizerItem, { key: placement.id, placement, asChild: true }, {
                    default: () => h(DataGrid.Cell, { rowID: cell.rowID, column: cell.columnID }, {
                      default: () => [rows[Number(cell.rowID.slice(1))]?.cells[cell.columnID], h(DataGrid.Editor, { rowID: cell.rowID, column: cell.columnID, 'aria-label': `Edit ${cell.rowID} ${cell.columnID}` })],
                    }),
                  });
                }),
              }),
              h(VirtualizerFooter, null, { default: () => h('div', { 'data-tabular-outer-footer': '', style: { height: '16px' } }, 'Outer footer') }),
            ],
          }),
        }),
      });
    },
  });
  try {
    app.mount(host); await settle(); root.value.flush(); await settle();
    const outerFramesPresent = host.querySelector('[data-tabular-outer-header]') !== null && host.querySelector('[data-tabular-outer-footer]') !== null;
    const surfaceLocalFrameOffset = (root.value.plan?.viewport.y ?? 0) < 0;
    root.value.measure([{ axis: 'row', id: 'r0', extent: exact(43) }, { axis: 'column', id: 'name', extent: exact(137) }]); root.value.flush(); await settle();
    const before = adapter.value; const changed = controller.dispatch({ type: 'set-column-state', columnState: { order: ['id', 'name', 'score'], hidden: [], pinnedStart: ['id'], pinnedEnd: ['score'] } });
    if (!changed.ok) throw new Error(changed.error.message);
    const reconciled = reconcileDataGridVirtualAdapter(before, root.value.state, controller.getProjection());
    if (!reconciled.ok) throw new Error(reconciled.error.message);
    adapter.value = reconciled.value.adapter; rebuildCells(); for (const mutation of reconciled.value.mutations) root.value.mutate(mutation); root.value.flush(); await settle();
    const pinnedOverlap = root.value.plan.placements.some((placement) => (placement.zIndex ?? 0) > 0);
    const measurementSurvived = root.value.state.rows.toArray().find((track) => track.id === 'r0')?.extent.value === 43 && root.value.state.columns.toArray().find((track) => track.id === 'name')?.extent.value === 137;
    const first = host.querySelector('[data-part="cell"]'); first?.dispatchEvent(new MouseEvent('click', { bubbles: true })); await settle();
    for (let index = 0; index < 8; index += 1) { (document.activeElement ?? first)?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true })); await settle(); root.value.flush(); await settle(); }
    (document.activeElement ?? host.querySelector('[data-part="cell"]'))?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); await settle();
    const editingFocus = document.activeElement?.getAttribute('data-part') === 'editor';
    const frameIDsOutsideVirtualDomain = !root.value.state.rows.toArray().some((track) => track.id === 'outer-header' || track.id === 'outer-footer') && !root.value.state.columns.toArray().some((track) => track.id === 'outer-header' || track.id === 'outer-footer');
    return Object.freeze({ ok: adapter.value.strategy === strategy && pinnedOverlap && measurementSurvived && revealCount > 0 && editingFocus && outerFramesPresent && surfaceLocalFrameOffset && frameIDsOutsideVirtualDomain, strategyStable: adapter.value.strategy === strategy, pinnedOverlap, measurementSurvived, revealCount, editingFocus, outerFramesPresent, surfaceLocalFrameOffset, frameIDsOutsideVirtualDomain });
  } finally { app.unmount(); host.remove(); }
}

async function controlledContractScenario() {
  const host = fixtureHost('controlled-contracts');
  const cursor = ref({ current: null });
  const editState = ref({ kind: 'navigation' });
  const columnSizes = ref({ name: 100 });
  let controller;
  const app = createApp({
    setup() {
      controller = useDataGrid({
        source: async (request) => response(request),
        cursor,
        editState,
        columnSizeState: columnSizes,
        onCursorChange: (value) => { cursor.value = value; },
        onEditStateChange: (value) => { editState.value = value; },
        onColumnSizeStateChange: (value) => { columnSizes.value = value.values; },
      });
      const request = controller.requestState.value.pendingRequest;
      if (request === null) throw new Error('missing request');
      const synchronized = controller.synchronizeView(response(request));
      if (!synchronized.ok) throw new Error(synchronized.error.message);
      const DataGrid = createDataGridComponents(controller);
      return () => h(DataGrid.Provider, null, {
        default: () => h(DataGrid.Root, { 'aria-label': 'Controlled contract grid' }, {
          default: () => [
            h(DataGrid.ColumnResizeHandle, { column: 'name', minSize: 50, maxSize: 150 }),
            h(DataGrid.RowSelectionControl, { as: 'div', rowID: 'r0', name: 'rows', value: 'r0' }),
            h(DataGrid.Cell, { rowID: 'r0', column: 'name' }, () => 'Row 0'),
          ],
        }),
      });
    },
  });
  let resizeHandle;
  try {
    app.mount(host); await settle();
    resizeHandle = host.querySelector('[data-part="column-resize-handle"]');
    const selection = host.querySelector('[data-part="row-selection-control"]');
    const cell = host.querySelector('[data-part="cell"]');
    resizeHandle?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));
    await settle();
    selection?.focus();
    selection?.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true }));
    cell?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await settle();
    cell?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    await settle();
    const beforeUnmount = resizeHandle?.getAttribute('aria-valuenow') ?? null;
    const ok = beforeUnmount === '108'
      && resizeHandle?.getAttribute('aria-valuemin') === '50'
      && resizeHandle?.getAttribute('aria-valuemax') === '150'
      && selection?.getAttribute('aria-checked') === 'true'
      && selection?.tabIndex === 0
      && controller.cursor.value.current?.rowID === 'r0'
      && controller.editState.value.kind === 'editing';
    app.unmount();
    columnSizes.value = { name: 132 };
    await nextTick();
    return Object.freeze({ ok: ok && resizeHandle?.getAttribute('aria-valuenow') === beforeUnmount, columnSize: beforeUnmount, selection: selection?.getAttribute('aria-checked') ?? null, cursor: controller.cursor.value.current, edit: controller.editState.value.kind, cleanupStable: resizeHandle?.getAttribute('aria-valuenow') === beforeUnmount });
  } finally { if (host.isConnected) { app.unmount(); host.remove(); } }
}

function readyTable() { const controller = useDataTable({ source: async (request) => response(request) }); const request = controller.requestState.value.pendingRequest; if (request === null) throw new Error('missing request'); const result = controller.synchronizeView(response(request)); if (!result.ok) throw new Error(result.error.message); return controller; }
function readyGrid() { const controller = useDataGrid({ source: async (request) => response(request) }); const request = controller.requestState.value.pendingRequest; if (request === null) throw new Error('missing request'); const result = controller.synchronizeView(response(request)); if (!result.ok) throw new Error(result.error.message); return controller; }
function response(request) { return { protocolVersion: 1, requestID: request.requestID, sourceGeneration: request.sourceGeneration, queryRevision: request.queryRevision, expansionRevision: request.expansionRevision, viewRevision: 1, access: request.access, matchingLeafCount: { kind: 'known', value: rows.length }, visibleRowCount: { kind: 'known', value: rows.length }, rows, columnSchema: { revision: request.columnSchemaRevision, columns, headers: [] }, removedRowIDs: [] }; }
function fixtureHost(id) { const host = document.createElement('section'); host.dataset.scenario = id; document.body.append(host); return host; }
async function settle() { await nextTick(); await new Promise((resolve) => requestAnimationFrame(() => resolve())); await nextTick(); }
