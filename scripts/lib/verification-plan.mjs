export function deriveAffectedSelection(graph, changedFiles) {
  const directPackages = new Set();
  const runtimePackages = new Set();
  let includeDocumentation = false;

  for (const path of changedFiles) {
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
    workspaceGates: Object.freeze(deriveAffectedWorkspaceGates(changedFiles, selectedPackages)),
  });
}

export function deriveAffectedWorkspaceGates(changedFiles, selectedPackages) {
  const gates = new Set();
  const sourceChanged = changedFiles.some((path) => /^packages\/[^/]+\/src\//u.test(path));
  const hostSourceChanged = changedFiles.some((path) => /^packages\/(?:dom|vue)\/src\//u.test(path));
  const toolingChanged = changedFiles.some((path) => (
    path === 'package.json'
    || path === 'pnpm-lock.yaml'
    || path.startsWith('scripts/')
    || path.startsWith('verification/performance/')
  ));
  const publicSurfaceChanged = changedFiles.some((path) => (
    /^packages\/[^/]+\/package\.json$/u.test(path)
    || /^packages\/[^/]+\/src\/(?!internal\/)[^/]+\.ts$/u.test(path)
  ));

  if (toolingChanged) gates.add('tooling');
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
  ))) gates.add('representation-crossovers');
  if (publicSurfaceChanged) {
    gates.add('entrypoint-migrations');
    gates.add('public-signatures');
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
