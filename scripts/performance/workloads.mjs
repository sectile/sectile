import {
  applySequencePatch,
  createSequence,
} from '../../packages/core/dist/structures/sequence.js';
import { createGrid } from '../../packages/core/dist/structures/grid.js';
import {
  addExactRatios,
  createExactRatio,
  createRange,
} from '../../packages/core/dist/structures/range.js';
import {
  containsIndexInSpanSet,
  createIndexSpanSet,
  unionIndexSpanSets,
} from '../../packages/core/dist/structures/index-span.js';
import {
  createSelectionExpression,
  materializeSelectionExpression,
  unionSelectionExpressions,
} from '../../packages/core/dist/structures/selection-expression.js';
import { createTree } from '../../packages/core/dist/structures/tree.js';
import {
  createSelectionState,
  toggleMultipleSelection,
} from '../../packages/core/dist/selection.js';
import {
  applyListboxEvent,
  createListboxState,
} from '../../packages/core/dist/listbox.js';
import {
  applyRevisionedEvent,
  createRevisionSnapshot,
} from '../../packages/core/dist/revision.js';
import {
  createFacadeConnection,
  createSemanticController,
} from '../../packages/core/dist/adapter-runtime.js';
import {
  createClientTabularSource,
  resolveClientTabularRequest,
} from '../../packages/tabular/dist/source.js';
import { createDataGrid } from '../../packages/tabular/dist/data-grid.js';
import { createExtentIndex } from '../../packages/virtual/dist/extent-index.js';
import {
  applyLinearMeasurements,
  createLinearLayout,
  queryLinearLayout,
} from '../../packages/virtual/dist/linear-layout.js';
import {
  applySpatialMeasurements,
  createSpatialLayout,
  querySpatialLayout,
} from '../../packages/virtual/dist/spatial-layout.js';

export const WORKLOAD_SCHEMA = Object.freeze({
  version: 6,
  scales: Object.freeze([1_000, 10_000, 100_000]),
  patchDepths: Object.freeze([1, 8, 32, 64]),
  changedDensities: Object.freeze([1, 32, 'full']),
  families: Object.freeze([
    'runner',
    'core-structure',
    'core-selection',
    'core-semantic',
    'core-runtime',
    'tabular-resolution',
    'tabular-profile',
    'virtual-layout',
  ]),
  browserQualifiedRegistrations: Object.freeze([
    Object.freeze({
      id: 'vue:mounted-virtual-projection',
      runtime: 'browser',
      metrics: Object.freeze(['render-count', 'effect-count', 'measurement-count', 'resource-count']),
      portableTimingBudget: false,
    }),
  ]),
});

