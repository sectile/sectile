import { applySequencePatch, createSequence } from '../../../packages/core/dist/structures/sequence.js';
import { createGrid } from '../../../packages/core/dist/structures/grid.js';
import { addExactRatios, createExactRatio, createRange } from '../../../packages/core/dist/structures/range.js';
import { containsIndexInSpanSet, createIndexSpanSet, unionIndexSpanSets } from '../../../packages/core/dist/structures/index-span.js';
import { createSelectionExpression, materializeSelectionExpression, unionSelectionExpressions } from '../../../packages/core/dist/structures/selection-expression.js';
import { createMetricIndex } from '../../../packages/core/dist/structures/metric-index.js';
import { boundsOfRects, rectanglesIntersect } from '../../../packages/core/dist/structures/geometry.js';
import { solveAnchoredLayout } from '../../../packages/core/dist/structures/anchored-layout.js';
import { oklchToSrgb, rgba8ToSrgb, srgbToOklch } from '../../../packages/core/dist/structures/color.js';
import { parseColorText } from '../../../packages/core/dist/editing/color-text.js';
import { replacePlainText } from '../../../packages/core/dist/text.js';
import { applySequenceReorderEvent, applyTreeReorderEvent, createSequenceReorderState, createTreeReorderState } from '../../../packages/core/dist/reorder.js';
import { createTree } from '../../../packages/core/dist/structures/tree.js';
import { createSelectionState, toggleMultipleSelection } from '../../../packages/core/dist/selection.js';
import { applyListboxEvent, createListboxState } from '../../../packages/core/dist/listbox.js';
import { applyGridEvent, createGridState } from '../../../packages/core/dist/grid-control.js';
import { applyTreeViewEvent, createTreeViewState } from '../../../packages/core/dist/tree-view.js';
import { applyMenuEvent, createMenuState } from '../../../packages/core/dist/menu.js';
import { applyCascadeListEvent, createCascadeListState } from '../../../packages/core/dist/cascade-list.js';
import { applyTreeGridEvent, createTreeGridModel, createTreeGridState } from '../../../packages/core/dist/tree-grid.js';
import { applyRevisionedEvent, createRevisionSnapshot } from '../../../packages/core/dist/revision.js';
import { createFacadeConnection, createSemanticController } from '../../../packages/core/dist/adapter-runtime.js';
import { WORKLOAD_SCHEMA } from '../schema.mjs';
import { iterations, selectedSizes, timed, unwrap, wants, wantsAny, workloadGroup } from './shared.mjs';

