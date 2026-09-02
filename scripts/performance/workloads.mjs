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
import { createMetricIndex } from '../../packages/core/dist/structures/metric-index.js';
import {
  boundsOfRects,
  rectanglesIntersect,
} from '../../packages/core/dist/structures/geometry.js';
import { solveAnchoredLayout } from '../../packages/core/dist/structures/anchored-layout.js';
import { oklchToSrgb, rgba8ToSrgb, srgbToOklch } from '../../packages/core/dist/structures/color.js';
import { parseColorText } from '../../packages/core/dist/editing/color-text.js';
import { replacePlainText } from '../../packages/core/dist/text.js';
import {
  applySequenceReorderEvent,
  applyTreeReorderEvent,
  createSequenceReorderState,
  createTreeReorderState,
} from '../../packages/core/dist/reorder.js';
import { createTree } from '../../packages/core/dist/structures/tree.js';
import {
  createSelectionState,
  toggleMultipleSelection,
} from '../../packages/core/dist/selection.js';
import {
  applyListboxEvent,
  createListboxState,
} from '../../packages/core/dist/listbox.js';
import { applyGridEvent, createGridState } from '../../packages/core/dist/grid-control.js';
import { applyTreeViewEvent, createTreeViewState } from '../../packages/core/dist/tree-view.js';
import { applyMenuEvent, createMenuState } from '../../packages/core/dist/menu.js';
import { applyCascadeListEvent, createCascadeListState } from '../../packages/core/dist/cascade-list.js';
import {
  applyTreeGridEvent,
  createTreeGridModel,
  createTreeGridState,
} from '../../packages/core/dist/tree-grid.js';
import {
  applyRevisionedEvent,
  createRevisionSnapshot,
} from '../../packages/core/dist/revision.js';
import {
  createFacadeConnection,
  createSemanticController,
} from '../../packages/core/dist/adapter-runtime.js';
import { PERFORMANCE_TIMING_PACKAGES, WORKLOAD_SCHEMA } from './schema.mjs';