export function createWorkloads({ quick = false } = {}) {
  const scales = quick ? [1_000] : WORKLOAD_SCHEMA.scales;
  const workloads = [createCalibrationWorkload(quick)];

  for (const size of scales) {
    const ids = Object.freeze(Array.from({ length: size }, (_, index) => `id-${size}-${index}`));
    const sequence = createSequence(ids, { maxItems: size + 128 });
    workloads.push(
      timed(`core:sequence:construct:${size}`, 'core-structure', { size, operation: 'construct' }, iterations(size, quick), () =>
        createSequence(ids, { maxItems: size + 128 }).size),
      timed(`core:sequence:index-of:${size}`, 'core-structure', { size, operation: 'index-of' }, quick ? 1_000 : 10_000, (iteration) =>
        sequence.indexOf(ids[(iteration * 8191) % size])),
      timed(`core:sequence:splice:${size}`, 'core-structure', { size, operation: 'splice', changed: 1 }, iterations(size, quick), (iteration) =>
        applySequencePatch(sequence, {
          type: 'splice',
          index: size >>> 1,
          deleteCount: 0,
          inserted: [`inserted-${size}-${iteration}`],
        }, { maxItems: size + 128 }).size),
      timed(`core:sequence:move:${size}`, 'core-structure', { size, operation: 'move', changed: 32 }, iterations(size, quick), () =>
        applySequencePatch(sequence, {
          type: 'move',
          from: size >>> 2,
          to: (size * 3) >>> 2,
          count: Math.min(32, size >>> 3),
        }).size),
    );

    for (const depth of quick ? [1, 8] : WORKLOAD_SCHEMA.patchDepths) {
      let patched = sequence;
      for (let patch = 0; patch < depth; patch += 1) {
        patched = applySequencePatch(patched, {
          type: 'splice',
          index: patched.size,
          deleteCount: 0,
          inserted: [`patch-${size}-${depth}-${patch}`],
        }, { maxItems: size + 128 });
      }
      workloads.push(
        timed(`core:sequence:patch-lookup:${size}:${depth}`, 'core-structure', { size, patchDepth: depth, operation: 'lookup' }, quick ? 500 : 5_000, () =>
          patched.indexOf(ids[size - 1])),
        timed(`core:sequence:materialize:${size}:${depth}`, 'core-structure', { size, patchDepth: depth, operation: 'materialize' }, iterations(size, quick), () =>
          patched.ids.length),
      );
    }

    const selection = unwrap(createSelectionState(sequence, 'multiple', {
      selected: ids.filter((_id, index) => index % 100 === 0),
      anchor: ids[0],
    }));
    workloads.push(timed(
      `core:selection:toggle:${size}`,
      'core-selection',
      { size, selected: selection.size, operation: 'toggle' },
      iterations(size, quick),
      (iteration) => toggleMultipleSelection(selection, ids[(iteration * 97) % size], sequence).size,
    ));

    const expressionLeft = createSelectionExpression('explicit', ids.filter((_id, index) => index % 2 === 0));
    const expressionRight = createSelectionExpression('explicit', ids.filter((_id, index) => index % 2 === 1));
    const expressionComplement = createSelectionExpression('complement', expressionLeft.exceptions);
    workloads.push(
      timed(`core:selection-expression:contains:${size}`, 'core-selection', { size, exceptions: expressionLeft.exceptionCount, operation: 'contains' }, quick ? 1_000 : 10_000, (iteration) =>
        expressionLeft.contains(ids[(iteration * 8191) % size]) ? 1 : 0),
      timed(`core:selection-expression:union:${size}`, 'core-selection', { size, exceptions: size, operation: 'union' }, iterations(size, quick), () =>
        unionSelectionExpressions(expressionLeft, expressionRight).exceptionCount),
      timed(`core:selection-expression:materialize:${size}`, 'core-selection', { size, exceptions: expressionComplement.exceptionCount, operation: 'materialize' }, iterations(size, quick), () =>
        materializeSelectionExpression(expressionComplement, sequence).length),
    );

    const tree = createTree(Array.from({ length: size }, (_, index) => ({
      id: `tree-${size}-${index}`,
      parentID: index === 0 ? null : `tree-${size}-${Math.floor((index - 1) / 3)}`,
    })));
    workloads.push(
      timed(`core:tree:views:${size}`, 'core-structure', { size, operation: 'views' }, quick ? 100 : 1_000, (iteration) =>
        tree.preorder().at((iteration * 8191) % size)?.length ?? 0),
      timed(`core:tree:visible:${size}`, 'core-structure', { size, operation: 'visible' }, iterations(size, quick), () =>
        tree.visible(tree.normalizeExpansion([`tree-${size}-0`])).size),
    );

    const columnCount = size === 1_000 ? 40 : size === 10_000 ? 100 : 400;
    const rowCount = Math.ceil(size / columnCount);
    const rows = Array.from({ length: rowCount }, (_, row) =>
      Array.from({ length: columnCount }, (_, column) => {
        const index = row * columnCount + column;
        return index < size ? `grid-${size}-${index}` : null;
      }));
    const grid = createGrid(rows);
    workloads.push(
      timed(`core:grid:position:${size}`, 'core-structure', { size, operation: 'position' }, quick ? 1_000 : 10_000, (iteration) =>
        grid.positionOf(`grid-${size}-${(iteration * 8191) % size}`)?.row ?? -1),
      timed(`core:grid:views:${size}`, 'core-structure', { size, operation: 'views' }, quick ? 100 : 1_000, (iteration) =>
        (grid.row(iteration % rowCount)?.size ?? 0) + (grid.column(iteration % columnCount)?.size ?? 0)),
    );

    const contiguousSpans = Object.freeze(Array.from(
      { length: size },
      (_, index) => Object.freeze({ start: index, endExclusive: index + 1 }),
    ));
    const separatedLeft = createIndexSpanSet(Array.from(
      { length: size >>> 1 },
      (_, index) => ({ start: index * 4, endExclusive: index * 4 + 1 }),
    ));
    const separatedRight = createIndexSpanSet(Array.from(
      { length: size >>> 1 },
      (_, index) => ({ start: index * 4 + 2, endExclusive: index * 4 + 3 }),
    ));
    workloads.push(
      timed(`core:index-span:normalize:${size}`, 'core-structure', { size, operation: 'normalize-contiguous' }, iterations(size, quick), () =>
        createIndexSpanSet(contiguousSpans).spanCount),
      timed(`core:index-span:contains:${size}`, 'core-structure', { size, spans: separatedLeft.spanCount, operation: 'contains' }, quick ? 1_000 : 10_000, (iteration) =>
        containsIndexInSpanSet(separatedLeft, (iteration * 8191) % (size * 2)) ? 1 : 0),
      timed(`core:index-span:union:${size}`, 'core-structure', { size, spans: separatedLeft.spanCount + separatedRight.spanCount, operation: 'union' }, iterations(size, quick), () =>
        unionIndexSpanSets(separatedLeft, separatedRight).spanCount),
    );

    const listboxState = createListboxState(sequence, { current: ids[0], selected: [ids[0]] });
    workloads.push(timed(
      `core:listbox:next:${size}`,
      'core-semantic',
      { size, operation: 'canonical-transition' },
      iterations(size, quick),
      () => unwrap(applyListboxEvent(sequence, listboxState, 'next')).state.selection.size,
    ));

    workloads.push(...createTabularWorkloads(size, quick));
    workloads.push(...createVirtualWorkloads(size, quick));
  }

  const range = createRange({ origin: '0', step: '0.01', count: 10_000_000 });
  workloads.push(timed('core:range:arithmetic', 'core-structure', { operation: 'value-ratio-map', count: 10_000_000 }, quick ? 1_000 : 10_000, (iteration) => {
    const tick = (iteration * 104_729) % 10_000_001;
    const ratio = range.ratioOfTick(tick);
    return ratio === null ? -1 : range.tickFromRatio(ratio) ?? -1;
  }));
  const wideRatioLeft = createExactRatio((1n << 1_023n) - 1n, (1n << 1_021n) - 1n);
  const wideRatioRight = createExactRatio((1n << 1_019n) - 1n, (1n << 1_017n) - 1n);
  workloads.push(timed('core:exact-ratio:add:1024', 'core-structure', { operation: 'reduced-add', bits: 1_024 }, quick ? 100 : 1_000, () =>
    Number(addExactRatios(wideRatioLeft, wideRatioRight).numerator & 1n)));
  workloads.push(...createRuntimeWorkloads(quick));
  return Object.freeze(workloads);
}

