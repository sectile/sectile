import { performance } from 'node:perf_hooks';
import { createChartDefinition } from '@sectile/chart/definition';
import { createChartProjection } from '@sectile/chart/projection';

let sink = 0;
const axes = [
  { id: 'x', orientation: 'x', scale: 'linear' },
  { id: 'y', orientation: 'y', scale: 'linear' },
];

function median(operation, rounds = 7) {
  const samples = [];
  for (let round = 0; round < rounds; round += 1) {
    const startedAt = performance.now();
    sink += operation();
    samples.push(performance.now() - startedAt);
  }
  samples.sort((left, right) => left - right);
  return Number(samples[Math.floor(samples.length / 2)].toFixed(3));
}

const results = {};
for (const size of [10_000, 100_000, 1_000_000]) {
  const data = Array.from({ length: size }, (_, id) => ({ id, x: id, y: Math.sin(id / 100) }));
  const line = createChartDefinition({
    coordinate: { kind: 'cartesian', axes },
    layers: [{ id: 'line', kind: 'line', xAxis: 'x', yAxis: 'y', data }],
  }, { maxDatums: size });
  const density = createChartDefinition({
    coordinate: { kind: 'cartesian', axes },
    layers: [{ id: 'scatter', kind: 'scatter', projection: 'density', xAxis: 'x', yAxis: 'y', data }],
  }, { maxDatums: size });
  const input = { viewport: { width: 1_920, height: 1_080, devicePixelRatio: 2 }, maximumRepresentatives: 8_192 };
  results[size] = {
    lineMs: median(() => createChartProjection(line, input).diagnostics.visitedIndexNodes, 5),
    densityMs: median(() => createChartProjection(density, input).diagnostics.visitedIndexNodes, 5),
  };
}

process.stdout.write(`${JSON.stringify({ benchmark: 'chart-semantic-projection', results, sink })}\n`);
