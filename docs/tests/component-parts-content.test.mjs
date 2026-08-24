import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const generator = await readFile(
  new URL('../scripts/generate-component-pages.mjs', import.meta.url),
  'utf8',
);

test('part documentation states shared attributes once and lists compact tokens', () => {
  assert.match(generator, /Rendered parts use \\`data-scope=/u);
  assert.match(generator, /Each name below is the part's \\`data-part\\` value/u);
  assert.match(generator, /<ul class="component-parts">/u);
  assert.match(generator, /<code class="component-part-token">/u);
  assert.doesNotMatch(generator, /Stable attributes \|/u);
  assert.doesNotMatch(generator, /안정 속성 \|/u);
});

test('API documentation groups identifiers without repeating their kind per export', () => {
  assert.match(generator, /Vue package:/u);
  assert.match(generator, /<ul class="component-api-list">/u);
  assert.match(generator, /<code class="component-api-token">/u);
  assert.doesNotMatch(generator, /Public Vue component/u);
  assert.doesNotMatch(generator, /공개 Vue 컴포넌트/u);
  assert.doesNotMatch(generator, /entry point exports/u);
  assert.doesNotMatch(generator, /진입점/u);
});
