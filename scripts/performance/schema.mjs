export const WORKLOAD_SCHEMA = Object.freeze({
  version: 18,
  scales: Object.freeze([1_000, 10_000, 100_000]),
  patchDepths: Object.freeze([1, 8, 32, 64]),
  changedDensities: Object.freeze([1, 32, 'full']),
  families: Object.freeze([
    'runner',
    'core-structure',
    'core-selection',
    'core-semantic',
    'core-runtime',
    'core-editing',
    'tabular-resolution',
    'tabular-profile',
    'virtual-layout',
  ]),
  browserQualifiedRegistrations: Object.freeze([
    Object.freeze({
      id: 'vue:mounted-virtual-projection',
      runtime: 'browser',
      metrics: Object.freeze(['render-count', 'effect-count', 'measurement-count', 'resource-count']),
      portableTimingBudget: false,
    }),
  ]),
});

export const PERFORMANCE_TIMING_PACKAGES = Object.freeze(['core', 'tabular', 'virtual']);

export function performancePackageForFamily(family) {
  if (family === 'runner') return null;
  if (family.startsWith('core-')) return 'core';
  if (family.startsWith('tabular-')) return 'tabular';
  if (family === 'virtual-layout') return 'virtual';
  throw new Error(`unowned performance workload family: ${family}`);
}
