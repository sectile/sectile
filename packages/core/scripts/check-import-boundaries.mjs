import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { dirname, relative, resolve, sep } from 'node:path';

const sourceRoot = resolve('src');
const foundationFiles = new Set(['error-code.ts', 'result.ts', 'shared.ts']);
const allowedTargets = Object.freeze({
  foundation: new Set(['foundation']),
  kernel: new Set(['foundation', 'kernel']),
  structures: new Set(['foundation', 'kernel', 'structures']),
  state: new Set(['foundation', 'kernel', 'structures', 'state']),
  editing: new Set(['foundation', 'kernel', 'structures', 'state', 'editing']),
  runtime: new Set(['foundation', 'kernel', 'runtime']),
  composites: new Set(['foundation', 'kernel', 'structures', 'state', 'editing', 'composites']),
  public: new Set(['foundation', 'kernel', 'structures', 'state', 'editing', 'runtime', 'composites', 'public']),
});
const publicReexports = new Set([
  'structures/grid.ts -> internal/composites/grid-control.ts',
]);

const violations = [];
for (const sourcePath of await files(sourceRoot)) {
  const sourceRelative = normalize(relative(sourceRoot, sourcePath));
  if (sourceRelative.startsWith('internal/reference/')) continue;
  const sourceLayer = layerOf(sourceRelative);
  const source = await readFile(sourcePath, 'utf8');
  for (const declaration of declarations(source)) {
    const { kind, specifier } = declaration;
    const targetPath = resolve(dirname(sourcePath), specifier.replace(/\.js$/u, '.ts'));
    const targetRelative = normalize(relative(sourceRoot, targetPath));
    if (targetRelative.startsWith(`..${sep}`) || targetRelative === '..') continue;
    const targetLayer = layerOf(targetRelative);
    const edge = `${sourceRelative} -> ${targetRelative}`;
    const isFacadeReexport = kind === 'export' && publicReexports.has(edge);
    if (!isFacadeReexport && !allowedTargets[sourceLayer].has(targetLayer)) {
      violations.push(`${edge} (${sourceLayer} cannot depend on ${targetLayer})`);
    }
  }
}

assert.deepEqual(violations, [], `Core import boundary violations:\n${violations.join('\n')}`);
console.log('core import boundaries: passed');

function layerOf(path) {
  if (!path.includes('/')) return foundationFiles.has(path) ? 'foundation' : 'public';
  if (path.startsWith('structures/')) return 'structures';
  for (const layer of ['kernel', 'state', 'editing', 'runtime', 'composites']) {
    if (path.startsWith(`internal/${layer}/`)) return layer;
  }
  if (path.startsWith('internal/reference/')) return 'reference';
  throw new TypeError(`Unclassified Core source: ${path}`);
}

async function files(directory) {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) result.push(...await files(path));
    else if (entry.isFile() && entry.name.endsWith('.ts')) result.push(path);
  }
  return result;
}

function normalize(path) {
  return path.split(sep).join('/');
}

function declarations(source) {
  const result = [];
  const pattern = /\b(import|export)\s+(?:type\s+)?(?:[^'";]*?\s+from\s+)?(['"])(\.[^'"]+)\2/gsu;
  for (const match of source.matchAll(pattern)) result.push({ kind: match[1], specifier: match[3] });
  return result;
}
