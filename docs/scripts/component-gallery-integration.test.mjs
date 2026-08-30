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

test('component gallery previews keep every rendered overlay non-interactive', async () => {
  const preview = await readFile(
    new URL('.vitepress/theme/components/ComponentGalleryPreview.vue', docsRoot),
    'utf8',
  );
  const card = await readFile(
    new URL('.vitepress/theme/components/ComponentGalleryCard.vue', docsRoot),
    'utf8',
  );

  assert.match(preview, /aria-hidden="true"\s+inert/u);
  assert.match(preview, /<HostProvider v-if="portalTarget !== null" :portal-target="portalTarget">/u);
  assert.match(preview, /\.component-gallery-preview\s*\{[^}]*pointer-events:\s*none;/u);
  assert.match(card, /\.component-gallery-card\s*\{[^}]*isolation:\s*isolate;/u);
  assert.match(card, /\.component-gallery-card__link\s*\{[^}]*z-index:\s*2;/u);
});

test('select previews keep the trigger surface stable and use a restrained selection tint', async () => {
  const source = await readFile(
    new URL('.vitepress/theme/components/DemoSelect.vue', docsRoot),
    'utf8',
  );
  const triggerHover = source.match(/\.demo-select__trigger:hover:not\(:disabled\)\s*\{(?<rules>[^}]*)\}/u)?.groups?.rules ?? '';

  assert.match(triggerHover, /background:\s*var\(--sectile-surface\);/u);
  assert.doesNotMatch(triggerHover, /background:\s*var\(--sectile-surface-hover\);/u);
  assert.match(source, /\.demo-select__option:is\(\[data-selected\], \[data-state="checked"\]\)\s*\{\s*background:\s*var\(--sectile-surface-interactive\);/u);
  assert.match(source, /\[data-highlighted\][^{]*:not\(\[data-selected\]\):not\(\[data-state="checked"\]\)/u);
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
