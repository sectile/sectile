import { WORKLOAD_SCHEMA } from '../schema.mjs';
import { selectedSizes, timed, unwrap, wants, wantsAny } from './shared.mjs';

export async function createChartWorkloads({ quick, selection }) {
  const workloads = [];
  const sizes = selectedSizes('chart', WORKLOAD_SCHEMA.chartScales, selection);
  for (const size of sizes) {
    if (wantsAny(selection, 'chart', ['construct', 'mutation'], 'model', size)) {
      workloads.push(...await modelWorkloads(size, quick, selection));
    }
    if (wants(selection, 'chart', 'projection', 'projection', size)) {
      workloads.push(...await projectionWorkloads(size, quick));
    }
    if (wants(selection, 'chart', 'query', 'query', size)) {
      workloads.push(...await queryWorkloads(size, quick));
    }
  }
  if (wants(selection, 'chart', 'transition', 'view')) workloads.push(await viewWorkload(quick));
  return workloads;
}

async function modelWorkloads(size, quick, selection) {
  const { applyChartPatch, createChartModel, replaceChartLayer } = await import('../../../packages/chart/dist/model.js');
  const source = chartData(size);
  const result = [];
  if (wants(selection, 'chart', 'construct', 'model', size)) {
    result.push(timed(`chart:model:normalize:${size}`, 'chart-model', { size, operation: 'normalize' }, quick ? 1 : size >= 1_000_000 ? 1 : 3, () =>
      createChartModel({ layers: [{ id: 'series', profile: 'ordered-series', data: source }] }, { maxDatums: size }).diagnostics.rebuiltIndexEntries));
  }
  if (wants(selection, 'chart', 'mutation', 'model', size)) {
    const initial = createChartModel({ layers: [{ id: 'series', profile: 'ordered-series', data: source }] }, { maxDatums: size });
    const dense = source.map((datum) => ({ ...datum, y: datum.y + 1 }));
    result.push(
      timed(`chart:model:patch-layer-sparse:${size}`, 'chart-model', { size, changed: 1, operation: 'patch-layer-sparse' }, quick ? 1 : 7, (iteration) => {
        const index = size >>> 1;
        const next = applyChartPatch(initial, {
          operations: [{ type: 'replace', layerID: 'series', index, data: [{ ...source[index], y: iteration + 1 }] }],
        });
        return next.diagnostics.copiedValueBlocks + next.diagnostics.repairedIndexEntries;
      }),
      timed(`chart:model:replace-layer:${size}`, 'chart-model', { size, operation: 'replace-layer' }, quick ? 1 : 5, () =>
        replaceChartLayer(initial, { id: 'series', profile: 'ordered-series', data: dense }).diagnostics.rebuiltIndexEntries),
    );
  }
  return result;
}

async function projectionWorkloads(size, quick) {
  const [{ createChartController }, { cloneChartProjection }, { createChartDefinition }] = await Promise.all([
    import('../../../packages/chart/dist/controller.js'),
    import('../../../packages/chart/dist/projection.js'),
    import('../../../packages/chart/dist/definition.js'),
  ]);
  const data = chartData(size);
  const definition = definitionInput(data);
  const controller = createChartController({
    definition,
    viewCapabilities: [{ axisID: 'x', initial: { kind: 'continuous', minimum: 0, maximum: Math.floor(size / 2) } }],
    limits: { maxDatums: size },
  });
  const input = projectionInput();
  const projection = unwrap(controller.project(input));
  const semantic = createChartDefinition({
    coordinate: definition.coordinate,
    layers: [{ id: 'scatter', kind: 'scatter', projection: 'density', xAxis: 'x', yAxis: 'y', data }],
  }, { maxDatums: size });
  const { createChartProjection } = await import('../../../packages/chart/dist/projection.js');
  return [
    timed(`chart:projection:cold:${size}`, 'chart-projection', { size, operation: 'cold' }, quick ? 1 : 5, (iteration) => {
      const moved = controller.dispatch({ type: 'pan-axis-view', axisID: 'x', fraction: iteration % 2 === 0 ? 0.01 : -0.01 });
      if (!moved.ok) throw new TypeError(moved.error.message);
      return unwrap(controller.project(input)).diagnostics.representedDatums;
    }),
    timed(`chart:projection:cached:${size}`, 'chart-projection', { size, operation: 'cached' }, quick ? 100 : 100_000, () => unwrap(controller.project(input)).batches.length),
    timed(`chart:projection:clone:${size}`, 'chart-projection', { size, operation: 'clone' }, quick ? 1 : 5, () => {
      const cloned = cloneChartProjection(projection);
      return cloned.batches.length + (cloned.dataBatches?.length ?? 0);
    }),
    timed(`chart:projection:semantic-bounded:${size}`, 'chart-projection', { size, operation: 'semantic-bounded' }, quick ? 1 : 5, () =>
      createChartProjection(semantic, { ...input, maximumRepresentatives: 8_192 }).diagnostics.visitedIndexNodes),
  ];
}

