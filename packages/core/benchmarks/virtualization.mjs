import { performance } from 'node:perf_hooks';
import { createExtentIndex } from '../dist/structures/extent-index.js';
import { createSequence } from '../dist/structures/sequence.js';
import { applyVirtualLayoutEvent, createVirtualLayoutState } from '../dist/virtual-layout.js';

globalThis.OffscreenCanvas ??= class OffscreenCanvas {
  getContext() {
    return {
      font: '',
      measureText(text) {
        let width = 0;
        for (const character of text) width += character.codePointAt(0) > 0x2fff ? 16 : 8;
        return { width };
      },
    };
  }
};

const { layout, prepare } = await import('@chenglou/pretext');
const exact = (value) => Object.freeze({ kind: 'exact', value });
const estimated = (value) => Object.freeze({ kind: 'estimated', value });
const prepared = Array.from({ length: 32 }, (_, index) =>
  prepare(`Variable row ${index}: fast text layout with content-dependent wrapping.`, '16px system-ui'));

let sink = 0;

function measure(iterations, operation) {
  for (let iteration = 0; iteration < Math.min(iterations, 10_000); iteration += 1) operation(iteration);
  const samples = [];
  for (let sample = 0; sample < 7; sample += 1) {
    const startedAt = performance.now();
    for (let iteration = 0; iteration < iterations; iteration += 1) operation(iteration);
    samples.push(((performance.now() - startedAt) * 1_000) / iterations);
  }
  samples.sort((left, right) => left - right);
  return Number(samples[Math.floor(samples.length / 2)].toFixed(3));
}

const pretextLayoutUs = measure(300_000, (iteration) => {
  sink += layout(prepared[iteration & 31], 240 + (iteration & 15), 20).height;
});

const measurements = {};
for (const size of [100_000, 1_000_000]) {
  const initial = Array(size).fill(estimated(44));
  let index = createExtentIndex(initial);
  const lookupUs = measure(100_000, (iteration) => {
    const item = (iteration * 104_729) % size;
    const offset = index.offsetAt(item);
    sink += offset === null ? 0 : index.indexAtOffset(offset) ?? 0;
  });
  const updates = Array.from({ length: 32 }, (_, item) => ({
    index: Math.floor(((item + 1) * size) / 33),
    extent: exact(36 + (item & 15)),
  }));
  const batchUpdateUs = measure(2_000, (iteration) => {
    index = index.update(updates.map((update) => ({
      index: update.index,
      extent: exact(36 + ((iteration + update.index) & 15)),
    }))).value;
    sink += index.totalExtent;
  });
  const spliceUs = measure(1_000, (iteration) => {
    const start = (iteration * 8191) % (index.size - 8);
    index = index.splice(start, 8, Array(8).fill(estimated(44))).value;
    sink += index.size;
  });
  measurements[size] = { lookupPairUs: lookupUs, batchUpdate32Us: batchUpdateUs, replace8Us: spliceUs };
}

const virtualDomain = createSequence(
  Array.from({ length: 100_000 }, (_, index) => `item-${index}`),
  { maxItems: 100_000 },
);
let viewportState = createVirtualLayoutState(
  virtualDomain,
  createExtentIndex(Array(100_000).fill(estimated(44))),
  { viewportExtent: 800, overscanBefore: 800, overscanAfter: 800 },
);
const viewportUpdateUs = measure(100_000, (iteration) => {
  viewportState = applyVirtualLayoutEvent(viewportState, {
    type: 'viewport-changed', offset: (iteration * 97) % 4_300_000,
  }).value.state;
  sink += viewportState.renderRange.start;
});

let measuredState = createVirtualLayoutState(
  virtualDomain,
  createExtentIndex(Array(100_000).fill(estimated(44))),
  { viewportOffset: 2_200_000, viewportExtent: 800, overscanBefore: 800, overscanAfter: 800 },
);
const combinedUpdates = Array.from({ length: 32 }, (_, item) => ({ index: 50_000 + item, extent: exact(40) }));
const virtualMeasurement32Us = measure(2_000, () => {
  measuredState = applyVirtualLayoutEvent(measuredState, {
    type: 'measurements-reported',
    generation: measuredState.measurementGeneration,
    updates: combinedUpdates,
  }).value.state;
  sink += measuredState.extents.totalExtent;
});
const pretextBatch32Us = measure(20_000, (iteration) => {
  for (let item = 0; item < 32; item += 1) sink += layout(prepared[item], 240 + (iteration & 15), 20).height;
});
const combinedBatch32Us = measure(2_000, (iteration) => {
  for (let item = 0; item < 32; item += 1) sink += layout(prepared[item], 240 + (iteration & 15), 20).height;
  measuredState = applyVirtualLayoutEvent(measuredState, {
    type: 'measurements-reported',
    generation: measuredState.measurementGeneration,
    updates: combinedUpdates,
  }).value.state;
  sink += measuredState.extents.totalExtent;
});

const result = {
  benchmark: 'core-virtualization-vs-pretext',
  units: 'microseconds-per-operation',
  environment: { node: process.version, platform: `${process.platform}-${process.arch}` },
  pretext: { version: '0.0.8', layoutUs: pretextLayoutUs, batch32Us: pretextBatch32Us },
  extentIndex: measurements,
  virtualLayout: { viewportUpdateUs, measurement32Us: virtualMeasurement32Us },
  integration: {
    pretextAndBatchUpdate32Us: combinedBatch32Us,
    addedBookkeepingUs: Number((combinedBatch32Us - pretextBatch32Us).toFixed(3)),
  },
};

if (!Number.isFinite(sink)) throw new Error('Benchmark sink became invalid.');
console.log(JSON.stringify(result));