export function* createCoreWorkloadGroups({ quick, selection }) {
  const sizes = selectedSizes('core', WORKLOAD_SCHEMA.scales, selection);
  for (const size of sizes) {
    if (wantsAny(selection, 'core', ['construct', 'query', 'mutation'], 'sequence', size)) {
      yield workloadGroup(() => sequenceWorkloads(size, quick, selection));
    }
    if (wants(selection, 'core', 'mutation', 'selection', size)) {
      yield workloadGroup(() => selectionWorkloads(size, quick));
    }
    if (wantsAny(selection, 'core', ['query', 'mutation'], 'selection-expression', size)) {
      yield workloadGroup(() => selectionExpressionWorkloads(size, quick, selection));
    }
    if (wantsAny(selection, 'core', ['construct', 'query'], 'metric-index', size)) {
      yield workloadGroup(() => metricIndexWorkloads(size, quick, selection));
    }
    if (wants(selection, 'core', 'query', 'tree', size)) {
      yield workloadGroup(() => treeWorkloads(size, quick));
    }
    if (wants(selection, 'core', 'primitive', 'geometry', size)) {
      yield workloadGroup(() => [geometryBoundsWorkload(size, quick)]);
    }
    if (wants(selection, 'core', 'mutation', 'text', size)) {
      yield workloadGroup(() => [textWorkload(size, quick)]);
    }
    if (wants(selection, 'core', 'mutation', 'sequence-reorder', size)) {
      yield workloadGroup(() => [sequenceReorderWorkload(size, quick)]);
    }
    if (wants(selection, 'core', 'mutation', 'tree-reorder', size)) {
      yield workloadGroup(() => [treeReorderWorkload(size, quick)]);
    }
    if (wants(selection, 'core', 'query', 'grid', size)) {
      yield workloadGroup(() => gridWorkloads(size, quick));
    }
    if (wantsAny(selection, 'core', ['construct', 'query', 'mutation'], 'index-span', size)) {
      yield workloadGroup(() => indexSpanWorkloads(size, quick, selection));
    }
    for (const domain of ['listbox', 'tree-view', 'menu', 'cascade', 'grid-control', 'tree-grid']) {
      if (wants(selection, 'core', 'transition', domain, size)) {
        yield workloadGroup(() => semanticWorkloads(domain, size, quick));
      }
    }
  }
  if (wantsAny(selection, 'core', ['transition', 'query'], 'runtime')) {
    yield workloadGroup(() => runtimeWorkloads(quick, selection));
  }
  if (wants(selection, 'core', 'primitive', 'range')) {
    yield workloadGroup(() => [rangeWorkload(quick)]);
  }
  if (wants(selection, 'core', 'primitive', 'exact-ratio')) {
    yield workloadGroup(() => [exactRatioWorkload(quick)]);
  }
  if (wants(selection, 'core', 'primitive', 'geometry')) {
    yield workloadGroup(() => [geometryIntersectionWorkload(quick)]);
  }
  if (wants(selection, 'core', 'primitive', 'anchored-layout')) {
    yield workloadGroup(() => [anchoredLayoutWorkload(quick)]);
  }
  if (wants(selection, 'core', 'primitive', 'color')) {
    yield workloadGroup(() => colorWorkloads(quick));
  }
  if (wants(selection, 'core', 'primitive', 'color-text')) {
    yield workloadGroup(() => [colorTextWorkload(quick)]);
  }
}

function sequenceWorkloads(size, quick, selection) {
  const ids = idsFor(size);
  const sequence = createSequence(ids, { maxItems: size + 128 });
  const result = [];
  if (wants(selection, 'core', 'construct', 'sequence', size)) {
    result.push(timed(`core:sequence:construct:${size}`, 'core-structure', { size, operation: 'construct' }, iterations(size, quick), () =>
      createSequence(ids, { maxItems: size + 128 }).size));
  }
  if (wants(selection, 'core', 'query', 'sequence', size)) {
    result.push(timed(`core:sequence:index-of:${size}`, 'core-structure', { size, operation: 'index-of' }, quick ? 1_000 : 10_000, (iteration) =>
      sequence.indexOf(ids[(iteration * 8191) % size])));
    for (const depth of quick ? [1, 8] : WORKLOAD_SCHEMA.patchDepths) {
      let patched = sequence;
      for (let patch = 0; patch < depth; patch += 1) {
        patched = applySequencePatch(patched, {
          type: 'splice', index: patched.size, deleteCount: 0, inserted: [`patch-${size}-${depth}-${patch}`],
        }, { maxItems: size + 128 });
      }
      result.push(
        timed(`core:sequence:patch-lookup:${size}:${depth}`, 'core-structure', { size, patchDepth: depth, operation: 'lookup' }, quick ? 500 : 5_000, () => patched.indexOf(ids[size - 1])),
        timed(`core:sequence:materialize:${size}:${depth}`, 'core-structure', { size, patchDepth: depth, operation: 'materialize' }, iterations(size, quick), () => patched.ids.length),
      );
    }
  }
  if (wants(selection, 'core', 'mutation', 'sequence', size)) {
    result.push(
      timed(`core:sequence:splice:${size}`, 'core-structure', { size, operation: 'splice', changed: 1 }, iterations(size, quick), (iteration) =>
        applySequencePatch(sequence, { type: 'splice', index: size >>> 1, deleteCount: 0, inserted: [`inserted-${size}-${iteration}`] }, { maxItems: size + 128 }).size),
      timed(`core:sequence:move:${size}`, 'core-structure', { size, operation: 'move', changed: 32 }, iterations(size, quick), () =>
        applySequencePatch(sequence, { type: 'move', from: size >>> 2, to: (size * 3) >>> 2, count: Math.min(32, size >>> 3) }).size),
    );
  }
  return result;
}

