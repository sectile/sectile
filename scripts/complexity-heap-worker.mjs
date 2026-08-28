import { performance } from 'node:perf_hooks';
import { getHeapStatistics } from 'node:v8';
import { createSequence } from '../packages/core/dist/structures/sequence.js';

const size = Number(process.argv[2]);
if (!Number.isSafeInteger(size) || size < 1) throw new Error('A positive size is required.');
if (typeof globalThis.gc !== 'function') throw new Error('The heap witness requires --expose-gc.');

const ids = Object.freeze(Array.from({ length: size }, (_, index) => `heap-${size}-${index}`));
const sequence = createSequence(ids);
globalThis.gc();
const beforeAuxiliary = getHeapStatistics().used_heap_size;
let sink = 0;
for (let iteration = 0; iteration < 100_000; iteration += 1) {
  sink += sequence.indexOf(ids[iteration % size]) ?? 0;
}
globalThis.gc();
const afterAuxiliary = getHeapStatistics().used_heap_size;

const startedAt = performance.now();
const projected = sequence.project(() => true);
const elapsedMilliseconds = performance.now() - startedAt;
globalThis.gc();
const afterOutput = getHeapStatistics().used_heap_size;
if (!Number.isFinite(sink)) throw new Error('Heap witness sink became invalid.');

process.stdout.write(JSON.stringify({
  size,
  outputEntries: projected.size,
  auxiliaryRetainedDelta: Math.max(0, afterAuxiliary - beforeAuxiliary),
  outputRetainedDelta: Math.max(0, afterOutput - afterAuxiliary),
  elapsedMilliseconds,
  sink,
}));
