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
