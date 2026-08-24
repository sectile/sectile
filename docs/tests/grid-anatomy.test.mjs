import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const anatomy = await readFile(new URL('../.vitepress/theme/component-anatomy.ts', import.meta.url), 'utf8');
const styles = await readFile(new URL('../.vitepress/theme/components/ComponentAnatomy.vue', import.meta.url), 'utf8');

test('grid anatomy separates the table frame, header, and body', () => {
  assert.match(anatomy, /'grid-header'/u);
  assert.match(anatomy, /className: 'grid-body'/u);
  assert.match(styles, /\.anatomy-node--data-grid\.anatomy-part-active::after/u);
  assert.match(styles, /border:\s*2px solid var\(--vp-c-brand-1\)/u);
  assert.match(styles, /\.anatomy-node--grid-header\s*\{[^}]*background:\s*var\(--vp-c-bg-soft\)/su);
});

test('grid anatomy draws each internal divider once and preserves outer corners', () => {
  assert.match(styles, /\.anatomy-node--data-grid \.anatomy-node--row > \.anatomy-node--cell:last-child\s*\{\s*border-right:\s*0;/u);
  assert.match(styles, /\.anatomy-node--grid-body > \.anatomy-node--row:last-child > \.anatomy-node--cell\s*\{\s*border-bottom:\s*0;/u);
  assert.match(styles, /border-radius:\s*11px 0 0;/u);
  assert.match(styles, /border-radius:\s*0 0 11px;/u);
  assert.match(styles, /\.anatomy-node--data-grid \.anatomy-node--cell\.anatomy-part-active/u);
});
