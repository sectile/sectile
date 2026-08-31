import { createChartController } from '@sectile/chart/controller';

if (typeof globalThis.gc !== 'function') throw new Error('Chart retention measurement requires --expose-gc.');

const collect = () => {
  globalThis.gc();
  globalThis.gc();
  return process.memoryUsage().heapUsed;
};

const size = Number(process.env['SECTILE_CHART_RETENTION_SIZE'] ?? 100_000);
const before = collect();
let controller = (() => {
  const data = Array.from({ length: size }, (_, id) => ({ id, x: id, y: Math.sin(id / 100) }));
  return createChartController({
    definition: {
      coordinate: { kind: 'cartesian', axes: [
        { id: 'x', orientation: 'x', scale: 'linear' },
        { id: 'y', orientation: 'y', scale: 'linear' },
      ] },
      layers: [{ id: 'series', kind: 'line', xAxis: 'x', yAxis: 'y', data }],
    },
    limits: { maxDatums: size },
  });
})();
const afterModel = collect();
const projection = controller.project({
  viewport: { width: 1_920, height: 1_080, devicePixelRatio: 2 },
  maximumRepresentatives: 8_192,
});
if (!projection.ok) throw new TypeError(projection.error.message);
const retainedProjection = projection.value;
const afterProjection = collect();
for (let iteration = 0; iteration < 100_000; iteration += 1) {
  const cached = controller.project({
    viewport: { width: 1_920, height: 1_080, devicePixelRatio: 2 },
    maximumRepresentatives: 8_192,
  });
  if (!cached.ok || cached.value !== retainedProjection) throw new Error('Cached projection identity changed.');
}
const afterCachedReads = collect();
const diagnostics = controller.getModel().diagnostics;
controller.dispose();
controller = null;
const afterRelease = collect();

process.stdout.write(`${JSON.stringify({
  benchmark: 'chart-retention',
  size,
  retainedModelBytes: Math.max(0, afterModel - before),
  retainedProjectionBytes: Math.max(0, afterProjection - afterModel),
  cachedReadGrowthBytes: Math.max(0, afterCachedReads - afterProjection),
  releasedBytes: Math.max(0, afterCachedReads - afterRelease),
  diagnostics,
})}\n`);