function selectionWorkloads(size, quick) {
  const ids = idsFor(size);
  const sequence = createSequence(ids, { maxItems: size + 128 });
  const selection = unwrap(createSelectionState(sequence, 'multiple', {
    selected: ids.filter((_id, index) => index % 100 === 0), anchor: ids[0],
  }));
  return [timed(`core:selection:toggle:${size}`, 'core-selection', { size, selected: selection.size, operation: 'toggle' }, iterations(size, quick), (iteration) =>
    toggleMultipleSelection(selection, ids[(iteration * 97) % size], sequence).size)];
}

function selectionExpressionWorkloads(size, quick, selection) {
  const ids = idsFor(size);
  const left = createSelectionExpression('explicit', ids.filter((_id, index) => index % 2 === 0));
  const right = createSelectionExpression('explicit', ids.filter((_id, index) => index % 2 === 1));
  const complement = createSelectionExpression('complement', left.exceptions);
  const sequence = createSequence(ids, { maxItems: size + 128 });
  const result = [];
  if (wants(selection, 'core', 'query', 'selection-expression', size)) {
    result.push(
      timed(`core:selection-expression:contains:${size}`, 'core-selection', { size, exceptions: left.exceptionCount, operation: 'contains' }, quick ? 1_000 : 10_000, (iteration) => left.contains(ids[(iteration * 8191) % size]) ? 1 : 0),
      timed(`core:selection-expression:materialize:${size}`, 'core-selection', { size, exceptions: complement.exceptionCount, operation: 'materialize' }, iterations(size, quick), () => materializeSelectionExpression(complement, sequence).length),
    );
  }
  if (wants(selection, 'core', 'mutation', 'selection-expression', size)) {
    result.push(timed(`core:selection-expression:union:${size}`, 'core-selection', { size, exceptions: size, operation: 'union' }, iterations(size, quick), () => unionSelectionExpressions(left, right).exceptionCount));
  }
  return result;
}

function metricIndexWorkloads(size, quick, selection) {
  const ids = idsFor(size);
  const points = Object.freeze(ids.map((id, index) => Object.freeze({ id, coordinates: Object.freeze([index % 997, Math.floor(index / 997)]) })));
  const result = [];
  if (wants(selection, 'core', 'construct', 'metric-index', size)) {
    result.push(
      timed(`core:metric-index:construct:2d:packed:${size}`, 'core-structure', { size, dimensions: 2, operation: 'construct-packed' }, iterations(size, quick), () => createMetricIndex(points, { dimensions: 2, maxItems: size }).size),
      timed(`core:metric-index:construct:2d:indexed:${size}`, 'core-structure', { size, dimensions: 2, operation: 'construct-indexed' }, iterations(size, quick), () => createMetricIndex(points, { dimensions: 2, maxItems: size, expectedQueries: 128 }).size),
    );
  }
  if (wants(selection, 'core', 'query', 'metric-index', size)) {
    const packed = createMetricIndex(points, { dimensions: 2, maxItems: size });
    const indexed = createMetricIndex(points, { dimensions: 2, maxItems: size, expectedQueries: 128 });
    const metric32 = createMetricIndex(ids.map((id, index) => ({
      id,
      coordinates: Array.from({ length: 32 }, (_, dimension) => ((index * (dimension + 3)) % 10_007) / 10_007),
    })), { dimensions: 32, maxItems: size });
    const targets = Object.freeze(Array.from({ length: 10 }, (_, target) => Object.freeze(
      Array.from({ length: 32 }, (_, dimension) => (((target + 1) * (dimension + 5)) % 10_007) / 10_007),
    )));
    result.push(
      timed(`core:metric-index:nearest:2d:indexed:${size}`, 'core-structure', { size, dimensions: 2, operation: 'nearest-indexed' }, iterations(size, quick), (iteration) => indexed.nearest([(iteration * 8191) % 997, iteration % Math.ceil(size / 997)])?.squaredDistance ?? -1),
      timed(`core:metric-index:nearest:2d:packed:${size}`, 'core-structure', { size, dimensions: 2, operation: 'nearest-packed' }, iterations(size, quick), (iteration) => packed.nearest([(iteration * 8191) % 997, iteration % Math.ceil(size / 997)])?.squaredDistance ?? -1),
      timed(`core:metric-index:radius:2d:indexed:${size}`, 'core-structure', { size, dimensions: 2, operation: 'radius-indexed' }, iterations(size, quick), (iteration) => indexed.withinRadius([(iteration * 8191) % 997, iteration % Math.ceil(size / 997)], 2).length),
      timed(`core:metric-index:radius:2d:packed:${size}`, 'core-structure', { size, dimensions: 2, operation: 'radius-packed' }, iterations(size, quick), (iteration) => packed.withinRadius([(iteration * 8191) % 997, iteration % Math.ceil(size / 997)], 2).length),
      timed(`core:metric-index:forward:2d:indexed:${size}`, 'core-structure', { size, dimensions: 2, operation: 'forward-indexed' }, iterations(size, quick), (iteration) => indexed.forwardNearest([(iteration * 8191) % 997, iteration % Math.ceil(size / 997)], [1, 0.25])?.squaredDistance ?? -1),
      timed(`core:metric-index:forward:2d:packed:${size}`, 'core-structure', { size, dimensions: 2, operation: 'forward-packed' }, iterations(size, quick), (iteration) => packed.forwardNearest([(iteration * 8191) % 997, iteration % Math.ceil(size / 997)], [1, 0.25])?.squaredDistance ?? -1),
      timed(`core:metric-index:nearest:32d:${size}`, 'core-structure', { size, dimensions: 32, operation: 'nearest-packed' }, iterations(size, quick), (iteration) => metric32.nearest(targets[iteration % targets.length])?.squaredDistance ?? -1),
    );
  }
  return result;
}

