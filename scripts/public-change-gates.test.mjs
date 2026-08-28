import assert from 'node:assert/strict';
import test from 'node:test';
import { surfaceDifferences, validateEntries, validateReplacement } from './check-breaking-changes.mjs';
import { validateOwnership } from './check-workstream-ownership.mjs';

test('breaking checker rejects empty, missing, duplicate, stale, invalid, and unexplained entries', async () => {
  const differences = surfaceDifferences(
    [{ subpath: './old', files: [{ sha256: 'before' }] }],
    [{ subpath: './old', files: [{ sha256: 'after' }] }],
  );
  assert.throws(() => validateEntries([], differences, '@sectile/core'), /missing breaking entry/u);
  const valid = entry();
  assert.throws(() => validateEntries([{}], differences, '@sectile/core'), /invalid breaking entry id/u);
  assert.throws(() => validateEntries([{ ...valid, symbols: [] }], differences, '@sectile/core'), /affected symbols/u);
  assert.throws(() => validateEntries([{ ...valid, replacement: null, removalReason: '' }], differences, '@sectile/core'), /removal reason/u);
  assert.throws(() => validateEntries([valid, valid], differences, '@sectile/core'), /duplicate breaking entry/u);
  assert.throws(() => validateEntries([{ ...valid, before: { subpath: './stale' } }], differences, '@sectile/core'), /stale breaking entry/u);
  assert.throws(() => validateEntries([{ ...valid, change: 'invalid' }], differences, '@sectile/core'), /invalid change kind/u);
  await assert.rejects(() => validateReplacement({
    ...valid,
    replacement: { package: '@sectile/core', subpath: './missing' },
  }), /replacement subpath does not resolve/u);
});

test('ownership checker rejects concrete same-stage path overlap', () => {
  assert.throws(() => validateOwnership({
    schemaVersion: 1,
    parallelStages: [{ stage: 'fixture', workItems: ['WI-001', 'WI-002'] }],
    workItems: { 'WI-001': ['packages/core/src/'], 'WI-002': ['packages/core/src/grid.ts'] },
  }), /overlap/u);
});

function entry() {
  return {
    id: 'WI-030:core/old',
    change: 'signature-changed',
    before: { subpath: './old' },
    symbols: ['*'],
    replacement: { package: '@sectile/core', subpath: './new' },
    removalReason: null,
  };
}
