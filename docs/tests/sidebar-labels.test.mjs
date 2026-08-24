import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const config = await readFile(
  new URL('../.vitepress/config.ts', import.meta.url),
  'utf8',
);

test('Korean component sidebar keeps localized groups and official English component names', () => {
  assert.match(config, /text: koFamilyLabels\[family\]/u);
  assert.match(config, /text: title\(component\.id\), link: `\/ko\/components/u);
  assert.doesNotMatch(config, /const koComponentNames/u);
});
