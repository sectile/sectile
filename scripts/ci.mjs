// Repository-wide CI job boundary. Package operations remain package-owned.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { appendFileSync, globSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { balanceVerificationUnits, validateVerificationReports } from './lib/verification-plan.mjs';
import { spawnSyncPortable } from '../tools/tooling/portable-process.mjs';

const directory = '.tasks/ci';
const planPath = join(directory, 'plan.json');
const sha = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
const [operation, ...args] = process.argv.slice(2);
const run = (command, argv, capture = false) => {
  const result = spawnSyncPortable(command, argv, { encoding: 'utf8', stdio: capture ? ['ignore', 'pipe', 'pipe'] : 'inherit' });
  if (result.error) throw result.error;
  assert.equal(result.status, 0, `${command} ${argv.join(' ')} failed${capture ? `\n${result.stderr}` : ''}`);
  return result.stdout;
};
const write = (path, value) => { mkdirSync(directory, { recursive: true }); writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`); };
const load = () => {
  const plan = JSON.parse(readFileSync(planPath, 'utf8'));
  assert.equal(plan.sha, sha, 'prepared CI artifacts belong to another source SHA');
  return plan;
};

if (operation === 'plan') {
  let selection = args.includes('--full') ? ['--full'] : args.filter(value => value.startsWith('--base='));
  assert.equal(selection.length, 1, 'CI needs --full or an explicit --base=SHA');
  if (selection[0].startsWith('--base=')) {
    const base = selection[0].slice('--base='.length);
    assert.match(base, /^[0-9a-f]{40}$/u, 'CI base must be a full commit SHA');
    const changed = execFileSync('git', ['diff', '--name-only', `${base}...HEAD`], { encoding: 'utf8' }).trim().split('\n');
    if (changed.some(path => ['.github/workflows/testing.yml', 'scripts/ci.mjs', 'scripts/browser-verification.mjs'].includes(path) || path.startsWith('scripts/browser/'))) selection = ['--full'];
  }
  const selected = JSON.parse(run(process.execPath, ['scripts/verify.mjs', ...selection, '--prepared', '--list-units'], true));
  const units = selected.units.filter(unit => unit.id !== 'publication-artifacts' && !unit.id.startsWith('prepare:')).flatMap(unit => {
    if (unit.id !== 'tooling') return [unit];
    return globSync(['scripts/*.test.mjs', 'scripts/virtual-benchmark/*.test.mjs']).sort().map(path => ({
      id: `tooling:${path}`, requires: [], execution: [{ command: process.execPath, args: ['--test', path] }],
    }));
  });
  if (selected.units.some(unit => unit.id === 'package:core')) units.push({ id: 'core:theory', execution: [{ command: 'pnpm', args: ['--filter', '@sectile/core', 'verify:theory'] }] });
  if (selection.includes('--full')) assert.ok(units.length > 0, 'full CI cannot have an empty plan');
  // Initial weights are observed local command medians; CI reports replace them.
  const weights = { 'package:vue': 10.3, 'package:core': 10, 'package:dom': 6.3, 'consumer-install': 15.8,
    'form:packed-consumer': 9.3, 'package-structure': 8.4, 'reproducible-builds': 6.2, documentation: 6.8,
    'core:theory': 15.1, 'tooling:scripts/package-structure.test.mjs': 19.7 };
  if (process.env['SECTILE_CI_TIMINGS']) Object.assign(weights, JSON.parse(readFileSync(process.env['SECTILE_CI_TIMINGS'], 'utf8')));
  const plan = { sha, mode: selected.mode, units, lanes: balanceVerificationUnits(units, 6, weights) };
  write(planPath, plan);
  const matrix = { include: plan.lanes.map(lane => ({ lane: lane.id })) };
  const browser = selection.includes('--full') || units.some(unit => ['package:dom', 'package:vue'].includes(unit.id));
  if (process.env['GITHUB_OUTPUT']) appendFileSync(process.env['GITHUB_OUTPUT'], `matrix=${JSON.stringify(matrix)}\ncount=${units.length}\nbrowser=${browser}\n`);
  console.log(JSON.stringify({ sha, units: units.length, matrix, lanes: plan.lanes }));
} else if (operation === 'prepare') {
  const plan = load();
  if (plan.units.length === 0) process.exit(0);
  run('pnpm', ['-r', '--filter', './packages/*', '--workspace-concurrency=1', 'build']);
  run('pnpm', ['-r', '--filter', './packages/*', '--workspace-concurrency=1', '--if-present', 'build:verification']);
  run(process.execPath, ['scripts/verify.mjs', '--full', '--prepared', '--unit', 'publication-artifacts']);
} else if (operation === 'run') {
  const plan = load(), lane = plan.lanes.find(item => item.id === args[0]);
  assert.ok(lane, 'unknown CI lane');
  const report = { sha, lane: lane.id, results: [] };
  let failed = false;
  for (const id of lane.units) {
    const unit = plan.units.find(item => item.id === id);
    const started = performance.now();
    try {
      for (const entry of unit.execution) run(entry.command === process.execPath || entry.command.endsWith('/node') ? process.execPath : entry.command, entry.args);
      report.results.push({ id, status: 'passed', seconds: (performance.now() - started) / 1000 });
    } catch (error) {
      failed = true;
      report.results.push({ id, status: 'failed', seconds: (performance.now() - started) / 1000 });
      console.error(error);
    }
    write(join(directory, `lane-${lane.id}.json`), report);
  }
  process.exitCode = failed ? 1 : 0;
} else if (operation === 'check') {
  const plan = load();
  const reports = globSync(join(directory, 'lane-*.json')).map(path => JSON.parse(readFileSync(path, 'utf8')));
  validateVerificationReports(plan, reports);
  const timings = Object.fromEntries(reports.flatMap(report => report.results.map(result => [result.id, result.seconds])));
  write(join(directory, 'timings.json'), timings);
  console.log(JSON.stringify({ status: 'passed', sha, verifiedUnits: plan.units.length }));
} else throw new Error('Usage: node scripts/ci.mjs plan|prepare|run <lane>|check');
