import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { relative, resolve, sep } from 'node:path';
import { publishedPackageDirectories } from './published-packages.mjs';

export const packageNames = publishedPackageDirectories;
const classifications = new Set(['reuse', 'result-proportional', 'bounded-small', 'migration-required']);

export async function collectAlgorithmReuseInventory(root, manifest) {
  validateManifest(manifest);
  const sourcePaths = [];
  for (const packageName of packageNames) sourcePaths.push(...await files(resolve(root, 'packages', packageName, 'src')));
  const findings = [];
  for (const absolutePath of sourcePaths.sort()) {
    const path = normalize(relative(root, absolutePath));
    const source = await readFile(absolutePath, 'utf8');
    findings.push(...scanSource(path, source, manifest.detectors));
  }
  return classifyFindings(findings, manifest);
}

export function scanSource(path, source, detectors) {
  const findings = [];
  for (const detector of detectors) {
    const expression = new RegExp(detector.pattern, 'gsu');
    for (const match of source.matchAll(expression)) {
      const offset = match.index ?? 0;
      findings.push(Object.freeze({
        detector: detector.id,
        category: detector.category,
        path,
        line: source.slice(0, offset).split('\n').length,
        evidence: oneLine(match[0]),
      }));
    }
  }
  return findings;
}

export function classifyFindings(findings, manifest) {
  validateManifest(manifest);
  const classified = findings.map((finding) => {
    const matches = manifest.rules
      .filter((rule) => matchesRule(finding, rule))
      .map((rule) => ({ rule, score: ruleScore(finding, rule) }))
      .sort((left, right) => right.score - left.score || left.rule.id.localeCompare(right.rule.id));
    assert.ok(matches.length > 0, `${finding.path}:${finding.line}: unclassified ${finding.detector}`);
    assert.ok(matches.length === 1 || matches[0].score > matches[1].score,
      `${finding.path}:${finding.line}: multiply classified ${finding.detector} by ${matches.filter(({ score }) => score === matches[0].score).map(({ rule }) => rule.id).join(', ')}`);
    const rule = matches[0].rule;
    return Object.freeze({ ...finding, rule: rule.id, classification: rule.classification, owner: rule.owner, rationale: rule.rationale });
  });
  return Object.freeze({ schemaVersion: 1, packages: packageNames, findings: Object.freeze(classified.sort(compareFinding)) });
}

export function validateManifest(manifest) {
  assert.equal(manifest.schemaVersion, 1, 'unsupported algorithm-reuse schema');
  assert.equal(new Set(manifest.detectors.map(({ id }) => id)).size, manifest.detectors.length, 'duplicate reuse detector');
  assert.equal(new Set(manifest.rules.map(({ id }) => id)).size, manifest.rules.length, 'duplicate reuse rule');
  const detectorIDs = new Set(manifest.detectors.map(({ id }) => id));
  const owners = new Set(manifest.allowedMigrationOwners);
  for (const detector of manifest.detectors) new RegExp(detector.pattern, 'gsu');
  for (const rule of manifest.rules) {
    assert.ok(classifications.has(rule.classification), `${rule.id}: invalid reuse classification`);
    assert.ok(rule.detectors.length > 0 && rule.detectors.every((id) => id === '*' || detectorIDs.has(id)), `${rule.id}: unknown detector`);
    assert.ok((rule.paths?.length ?? 0) + (rule.prefixes?.length ?? 0) > 0, `${rule.id}: paths or prefixes required`);
    assert.ok(typeof rule.rationale === 'string' && rule.rationale.length > 0, `${rule.id}: rationale required`);
    if (rule.classification === 'migration-required') {
      assert.equal(typeof rule.owner, 'string', `${rule.id}: exactly one migration owner required`);
      assert.ok(owners.has(rule.owner), `${rule.id}: invalid migration owner`);
    } else assert.equal(rule.owner, null, `${rule.id}: non-migration rule cannot own a WI`);
  }
}

export function renderAlgorithmReuseInventory(inventory) {
  const byClassification = countBy(inventory.findings, 'classification');
  const byCategory = countBy(inventory.findings, 'category');
  const migrations = [...new Set(inventory.findings.filter(({ owner }) => owner !== null).map(({ owner }) => owner))].sort();
  const lines = [
    '# Algorithm reuse inventory',
    '',
    `> Generated from \`verification/algorithm-reuse/manifest.json\` and all ${inventory.packages.length} package source trees.`,
    '',
    `Findings: ${inventory.findings.length}; migration owners: ${migrations.join(', ')}.`,
    '',
    '## Classifications',
    '',
    '| Classification | Count |',
    '|---|---:|',
    ...Object.entries(byClassification).map(([key, value]) => `| ${key} | ${value} |`),
    '',
    '## Categories',
    '',
    '| Category | Count |',
    '|---|---:|',
    ...Object.entries(byCategory).map(([key, value]) => `| ${key} | ${value} |`),
    '',
    '## Migration-required findings',
    '',
    '| Owner | Rule | Source | Detector |',
    '|---|---|---|---|',
    ...inventory.findings.filter(({ classification }) => classification === 'migration-required')
      .map((entry) => `| ${entry.owner} | ${entry.rule} | \`${entry.path}:${entry.line}\` | ${entry.detector} |`),
  ];
  return `${lines.join('\n')}\n`;
}

export function validateGeneratedAlgorithmReuse(inventory, storedInventory, storedDocumentation) {
  assert.deepEqual(storedInventory, inventory, 'algorithm-reuse inventory drifted; review and run pnpm update:algorithm-reuse');
  assert.equal(normalizeText(storedDocumentation), renderAlgorithmReuseInventory(inventory), 'algorithm-reuse documentation drifted; run pnpm update:algorithm-reuse');
}

function matchesRule(finding, rule) {
  if (!rule.detectors.includes('*') && !rule.detectors.includes(finding.detector)) return false;
  return (rule.paths ?? []).includes(finding.path) || (rule.prefixes ?? []).some((prefix) => finding.path.startsWith(prefix));
}

function ruleScore(finding, rule) {
  const detector = rule.detectors.includes('*') ? 0 : 1_000_000;
  const exact = (rule.paths ?? []).includes(finding.path) ? 500_000 : 0;
  const prefix = Math.max(0, ...(rule.prefixes ?? []).filter((value) => finding.path.startsWith(value)).map((value) => value.length));
  return detector + exact + prefix;
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

function countBy(values, key) {
  return Object.fromEntries([...values.reduce((counts, value) => counts.set(value[key], (counts.get(value[key]) ?? 0) + 1), new Map())]
    .sort(([left], [right]) => left.localeCompare(right)));
}

function compareFinding(left, right) {
  return left.path.localeCompare(right.path) || left.line - right.line || left.detector.localeCompare(right.detector);
}

function oneLine(value) {
  return value.replace(/\s+/gu, ' ').trim().slice(0, 160);
}

function normalize(path) {
  return path.split(sep).join('/');
}

function normalizeText(value) {
  return value.replaceAll('\r\n', '\n');
}
