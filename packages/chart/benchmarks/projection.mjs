import { performance } from 'node:perf_hooks';
import { createChartController } from '@sectile/chart/controller';

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
    model: { layers: [{
      id: 'series',
      profile: 'ordered-series',
      data: Array.from({ length: size }, (_, id) => ({ id, x: id, y: Math.sin(id / 100) })),
    }] },
    limits: { maxDatums: size },
  });
  const input = { viewport: { width: 1_920, height: 1_080, devicePixelRatio: 2 }, maximumRepresentatives: 100_000 };
  const coldMs = measure(() => {
    controller.dispatch({ type: 'pan', x: 0.125, y: 0 });
    return controller.project(input).value.diagnostics.representedDatums;
  }, 5);
  const cachedIterations = 100_000;
  const cacheStartedAt = performance.now();
  for (let iteration = 0; iteration < cachedIterations; iteration += 1) {
    sink += controller.project(input).value.batches.length;
  }
  const cachedMicroseconds = Number((((performance.now() - cacheStartedAt) * 1_000) / cachedIterations).toFixed(3));
  results[size] = { coldMs, cachedMicroseconds };
  controller.dispose();
}

process.stdout.write(`${JSON.stringify({ benchmark: 'chart-projection', results, sink })}\n`);