async function queryWorkloads(size, quick) {
  const [{ createChartController }, { prepareChartProjectionQueries, hitTestChartProjection }] = await Promise.all([
    import('../../../packages/chart/dist/controller.js'),
    import('../../../packages/chart/dist/query.js'),
  ]);
  const controller = createChartController({ definition: definitionInput(chartData(size)), limits: { maxDatums: size } });
  const input = projectionInput();
  const projection = unwrap(controller.project(input));
  prepareChartProjectionQueries(projection);
  return [
    timed(`chart:query:hit-test:${size}`, 'chart-query', { size, operation: 'hit-test' }, quick ? 100 : 10_000, (iteration) =>
      hitTestChartProjection(projection, {
        x: (iteration * 104_729) % input.viewport.width,
        y: (iteration * 130_363) % input.viewport.height,
      }).length),
  ];
}

async function viewWorkload(quick) {
  const { createChartAxisViewState, reduceChartViewAction } = await import('../../../packages/chart/dist/view.js');
  const axes = Array.from({ length: 16 }, (_, index) => ({
    id: index,
    orientation: index % 2 === 0 ? 'x' : 'y',
    scale: index % 4 === 0 ? 'logarithmic' : 'linear',
    domain: { kind: 'numeric', minimum: index % 4 === 0 ? 1 : 0, maximum: 1_000 },
    ticks: 0,
  }));
  let state = createChartAxisViewState(axes, axes.map((axis) => ({
    axisID: axis.id,
    initial: { kind: 'continuous', minimum: axis.scale === 'logarithmic' ? 10 : 100, maximum: 900 },
  })));
  return timed('chart:view:transition', 'chart-view', { axes: axes.length, operation: 'zoom-axis-view' }, quick ? 1_000 : 1_000_000, (iteration) => {
    const transition = unwrap(reduceChartViewAction(state, {
      type: 'zoom-axis-view', axisID: iteration & 15, factor: iteration % 2 === 0 ? 1.0001 : 0.9999, anchor: 0.5,
    }));
    state = transition.state;
    return transition.work.axisLookups + transition.work.mathOperations;
  });
}

function chartData(size) {
  return Array.from({ length: size }, (_, id) => ({ id, x: id, y: Math.sin(id / 100) }));
}

function definitionInput(data) {
  return {
    coordinate: { kind: 'cartesian', axes: [
      { id: 'x', orientation: 'x', scale: 'linear' },
      { id: 'y', orientation: 'y', scale: 'linear' },
    ] },
    layers: [{ id: 'series', kind: 'line', xAxis: 'x', yAxis: 'y', data }],
  };
}

function projectionInput() {
  return { viewport: { width: 1_920, height: 1_080, devicePixelRatio: 2 }, maximumRepresentatives: 100_000 };
}