function treeWorkloads(size, quick) {
  const tree = treeFor(size, 'tree', 3);
  return [
    timed(`core:tree:views:${size}`, 'core-structure', { size, operation: 'views' }, quick ? 100 : 1_000, (iteration) => tree.preorder().at((iteration * 8191) % size)?.length ?? 0),
    timed(`core:tree:visible:${size}`, 'core-structure', { size, operation: 'visible' }, iterations(size, quick), () => tree.visible(tree.normalizeExpansion([`tree-${size}-0`])).size),
  ];
}

function textWorkload(size, quick) {
  const text = 'a'.repeat(size);
  return timed(`core:text:replace:${size}`, 'core-editing', { size, operation: 'replace-one' }, iterations(size, quick), () => unwrap(replacePlainText(text, size - 1, size, 'z')).length);
}

function sequenceReorderWorkload(size, quick) {
  const ids = idsFor(size);
  const state = createSequenceReorderState(ids);
  return timed(`core:sequence-reorder:move:${size}`, 'core-editing', { size, operation: 'move-before' }, iterations(size, quick), () =>
    unwrap(applySequenceReorderEvent(state, { type: 'move-before', id: ids[size - 1], targetID: ids[0] })).state.ids.length);
}

function treeReorderWorkload(size, quick) {
  const state = createTreeReorderState(Array.from({ length: size }, (_, index) => ({
    id: `reorder-tree-${size}-${index}`,
    parentID: index === 0 ? null : `reorder-tree-${size}-${Math.floor((index - 1) / 2)}`,
  })));
  return timed(`core:tree-reorder:move:${size}`, 'core-editing', { size, operation: 'move-node' }, iterations(size, quick), () =>
    unwrap(applyTreeReorderEvent(state, { type: 'move-node', id: `reorder-tree-${size}-${size - 1}`, parentID: `reorder-tree-${size}-0`, beforeID: `reorder-tree-${size}-1` })).state.nodes.length);
}

function gridWorkloads(size, quick) {
  const { grid, rowCount, columnCount } = gridFor(size);
  return [
    timed(`core:grid:position:${size}`, 'core-structure', { size, operation: 'position' }, quick ? 1_000 : 10_000, (iteration) => grid.positionOf(`grid-${size}-${(iteration * 8191) % size}`)?.row ?? -1),
    timed(`core:grid:views:${size}`, 'core-structure', { size, operation: 'views' }, quick ? 100 : 1_000, (iteration) => (grid.row(iteration % rowCount)?.size ?? 0) + (grid.column(iteration % columnCount)?.size ?? 0)),
  ];
}

