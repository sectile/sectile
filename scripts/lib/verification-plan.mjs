/** Longest-first scheduling; stable IDs make identical plans reproducible. */
export function balanceVerificationUnits(units, laneCount, durations = {}) {
  if (!Number.isInteger(laneCount) || laneCount < 1 || laneCount > 6) throw new Error('CI lane count must be between 1 and 6');
  if (new Set(units.map(({ id }) => id)).size !== units.length) throw new Error('duplicate verification unit');
  const weight = (unit) => {
    const value = durations[unit.id];
    return Number.isFinite(value) && value > 0 ? value : 1;
  };
  const lanes = Array.from({ length: Math.min(laneCount, units.length) }, (_, index) => ({ id: String(index + 1), weight: 0, units: [] }));
  for (const unit of [...units].sort((a, b) => weight(b) - weight(a) || a.id.localeCompare(b.id))) {
    const lane = lanes.reduce((best, candidate) => candidate.weight < best.weight ? candidate : best);
    lane.units.push(unit.id);
    lane.weight += weight(unit);
  }
  return lanes;
}

export function validateVerificationReports(plan, reports) {
  const expected = new Set(plan.units.map(({ id }) => id));
  const observed = new Set();
  for (const report of reports) {
    if (report.sha !== plan.sha) throw new Error('verification report belongs to another source SHA');
    for (const result of report.results) {
      if (!expected.has(result.id) || observed.has(result.id)) throw new Error(`unexpected or duplicate verification result: ${result.id}`);
      if (result.status !== 'passed') throw new Error(`verification failed: ${result.id}`);
      observed.add(result.id);
    }
  }
  if (observed.size !== expected.size) throw new Error('verification results are incomplete');
}

export function deriveAffectedSelection(graph, changedFiles, options = {}) {
  const directPackages = new Set();
  const runtimePackages = new Set();
  let includeDocumentation = false;

  for (const path of changedFiles) {
    if (path.startsWith('tools/tooling/')) {
      for (const entry of graph.packages) directPackages.add(entry.name);
      includeDocumentation = true;
    }
    if (path === 'docs' || path.startsWith('docs/')) includeDocumentation = true;
    const entry = packageEntryForPath(graph, path);
    if (entry === null) continue;
    directPackages.add(entry.name);
    if (isRuntimeAffectingPackagePath(entry.directory, path)) runtimePackages.add(entry.name);
  }

  const selectedPackages = new Set(directPackages);
  const reverse = reverseDependencies(graph);
  const pending = [...runtimePackages];
  while (pending.length > 0) {
    const current = pending.pop();
    for (const dependent of reverse.get(current) ?? []) {
      if (selectedPackages.has(dependent)) continue;
      selectedPackages.add(dependent);
      pending.push(dependent);
    }
  }

  return Object.freeze({
    selectedPackages: Object.freeze([...selectedPackages]),
    directPackages: Object.freeze([...directPackages]),
    runtimePackages: Object.freeze([...runtimePackages]),
    includeDocumentation,
    workspaceGates: Object.freeze(deriveAffectedWorkspaceGates(changedFiles, selectedPackages, options)),
  });
}

export function deriveAffectedWorkspaceGates(changedFiles, selectedPackages, options = {}) {
  const gates = new Set();
  const crossoverGovernedSources = new Set(options.crossoverGovernedSources ?? []);
  const sourceChanged = changedFiles.some((path) => /^packages\/[^/]+\/src\//u.test(path));
  const hostSourceChanged = changedFiles.some((path) => /^packages\/(?:dom|vue)\/src\//u.test(path));
  const toolingChanged = changedFiles.some((path) => (
    path === 'package.json'
    || path === 'pnpm-lock.yaml'
    || path.startsWith('scripts/')
    || path.startsWith('tools/')
    || path.startsWith('verification/performance/')
  ));
  // Public declarations and bundles also depend on nested and private source owners.
  const publicSurfaceChanged = sourceChanged || changedFiles.some((path) => (
    /^packages\/[^/]+\/package\.json$/u.test(path)
  ));

  if (toolingChanged) gates.add('tooling');
  if (sourceChanged || changedFiles.some((path) => (
    /^packages\/[^/]+\/(?:package|tsconfig(?:\.[^/]+)?)\.json$/u.test(path)
    || ['package.json', 'pnpm-lock.yaml', 'scripts/check-package-structure.mjs', 'scripts/lib/core-module-dag.mjs'].includes(path)
    || path.startsWith('tools/tooling/')
    || path.startsWith('scripts/lib/module-graph/')
    || path.startsWith('verification/package-structure/')
    || path.startsWith('verification/core-layers/')
  ))) gates.add('package-structure');
  if (changedFiles.some((path) => (
    /^(?:packages|benchmarks|docs|tools)\/.*\.(?:json|[cm]?js|[cm]?ts|tsx|vue)$/u.test(path)
    || path === 'scripts/check-workspace-boundaries.mjs'
  ))) gates.add('workspace-boundaries');
  if (sourceChanged) {
    gates.add('semantic-authority');
    gates.add('algorithm-reuse');
  }
  if (hostSourceChanged || changedFiles.some((path) => path.startsWith('verification/cross-host/'))) {
    gates.add('cross-host');
  }
  if (changedFiles.some((path) => (
    path.startsWith('verification/complexity-contracts/')
    || path === 'docs/performance/complexity.md'
  ))) gates.add('complexity');
  if (changedFiles.some((path) => (
    path.startsWith('verification/representation-crossovers/')
    || path.startsWith('scripts/representation-crossovers')
    || crossoverGovernedSources.has(path)
  ))) gates.add('representation-crossovers');
  if (publicSurfaceChanged) {
    gates.add('entrypoint-migrations');
    gates.add('public-signatures');
    gates.add('consumer-bundles');
  }
  if (selectedPackages.has('@sectile/form')) gates.add('form-scenarios');

  return [...gates];
}

export function collectDependencyClosure(graph, targets, includeDocumentation) {
  const closure = new Set(includeDocumentation ? graph.packages.map(({ name }) => name) : []);
  const visit = (name) => {
    if (closure.has(name)) return;
    closure.add(name);
    const entry = graph.byName.get(name);
    if (entry === undefined) throw new Error(`unknown package ${name}`);
    for (const dependency of entry.dependencies) visit(dependency);
  };
  for (const target of targets) visit(target);
  return closure;
}

function reverseDependencies(graph) {
  const result = new Map(graph.packages.map(({ name }) => [name, []]));
  for (const entry of graph.packages) {
    for (const dependency of entry.dependencies) result.get(dependency)?.push(entry.name);
  }
  return result;
}

function packageEntryForPath(graph, path) {
  const match = /^packages\/([^/]+)\//u.exec(path);
  if (match === null) return null;
  return graph.packages.find(({ directory }) => directory === match[1]) ?? null;
}

function isRuntimeAffectingPackagePath(directory, path) {
  const relative = path.slice(`packages/${directory}/`.length);
  return relative === 'package.json' || relative.startsWith('src/');
}
