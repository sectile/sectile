import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import test from 'node:test';
import {
  COMPLEXITY_SCALES,
  runDeterministicWitness,
  runHostResourceWitness,
} from '../verification/complexity-contracts/witnesses.mjs';

test('deterministic complexity witnesses hold at 1k, 10k, and 100k', () => {
  for (const size of COMPLEXITY_SCALES) {
    const report = runDeterministicWitness(size);
    assert.equal(report.sequence.predicateCalls, size);
    assert.equal(report.sequence.outputEntries, Math.ceil(size / 2));
    assert.equal(report.sequence.eligibleCalls, 64);
    assert.equal(report.sequence.scanned, 64);
    assert.equal(report.selection.contains, 0);
    assert.equal(report.selection.at, 0);
    assert.equal(report.selection.indexOf, 1);
    assert.equal(report.grid.eligibleCalls, report.grid.scanned);
    assert.ok(report.grid.scanned <= 32);
    assert.equal(report.grid.viewsCached, true);
    assert.equal(report.grid.domainEntries, size);
    assert.equal(report.tree.expansionReads, Math.min(size, 64));
    assert.ok(report.tree.visibleEntries <= size);
    assert.equal(report.tree.viewsCached, true);
    assert.equal(report.tree.rootIntervalEntries, size);
    assert.equal(report.text.outputCodeUnits, size);
    assert.ok(Number.isFinite(report.elapsedMilliseconds));
  }
});

test('controller and facade resource witnesses release subscriptions exactly once', () => {
  assert.deepEqual(runHostResourceWitness(), {
    reducerCalls: 1,
    effectCalls: 1,
    facadeNotifications: 2,
    subscriptions: 0,
    disconnects: 1,
  });
});

test('isolated heap witnesses separate retained output from lookup auxiliary space', () => {
  const reports = COMPLEXITY_SCALES.map((size) => JSON.parse(execFileSync(
    process.execPath,
    ['--expose-gc', 'scripts/complexity-heap-worker.mjs', String(size)],
    { encoding: 'utf8' },
  )));
  for (const report of reports) {
    assert.equal(report.outputEntries, report.size);
    assert.ok(report.outputRetainedDelta > 0);
    assert.ok(report.auxiliaryRetainedDelta <= Math.max(1_048_576, report.outputRetainedDelta));
    assert.ok(Number.isFinite(report.elapsedMilliseconds));
  }
  assert.ok(reports[2].outputRetainedDelta > reports[0].outputRetainedDelta * 20);
});