function indexSpanWorkloads(size, quick, selection) {
  const result = [];
  if (wants(selection, 'core', 'construct', 'index-span', size)) {
    const contiguous = Object.freeze(Array.from({ length: size }, (_, index) => Object.freeze({ start: index, endExclusive: index + 1 })));
    result.push(timed(`core:index-span:normalize:${size}`, 'core-structure', { size, operation: 'normalize-contiguous' }, iterations(size, quick), () => createIndexSpanSet(contiguous).spanCount));
  }
  if (wantsAny(selection, 'core', ['query', 'mutation'], 'index-span', size)) {
    const left = createIndexSpanSet(Array.from({ length: size >>> 1 }, (_, index) => ({ start: index * 4, endExclusive: index * 4 + 1 })));
    if (wants(selection, 'core', 'query', 'index-span', size)) {
      result.push(timed(`core:index-span:contains:${size}`, 'core-structure', { size, spans: left.spanCount, operation: 'contains' }, quick ? 1_000 : 10_000, (iteration) => containsIndexInSpanSet(left, (iteration * 8191) % (size * 2)) ? 1 : 0));
    }
    if (wants(selection, 'core', 'mutation', 'index-span', size)) {
      const right = createIndexSpanSet(Array.from({ length: size >>> 1 }, (_, index) => ({ start: index * 4 + 2, endExclusive: index * 4 + 3 })));
      result.push(timed(`core:index-span:union:${size}`, 'core-structure', { size, spans: left.spanCount + right.spanCount, operation: 'union' }, iterations(size, quick), () => unionIndexSpanSets(left, right).spanCount));
    }
  }
  return result;
}

