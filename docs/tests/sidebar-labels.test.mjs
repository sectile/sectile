import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const config = await readFile(
  new URL('../.vitepress/config.ts', import.meta.url),
  'utf8',
);

test('component sidebars use balanced task groups and official English component names', () => {
  assert.match(config, /text: 'Input & Editing'/u);
  assert.match(config, /text: 'Navigation & Disclosure'/u);
  assert.match(config, /koText: '입력과 편집'/u);
  assert.match(config, /koText: '이동과 펼침'/u);
  assert.match(config, /text: title\(id\)/u);
  assert.match(config, /const linkPrefix = locale === 'ko' \? '\/ko\/components' : '\/components'/u);
  assert.doesNotMatch(config, /const koComponentNames/u);
  assert.doesNotMatch(config, /collapsed:/u);
  assert.doesNotMatch(config, /Paged Navigation|Linear Action|Tree Choice/u);
});

test('component sidebar guards against missing, duplicate, and unknown entries', () => {
  assert.match(config, /duplicateSidebarIds/u);
  assert.match(config, /missingSidebarIds/u);
  assert.match(config, /unknownSidebarIds/u);
  assert.match(config, /throw new Error\(`Invalid component sidebar:/u);
});
