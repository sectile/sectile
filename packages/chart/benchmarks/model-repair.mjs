import { performance } from 'node:perf_hooks';
import { applyChartPatch, createChartModel, replaceChartLayer } from '@sectile/chart/model';

let sink = 0;

function measure(operation, rounds = 7) {
  const samples = [];
  for (let round = 0; round < rounds; round += 1) {
    const startedAt = performance.now();
    sink += operation(round);
    samples.push(performance.now() - startedAt);
  }
  samples.sort((left, right) => left - right);
  return Number(samples[Math.floor(samples.length / 2)].toFixed(3));
}

const results = {};
for (const size of [10_000, 100_000, 1_000_000]) {
  const source = Array.from({ length: size }, (_, id) => ({ id, x: id, y: Math.sin(id / 100) }));
  const initial = createChartModel({ layers: [{ id: 'series', profile: 'ordered-series', data: source }] }, { maxDatums: size });
  const sparseMs = measure((round) => {
    const index = Math.floor(size / 2);
    const next = applyChartPatch(initial, {
      operations: [{ type: 'replace', layerID: 'series', index, data: [{ ...source[index], y: round + 1 }] }],
    });
    return next.diagnostics.copiedValueBlocks + next.diagnostics.repairedIndexEntries;
  });
  const dense = source.map((datum) => ({ ...datum, y: datum.y + 1 }));
  const rebuildMs = measure(() => {
    const next = replaceChartLayer(initial, { id: 'series', profile: 'ordered-series', data: dense });
    return next.diagnostics.rebuiltIndexEntries;
  }, 5);
  results[size] = { sparseMs, rebuildMs };
}

const heatmapSize = 100_000;
const denseColumns = 1_000;
const denseHeatmap = Array.from({ length: heatmapSize }, (_, id) => ({
  id: `dense-${id}`,
  column: id % denseColumns,
  row: Math.floor(id / denseColumns),
  value: id % 17,
}));
const sparseHeatmap = Array.from({ length: heatmapSize }, (_, id) => ({
  id: `sparse-${id}`,
  column: id * 2,
  row: id * 3,
  value: id % 17,
}));
results.heatmap = {
  denseBuildMs: measure(() => createChartModel({ layers: [{ id: 'heat', profile: 'grid-cell', data: denseHeatmap }] }).diagnostics.rebuiltIndexEntries, 5),
  sparseBuildMs: measure(() => createChartModel({ layers: [{ id: 'heat', profile: 'grid-cell', data: sparseHeatmap }] }).diagnostics.rebuiltIndexEntries, 5),
};

process.stdout.write(`${JSON.stringify({ benchmark: 'chart-model-repair', results, sink })}\n`);