function semanticWorkloads(domain, size, quick) {
  const canonicalIterations = quick ? 100 : 10_000;
  const externalIterations = iterations(size, quick);
  if (domain === 'listbox') {
    const ids = idsFor(size); const sequence = createSequence(ids, { maxItems: size + 128 });
    const state = createListboxState(sequence, { current: ids[0], selected: [ids[0]] }); const external = Object.freeze({ ...state });
    return [
      timed(`core:listbox:next:${size}`, 'core-semantic', { size, operation: 'canonical-transition' }, canonicalIterations, () => unwrap(applyListboxEvent(sequence, state, 'next')).state.selection.size),
      timed(`core:listbox:next:external:${size}`, 'core-semantic', { size, operation: 'external-validation-reference' }, externalIterations, () => unwrap(applyListboxEvent(sequence, external, 'next')).state.selection.size),
    ];
  }
  if (domain === 'tree-view' || domain === 'menu') {
    const tree = treeFor(size, 'tree', 3); const root = `tree-${size}-0`;
    if (domain === 'tree-view') {
      const state = createTreeViewState(tree, { expanded: [root], current: root }); const external = Object.freeze({ ...state });
      return [
        timed(`core:tree-view:next:${size}`, 'core-semantic', { size, operation: 'canonical-transition' }, canonicalIterations, () => unwrap(applyTreeViewEvent(tree, state, 'next')).state.selection.size),
        timed(`core:tree-view:next:external:${size}`, 'core-semantic', { size, operation: 'external-validation-reference' }, externalIterations, () => unwrap(applyTreeViewEvent(tree, external, 'next')).state.selection.size),
      ];
    }
    const state = createMenuState(tree, true, root); const external = Object.freeze({ ...state });
    return [
      timed(`core:menu:next:${size}`, 'core-semantic', { size, operation: 'canonical-transition' }, canonicalIterations, () => unwrap(applyMenuEvent(tree, state, 'next')).state.openPath.length),
      timed(`core:menu:next:external:${size}`, 'core-semantic', { size, operation: 'external-validation-reference' }, externalIterations, () => unwrap(applyMenuEvent(tree, external, 'next')).state.openPath.length),
    ];
  }
  if (domain === 'cascade') {
    const depth = Math.min(size, 1_024);
    const tree = createTree(Array.from({ length: depth }, (_, index) => ({ id: `cascade-${size}-${index}`, parentID: index === 0 ? null : `cascade-${size}-${index - 1}` })));
    const state = createCascadeListState(tree, { value: `cascade-${size}-${depth - 1}` }); const external = Object.freeze({ ...state });
    return [
      timed(`core:cascade:next:${size}`, 'core-semantic', { size, depth, operation: 'canonical-transition' }, canonicalIterations, () => unwrap(applyCascadeListEvent(tree, state, 'next')).state.path.length),
      timed(`core:cascade:next:external:${size}`, 'core-semantic', { size, depth, operation: 'external-validation-reference' }, externalIterations, () => unwrap(applyCascadeListEvent(tree, external, 'next')).state.path.length),
    ];
  }
  const { grid, rowCount } = gridFor(size); const gridID = `grid-${size}-0`;
  if (domain === 'grid-control') {
    const state = createGridState(grid, { current: gridID, selected: [gridID] }); const external = Object.freeze({ ...state });
    return [
      timed(`core:grid-control:right:${size}`, 'core-semantic', { size, operation: 'canonical-transition' }, canonicalIterations, () => unwrap(applyGridEvent(grid, state, 'right')).state.selection.size),
      timed(`core:grid-control:right:external:${size}`, 'core-semantic', { size, operation: 'external-validation-reference' }, externalIterations, () => unwrap(applyGridEvent(ephemeralOwner(grid), external, 'right')).state.selection.size),
    ];
  }
  const rowIDs = Array.from({ length: rowCount }, (_, index) => `tree-grid-row-${size}-${index}`);
  const rowTree = createTree(rowIDs.map((id) => ({ id, parentID: null }))); const model = createTreeGridModel(rowTree, grid, rowIDs);
  const state = createTreeGridState(model, { current: gridID }); const external = Object.freeze({ ...state });
  return [
    timed(`core:tree-grid:right:${size}`, 'core-semantic', { size, operation: 'canonical-transition' }, canonicalIterations, () => unwrap(applyTreeGridEvent(model, state, 'right')).state.selection.size),
    timed(`core:tree-grid:right:external:${size}`, 'core-semantic', { size, operation: 'external-validation-reference' }, externalIterations, () => unwrap(applyTreeGridEvent(model, external, 'right')).state.selection.size),
  ];
}

function runtimeWorkloads(quick, selection) {
  const result = [];
  const reducer = (state, event) => ({ ok: true, value: { state: state + event, commands: [state] } });
  if (wants(selection, 'core', 'transition', 'runtime')) {
    const snapshot = createRevisionSnapshot(0);
    const controller = unwrap(createSemanticController({ initial: { ok: true, value: 0 }, reducer, toEffect: (command) => command }));
    result.push(
      timed('core:revision:apply', 'core-runtime', { operation: 'revision' }, quick ? 1_000 : 10_000, () => applyRevisionedEvent(snapshot, 0, 1, reducer).snapshot.revision),
      timed('core:controller:handle', 'core-runtime', { operation: 'controller' }, quick ? 1_000 : 10_000, () => controller.handle(1).snapshot.revision),
    );
  }
  if (wants(selection, 'core', 'query', 'runtime')) {
    const connection = { getSnapshot: () => ({ state: 1 }), handleEvent: () => true, syncControlledValue: () => ({ ok: true, value: 1 }) };
    const facade = unwrap(createFacadeConnection({}, () => ({ ok: true, value: connection })));
    result.push(timed('core:facade:access', 'core-runtime', { operation: 'facade-proxy' }, quick ? 1_000 : 10_000, () => facade.state + (facade.send(1) ? 1 : 0)));
  }
  return result;
}

function rangeWorkload(quick) {
  const range = createRange({ origin: '0', step: '0.01', count: 10_000_000 });
  return timed('core:range:arithmetic', 'core-structure', { operation: 'value-ratio-map', count: 10_000_000 }, quick ? 1_000 : 10_000, (iteration) => {
    const tick = (iteration * 104_729) % 10_000_001; const ratio = range.ratioOfTick(tick); return ratio === null ? -1 : range.tickFromRatio(ratio) ?? -1;
  });
}

