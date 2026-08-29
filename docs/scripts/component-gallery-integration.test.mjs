import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const docsRoot = new URL('../', import.meta.url);

test('component previews are visibility-gated during client-side navigation', async () => {
  const source = await readFile(
    new URL('.vitepress/theme/components/ComponentGalleryPreview.vue', docsRoot),
    'utf8',
  );

  assert.match(source, /new IntersectionObserver/u);
  assert.match(source, /shouldRender\.value = entry\?\.isIntersecting === true/u);
  assert.match(source, /<ComponentExamplePreview\s+v-if="shouldRender"/u);
  assert.doesNotMatch(source, /hydrateOnVisible/u);
});

test('component example cards round their own surfaces without clipping floating content', async () => {
  const source = await readFile(
    new URL('.vitepress/theme/styles.css', docsRoot),
    'utf8',
  );
  const card = source.match(/\.sectile-example\s*\{(?<rules>[^}]*)\}/u)?.groups?.rules ?? '';

  assert.doesNotMatch(card, /overflow\s*:\s*hidden/u);
  assert.match(source, /\.sectile-example__toolbar\s*\{[^}]*border-radius:\s*13px 13px 0 0;/u);
  assert.match(source, /\.sectile-example__preview > \.component-example-stage,[\s\S]*?border-radius:\s*0 0 13px 13px;/u);
  assert.match(source, /\.sectile-example__code\s*\{[^}]*border-radius:\s*0 0 13px 13px;/u);
});
