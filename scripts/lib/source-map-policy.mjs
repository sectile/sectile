import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, rm, stat } from 'node:fs/promises';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { tmpdir } from 'node:os';
import { publishedPackageDirectories } from './published-packages.mjs';
import { execFileSyncPortable } from '../../tools/tooling/portable-process.mjs';

export const packageNames = publishedPackageDirectories;

export async function inspectSourceMapPackages(root) {
  const packages = [];
  for (const packageName of packageNames) packages.push(await inspectPackage(root, packageName));
  return Object.freeze({ schemaVersion: 1, packages: Object.freeze(packages) });
}

export async function inspectPackage(root, packageName) {
  const packageRoot = resolve(root, 'packages', packageName);
  const paths = (await files(resolve(packageRoot, 'dist'))).sort();
  const contents = new Map();
  for (const path of paths) contents.set(normalize(relative(packageRoot, path)), await readFile(path, 'utf8'));
  const policy = validateSourceMapFiles(contents);
  const bytes = { javascript: 0, declarations: 0, sourceMaps: 0, total: 0 };
  for (const path of paths) {
    const size = (await stat(path)).size;
    bytes.total += size;
    if (path.endsWith('.js')) bytes.javascript += size;
    else if (path.endsWith('.d.ts')) bytes.declarations += size;
    else if (path.endsWith('.map')) bytes.sourceMaps += size;
  }
  const packed = await dryRunPack(packageRoot, paths.map((path) => normalize(relative(packageRoot, path))));
  return Object.freeze({ package: packageName, ...policy, bytes: Object.freeze(bytes), packed });
}