function exactRatioWorkload(quick) {
  const left = createExactRatio((1n << 1_023n) - 1n, (1n << 1_021n) - 1n); const right = createExactRatio((1n << 1_019n) - 1n, (1n << 1_017n) - 1n);
  return timed('core:exact-ratio:add:1024', 'core-structure', { operation: 'reduced-add', bits: 1_024 }, quick ? 100 : 1_000, () => Number(addExactRatios(left, right).numerator & 1n));
}

function geometryBoundsWorkload(size, quick) {
  const rects = Object.freeze(Array.from({ length: size }, (_, index) => Object.freeze({
    x: index % 997,
    y: Math.floor(index / 997),
    width: 10,
    height: 10,
  })));
  return timed(`core:geometry:bounds:${size}`, 'core-structure', { size, operation: 'bounds' }, iterations(size, quick), () =>
    boundsOfRects(rects, { maxRects: size })?.width ?? 0);
}

function geometryIntersectionWorkload(quick) {
  const left = Object.freeze({ x: 10, y: 20, width: 40, height: 30 }); const right = Object.freeze({ x: 30, y: 25, width: 35, height: 45 });
  return timed('core:geometry:intersection', 'core-structure', { operation: 'intersection' }, quick ? 10_000 : 100_000, () => rectanglesIntersect(left, right) ? 1 : 0);
}

function anchoredLayoutWorkload(quick) {
  const input = Object.freeze({ reference: Object.freeze({ x: 972, y: 740, width: 40, height: 30 }), floating: Object.freeze({ width: 180, height: 120 }), boundary: Object.freeze({ x: 0, y: 0, width: 1_024, height: 768 }), side: 'bottom', align: 'center', offset: 8, padding: 12, arrow: Object.freeze({ width: 10, height: 6 }) });
  return timed('core:anchored-layout:solve', 'core-structure', { operation: 'bounded-placement', candidates: 4 }, quick ? 1_000 : 10_000, () => solveAnchoredLayout(input).rect.x);
}

function colorWorkloads(quick) {
  return [
    timed('core:color:convert', 'core-structure', { operation: 'srgb-oklch-roundtrip' }, quick ? 10_000 : 100_000, (iteration) => { const srgb = rgba8ToSrgb({ red: iteration & 255, green: iteration >>> 3 & 255, blue: iteration >>> 7 & 255, alpha: 255 }); const converted = oklchToSrgb(srgbToOklch(srgb)); return converted.ok ? converted.value.red : -1; }),
    timed('core:color:gamut-reduce', 'core-structure', { operation: 'reduce-chroma', iterations: 12 }, quick ? 1_000 : 10_000, () => oklchToSrgb({ lightness: 0.8, chroma: 0.5, hue: 120, alpha: 1 }, 'reduce-chroma').value.green),
  ];
}

function colorTextWorkload(quick) {
  return timed('core:color-text:parse', 'core-editing', { operation: 'parse', codeUnits: 34 }, quick ? 1_000 : 10_000, () => parseColorText('oklch(62.7955% 0.25768 29.2339)').value.red);
}

function idsFor(size) { return Object.freeze(Array.from({ length: size }, (_, index) => `id-${size}-${index}`)); }
function treeFor(size, prefix, divisor) { return createTree(Array.from({ length: size }, (_, index) => ({ id: `${prefix}-${size}-${index}`, parentID: index === 0 ? null : `${prefix}-${size}-${Math.floor((index - 1) / divisor)}` }))); }
function gridFor(size) {
  const columnCount = size === 1_000 ? 40 : size === 10_000 ? 100 : 400; const rowCount = Math.ceil(size / columnCount);
  const rows = Array.from({ length: rowCount }, (_, row) => Array.from({ length: columnCount }, (_, column) => { const index = row * columnCount + column; return index < size ? `grid-${size}-${index}` : null; }));
  return { grid: createGrid(rows), rowCount, columnCount };
}
function ephemeralOwner(owner) { return new Proxy(owner, { get(target, property) { const value = Reflect.get(target, property, target); return typeof value === 'function' ? value.bind(target) : value; } }); }
