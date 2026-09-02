export const PERFORMANCE_TYPES = Object.freeze([
  'construct',
  'query',
  'mutation',
  'transition',
  'projection',
  'primitive',
]);

export const PERFORMANCE_EVIDENCE = Object.freeze(['timing', 'allocation', 'retention']);
export const PERFORMANCE_SCALE_CLASSES = Object.freeze(['representative', 'scaling', 'stress']);
export const PERFORMANCE_TIMING_PACKAGES = Object.freeze(['core', 'chart', 'tabular', 'virtual']);

export const WORKLOAD_SCHEMA = Object.freeze({
  version: 19,
  scales: Object.freeze([1_000, 10_000, 100_000]),
  chartScales: Object.freeze([10_000, 100_000, 1_000_000]),
  patchDepths: Object.freeze([1, 8, 32, 64]),
  changedDensities: Object.freeze([1, 32, 'full']),
  families: Object.freeze([
    'runner',
    'core-structure',
    'core-selection',
    'core-semantic',
    'core-runtime',
    'core-editing',
    'chart-model',
    'chart-projection',
    'chart-query',
    'chart-view',
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

const METRIC_RULES = Object.freeze([
  rule(/^core:sequence:construct:/u, 'core', 'construct', 'sequence'),
  rule(/^core:sequence:(?:index-of|patch-lookup|materialize):/u, 'core', 'query', 'sequence'),
  rule(/^core:sequence:(?:splice|move):/u, 'core', 'mutation', 'sequence'),
  rule(/^core:selection:toggle:/u, 'core', 'mutation', 'selection'),
  rule(/^core:selection-expression:(?:contains|materialize):/u, 'core', 'query', 'selection-expression'),
  rule(/^core:selection-expression:union:/u, 'core', 'mutation', 'selection-expression'),
  rule(/^core:metric-index:construct:/u, 'core', 'construct', 'metric-index'),
  rule(/^core:metric-index:(?!construct:)/u, 'core', 'query', 'metric-index'),
  rule(/^core:tree:(?:views|visible):/u, 'core', 'query', 'tree'),
  rule(/^core:text:/u, 'core', 'mutation', 'text'),
  rule(/^core:sequence-reorder:/u, 'core', 'mutation', 'sequence-reorder'),
  rule(/^core:tree-reorder:/u, 'core', 'mutation', 'tree-reorder'),
  rule(/^core:grid:/u, 'core', 'query', 'grid'),
  rule(/^core:index-span:normalize:/u, 'core', 'construct', 'index-span'),
  rule(/^core:index-span:contains:/u, 'core', 'query', 'index-span'),
  rule(/^core:index-span:union:/u, 'core', 'mutation', 'index-span'),
  rule(/^core:listbox:/u, 'core', 'transition', 'listbox'),
  rule(/^core:tree-view:/u, 'core', 'transition', 'tree-view'),
  rule(/^core:menu:/u, 'core', 'transition', 'menu'),
  rule(/^core:cascade:/u, 'core', 'transition', 'cascade'),
  rule(/^core:grid-control:/u, 'core', 'transition', 'grid-control'),
  rule(/^core:tree-grid:/u, 'core', 'transition', 'tree-grid'),
  rule(/^core:(?:revision|controller):/u, 'core', 'transition', 'runtime'),
  rule(/^core:facade:/u, 'core', 'query', 'runtime'),
  rule(/^core:range:/u, 'core', 'primitive', 'range'),
  rule(/^core:exact-ratio:/u, 'core', 'primitive', 'exact-ratio'),
  rule(/^core:geometry:/u, 'core', 'primitive', 'geometry'),
  rule(/^core:anchored-layout:/u, 'core', 'primitive', 'anchored-layout'),
  rule(/^core:color:/u, 'core', 'primitive', 'color'),
  rule(/^core:color-text:/u, 'core', 'primitive', 'color-text'),
  rule(/^tabular:resolve:/u, 'tabular', 'query', 'resolution'),
  rule(/^tabular:grid-profile:/u, 'tabular', 'transition', 'grid-profile'),
  rule(/^virtual:linear:query:/u, 'virtual', 'query', 'linear'),
  rule(/^virtual:linear:measure:/u, 'virtual', 'mutation', 'linear'),
  rule(/^virtual:spatial:build:/u, 'virtual', 'construct', 'spatial'),
  rule(/^virtual:spatial:query:/u, 'virtual', 'query', 'spatial'),
  rule(/^virtual:spatial:measure:/u, 'virtual', 'mutation', 'spatial'),
  rule(/^virtual:partitioned:measure:/u, 'virtual', 'mutation', 'partitioned'),
  rule(/^chart:model:normalize:/u, 'chart', 'construct', 'model'),
  rule(/^chart:model:(?:replace-layer|patch-layer-sparse):/u, 'chart', 'mutation', 'model'),
  rule(/^chart:projection:/u, 'chart', 'projection', 'projection'),
  rule(/^chart:query:/u, 'chart', 'query', 'query'),
  rule(/^chart:view:/u, 'chart', 'transition', 'view'),
]);

export function classifyPerformanceMetric(id, family, dimensions = {}) {
  if (id === 'runner:calibration' || family === 'runner') {
    return Object.freeze({
      owner: 'runner',
      type: 'primitive',
      domain: 'calibration',
      scale: 'representative',
      evidence: PERFORMANCE_EVIDENCE,
    });
  }
  const matching = METRIC_RULES.filter(({ pattern }) => pattern.test(id));
  if (matching.length !== 1) {
    throw new Error(`${id}: expected exactly one performance catalog rule, found ${matching.length}`);
  }
  const selected = matching[0];
  return Object.freeze({
    owner: selected.owner,
    type: selected.type,
    domain: selected.domain,
    scale: performanceScaleClass(selected.owner, dimensions.size),
    evidence: PERFORMANCE_EVIDENCE,
  });
}

export function performanceScaleClass(owner, size) {
  if (!Number.isFinite(size)) return 'representative';
  if (owner === 'chart') {
    if (size >= 1_000_000) return 'stress';
    if (size >= 100_000) return 'scaling';
    return 'representative';
  }
  if (size >= 10_000) return 'scaling';
  return 'representative';
}

export function performancePackageForFamily(family) {
  if (family === 'runner') return null;
  if (family.startsWith('core-')) return 'core';
  if (family.startsWith('chart-')) return 'chart';
  if (family.startsWith('tabular-')) return 'tabular';
  if (family === 'virtual-layout') return 'virtual';
  throw new Error(`unowned performance workload family: ${family}`);
}

export function performanceExecutionMode(mode, quick) {
  return quick && mode !== 'record' ? 'smoke' : mode;
}

export function normalizePerformanceSelection(selection = {}) {
  return Object.freeze({
    owners: normalizeValues(selection.owners, PERFORMANCE_TIMING_PACKAGES, 'owner'),
    types: normalizeValues(selection.types, PERFORMANCE_TYPES, 'type'),
    domains: Object.freeze([...new Set(selection.domains ?? [])].sort()),
    scales: normalizeValues(selection.scales, PERFORMANCE_SCALE_CLASSES, 'scale'),
    evidence: normalizeValues(selection.evidence, PERFORMANCE_EVIDENCE, 'evidence'),
  });
}

export function performanceMetricSelected(metadata, selection) {
  if (metadata.owner === 'runner') return true;
  return selected(selection.owners, metadata.owner)
    && selected(selection.types, metadata.type)
    && selected(selection.domains, metadata.domain)
    && selected(selection.scales, metadata.scale)
    && metadata.evidence.some((entry) => selected(selection.evidence, entry));
}

export function performanceSelectionID(selection) {
  const normalized = normalizePerformanceSelection(selection);
  return [
    segment(normalized.owners, 'all-owners'),
    segment(normalized.types, 'all-types'),
    segment(normalized.domains, 'all-domains'),
    segment(normalized.scales, 'all-scales'),
    segment(normalized.evidence, 'all-evidence'),
  ].join('__');
}

export function performanceSelectionIsFull(selection) {
  const normalized = normalizePerformanceSelection(selection);
  return normalized.owners.length === 0
    && normalized.types.length === 0
    && normalized.domains.length === 0
    && normalized.scales.length === 0
    && normalized.evidence.length === 0;
}

function rule(pattern, owner, type, domain) {
  return Object.freeze({ pattern, owner, type, domain });
}

function normalizeValues(values, allowed, label) {
  const normalized = [...new Set(values ?? [])].sort();
  for (const value of normalized) {
    if (!allowed.includes(value)) throw new Error(`unknown performance ${label} ${value}; expected ${allowed.join(', ')}`);
  }
  return Object.freeze(normalized);
}

function selected(values, value) {
  return values.length === 0 || values.includes(value);
}

function segment(values, fallback) {
  return values.length === 0 ? fallback : values.join('+');
}
