import assert from 'node:assert/strict';
import test from 'node:test';
import { validateModuleCoverage, validateSymbolCoverage } from './check-entrypoint-migrations.mjs';

test('entrypoint migration coverage rejects missing modules, symbols, and duplicate ownership', () => {
  assert.throws(() => validateModuleCoverage('fixture', "export * from './a.js';\nexport * from './b.js';", [
    { subpath: './a' },
  ]), /module migration coverage/u);
  assert.throws(() => validateSymbolCoverage('fixture', 'export const A = 1;\nexport interface B {}', [
    { subpath: './next', symbols: ['A'] },
  ]), /symbol migration coverage/u);
  assert.throws(() => validateSymbolCoverage('fixture', 'export const A = 1;', [
    { subpath: './one', symbols: ['A'] },
    { subpath: './two', symbols: ['A'] },
  ]), /mapped more than once/u);
});