export function validateSourceMapFiles(contents) {
  const paths = [...contents.keys()].sort();
  const javascript = paths.filter((path) => path.endsWith('.js'));
  const declarations = paths.filter((path) => path.endsWith('.d.ts'));
  const maps = paths.filter((path) => path.endsWith('.js.map'));
  const stylesheets = paths.filter(path => path.endsWith('.css') && !path.endsWith('.source.css'));
  const cssMaps = paths.filter(path => path.endsWith('.css.map'));
  const declarationMaps = paths.filter((path) => path.endsWith('.d.ts.map'));
  assert.deepEqual(declarationMaps, [], `declaration maps are forbidden: ${declarationMaps.join(', ')}`);
  const referenced = new Set();
  for (const path of javascript) {
    const source = contents.get(path);
    assert.equal(typeof source, 'string', `${path}: JavaScript content missing`);
    const references = [...source.matchAll(/\/\/[#@]\s*sourceMappingURL=([^\s]+)\s*$/gmu)].map((match) => match[1]);
    assert.equal(references.length, 1, `${path}: exactly one external sourceMappingURL required`);
    const reference = references[0];
    assert.ok(!reference.startsWith('data:'), `${path}: inline source maps are forbidden`);
    const mapPath = normalize(join(dirname(path), reference));
    assert.equal(mapPath, `${path}.map`, `${path}: sourceMappingURL must resolve to its adjacent .js.map`);
    assert.ok(contents.has(mapPath), `${path}: dangling sourceMappingURL ${reference}`);
    referenced.add(mapPath);
  }
  assert.deepEqual([...referenced].sort(), maps, 'every JavaScript map must be referenced exactly once');
  const cssReferenced = [];
  for (const path of stylesheets) {
    const references = [...contents.get(path).matchAll(/\/\*[#@]\s*sourceMappingURL=([^\s*]+)\s*\*\//gu)].map(match => match[1]);
    assert.equal(references.length, 1, `${path}: exactly one external CSS sourceMappingURL required`);
    const mapPath = normalize(join(dirname(path), references[0]));
    assert.equal(mapPath, `${path}.map`, `${path}: CSS map must be adjacent`);
    assert.ok(contents.has(mapPath), `${path}: dangling CSS source map`);
    cssReferenced.push(mapPath);
  }
  assert.deepEqual(cssReferenced.sort(), cssMaps, 'every CSS map must be referenced exactly once');
  for (const path of declarations) {
    const source = contents.get(path);
    assert.ok(!/sourceMappingURL=/u.test(source), `${path}: stale declaration-map reference`);
  }
  for (const path of [...maps, ...cssMaps]) {
    const map = JSON.parse(contents.get(path));
    assert.equal(map.version, 3, `${path}: unsupported source-map version`);
    assert.ok(Array.isArray(map.sources) && map.sources.length > 0, `${path}: source list required`);
    assert.equal(map.sourcesContent, undefined, `${path}: sourcesContent is forbidden`);
    assert.equal(map.file, path.slice(path.lastIndexOf('/') + 1, -4), `${path}: source-map file target drifted`);
    assertPortableSourcePath(path, map.sourceRoot ?? '');
    for (const source of map.sources) assertPortableSourcePath(path, source);
    if (path.endsWith('.css.map')) {
      assert.ok(!map.sourceRoot, `${path}: CSS sourceRoot must be empty`);
      for (const source of map.sources) assert.ok(contents.has(normalize(join(dirname(path), source))), `${path}: CSS source must be shipped: ${source}`);
    }
  }
  return Object.freeze({ javascriptFiles: javascript.length, declarationFiles: declarations.length, sourceMapFiles: maps.length, declarationMapFiles: 0,
    ...(stylesheets.length || cssMaps.length ? { cssFiles: stylesheets.length, cssSourceMapFiles: cssMaps.length } : {}) });
}

function assertPortableSourcePath(mapPath, source) {
  assert.equal(typeof source, 'string', `${mapPath}: source path must be a string`);
  assert.equal(/^\/|^[A-Za-z]:[\\/]|^[a-z][a-z0-9+.-]*:/iu.test(source), false,
    `${mapPath}: private or URL source path is forbidden: ${source}`);
}

export function validateSourceMapReport(current, baseline) {
  assert.equal(current.schemaVersion, baseline.schemaVersion, 'source-map baseline schema drifted');
  const expected = new Map(baseline.packages.map((entry) => [entry.package, entry]));
  assert.equal(expected.size, baseline.packages.length, 'duplicate source-map baseline packages');
  assert.deepEqual(current.packages.map(({ package: name }) => name).sort(), [...expected.keys()].sort(), 'source-map package coverage drifted');
  for (const entry of current.packages) {
    const before = expected.get(entry.package);
    assert.ok(before !== undefined, `${entry.package}: source-map baseline missing`);
    // The root consumer-install gate owns payload and category ceilings.
    assert.equal(entry.declarationMapFiles, 0, `${entry.package}: declaration maps must remain absent`);
  }
}

async function dryRunPack(packageRoot, distPaths) {
  const cache = await mkdtemp(join(tmpdir(), 'sectile-source-map-pack-'));
  try {
    const output = execFileSyncPortable('npm', ['pack', '--dry-run', '--json', '--ignore-scripts', '--cache', cache], {
      cwd: packageRoot,
      encoding: 'utf8',
      env: { ...process.env, NPM_CONFIG_UPDATE_NOTIFIER: 'false' },
      maxBuffer: 16 * 1024 * 1024,
    });
    const report = JSON.parse(output)[0];
    const packedPaths = report.files.map(({ path }) => path).sort();
    for (const path of distPaths.filter((path) => path.endsWith('.js') || path.endsWith('.js.map'))) {
      assert.ok(packedPaths.includes(path), `${packageRoot}: packed artifact missing ${path}`);
    }
    assert.deepEqual(packedPaths.filter((path) => path.endsWith('.d.ts.map')), [], `${packageRoot}: packed declaration maps are forbidden`);
    return Object.freeze({ tarballBytes: report.size, unpackedBytes: report.unpackedSize, files: report.entryCount });
  } finally {
    await rm(cache, { recursive: true, force: true });
  }
}

async function files(directory) {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) result.push(...await files(path));
    else if (entry.isFile()) result.push(path);
  }
  return result;
}

function normalize(path) {
  return path.split(sep).join('/');
}