function createCalibrationWorkload(quick) {
  return timed('runner:calibration', 'runner', { operation: 'integer-mix' }, quick ? 200_000 : 1_000_000, (iteration) => {
    let value = iteration | 0;
    for (let round = 0; round < 32; round += 1) value = Math.imul(value ^ round, 1_664_525) + 1_013_904_223;
    return value;
  });
}

function createRuntimeWorkloads(quick) {
  const snapshot = createRevisionSnapshot(0);
  const reducer = (state, event) => ({ ok: true, value: { state: state + event, commands: [state] } });
  const controller = unwrap(createSemanticController({
    initial: { ok: true, value: 0 },
    reducer,
    toEffect: (command) => command,
  }));
  const connection = {
    getSnapshot: () => ({ state: 1 }),
    handleEvent: () => true,
    syncControlledValue: () => ({ ok: true, value: 1 }),
  };
  const facade = unwrap(createFacadeConnection({}, () => ({ ok: true, value: connection })));
  return [
    timed('core:revision:apply', 'core-runtime', { operation: 'revision' }, quick ? 1_000 : 10_000, () =>
      applyRevisionedEvent(snapshot, 0, 1, reducer).snapshot.revision),
    timed('core:controller:handle', 'core-runtime', { operation: 'controller' }, quick ? 1_000 : 10_000, () =>
      controller.handle(1).snapshot.revision),
    timed('core:facade:access', 'core-runtime', { operation: 'facade-proxy' }, quick ? 1_000 : 10_000, () =>
      facade.state + (facade.send(1) ? 1 : 0)),
  ];
}

