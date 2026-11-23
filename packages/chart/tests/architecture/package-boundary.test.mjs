import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('Chart has one renderer-neutral workspace dependency and focused exports', async () => {
  const manifest = JSON.parse(await readFile(new URL('../../package.json', import.meta.url), 'utf8'));
  assert.deepEqual(Object.keys(manifest.dependencies), ['@sectile/core']);
  assert.match(manifest.dependencies['@sectile/core'], /^workspace:\^\d+\.\d+\.\d+$/u);
  assert.equal(manifest.sideEffects, false);
  assert.deepEqual(
    Object.keys(manifest.exports),
  ['.', './model', './result', './scale', './projection', './query', './interaction', './controller', './contract', './layout', './definition', './view', './package.json'],
  );
});
