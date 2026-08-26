import { performance } from 'node:perf_hooks';
import { createSequence } from '@sectile/core/sequence';
import { createExtentIndex } from '@sectile/virtual/extent-index';
import { applyLinearMeasurements, createLinearLayout, queryLinearWindow } from '@sectile/virtual/linear-layout';

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
  const updateVariants = Array.from({ length: 16 }, (_, variant) => updates.map((update) => ({
    index: update.index,
    extent: exact(36 + ((variant + update.index) & 15)),
  })));
  const batchUpdateUs = measure(2_000, (iteration) => {
    index = index.update(updateVariants[iteration & 15]).value;
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
const viewportState = createLinearLayout(
  virtualDomain,
  createExtentIndex(Array(100_000).fill(estimated(44))),
  { crossExtent: 320 },
);
const viewportUpdateUs = measure(100_000, (iteration) => {
  const window = queryLinearWindow(viewportState, {
    viewport: { x: 0, y: (iteration * 97) % 4_300_000, width: 320, height: 800 },
    overscan: { top: 800, bottom: 800 },
  });
  sink += window.renderStart;
});

let measuredState = createLinearLayout(
  virtualDomain,
  createExtentIndex(Array(100_000).fill(estimated(44))),
  { crossExtent: 320 },
);
const measurementVariants = [40, 41].map((value) => (
  Array.from({ length: 32 }, (_, item) => ({ index: 50_000 + item, extent: exact(value) }))
));
const virtualMeasurement32Us = measure(2_000, (iteration) => {
  measuredState = applyLinearMeasurements(measuredState, {
    generation: measuredState.generation,
    measurements: measurementVariants[iteration & 1],
  }).state;
  sink += measuredState.extents.totalExtent;
});
let idempotentState = applyLinearMeasurements(createLinearLayout(
  virtualDomain,
  createExtentIndex(Array(100_000).fill(estimated(44))),
  { crossExtent: 320 },
), { generation: 0, measurements: measurementVariants[0] }).state;
const idempotentMeasurement32Us = measure(20_000, () => {
  idempotentState = applyLinearMeasurements(idempotentState, {
    generation: idempotentState.generation,
    measurements: measurementVariants[0],
  }).state;
  sink += idempotentState.extents.totalExtent;
});
const pretextBatch32Us = measure(20_000, (iteration) => {
  for (let item = 0; item < 32; item += 1) sink += layout(prepared[item], 240 + (iteration & 15), 20).height;
});
const combinedBatch32Us = measure(2_000, (iteration) => {
  for (let item = 0; item < 32; item += 1) sink += layout(prepared[item], 240 + (iteration & 15), 20).height;
  measuredState = applyLinearMeasurements(measuredState, {
    generation: measuredState.generation,
    measurements: measurementVariants[iteration & 1],
  }).state;
  sink += measuredState.extents.totalExtent;
});

const result = {
  benchmark: 'sectile-virtualization-vs-pretext',
  units: 'microseconds-per-operation',
  environment: { node: process.version, platform: `${process.platform}-${process.arch}` },
  pretext: { version: '0.0.8', layoutUs: pretextLayoutUs, batch32Us: pretextBatch32Us },
  extentIndex: measurements,
  linearLayout: {
    viewportUpdateUs,
    changedMeasurement32Us: virtualMeasurement32Us,
    idempotentMeasurement32Us,
  },
  integration: {
    pretextAndBatchUpdate32Us: combinedBatch32Us,
    addedBookkeepingUs: Number((combinedBatch32Us - pretextBatch32Us).toFixed(3)),
  },
};

if (!Number.isFinite(sink)) throw new Error('Benchmark sink became invalid.');
console.log(JSON.stringify(result));
