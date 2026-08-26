import { performance } from 'node:perf_hooks';
import { createSequence, tryApplySequencePatch } from '@sectile/core/sequence';
import { createExtentIndex } from '@sectile/virtual/extent-index';
import { applyLinearMeasurements, createLinearLayout, queryLinearLayout, queryLinearWindow } from '@sectile/virtual/linear-layout';
import { applyMasonryMeasurements, applyMasonryMutation, createMasonryLayout, queryMasonryLayout } from '@sectile/virtual/masonry-layout';
import { applySpatialMeasurements, applySpatialMutation, createSpatialLayout, querySpatialLayout } from '@sectile/virtual/spatial-layout';
import { applyGridMeasurements, applyTrackGridMutation, createTrackGridLayout, queryTrackGridLayout } from '@sectile/virtual/track-grid-layout';

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

function measureColdMilliseconds(operation) {
  const samples = [];
  for (let sample = 0; sample < 5; sample += 1) {
    const startedAt = performance.now();
    sink += operation(sample);
    samples.push(performance.now() - startedAt);
  }
  samples.sort((left, right) => left - right);
  return Number(samples[2].toFixed(3));
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

const sequencePatch = {};
for (const size of [100_000, 1_000_000]) {
  const sequence = createSequence(Array.from({ length: size }, (_, index) => `sequence-${index}`), { maxItems: size + 1 });
  const spliceMs = measureColdMilliseconds((sample) => tryApplySequencePatch(sequence, {
    type: 'splice',
    index: size >>> 1,
    deleteCount: 1,
    inserted: [`inserted-${sample}`],
  }, { maxItems: size + 1 }).value.size);
  const moveMs = measureColdMilliseconds(() => tryApplySequencePatch(sequence, {
    type: 'move',
    from: size >>> 2,
    to: (size * 3) >>> 2,
    count: 32,
  }, { maxItems: size + 1 }).value.size);
  sequencePatch[size] = { replace1Ms: spliceMs, move32Ms: moveMs };
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
const linearPlanUs = measure(20_000, (iteration) => {
  const plan = queryLinearLayout(viewportState, {
    viewport: { x: 0, y: (iteration * 97) % 4_300_000, width: 320, height: 800 },
    overscan: { top: 800, bottom: 800 },
  });
  sink += plan.placements.length;
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

const strategySize = 100_000;
const gridRows = createExtentIndex(Array(strategySize).fill(estimated(32)));
const gridColumns = createExtentIndex(Array(64).fill(exact(96)));
const gridRegions = Array.from({ length: strategySize }, (_, index) => ({ id: `grid-${index}`, row: index, column: index & 63 }));
const gridState = createTrackGridLayout(gridRows, gridColumns, gridRegions);
const gridQueryUs = measure(20_000, (iteration) => {
  const plan = queryTrackGridLayout(gridState, {
    viewport: { x: ((iteration * 193) % 6_000), y: ((iteration * 997) % 3_100_000), width: 960, height: 800 },
    overscan: 320,
  });
  sink += plan.placements.length;
});
const gridBuildMs = measureColdMilliseconds(() => createTrackGridLayout(gridRows, gridColumns, gridRegions).generation);
let measuredGrid = gridState;
const gridMeasurementVariants = [30, 34].map((value) => Array.from({ length: 32 }, (_, index) => ({ axis: 'row', index: 50_000 + index, extent: exact(value) })));
const gridMeasurement32Us = measure(2_000, (iteration) => {
  measuredGrid = applyGridMeasurements(measuredGrid, { generation: measuredGrid.generation, measurements: gridMeasurementVariants[iteration & 1] }).state;
  sink += measuredGrid.rows.totalExtent;
});
const gridInsertTrackMs = measureColdMilliseconds(() => applyTrackGridMutation(gridState, {
  type: 'splice-tracks', axis: 'row', index: 0, deleteCount: 0, inserted: [exact(28)],
}).state.generation);

const strategyDomain = createSequence(Array.from({ length: strategySize }, (_, index) => `strategy-${index}`), { maxItems: strategySize + 1 });
const strategyExtents = createExtentIndex(Array.from({ length: strategySize }, (_, index) => estimated(24 + (index % 73))));
const masonryState = createMasonryLayout(strategyDomain, strategyExtents, { laneCount: 8, laneExtent: 160, laneGap: 12, itemGap: 12 });
const masonryQueryUs = measure(20_000, (iteration) => {
  const plan = queryMasonryLayout(masonryState, {
    viewport: { x: 0, y: (iteration * 977) % 800_000, width: 1_364, height: 800 },
    overscan: 320,
  });
  sink += plan.placements.length;
});
const masonryBuildMs = measureColdMilliseconds(() => createMasonryLayout(strategyDomain, strategyExtents, { laneCount: 8, laneExtent: 160, laneGap: 12, itemGap: 12 }).generation);
const masonryMeasurement1Ms = measureColdMilliseconds((sample) => applyMasonryMeasurements(masonryState, {
  generation: masonryState.generation,
  measurements: [{ index: sample & 1 ? 1 : strategySize - 2, extent: exact(72 + sample) }],
}).state.generation);
const masonryMeasurements32 = Array.from({ length: 32 }, (_, index) => ({ index: 40_000 + index * 127, extent: exact(48 + (index % 17)) }));
const masonryMeasurement32Ms = measureColdMilliseconds(() => applyMasonryMeasurements(masonryState, {
  generation: masonryState.generation,
  measurements: masonryMeasurements32,
}).state.generation);
const masonryInsertEarlyMs = measureColdMilliseconds((sample) => applyMasonryMutation(masonryState, {
  type: 'items',
  patch: { type: 'splice', index: 1, deleteCount: 0, inserted: [`masonry-early-${sample}`] },
  insertedExtents: [exact(44)],
}).state.generation);
const masonryInsertLateMs = measureColdMilliseconds((sample) => applyMasonryMutation(masonryState, {
  type: 'items',
  patch: { type: 'splice', index: strategySize - 1, deleteCount: 0, inserted: [`masonry-late-${sample}`] },
  insertedExtents: [exact(44)],
}).state.generation);

const spatialItems = Array.from({ length: strategySize }, (_, index) => ({
  id: `spatial-${index}`,
  rect: { x: (index % 1_000) * 24, y: Math.floor(index / 1_000) * 24, width: 28, height: 28 },
  zIndex: index % 7,
}));
const spatialState = createSpatialLayout(spatialItems);
const spatialQueryUs = measure(5_000, (iteration) => {
  const plan = querySpatialLayout(spatialState, {
    viewport: { x: (iteration * 193) % 23_000, y: (iteration * 47) % 2_000, width: 240, height: 240 },
    overscan: 48,
  });
  sink += plan.placements.length;
});
const spatialBuildMs = measureColdMilliseconds(() => createSpatialLayout(spatialItems).generation);
const spatialMeasurement1Ms = measureColdMilliseconds((sample) => applySpatialMeasurements(spatialState, {
  generation: spatialState.generation,
  measurements: [{ id: `spatial-${sample & 1 ? 1 : strategySize - 2}`, rect: { x: 12 + sample, y: 18 + sample, width: 30, height: 30 } }],
}).state.generation);
const spatialConcentrated32 = Array.from({ length: 32 }, (_, index) => ({
  id: `spatial-${index}`,
  rect: { x: 400 + index, y: 500 + index, width: 30, height: 30 },
}));
const spatialDistributed32 = Array.from({ length: 32 }, (_, index) => ({
  id: `spatial-${index * 3_001}`,
  rect: { x: (index * 719) % 20_000, y: (index * 283) % 2_000, width: 30, height: 30 },
}));
const spatialConcentrated32Ms = measureColdMilliseconds(() => applySpatialMeasurements(spatialState, {
  generation: spatialState.generation,
  measurements: spatialConcentrated32,
}).state.generation);
const spatialDistributed32Ms = measureColdMilliseconds(() => applySpatialMeasurements(spatialState, {
  generation: spatialState.generation,
  measurements: spatialDistributed32,
}).state.generation);
const spatialInsertRemoveMs = measureColdMilliseconds((sample) => applySpatialMutation(spatialState, {
  type: 'update',
  remove: [`spatial-${sample}`],
  upsert: [{ id: `spatial-added-${sample}`, rect: { x: 10, y: 20, width: 30, height: 40 } }],
}).state.generation);

const result = {
  benchmark: 'sectile-virtualization-vs-pretext',
  units: 'microseconds-per-operation',
  environment: { node: process.version, platform: `${process.platform}-${process.arch}` },
  pretext: { version: '0.0.8', layoutUs: pretextLayoutUs, batch32Us: pretextBatch32Us },
  extentIndex: measurements,
  sequencePatch,
  linearLayout: {
    viewportUpdateUs,
    materializedPlanUs: linearPlanUs,
    changedMeasurement32Us: virtualMeasurement32Us,
    idempotentMeasurement32Us,
  },
  trackGrid: { items: strategySize, queryUs: gridQueryUs, changedRowMeasurement32Us: gridMeasurement32Us, insertTrackMs: gridInsertTrackMs, buildMs: gridBuildMs },
  masonry: {
    items: strategySize,
    lanes: 8,
    queryUs: masonryQueryUs,
    buildMs: masonryBuildMs,
    changedMeasurement1Ms: masonryMeasurement1Ms,
    changedMeasurement32Ms: masonryMeasurement32Ms,
    insertEarlyMs: masonryInsertEarlyMs,
    insertLateMs: masonryInsertLateMs,
  },
  spatial: {
    items: strategySize,
    queryUs: spatialQueryUs,
    buildMs: spatialBuildMs,
    changedMeasurement1Ms: spatialMeasurement1Ms,
    changedMeasurementConcentrated32Ms: spatialConcentrated32Ms,
    changedMeasurementDistributed32Ms: spatialDistributed32Ms,
    insertRemove1Ms: spatialInsertRemoveMs,
  },
  integration: {
    pretextAndBatchUpdate32Us: combinedBatch32Us,
    addedBookkeepingUs: Number((combinedBatch32Us - pretextBatch32Us).toFixed(3)),
  },
};

if (!Number.isFinite(sink)) throw new Error('Benchmark sink became invalid.');
console.log(JSON.stringify(result));
