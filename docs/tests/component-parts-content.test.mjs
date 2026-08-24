import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import catalog from '../data/components.json' with { type: 'json' };
import { componentAnatomy } from '../.vitepress/theme/component-anatomy.ts';

const generator = await readFile(
  new URL('../scripts/generate-component-pages.mjs', import.meta.url),
  'utf8',
);

test('part documentation states the shared scope once and documents each contract', () => {
  assert.match(generator, /Shared scope:/u);
  assert.match(generator, /component-scope-token/u);
  assert.match(generator, /<div class="component-parts-table">/u);
  assert.match(generator, /'Part', 'Selector', 'Role', 'Extra attributes'/u);
  assert.match(generator, /contract\.purpose\[korean \? 'ko' : 'en'\]/u);
  assert.match(generator, /<code class="component-part-token">/u);
  assert.doesNotMatch(generator, /<ul class="component-parts">/u);
  assert.doesNotMatch(generator, /Each name below is the part's/u);
});

test('generated part documentation never repeats a component shared scope per row', async () => {
  for (const { id } of catalog.components) {
    const definition = componentAnatomy[id];
    assert.ok(definition, id);
    for (const localePrefix of ['', 'ko/']) {
      const page = await readFile(new URL(`../${localePrefix}components/${id}.md`, import.meta.url), 'utf8');
      const sharedScope = `[data-scope="${definition.scope}"]`;
      assert.equal(page.split(sharedScope).length - 1, 1, `${localePrefix}${id}: shared scope`);
      for (const part of definition.parts) {
        assert.equal(
          page.split(`[data-part="${part}"]`).length - 1,
          1,
          `${localePrefix}${id}:${part}: selector`,
        );
      }
    }
  }
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
