#!/usr/bin/env node
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { basename, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export async function validateEntrypointMigrations(root, manifest, protectedCommit) {
  assert.equal(manifest.schemaVersion, 1, 'entrypoint migration schema drifted');
  assert.equal(manifest.workItem, 'WI-025', 'entrypoint migration owner drifted');
  const removedKeys = new Set();
  for (const removed of manifest.removed) {
    const key = `${removed.package}:${removed.subpath}`;
    assert.ok(!removedKeys.has(key), `${key}: duplicate removed entrypoint`);
    removedKeys.add(key);
    const packageRoot = resolve(root, 'packages', removed.package);
    const packageJSON = JSON.parse(await readFile(resolve(packageRoot, 'package.json'), 'utf8'));
    assert.equal(packageJSON.exports[removed.subpath], undefined, `${key}: compatibility entrypoint remains`);
    const source = execFileSync('git', ['show', `${protectedCommit}:${removed.protectedSource}`], {
      cwd: root,
      encoding: 'utf8',
    });
    const replacements = removed.replacements.map((entry) => typeof entry === 'string' ? { subpath: entry } : entry);
    const replacementKeys = new Set();
    for (const replacement of replacements) {
      assert.ok(!replacementKeys.has(replacement.subpath), `${key}: duplicate replacement ${replacement.subpath}`);
      replacementKeys.add(replacement.subpath);
      const target = packageJSON.exports[replacement.subpath];
      assert.ok(target !== undefined, `${key}: replacement ${replacement.subpath} does not resolve`);
      assert.equal(typeof target.types, 'string', `${key}: replacement types missing`);
      assert.equal(typeof target.import, 'string', `${key}: replacement runtime missing`);
      await readFile(resolve(packageRoot, target.types), 'utf8');
      await import(pathToFileURL(resolve(packageRoot, target.import)).href);
    }
    if (removed.coverage === 'modules') validateModuleCoverage(key, source, replacements);
    else if (removed.coverage === 'symbols') validateSymbolCoverage(key, source, replacements);
    else assert.fail(`${key}: unknown migration coverage`);
  }
  assert.deepEqual(removedKeys, new Set([
    'dom:./temporal',
    'vue:./tabular',
    'vue:./temporal',
    'vue:./virtual',
  ]), 'removed entrypoint inventory drifted');
  await validateVueVirtualRuntimeClosures(resolve(root, 'packages/vue'));
}

async function validateVueVirtualRuntimeClosures(packageRoot) {
  const packageJSON = JSON.parse(await readFile(resolve(packageRoot, 'package.json'), 'utf8'));
  const expected = new Map([
    ['./virtual/core', new Set()],
    ['./virtual/list', new Set(['@sectile/virtual/extent-index', '@sectile/virtual/linear-layout'])],
    ['./virtual/grid', new Set(['@sectile/virtual/extent-index', '@sectile/virtual/track-grid-layout'])],
    ['./virtual/masonry', new Set(['@sectile/virtual/extent-index', '@sectile/virtual/masonry-layout'])],
    ['./virtual/spatial', new Set(['@sectile/virtual/spatial-layout'])],
  ]);
  for (const [subpath, allowed] of expected) {
    const entry = resolve(packageRoot, packageJSON.exports[subpath].import);
    const closure = await collectRuntimeImports(entry);
    const strategies = new Set([...closure].filter((specifier) => specifier.startsWith('@sectile/virtual/')));
    assert.deepEqual(strategies, allowed, `${subpath}: unbundled runtime strategy closure drifted`);
  }
}

async function collectRuntimeImports(entry) {
  const visited = new Set();
  const external = new Set();
  const visit = async (path) => {
    if (visited.has(path)) return;
    visited.add(path);
    const source = await readFile(path, 'utf8');
    const specifiers = [...source.matchAll(/(?:from\s+|import\s*)['"]([^'"]+)['"]/gu)].map((match) => match[1]);
    for (const specifier of specifiers) {
      if (!specifier.startsWith('.')) {
        external.add(specifier);
        continue;
      }
      await visit(resolve(path, '..', specifier));
    }
  };
  await visit(entry);
  return external;
}

export function validateModuleCoverage(key, source, replacements) {
  const modules = new Set([...source.matchAll(/from\s+['"]([^'"]+)['"]/gu)].map((match) => moduleName(match[1])));
  const targets = new Set(replacements.map(({ subpath }) => basename(subpath)));
  assert.deepEqual(targets, modules, `${key}: module migration coverage drifted`);
}

export function validateSymbolCoverage(key, source, replacements) {
  const symbols = new Set([...source.matchAll(/^export\s+(?:interface|type|function|const)\s+([A-Za-z0-9_]+)/gmu)].map((match) => match[1]));
  const mapped = replacements.flatMap(({ symbols: names = [] }) => names);
  assert.equal(new Set(mapped).size, mapped.length, `${key}: symbol mapped more than once`);
  assert.deepEqual(new Set(mapped), symbols, `${key}: symbol migration coverage drifted`);
}

function moduleName(specifier) {
  return basename(specifier).replace(/\.js$/u, '');
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const root = resolve('.');
  const protectedBaseline = JSON.parse(await readFile(resolve(root, 'verification/public-change-baseline.json'), 'utf8'));
  const manifest = JSON.parse(await readFile(resolve(root, 'verification/entrypoint-migrations/WI-025.json'), 'utf8'));
  await validateEntrypointMigrations(root, manifest, protectedBaseline.protectedCommit);
  console.log(JSON.stringify({ status: 'passed', workItem: manifest.workItem, removed: manifest.removed.length }));
}
