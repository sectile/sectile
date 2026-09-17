import assert from 'node:assert/strict';
import { cyclicComponents } from './cycles.mjs';

export function sourceIdentity(path) {
  return path.replace('/dist/', '/src/').replace(/\.js$/u, '.ts');
}
const pairs = (edges) => [...new Set(edges.map((edge) => JSON.stringify(edge)))].sort().map((edge) => JSON.parse(edge));
const signature = (entry) => JSON.stringify([entry.graph, entry.rule, pairs(entry.edges)]);

export function validateStructureManifest(manifest, packages, sourceGraph) {
  assert.equal(manifest.schemaVersion, 1, 'Unsupported package structure schema');
  assert.deepEqual(Object.keys(manifest.packages).sort(), packages.map((entry) => entry.directory).sort(), 'Product package classification mismatch');
  const classes = new Map();
  const actual = new Set(sourceGraph.modules.map((entry) => entry.path));
  for (const entry of packages) {
    const policy = manifest.packages[entry.directory];
    assert.ok(typeof policy.reason === 'string' && policy.reason.length > 10, `${entry.name}: ownership rationale required`);
    assert.ok(['keep', 'regroup', 'extract'].includes(policy.disposition), `${entry.name}: invalid disposition`);
    assert.ok(Array.isArray(policy.dependencies), `${entry.name}: dependency policy required`);
    for (const dependency of policy.dependencies) assert.ok(manifest.packages[dependency], `${entry.name}: unknown dependency policy ${dependency}`);
    for (const [role, definition] of Object.entries(policy.roles)) {
      assert.ok(typeof definition.reason === 'string' && definition.reason.length > 10, `${entry.name}/${role}: role rationale required`);
      assert.ok(Array.isArray(definition.allows), `${entry.name}/${role}: allowed roles required`);
      for (const allowed of definition.allows) assert.ok(Object.hasOwn(policy.roles, allowed), `${entry.name}/${role}: unknown allowed role ${allowed}`);
    }
    for (const [path, classification] of Object.entries(policy.modules)) {
      assert.match(path, /^src\/.+\.ts$/u, `${entry.name}: invalid classified path`);
      const id = `packages/${entry.directory}/${path}`;
      assert.ok(actual.has(id), `Stale module classification: ${id}`);
      assert.ok(Object.hasOwn(policy.roles, classification.role), `${id}: unknown role`);
      assert.ok(['owner', 'facade', 'reference'].includes(classification.kind), `${id}: unknown module kind`);
      classes.set(id, { ...classification, package: entry.directory });
    }
  }
  for (const path of actual) assert.ok(classes.has(path), `Unclassified source module: ${path}`);
  assert.ok(Array.isArray(manifest.exceptions), 'Explicit exception list required');
  const ids = new Set();
  const signatures = new Set();
  for (const exception of manifest.exceptions) {
    assert.ok(typeof exception.id === 'string' && !ids.has(exception.id), 'Duplicate/missing exception ID');
    ids.add(exception.id);
    assert.ok(['source', 'runtime'].includes(exception.graph), `${exception.id}: invalid graph`);
    assert.ok(['direction', 'facade', 'cycle', 'package'].includes(exception.rule), `${exception.id}: invalid rule`);
    assert.ok(manifest.packages[exception.owner], `${exception.id}: owner required`);
    assert.match(exception.workItem, /^WI-\d{3}(?:[A-Z])?$/u, `${exception.id}: remediation WI required`);
    assert.ok(typeof exception.reason === 'string' && exception.reason.length > 10, `${exception.id}: rationale required`);
    assert.ok(Array.isArray(exception.edges) && exception.edges.length > 0, `${exception.id}: exact edge set required`);
    for (const pair of exception.edges) {
      assert.ok(Array.isArray(pair) && pair.length === 2 && pair.every((path) => classes.has(path)), `${exception.id}: unknown exception endpoint`);
    }
    assert.deepEqual(exception.edges, pairs(exception.edges), `${exception.id}: edges must be sorted and unique`);
    const key = signature(exception);
    assert.equal(signatures.has(key), false, `${exception.id}: duplicate exception contract`);
    signatures.add(key);
  }
  return classes;
}

/** Policy is semantic input. No rule or exception is learned from a changed graph. */
export function inspectStructure(graph, manifest, classes) {
  const mode = graph.mode;
  const violations = [];
  const localEdges = [];
  const add = (rule, edges) => violations.push({ graph: mode, rule, edges: pairs(edges) });
  for (const edge of graph.edges) {
    const from = sourceIdentity(edge.source);
    const origin = classes.get(from);
    assert.ok(origin, `Unclassified graph origin: ${edge.source}`);
    if (edge.targetPackage !== null && edge.targetPackage !== `@sectile/${origin.package}`) {
      const dependency = edge.targetPackage.slice('@sectile/'.length);
      if (!manifest.packages[origin.package].dependencies.includes(dependency)) {
        // Metadata dependencies have no source node but remain an explicit error.
        assert.ok(edge.target !== null, `${from}: disallowed metadata dependency ${edge.targetPackage}`);
        add('package', [[from, sourceIdentity(edge.target)]]);
      }
    }
    if (edge.target === null) continue;
    const to = sourceIdentity(edge.target);
    const target = classes.get(to);
    assert.ok(target, `Unclassified graph target: ${edge.target}`);
    localEdges.push({ source: from, target: to });
    if (origin.package !== target.package) continue;
    if (!manifest.packages[origin.package].roles[origin.role].allows.includes(target.role)) add('direction', [[from, to]]);
    if (target.kind === 'facade' && origin.kind !== 'facade') add('facade', [[from, to]]);
  }
  const components = cyclicComponents(graph.modules.map(({ path }) => sourceIdentity(path)), localEdges);
  for (const component of components) {
    const roles = new Set(component.modules.map((path) => `${classes.get(path).package}/${classes.get(path).role}`));
    const facade = component.modules.some((path) => classes.get(path).kind === 'facade');
    // Same-owner type relationships remain visible but are not a blanket prohibition.
    if (mode === 'runtime' || roles.size > 1 || facade) add('cycle', component.edges);
  }
  const unique = [...new Map(violations.map((entry) => [signature(entry), entry])).values()];
  const expected = manifest.exceptions.filter((entry) => entry.graph === mode);
  const bySignature = new Map(expected.map((entry) => [signature(entry), entry]));
  const actual = new Set(unique.map(signature));
  const unexpected = unique.filter((entry) => !bySignature.has(signature(entry)));
  const stale = expected.filter((entry) => !actual.has(signature(entry)));
  return { mode, components, violations: unique, unexpected, stale, debt: expected.filter((entry) => actual.has(signature(entry))) };
}

export function assertStructure(report) {
  assert.deepEqual(report.unexpected, [], `New ${report.mode} ownership/cycle violations:\n${JSON.stringify(report.unexpected, null, 2)}`);
  assert.deepEqual(report.stale, [], `Stale ${report.mode} exceptions must be removed:\n${JSON.stringify(report.stale.map(({ id }) => id))}`);
}