function createTabularWorkloads(size, quick) {
  const records = Object.freeze(Array.from({ length: size }, (_, index) => Object.freeze({
    id: `row-${size}-${index}`,
    score: (index * 48_271) % 100_003,
    active: index % 3 !== 0,
  })));
  const createSource = () => createClientTabularSource({
    records,
    columnSchema: { revision: 0, columns: [{ id: 'score' }, { id: 'active' }], headers: [] },
    getRowID: (record) => record.id,
    getValue: (record, columnID) => record[columnID],
    policies: {
      predicates: { equals: (record, descriptor, getValue) => getValue(record, descriptor.columnID) === descriptor.value },
      comparators: { value: (left, right, descriptor, getValue) => getValue(left, descriptor.columnID) - getValue(right, descriptor.columnID) },
    },
  });
  const source = createSource();
  const request = tabularRequest(1, 'descending');
  const invalidated = tabularRequest(2, 'ascending');
  const repetitions = iterations(size, quick);

  const grid = createDataGrid({ columns: [{ id: 'score' }, { id: 'active' }] });
  const pending = grid.getSnapshot().tabular.state.requestState.pendingRequest;
  if (pending === null) throw new Error('Tabular grid benchmark requires an initial request.');
  const response = unwrap(resolveClientTabularRequest(source, pending));
  unwrap(grid.synchronizeView(response));
  const firstCell = grid.getProjection().rows[0]?.cells[0];
  if (firstCell === undefined) throw new Error('Tabular grid benchmark requires one projected cell.');
  unwrap(grid.dispatch({ type: 'focus-cell', cell: firstCell }));

  return [
    timed(`tabular:resolve:cold:${size}`, 'tabular-resolution', { size, stage: 'cold' }, repetitions, () =>
      unwrap(resolveClientTabularRequest(createSource(), request)).rows.length),
    timed(`tabular:resolve:warm:${size}`, 'tabular-resolution', { size, stage: 'warm' }, repetitions, () =>
      unwrap(resolveClientTabularRequest(source, request)).rows.length),
    timed(`tabular:resolve:invalidate:${size}`, 'tabular-resolution', { size, stage: 'invalidation' }, repetitions, () =>
      unwrap(resolveClientTabularRequest(source, invalidated)).rows.length),
    timed(`tabular:grid-profile:move:${size}`, 'tabular-profile', { size, operation: 'move-cell' }, quick ? 10 : 100, () =>
      unwrap(grid.dispatch({ type: 'move-cell', direction: 'right', boundary: 'wrap-axis' })).snapshot.revision),
  ];
}

