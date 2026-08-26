import { performance } from 'node:perf_hooks';
import { reconcileCollectionState } from '../dist/internal/collection.js';

const measurements = [1_000, 10_000, 100_000].map((size) => {
  const items = Array.from({ length: size }, (_, index) => `item-${index}`);
  const selected = items.filter((_item, index) => index % 10 === 0);
  const disabled = items.filter((_item, index) => index % 20 === 1);
  const iterations = Math.max(20, Math.floor(2_000_000 / size));
  let checksum = 0;

  for (let index = 0; index < 5; index += 1) {
    checksum += reconcileCollectionState(items, selected, 'missing', disabled, 'multiple').selected.length;
  }

  const startedAt = performance.now();
  for (let index = 0; index < iterations; index += 1) {
    const result = reconcileCollectionState(items, selected, 'missing', disabled, 'multiple');
    checksum += result.selected.length + (result.current === null ? 0 : 1);
  }
  const elapsed = performance.now() - startedAt;
  return Object.freeze({
    size,
    iterations,
    milliseconds: Number(elapsed.toFixed(3)),
    microsecondsPerOperation: Number(((elapsed * 1_000) / iterations).toFixed(3)),
    checksum,
  });
});

console.log(JSON.stringify({ benchmark: 'vue-collection-reconciliation', measurements }));
