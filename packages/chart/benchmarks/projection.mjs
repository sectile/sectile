import { performance } from 'node:perf_hooks';
import { createChartController } from '@sectile/chart/controller';
import { prepareChartProjectionQueries, hitTestChartProjection } from '@sectile/chart/query';

let sink = 0;

function medianMilliseconds(samples) {
  samples.sort((left, right) => left - right);
  return Number(samples[Math.floor(samples.length / 2)].toFixed(3));
}

function measure(operation, rounds = 7) {
  const samples = [];
  for (let round = 0; round < rounds; round += 1) {
    const startedAt = performance.now();
    sink += operation(round);
    samples.push(performance.now() - startedAt);
  }
  return medianMilliseconds(samples);
}

const results = {};
for (const size of [10_000, 100_000, 1_000_000]) {
  const controller = createChartController({
    definition: {
      coordinate: { kind: 'cartesian', axes: [
        { id: 'x', orientation: 'x', scale: 'linear' },
        { id: 'y', orientation: 'y', scale: 'linear' },
      ] },
      layers: [{
        id: 'series', kind: 'line', xAxis: 'x', yAxis: 'y',
        data: Array.from({ length: size }, (_, id) => ({ id, x: id, y: Math.sin(id / 100) })),
      }],
    },
    viewCapabilities: [{
      axisID: 'x',
      initial: { kind: 'continuous', minimum: 0, maximum: Math.floor(size / 2) },
    }],
    limits: { maxDatums: size },
  });
  const input = { viewport: { width: 1_920, height: 1_080, devicePixelRatio: 2 }, maximumRepresentatives: 100_000 };
  const coldMs = measure((round) => {
    const moved = controller.dispatch({
      type: 'pan-axis-view', axisID: 'x', fraction: round % 2 === 0 ? 0.01 : -0.01,
    });
    if (!moved.ok) throw new TypeError(moved.error.message);
    return controller.project(input).value.diagnostics.representedDatums;
  }, 5);
  const cachedIterations = 100_000;
  const cacheStartedAt = performance.now();
  for (let iteration = 0; iteration < cachedIterations; iteration += 1) {
    sink += controller.project(input).value.batches.length;
  }
  const cachedMicroseconds = Number((((performance.now() - cacheStartedAt) * 1_000) / cachedIterations).toFixed(3));
  const projection = controller.project(input).value;
  const indexStartedAt = performance.now();
  prepareChartProjectionQueries(projection);
  const indexBuildMs = Number((performance.now() - indexStartedAt).toFixed(3));
  const queryIterations = 10_000;
  const queryStartedAt = performance.now();
  for (let iteration = 0; iteration < queryIterations; iteration += 1) {
    sink += hitTestChartProjection(projection, {
      x: (iteration * 104_729) % input.viewport.width,
      y: (iteration * 130_363) % input.viewport.height,
    }).length;
  }
  const hitTestMicroseconds = Number((((performance.now() - queryStartedAt) * 1_000) / queryIterations).toFixed(3));
  results[size] = { coldMs, cachedMicroseconds, indexBuildMs, hitTestMicroseconds };
  controller.dispose();
}

process.stdout.write(`${JSON.stringify({ benchmark: 'chart-projection', results, sink })}\n`);