function tabularRequest(queryRevision, direction) {
  return Object.freeze({
    protocolVersion: 1,
    requestID: queryRevision,
    sourceGeneration: 0,
    queryRevision,
    expansionRevision: 0,
    query: Object.freeze({
      filters: Object.freeze([{ id: 'active', scope: 'column', columnID: 'active', predicate: 'equals', value: true }]),
      sort: Object.freeze([{ id: 'score', columnID: 'score', direction, comparator: 'value' }]),
      groups: Object.freeze([]),
      aggregates: Object.freeze([]),
      pivots: Object.freeze([]),
    }),
    expansion: Object.freeze([]),
    access: Object.freeze({ kind: 'window', start: 0, count: 100 }),
    columnSchemaRevision: 0,
  });
}

function createVirtualWorkloads(size, quick) {
  const domain = createSequence(Array.from({ length: size }, (_, index) => `virtual-${size}-${index}`));
  const estimated = (value) => Object.freeze({ kind: 'estimated', value });
  const exact = (value) => Object.freeze({ kind: 'exact', value });
  const extents = createExtentIndex(Array(size).fill(estimated(44)));
  const linear = createLinearLayout(domain, extents, { crossExtent: 320 });
  const spatialItems = Object.freeze(Array.from({ length: size }, (_, index) => Object.freeze({
    id: `spatial-${size}-${index}`,
    rect: Object.freeze({ x: (index % 1_000) * 24, y: Math.floor(index / 1_000) * 24, width: 28, height: 28 }),
    zIndex: index % 7,
  })));
  const spatial = createSpatialLayout(spatialItems);
  const changes = quick ? [1, 32] : [1, 32, size];
  const workloads = [
    timed(`virtual:linear:query:${size}`, 'virtual-layout', { size, operation: 'query' }, quick ? 100 : 1_000, (iteration) =>
      queryLinearLayout(linear, {
        viewport: { x: 0, y: (iteration * 97) % Math.max(1, size * 40), width: 320, height: 800 },
        overscan: 800,
      }).placements.length),
    timed(`virtual:spatial:build:${size}`, 'virtual-layout', { size, operation: 'packed-build' }, iterations(size, quick), () =>
      createSpatialLayout(spatialItems).generation),
    timed(`virtual:spatial:query:${size}`, 'virtual-layout', { size, operation: 'query' }, quick ? 100 : 1_000, (iteration) =>
      querySpatialLayout(spatial, {
        viewport: { x: (iteration * 193) % 23_000, y: (iteration * 47) % Math.max(1, size), width: 240, height: 240 },
        overscan: 48,
      }).placements.length),
  ];
  for (const changed of changes) {
    const linearMeasurements = Object.freeze(Array.from({ length: changed }, (_, index) => Object.freeze({
      index,
      extent: exact(36 + (index & 15)),
    })));
    const spatialMeasurements = Object.freeze(Array.from({ length: changed }, (_, index) => Object.freeze({
      id: `spatial-${size}-${index}`,
      rect: Object.freeze({ x: index * 3, y: index * 5, width: 30, height: 30 }),
    })));
    workloads.push(
      timed(`virtual:linear:measure:${size}:${changed}`, 'virtual-layout', { size, changed, operation: 'measurement' }, iterations(size, quick), () =>
        applyLinearMeasurements(linear, { generation: linear.generation, measurements: linearMeasurements }).state.generation),
      timed(`virtual:spatial:measure:${size}:${changed}`, 'virtual-layout', { size, changed, operation: 'measurement' }, iterations(size, quick), () =>
        applySpatialMeasurements(spatial, { generation: spatial.generation, measurements: spatialMeasurements }).state.generation),
    );
  }
  return workloads;
}

function iterations(size, quick) {
  if (quick) return 1;
  if (size >= 100_000) return 1;
  if (size >= 10_000) return 3;
  return 10;
}

function timed(id, family, dimensions, iterationCount, operation) {
  return Object.freeze({
    id,
    family,
    dimensions: Object.freeze(dimensions),
    iterations: iterationCount,
    warmupIterations: Math.max(1, Math.min(iterationCount, 10)),
    operation,
  });
}

function unwrap(result) {
  if (!result.ok) throw new Error(`${result.error.code}: ${result.error.message}`);
  return result.value;
}
