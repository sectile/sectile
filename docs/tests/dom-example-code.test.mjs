import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const source = await readFile(
  new URL('../.vitepress/theme/dom-demo-code.ts', import.meta.url),
  'utf8',
);

test('DOM examples query their known demo elements directly', () => {
  assert.match(source, /document\.querySelector</u);
  assert.doesNotMatch(source, /const required/u);
  assert.doesNotMatch(source, /Missing element:/u);
  assert.doesNotMatch(source, /required[<(]/u);
});
