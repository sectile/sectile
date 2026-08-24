import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const styles = await readFile(
  new URL('../.vitepress/theme/component-examples.css', import.meta.url),
  'utf8',
);

test('accordion headers reset document heading spacing without losing heading semantics', () => {
  assert.match(styles, /\.accordion-item > \.accordion-header\s*\{[^}]*margin:\s*0;[^}]*padding:\s*0;[^}]*border:\s*0;/su);
  assert.doesNotMatch(styles, /\.accordion-header\s*\{\s*margin:\s*0;\s*\}/u);
});
