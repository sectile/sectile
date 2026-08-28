#!/usr/bin/env node
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { collectPublicSignatureSurfaces } from './lib/public-signatures.mjs';

const packages = ['core', 'dom', 'form', 'tabular', 'temporal', 'terminal', 'virtual', 'vue'];
if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const protectedBaseline = await readJSON(resolve('verification/public-change-baseline.json'));
  assert.equal(protectedBaseline.schemaVersion, 1, 'unsupported protected public baseline schema');
  assert.match(protectedBaseline.protectedCommit, /^[0-9a-f]{40}$/u, 'protected commit required');
  execFileSync('git', ['cat-file', '-e', `${protectedBaseline.protectedCommit}^{commit}`], { stdio: 'ignore' });
  assert.ok(Array.isArray(protectedBaseline.acceptedDirtyPaths), 'accepted dirty paths must be explicit');
  let changes = 0;
  const fragments = [];
  for (const packageName of packages) {
    const baseline = await readJSON(resolve('verification/breaking-changes/baseline', `${packageName}.json`));
    const fragment = await readJSON(resolve('verification/breaking-changes/fragments', `${packageName}.json`));
    fragments.push(fragment);
    const current = await collectPublicSignatureSurfaces(resolve('packages', packageName));
    assert.equal(fragment.schemaVersion, 1, `${packageName}: unsupported breaking fragment schema`);
    assert.equal(fragment.package, baseline.package, `${packageName}: breaking fragment package mismatch`);
    assert.equal(protectedBaseline.packages[packageName], baseline.fingerprint, `${packageName}: protected signature fingerprint drifted`);
    const differences = surfaceDifferences(baseline.surfaces, current.surfaces);
    validateEntries(fragment.entries, differences, baseline.package);
    for (const entry of fragment.entries) await validateReplacement(entry);
    changes += differences.length;
  }
  assert.equal(
    await readFile(resolve('docs/engineering/breaking-changes.md'), 'utf8'),
    renderBreakingDocumentation(fragments),
    'breaking-change migration documentation drifted; run pnpm update:breaking-documentation',
  );
  console.log(JSON.stringify({ status: 'passed', packages: packages.length, changes }));
}

export function renderBreakingDocumentation(fragments) {
  const lines = [
    '# Breaking changes',
    '',
    '> Generated from `verification/breaking-changes/fragments/*.json`.',
    '',
  ];
  const entries = fragments.flatMap((fragment) => fragment.entries.map((entry) => ({ package: fragment.package, ...entry })));
  if (entries.length === 0) lines.push('No breaking changes recorded after the protected WI-024 baseline.');
  else {
    lines.push('| Work item | Package | Previous surface | Symbols | Replacement or removal |', '|---|---|---|---|---|');
    for (const entry of entries.sort((left, right) => left.id.localeCompare(right.id))) {
      const replacement = entry.replacement === null
        ? entry.removalReason
        : `${entry.replacement.package}${entry.replacement.subpath === '.' ? '' : entry.replacement.subpath.slice(1)}${entry.replacement.exportName === undefined ? '' : `#${entry.replacement.exportName}`}`;
      lines.push(`| ${entry.id.split(':')[0]} | ${entry.package} | \`${entry.before.subpath}\` | ${entry.symbols.map((symbol) => `\`${symbol}\``).join(', ')} | ${replacement} |`);
    }
  }
  return `${lines.join('\n')}\n`;
}

export function surfaceDifferences(before, after) {
  const current = new Map(after.map((entry) => [entry.subpath, entry]));
  const baseline = new Map(before.map((entry) => [entry.subpath, entry]));
  const differences = [];
  for (const entry of before) {
    const next = current.get(entry.subpath);
    if (next === undefined) differences.push(Object.freeze({ subpath: entry.subpath, change: 'removed' }));
    else if (JSON.stringify(entry) !== JSON.stringify(next)) differences.push(Object.freeze({ subpath: entry.subpath, change: 'signature-changed' }));
  }
  for (const entry of after) {
    if (!baseline.has(entry.subpath)) differences.push(Object.freeze({ subpath: entry.subpath, change: 'added' }));
  }
  return Object.freeze(differences.sort((left, right) => left.subpath.localeCompare(right.subpath)));
}

export function validateEntries(entries, differences, packageName) {
  assert.ok(Array.isArray(entries), `${packageName}: breaking entries required`);
  const relevant = differences.filter(({ change }) => change !== 'added');
  const keys = entries.map(({ before, change }) => `${before?.subpath}:${change}`);
  assert.equal(new Set(keys).size, keys.length, `${packageName}: duplicate breaking entry`);
  for (const entry of entries) {
    assert.match(entry.id, /^WI-[0-9]{3}:[a-z0-9./-]+$/u, `${packageName}: invalid breaking entry id`);
    assert.ok(['removed', 'renamed', 'signature-changed'].includes(entry.change), `${entry.id}: invalid change kind`);
    assert.equal(typeof entry.before?.subpath, 'string', `${entry.id}: before subpath required`);
    assert.ok(Array.isArray(entry.symbols) && entry.symbols.length > 0, `${entry.id}: affected symbols required`);
    assert.ok(entry.symbols.every((symbol) => typeof symbol === 'string' && symbol.length > 0), `${entry.id}: invalid affected symbol`);
    assert.ok(entry.replacement !== null || (typeof entry.removalReason === 'string' && entry.removalReason.length > 0), `${entry.id}: explicit removal reason required`);
    assert.ok(relevant.some((difference) => difference.subpath === entry.before.subpath
      && (difference.change === entry.change || (difference.change === 'removed' && entry.change === 'renamed'))), `${entry.id}: stale breaking entry`);
  }
  for (const difference of relevant) {
    assert.ok(entries.some((entry) => entry.before.subpath === difference.subpath
      && (entry.change === difference.change || (difference.change === 'removed' && entry.change === 'renamed'))), `${packageName}:${difference.subpath}: missing breaking entry`);
  }
}

export async function validateReplacement(entry) {
  if (entry.replacement === null) return;
  assert.equal(typeof entry.replacement.package, 'string', `${entry.id}: replacement package required`);
  assert.equal(typeof entry.replacement.subpath, 'string', `${entry.id}: replacement subpath required`);
  const packageName = entry.replacement.package.replace(/^@sectile\//u, '');
  assert.ok(packages.includes(packageName), `${entry.id}: replacement package is not published`);
  const manifest = await readJSON(resolve('packages', packageName, 'package.json'));
  const target = manifest.exports?.[entry.replacement.subpath];
  assert.ok(target !== undefined, `${entry.id}: replacement subpath does not resolve`);
  if (entry.replacement.exportName !== undefined) {
    const runtimeTarget = typeof target === 'string' ? target : target.import ?? target.default;
    assert.equal(typeof runtimeTarget, 'string', `${entry.id}: replacement has no runtime target`);
    const module = await import(pathToFileURL(resolve('packages', packageName, runtimeTarget)).href);
    assert.ok(Object.hasOwn(module, entry.replacement.exportName), `${entry.id}: replacement export does not resolve`);
  }
}

async function readJSON(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}
