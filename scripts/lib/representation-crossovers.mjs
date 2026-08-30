import assert from 'node:assert/strict';

export const REQUIRED_CROSSOVER_DECISIONS = Object.freeze([
  'sequence',
  'selection',
  'grid',
  'tree',
  'text',
  'reorder',
  'exact-ratio',
  'index-span-set',
  'selection-expression',
  'metric-index',
  'geometry',
  'tabular-cache',
  'virtual-spatial',
  'virtual-track',
  'color-value',
  'color-gamut',
]);

export function validateCrossoverDecisions(manifest, baseline) {
  assert.equal(manifest.schemaVersion, 1, 'crossover decision schema drifted');
  assert.equal(manifest.workItem, 'WI-018', 'crossover decision owner drifted');
  assert.equal(baseline.schemaVersion, 1, 'crossover baseline schema drifted');
  assert.equal(baseline.workItem, 'WI-018', 'crossover baseline owner drifted');
  assert.ok(baseline.processCount >= 9, 'crossovers require at least nine isolated processes');
  assert.equal(baseline.fingerprint, manifest.fingerprint, 'decision/baseline fingerprint drifted');
  assert.deepEqual(
    manifest.decisions.map(({ id }) => id).sort(),
    [...REQUIRED_CROSSOVER_DECISIONS].sort(),
    'crossover decision inventory drifted',
  );
  const metrics = new Map(baseline.metrics.map((metric) => [metric.id, metric]));
  assert.equal(metrics.size, baseline.metrics.length, 'duplicate crossover metric');
  for (const decision of manifest.decisions) {
    assert.ok(typeof decision.selected === 'string' && decision.selected.length > 0, `${decision.id}: selected representation missing`);
    assert.ok(Array.isArray(decision.candidates) && decision.candidates.length >= 2, `${decision.id}: at least two candidates required`);
    assert.ok(decision.candidates.includes(decision.selected), `${decision.id}: selected representation is not a candidate`);
    assert.equal(new Set(decision.candidates).size, decision.candidates.length, `${decision.id}: duplicate candidate`);
    assert.ok(typeof decision.rule === 'string' && decision.rule.length >= 16, `${decision.id}: crossover rule missing`);
    assert.ok(typeof decision.rationale === 'string' && decision.rationale.length >= 24, `${decision.id}: rationale missing`);
    assert.ok(Array.isArray(decision.rejected) && decision.rejected.length === decision.candidates.length - 1, `${decision.id}: every alternative must be rejected explicitly`);
    assert.deepEqual(
      new Set(decision.rejected.map(({ candidate }) => candidate)),
      new Set(decision.candidates.filter((candidate) => candidate !== decision.selected)),
      `${decision.id}: rejected alternative coverage drifted`,
    );
    for (const rejected of decision.rejected) {
      assert.ok(typeof rejected.reason === 'string' && rejected.reason.length >= 16, `${decision.id}/${rejected.candidate}: rejection reason missing`);
    }
    assert.ok(Array.isArray(decision.evidence) && decision.evidence.length > 0, `${decision.id}: evidence missing`);
    const observedCandidates = new Set();
    for (const metricID of decision.evidence) {
      const metric = metrics.get(metricID);
      assert.ok(metric !== undefined, `${decision.id}: missing evidence metric ${metricID}`);
      assert.equal(metric.family, decision.id, `${decision.id}: foreign evidence metric ${metricID}`);
      observedCandidates.add(metric.candidate);
      validateMetric(metric);
    }
    for (const candidate of decision.candidates) {
      assert.ok(observedCandidates.has(candidate), `${decision.id}: candidate ${candidate} lacks measured/model evidence`);
    }
  }
  requireMatrix(baseline.metrics);
  const virtual = new Map(manifest.decisions.map((decision) => [decision.id, decision]));
  for (const id of ['virtual-spatial', 'virtual-track']) {
    const decision = virtual.get(id);
    assert.equal(decision.parameters.blockSize, 64, `${id}: block-size drifted`);
    assert.ok(/^repairBound\(/u.test(decision.parameters.repairBound), `${id}: input-derived repair bound missing`);
    assert.ok(/^incremental iff /u.test(decision.rule), `${id}: fallback threshold must be explicit`);
  }
  assert.equal(
    virtual.get('virtual-spatial').parameters.structuralOverlayBound,
    'p<=min(256,ceil(n/64))',
    'virtual-spatial: structural overlay bound drifted',
  );
  return Object.freeze({ decisions: manifest.decisions.length, metrics: baseline.metrics.length });
}

function requireMatrix(metrics) {
  const inputs = (family, candidate) => metrics.filter((metric) => metric.family === family && (candidate === undefined || metric.candidate === candidate)).map((metric) => metric.input);
  assert.deepEqual(new Set(inputs('selection').map(({ density }) => density)), new Set([0.001, 0.01, 0.0625, 0.5]), 'selection density matrix drifted');
  assert.deepEqual(new Set(inputs('grid').map(({ occupancy }) => occupancy)), new Set([0.01, 0.05, 0.5, 1]), 'grid occupancy matrix drifted');
  assert.deepEqual(new Set(inputs('sequence').map(({ depth }) => depth)), new Set([1, 8, 32, 64]), 'Sequence depth matrix drifted');
  assert.deepEqual(new Set(inputs('sequence').map(({ reads }) => reads)), new Set([4, 256]), 'Sequence read-ratio matrix drifted');
  assert.deepEqual(new Set(inputs('tree').map(({ shape }) => shape)), new Set(['balanced', 'chain']), 'Tree shape matrix drifted');
  assert.deepEqual(new Set(inputs('metric-index').map(({ count }) => count)), new Set([256, 4_096]), 'MetricIndex count matrix drifted');
  assert.deepEqual(new Set(inputs('metric-index').map(({ dimensions }) => dimensions)), new Set([2, 16]), 'MetricIndex dimension matrix drifted');
  assert.deepEqual(new Set(inputs('metric-index').map(({ queries }) => queries)), new Set([32, 512]), 'MetricIndex query-mix matrix drifted');
  assert.deepEqual(new Set(inputs('selection-expression').map(({ exceptions }) => exceptions)), new Set([4_096, 50_000]), 'SelectionExpression exception matrix drifted');
  for (const family of ['virtual-spatial', 'virtual-track']) {
    assert.deepEqual(new Set(inputs(family).map(({ changed }) => changed)), new Set([1, 8, 64, 12_500]), `${family} update-density matrix drifted`);
    assert.deepEqual(new Set(inputs(family).map(({ queries }) => queries)), new Set([64]), `${family} query-mix matrix drifted`);
  }
  assert.ok(inputs('tabular-cache').some(({ generations }) => generations === 8), 'Tabular invalidation matrix missing');
}

function validateMetric(metric) {
  assert.ok(typeof metric.id === 'string' && metric.id.length > 0, 'metric id missing');
  assert.ok(typeof metric.candidate === 'string' && metric.candidate.length > 0, `${metric.id}: candidate missing`);
  assert.ok(metric.timing.count >= 9, `${metric.id}: timing process count drifted`);
  for (const key of ['median', 'p95', 'relativeMAD', 'minimum', 'maximum']) {
    assert.ok(Number.isFinite(metric.timing[key]) && metric.timing[key] >= 0, `${metric.id}: invalid timing ${key}`);
  }
  assert.ok(metric.timing.relativeMAD <= 0.1, `${metric.id}: isolated timing dispersion exceeds the 10% validity ceiling`);
  for (const key of ['work', 'allocationUnits', 'retainedBytes', 'heapDeltaBytes', 'sourceBytes']) {
    assert.ok(Number.isFinite(metric[key]) && metric[key] >= 0, `${metric.id}: invalid ${key}`);
  }
  assert.ok(metric.input !== null && typeof metric.input === 'object', `${metric.id}: input missing`);
}

export function renderCrossoverDocumentation(manifest, baseline) {
  const metrics = new Map(baseline.metrics.map((metric) => [metric.id, metric]));
  const lines = [
    '# Representation crossovers',
    '',
    'This generated record freezes WI-018 representation choices before implementation. Timings are medians from nine isolated Node processes; deterministic work, allocation units, retained bytes, observed heap delta, and prototype source bytes are separate evidence dimensions. A selected adaptive representation includes the fallback named in its rule.',
    '',
    '| Family | Selected | Frozen rule | Evidence range |',
    '|---|---|---|---|',
  ];
  for (const decision of manifest.decisions) {
    const evidence = decision.evidence.map((id) => metrics.get(id));
    const timing = evidence.map((metric) => metric.timing.median / 1_000);
    const retained = evidence.map((metric) => metric.retainedBytes);
    lines.push(`| ${decision.id} | \`${decision.selected}\` | ${escapeCell(decision.rule)} | ${format(Math.min(...timing))}–${format(Math.max(...timing))} µs; retained ${formatBytes(Math.min(...retained))}–${formatBytes(Math.max(...retained))} |`);
  }
  lines.push('', '## Rejected alternatives', '');
  for (const decision of manifest.decisions) {
    lines.push(`- **${decision.id}:** ${decision.rejected.map(({ candidate, reason }) => `\`${candidate}\` — ${reason}`).join(' ')}`);
  }
  lines.push('', 'The machine-readable source of truth is `verification/representation-crossovers/decisions.json`; `pnpm check:crossovers` rejects source, decision, evidence, threshold, or documentation drift.', '');
  return lines.join('\n');
}

function escapeCell(value) { return value.replaceAll('|', '\\|'); }
function format(value) { return Number(value.toPrecision(4)).toLocaleString('en-US'); }
function formatBytes(value) { return `${Number((value / 1024).toPrecision(4)).toLocaleString('en-US')} KiB`; }

export function stableCrossoverFingerprint(workerSource, manifestWithoutFingerprint) {
  let hash = 2_166_136_261;
  const source = `${workerSource}\n${JSON.stringify(manifestWithoutFingerprint)}`;
  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619) >>> 0;
  }
  return `fnv1a32:${hash.toString(16).padStart(8, '0')}`;
}