export async function createWorkloads({ quick = false, packages = PERFORMANCE_TIMING_PACKAGES } = {}) {
  const selectedPackages = new Set(packages);
  const includeCore = selectedPackages.has('core');
  const includeTabular = selectedPackages.has('tabular');
  const includeVirtual = selectedPackages.has('virtual');
  const scales = quick ? [1_000] : WORKLOAD_SCHEMA.scales;
  const workloads = [createCalibrationWorkload(quick)];

  for (const size of scales) {
    if (includeCore) {
      const ids = Object.freeze(Array.from({ length: size }, (_, index) => `id-${size}-${index}`));
    const geometryRects = Object.freeze(Array.from({ length: size }, (_, index) => Object.freeze({
      x: index % 997,
      y: Math.floor(index / 997),
      width: 10,
      height: 10,
    })));
    workloads.push(timed(`core:geometry:bounds:${size}`, 'core-structure', { size, operation: 'bounds' }, iterations(size, quick), () =>
      boundsOfRects(geometryRects, { maxRects: size })?.width ?? 0));
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

    const metric2Points = Object.freeze(ids.map((id, index) => Object.freeze({
      id,
      coordinates: Object.freeze([index % 997, Math.floor(index / 997)]),
    })));
    const metric2Packed = createMetricIndex(metric2Points, { dimensions: 2, maxItems: size });
    const metric2 = createMetricIndex(metric2Points, { dimensions: 2, maxItems: size, expectedQueries: 128 });
    const metric32 = createMetricIndex(ids.map((id, index) => ({
      id,
      coordinates: Array.from({ length: 32 }, (_, dimension) => ((index * (dimension + 3)) % 10_007) / 10_007),
    })), { dimensions: 32, maxItems: size });
    const metric32Targets = Object.freeze(Array.from({ length: 10 }, (_, target) => Object.freeze(
      Array.from({ length: 32 }, (_, dimension) => (((target + 1) * (dimension + 5)) % 10_007) / 10_007),
    )));
    workloads.push(
      timed(`core:metric-index:construct:2d:packed:${size}`, 'core-structure', { size, dimensions: 2, operation: 'construct-packed' }, iterations(size, quick), () =>
        createMetricIndex(metric2Points, { dimensions: 2, maxItems: size }).size),
      timed(`core:metric-index:construct:2d:indexed:${size}`, 'core-structure', { size, dimensions: 2, operation: 'construct-indexed' }, iterations(size, quick), () =>
        createMetricIndex(metric2Points, { dimensions: 2, maxItems: size, expectedQueries: 128 }).size),
      timed(`core:metric-index:nearest:2d:indexed:${size}`, 'core-structure', { size, dimensions: 2, operation: 'nearest-indexed' }, iterations(size, quick), (iteration) =>
        metric2.nearest([(iteration * 8191) % 997, iteration % Math.ceil(size / 997)])?.squaredDistance ?? -1),
      timed(`core:metric-index:nearest:2d:packed:${size}`, 'core-structure', { size, dimensions: 2, operation: 'nearest-packed' }, iterations(size, quick), (iteration) =>
        metric2Packed.nearest([(iteration * 8191) % 997, iteration % Math.ceil(size / 997)])?.squaredDistance ?? -1),
      timed(`core:metric-index:radius:2d:indexed:${size}`, 'core-structure', { size, dimensions: 2, operation: 'radius-indexed' }, iterations(size, quick), (iteration) =>
        metric2.withinRadius([(iteration * 8191) % 997, iteration % Math.ceil(size / 997)], 2).length),
      timed(`core:metric-index:radius:2d:packed:${size}`, 'core-structure', { size, dimensions: 2, operation: 'radius-packed' }, iterations(size, quick), (iteration) =>
        metric2Packed.withinRadius([(iteration * 8191) % 997, iteration % Math.ceil(size / 997)], 2).length),
      timed(`core:metric-index:forward:2d:indexed:${size}`, 'core-structure', { size, dimensions: 2, operation: 'forward-indexed' }, iterations(size, quick), (iteration) =>
        metric2.forwardNearest([(iteration * 8191) % 997, iteration % Math.ceil(size / 997)], [1, 0.25])?.squaredDistance ?? -1),
      timed(`core:metric-index:forward:2d:packed:${size}`, 'core-structure', { size, dimensions: 2, operation: 'forward-packed' }, iterations(size, quick), (iteration) =>
        metric2Packed.forwardNearest([(iteration * 8191) % 997, iteration % Math.ceil(size / 997)], [1, 0.25])?.squaredDistance ?? -1),
      timed(`core:metric-index:nearest:32d:${size}`, 'core-structure', { size, dimensions: 32, operation: 'nearest-packed' }, iterations(size, quick), (iteration) =>
        metric32.nearest(metric32Targets[iteration % metric32Targets.length])?.squaredDistance ?? -1),
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

    const text = 'a'.repeat(size);
    const sequenceReorder = createSequenceReorderState(ids);
    const treeReorder = createTreeReorderState(Array.from({ length: size }, (_, index) => ({
      id: `reorder-tree-${size}-${index}`,
      parentID: index === 0 ? null : `reorder-tree-${size}-${Math.floor((index - 1) / 2)}`,
    })));
    workloads.push(
      timed(`core:text:replace:${size}`, 'core-editing', { size, operation: 'replace-one' }, iterations(size, quick), () =>
        unwrap(replacePlainText(text, size - 1, size, 'z')).length),
      timed(`core:sequence-reorder:move:${size}`, 'core-editing', { size, operation: 'move-before' }, iterations(size, quick), () =>
        unwrap(applySequenceReorderEvent(sequenceReorder, {
          type: 'move-before', id: ids[size - 1], targetID: ids[0],
        })).state.ids.length),
      timed(`core:tree-reorder:move:${size}`, 'core-editing', { size, operation: 'move-node' }, iterations(size, quick), () =>
        unwrap(applyTreeReorderEvent(treeReorder, {
          type: 'move-node',
          id: `reorder-tree-${size}-${size - 1}`,
          parentID: 'reorder-tree-' + size + '-0',
          beforeID: 'reorder-tree-' + size + '-1',
        })).state.nodes.length),
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
    const externalListboxState = Object.freeze({ ...listboxState });
    const treeRoot = `tree-${size}-0`;
    const treeViewState = createTreeViewState(tree, { expanded: [treeRoot], current: treeRoot });
    const externalTreeViewState = Object.freeze({ ...treeViewState });
    const menuState = createMenuState(tree, true, treeRoot);
    const externalMenuState = Object.freeze({ ...menuState });
    const cascadeDepth = Math.min(size, 1_024);
    const cascadeTree = createTree(Array.from({ length: cascadeDepth }, (_, index) => ({
      id: `cascade-${size}-${index}`,
      parentID: index === 0 ? null : `cascade-${size}-${index - 1}`,
    })));
    const cascadeState = createCascadeListState(cascadeTree, { value: `cascade-${size}-${cascadeDepth - 1}` });
    const externalCascadeState = Object.freeze({ ...cascadeState });
    const gridID = 'grid-' + size + '-0';
    const gridState = createGridState(grid, { current: gridID, selected: [gridID] });
    const externalGridState = Object.freeze({ ...gridState });
    const rowIDs = Array.from({ length: rowCount }, (_, index) => `tree-grid-row-${size}-${index}`);
    const rowTree = createTree(rowIDs.map((id) => ({ id, parentID: null })));
    const treeGridModel = createTreeGridModel(rowTree, grid, rowIDs);
    const treeGridState = createTreeGridState(treeGridModel, { current: gridID });
    const externalTreeGridState = Object.freeze({ ...treeGridState });
    const semanticIterations = iterations(size, quick);
    const canonicalIterations = quick ? 100 : 10_000;
    workloads.push(
      timed(`core:listbox:next:${size}`, 'core-semantic', { size, operation: 'canonical-transition' }, canonicalIterations, () => unwrap(applyListboxEvent(sequence, listboxState, 'next')).state.selection.size),
      timed(`core:listbox:next:external:${size}`, 'core-semantic', { size, operation: 'external-validation-reference' }, semanticIterations, () => unwrap(applyListboxEvent(sequence, externalListboxState, 'next')).state.selection.size),
      timed(`core:tree-view:next:${size}`, 'core-semantic', { size, operation: 'canonical-transition' }, canonicalIterations, () => unwrap(applyTreeViewEvent(tree, treeViewState, 'next')).state.selection.size),
      timed(`core:tree-view:next:external:${size}`, 'core-semantic', { size, operation: 'external-validation-reference' }, semanticIterations, () => unwrap(applyTreeViewEvent(tree, externalTreeViewState, 'next')).state.selection.size),
      timed(`core:menu:next:${size}`, 'core-semantic', { size, operation: 'canonical-transition' }, canonicalIterations, () => unwrap(applyMenuEvent(tree, menuState, 'next')).state.openPath.length),
      timed(`core:menu:next:external:${size}`, 'core-semantic', { size, operation: 'external-validation-reference' }, semanticIterations, () => unwrap(applyMenuEvent(tree, externalMenuState, 'next')).state.openPath.length),
      timed(`core:cascade:next:${size}`, 'core-semantic', { size, depth: cascadeDepth, operation: 'canonical-transition' }, canonicalIterations, () => unwrap(applyCascadeListEvent(cascadeTree, cascadeState, 'next')).state.path.length),
      timed(`core:cascade:next:external:${size}`, 'core-semantic', { size, depth: cascadeDepth, operation: 'external-validation-reference' }, semanticIterations, () => unwrap(applyCascadeListEvent(cascadeTree, externalCascadeState, 'next')).state.path.length),
      timed(`core:grid-control:right:${size}`, 'core-semantic', { size, operation: 'canonical-transition' }, canonicalIterations, () => unwrap(applyGridEvent(grid, gridState, 'right')).state.selection.size),
      timed(`core:grid-control:right:external:${size}`, 'core-semantic', { size, operation: 'external-validation-reference' }, semanticIterations, () => unwrap(applyGridEvent(ephemeralOwner(grid), externalGridState, 'right')).state.selection.size),
      timed(`core:tree-grid:right:${size}`, 'core-semantic', { size, operation: 'canonical-transition' }, canonicalIterations, () => unwrap(applyTreeGridEvent(treeGridModel, treeGridState, 'right')).state.selection.size),
      timed(`core:tree-grid:right:external:${size}`, 'core-semantic', { size, operation: 'external-validation-reference' }, semanticIterations, () => unwrap(applyTreeGridEvent(treeGridModel, externalTreeGridState, 'right')).state.selection.size),
    );
    }

    if (includeTabular) workloads.push(...await createTabularWorkloads(size, quick));
    if (includeVirtual) workloads.push(...await createVirtualWorkloads(size, quick));
  }

  if (includeCore) {
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
  const anchoredInput = Object.freeze({
    reference: Object.freeze({ x: 972, y: 740, width: 40, height: 30 }),
    floating: Object.freeze({ width: 180, height: 120 }),
    boundary: Object.freeze({ x: 0, y: 0, width: 1_024, height: 768 }),
    side: 'bottom',
    align: 'center',
    offset: 8,
    padding: 12,
    arrow: Object.freeze({ width: 10, height: 6 }),
  });
  const geometryLeft = Object.freeze({ x: 10, y: 20, width: 40, height: 30 });
  const geometryRight = Object.freeze({ x: 30, y: 25, width: 35, height: 45 });
  workloads.push(
    timed('core:geometry:intersection', 'core-structure', { operation: 'intersection' }, quick ? 10_000 : 100_000, () =>
      rectanglesIntersect(geometryLeft, geometryRight) ? 1 : 0),
    timed('core:anchored-layout:solve', 'core-structure', { operation: 'bounded-placement', candidates: 4 }, quick ? 1_000 : 10_000, () =>
      solveAnchoredLayout(anchoredInput).rect.x),
    timed('core:color:convert', 'core-structure', { operation: 'srgb-oklch-roundtrip' }, quick ? 10_000 : 100_000, (iteration) => {
      const srgb = rgba8ToSrgb({ red: iteration & 255, green: iteration >>> 3 & 255, blue: iteration >>> 7 & 255, alpha: 255 });
      const converted = oklchToSrgb(srgbToOklch(srgb));
      return converted.ok ? converted.value.red : -1;
    }),
    timed('core:color:gamut-reduce', 'core-structure', { operation: 'reduce-chroma', iterations: 12 }, quick ? 1_000 : 10_000, () =>
      oklchToSrgb({ lightness: 0.8, chroma: 0.5, hue: 120, alpha: 1 }, 'reduce-chroma').value.green),
    timed('core:color-text:parse', 'core-editing', { operation: 'parse', codeUnits: 34 }, quick ? 1_000 : 10_000, () =>
      parseColorText('oklch(62.7955% 0.25768 29.2339)').value.red),
  );
  workloads.push(...createRuntimeWorkloads(quick));
  }
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

async function createTabularWorkloads(size, quick) {
  const [sourceModule, gridModule] = await Promise.all([
    import('../../packages/tabular/dist/source.js'),
    import('../../packages/tabular/dist/data-grid.js'),
  ]);
  const { createClientTabularSource, resolveClientTabularRequest } = sourceModule;
  const { createDataGrid } = gridModule;
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
  const invalidated = Object.freeze([tabularRequest(2, 'ascending'), tabularRequest(3, 'descending')]);
  const repetitions = iterations(size, quick);

  const grid = createDataGrid({
    columns: [{ id: 'score' }, { id: 'active' }],
    initialValues: {
      accessState: { kind: 'page', page: 1, itemsPerPage: size, visibleRowCount: null, pagination: null },
    },
  });
  const pending = grid.getSnapshot().tabular.state.requestState.pendingRequest;
  if (pending === null) throw new Error('Tabular grid benchmark requires an initial request.');
  const response = unwrap(resolveClientTabularRequest(source, pending));
  unwrap(grid.synchronizeView(response));
  const firstCell = grid.getProjection().rows[0]?.cells[0];
  if (firstCell === undefined) throw new Error('Tabular grid benchmark requires one projected cell.');
  unwrap(grid.dispatch({ type: 'focus-cell', cell: firstCell }));
  unwrap(resolveClientTabularRequest(source, request));

  return [
    timed(`tabular:resolve:cold:${size}`, 'tabular-resolution', { size, stage: 'cold' }, repetitions, () =>
      unwrap(resolveClientTabularRequest(createSource(), request)).rows.length),
    timed(`tabular:resolve:warm:${size}`, 'tabular-resolution', { size, stage: 'warm' }, repetitions, () =>
      unwrap(resolveClientTabularRequest(source, request)).rows.length),
    timed(`tabular:resolve:invalidate:${size}`, 'tabular-resolution', { size, stage: 'invalidation' }, repetitions, (iteration) =>
      unwrap(resolveClientTabularRequest(source, invalidated[iteration & 1])).rows.length),
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

async function createVirtualWorkloads(size, quick) {
  const [extentModule, linearModule, spatialModule, partitionedModule] = await Promise.all([
    import('../../packages/virtual/dist/extent-index.js'),
    import('../../packages/virtual/dist/linear-layout.js'),
    import('../../packages/virtual/dist/spatial-layout.js'),
    import('../../packages/virtual/dist/partitioned-track-grid-layout.js'),
  ]);
  const { createExtentIndex } = extentModule;
  const { applyLinearMeasurements, createLinearLayout, queryLinearLayout } = linearModule;
  const { applySpatialMeasurements, createSpatialLayout, querySpatialLayout } = spatialModule;
  const { applyPartitionedTrackGridMeasurements, createPartitionedTrackGridLayout } = partitionedModule;
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
  const partitionedRows = Object.freeze(Array.from({ length: size }, (_, index) => Object.freeze({
    id: `partitioned-row-${size}-${index}`,
    partition: 'center',
    extent: estimated(44),
  })));
  const partitionedColumns = Object.freeze(Array.from({ length: 64 }, (_, index) => Object.freeze({
    id: `partitioned-column-${size}-${index}`,
    partition: 'center',
    extent: exact(96),
  })));
  const partitioned = createPartitionedTrackGridLayout(partitionedRows, partitionedColumns, []);
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
    const partitionedMeasurements = Object.freeze(Array.from({ length: changed }, (_, index) => Object.freeze({
      axis: 'row',
      id: `partitioned-row-${size}-${index}`,
      extent: exact(36 + (index & 15)),
    })));
    workloads.push(
      timed(`virtual:linear:measure:${size}:${changed}`, 'virtual-layout', { size, changed, operation: 'measurement' }, iterations(size, quick), () =>
        applyLinearMeasurements(linear, { generation: linear.generation, measurements: linearMeasurements }).state.generation),
      timed(`virtual:spatial:measure:${size}:${changed}`, 'virtual-layout', { size, changed, operation: 'measurement' }, iterations(size, quick), () =>
        applySpatialMeasurements(spatial, { generation: spatial.generation, measurements: spatialMeasurements }).state.generation),
      timed(`virtual:partitioned:measure:${size}:${changed}`, 'virtual-layout', { size, changed, operation: 'measurement' }, iterations(size, quick), () =>
        applyPartitionedTrackGridMeasurements(partitioned, { generation: partitioned.generation, measurements: partitionedMeasurements }).state.generation),
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

function ephemeralOwner(owner) {
  return new Proxy(owner, {
    get(target, property) {
      const value = Reflect.get(target, property, target);
      return typeof value === 'function' ? value.bind(target) : value;
    },
  });
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
