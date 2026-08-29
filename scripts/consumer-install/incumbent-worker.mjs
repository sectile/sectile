import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { performance } from 'node:perf_hooks';
import { pathToFileURL } from 'node:url';
import { formatColorValue, getColorCoordinates, parseColorValue } from '../../packages/core/dist/color-picker.js';

const requireFromDOM = createRequire(new URL('../../packages/dom/package.json', import.meta.url));
const { arrow, flip, hide, offset, shift, size } = await import(pathToFileURL(requireFromDOM.resolve('@floating-ui/dom')).href);

assert.equal(typeof globalThis.gc, 'function', 'incumbent worker requires --expose-gc');
const sink = { value: 0 };
const reports = {
  colord: measure(20_000, () => {
    const parsed = parseColorValue('hsl(210 75% 42% / 0.8)');
    assert.equal(parsed.ok, true);
    const formatted = formatColorValue(parsed.value, 'cmyk');
    const coordinates = getColorCoordinates(parsed.value, 'hsv');
    sink.value += (formatted.ok ? formatted.value.length : 0) + (coordinates.ok ? coordinates.value.length : 0);
  }),
  '@floating-ui/dom': measure(50_000, () => {
    const middleware = [offset(8), flip({ padding: 8 }), shift({ padding: 8 }), size({ padding: 8 }), arrow({ element: {} }), hide({ padding: 8 })];
    sink.value += middleware.length;
  }),
};
process.stdout.write(`${JSON.stringify({ reports, sink: sink.value })}\n`);

function measure(iterations, operation) {
  for (let index = 0; index < Math.min(iterations, 5_000); index += 1) operation();
  const timings = [];
  const allocations = [];
  const retained = [];
  for (let batch = 0; batch < 5; batch += 1) {
    globalThis.gc();
    const before = process.memoryUsage().heapUsed;
    const startedAt = performance.now();
    let peak = before;
    for (let start = 0; start < iterations; start += 1_000) {
      const end = Math.min(iterations, start + 1_000);
      for (let index = start; index < end; index += 1) operation();
      peak = Math.max(peak, process.memoryUsage().heapUsed);
    }
    timings.push((performance.now() - startedAt) * 1_000_000 / iterations);
    allocations.push(Math.max(0, peak - before));
    globalThis.gc();
    retained.push(Math.max(0, process.memoryUsage().heapUsed - before));
  }
  return Object.freeze({
    iterations,
    medianNanoseconds: median(timings),
    medianAllocationBytes: median(allocations),
    medianRetainedBytes: median(retained),
  });
}

function median(values) {
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.floor(sorted.length / 2)];
}
