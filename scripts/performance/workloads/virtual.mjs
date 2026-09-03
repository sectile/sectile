import { createSequence } from '../../../packages/core/dist/structures/sequence.js';
import { iterations, selectedSizes, timed, wants, wantsAny, workloadGroup } from './shared.mjs';

export function* createVirtualWorkloadGroups({ quick, selection }) {
  const sizes = selectedSizes('virtual', [1_000, 10_000, 100_000], selection);
  for (const size of sizes) {
    if (wantsAny(selection, 'virtual', ['query', 'mutation'], 'linear', size)) {
      yield workloadGroup(() => linearWorkloads(size, quick, selection));
    }
    if (wantsAny(selection, 'virtual', ['construct', 'query', 'mutation'], 'spatial', size)) {
      yield workloadGroup(() => spatialWorkloads(size, quick, selection));
    }
    if (wants(selection, 'virtual', 'mutation', 'partitioned', size)) {
      yield workloadGroup(() => partitionedWorkloads(size, quick));
    }
  }
}

async function linearWorkloads(size, quick, selection) {
  const [{ createExtentIndex }, linearModule] = await Promise.all([
    import('../../../packages/virtual/dist/extent-index.js'),
    import('../../../packages/virtual/dist/linear-layout.js'),
  ]);
  const { applyLinearMeasurements, createLinearLayout, queryLinearLayout } = linearModule;
  const domain = createSequence(Array.from({ length: size }, (_, index) => `virtual-${size}-${index}`));
  const estimated = (value) => Object.freeze({ kind: 'estimated', value });
  const exact = (value) => Object.freeze({ kind: 'exact', value });
  const extents = createExtentIndex(Array(size).fill(estimated(44)));
  const linear = createLinearLayout(domain, extents, { crossExtent: 320 });
  const result = [];
  if (wants(selection, 'virtual', 'query', 'linear', size)) {
    result.push(timed(`virtual:linear:query:${size}`, 'virtual-layout', { size, operation: 'query' }, quick ? 100 : 1_000, (iteration) =>
      queryLinearLayout(linear, {
        viewport: { x: 0, y: (iteration * 97) % Math.max(1, size * 40), width: 320, height: 800 }, overscan: 800,
      }).placements.length));
  }
  if (wants(selection, 'virtual', 'mutation', 'linear', size)) {
    for (const changed of quick ? [1, 32] : [1, 32, size]) {
      const measurements = Object.freeze(Array.from({ length: changed }, (_, index) => Object.freeze({ index, extent: exact(36 + (index & 15)) })));
      result.push(timed(`virtual:linear:measure:${size}:${changed}`, 'virtual-layout', { size, changed, operation: 'measurement' }, iterations(size, quick), () =>
        applyLinearMeasurements(linear, { generation: linear.generation, measurements }).state.generation));
    }
  }
  return result;
}

async function spatialWorkloads(size, quick, selection) {
  const spatialModule = await import('../../../packages/virtual/dist/spatial-layout.js');
  const { applySpatialMeasurements, createSpatialLayout, querySpatialLayout } = spatialModule;
  const items = Object.freeze(Array.from({ length: size }, (_, index) => Object.freeze({
    id: `spatial-${size}-${index}`,
    rect: Object.freeze({ x: (index % 1_000) * 24, y: Math.floor(index / 1_000) * 24, width: 28, height: 28 }),
    zIndex: index % 7,
  })));
  const result = [];
  if (wants(selection, 'virtual', 'construct', 'spatial', size)) {
    result.push(timed(`virtual:spatial:build:${size}`, 'virtual-layout', { size, operation: 'packed-build' }, iterations(size, quick), () =>
      createSpatialLayout(items).generation));
  }
  if (wantsAny(selection, 'virtual', ['query', 'mutation'], 'spatial', size)) {
    const spatial = createSpatialLayout(items);
    if (wants(selection, 'virtual', 'query', 'spatial', size)) {
      result.push(timed(`virtual:spatial:query:${size}`, 'virtual-layout', { size, operation: 'query' }, quick ? 100 : 1_000, (iteration) =>
        querySpatialLayout(spatial, {
          viewport: { x: (iteration * 193) % 23_000, y: (iteration * 47) % Math.max(1, size), width: 240, height: 240 }, overscan: 48,
        }).placements.length));
    }
    if (wants(selection, 'virtual', 'mutation', 'spatial', size)) {
      for (const changed of quick ? [1, 32] : [1, 32, size]) {
        const measurements = Object.freeze(Array.from({ length: changed }, (_, index) => Object.freeze({
          id: `spatial-${size}-${index}`, rect: Object.freeze({ x: index * 3, y: index * 5, width: 30, height: 30 }),
        })));
        result.push(timed(`virtual:spatial:measure:${size}:${changed}`, 'virtual-layout', { size, changed, operation: 'measurement' }, iterations(size, quick), () =>
          applySpatialMeasurements(spatial, { generation: spatial.generation, measurements }).state.generation));
      }
    }
  }
  return result;
}

async function partitionedWorkloads(size, quick) {
  const { applyPartitionedTrackGridMeasurements, createPartitionedTrackGridLayout } = await import('../../../packages/virtual/dist/partitioned-track-grid-layout.js');
  const estimated = (value) => Object.freeze({ kind: 'estimated', value });
  const exact = (value) => Object.freeze({ kind: 'exact', value });
  const rows = Object.freeze(Array.from({ length: size }, (_, index) => Object.freeze({ id: `partitioned-row-${size}-${index}`, partition: 'center', extent: estimated(44) })));
  const columns = Object.freeze(Array.from({ length: 64 }, (_, index) => Object.freeze({ id: `partitioned-column-${size}-${index}`, partition: 'center', extent: exact(96) })));
  const partitioned = createPartitionedTrackGridLayout(rows, columns, []);
  const result = [];
  for (const changed of quick ? [1, 32] : [1, 32, size]) {
    const measurements = Object.freeze(Array.from({ length: changed }, (_, index) => Object.freeze({ axis: 'row', id: `partitioned-row-${size}-${index}`, extent: exact(36 + (index & 15)) })));
    result.push(timed(`virtual:partitioned:measure:${size}:${changed}`, 'virtual-layout', { size, changed, operation: 'measurement' }, iterations(size, quick), () =>
      applyPartitionedTrackGridMeasurements(partitioned, { generation: partitioned.generation, measurements }).state.generation));
  }
  return result;
}
