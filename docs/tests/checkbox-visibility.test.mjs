import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const source = await readFile(
  new URL('../.vitepress/theme/components/CheckedControlCase.vue', import.meta.url),
  'utf8',
);

test('checkbox examples keep the box visible when the indicator is hidden', () => {
  assert.match(source, /<span class="checkbox-marker" aria-hidden="true">\s*<CheckboxIndicator class="checkbox-indicator">/u);
  assert.match(source, /<Minus v-if="isIndeterminate"/u);
  assert.match(source, /<Check v-else/u);
  assert.doesNotMatch(source, /<CheckboxIndicator class="checkbox-marker">/u);
});
