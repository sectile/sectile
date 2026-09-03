import {
  PERFORMANCE_EVIDENCE,
  classifyPerformanceMetric,
  performanceMetricSelected,
  performanceScaleClass,
} from '../schema.mjs';

export function timed(id, family, dimensions, iterationCount, operation) {
  return Object.freeze({
    id,
    family,
    metadata: classifyPerformanceMetric(id, family, dimensions),
    dimensions: Object.freeze(dimensions),
    iterations: iterationCount,
    warmupIterations: Math.max(1, Math.min(iterationCount, 10)),
    operation,
  });
}

export function workloadGroup(create) {
  return Object.freeze(async () => Object.freeze(await create()));
}

export function iterations(size, quick) {
  if (quick) return 1;
  if (size >= 100_000) return 1;
  if (size >= 10_000) return 3;
  return 10;
}

export function selectedSizes(owner, sizes, selection) {
  return sizes.filter((size) => selection.scales.length === 0
    || selection.scales.includes(performanceScaleClass(owner, size)));
}

export function wants(selection, owner, type, domain, size = undefined) {
  return performanceMetricSelected({
    owner,
    type,
    domain,
    scale: performanceScaleClass(owner, size),
    evidence: PERFORMANCE_EVIDENCE,
  }, selection);
}

export function wantsAny(selection, owner, types, domain, size = undefined) {
  return types.some((type) => wants(selection, owner, type, domain, size));
}

export function unwrap(result) {
  if (!result.ok) throw new Error(`${result.error.code}: ${result.error.message}`);
  return result.value;
}
