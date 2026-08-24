import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const source = await readFile(new URL('../.vitepress/theme/components/ExampleFrame.vue', import.meta.url), 'utf8');

test('View and Code tabs drive persistent panel visibility through native hidden state', () => {
  assert.doesNotMatch(source, /v-show=/);
  assert.match(source, /:hidden="mode !== 'view'"/);
  assert.match(source, /:hidden="mode !== 'code'"/);
  assert.match(source, /:aria-controls="panelID\('view'\)"/);
  assert.match(source, /:aria-controls="panelID\('code'\)"/);
});

test('example display tabs support arrow, Home, and End keyboard movement', () => {
  for (const key of ['ArrowLeft', 'ArrowUp', 'Home', 'ArrowRight', 'ArrowDown', 'End']) {
    assert.match(source, new RegExp(`event\\.key === '${key}'`));
  }
  assert.match(source, /:tabindex="mode === 'view' \? 0 : -1"/);
  assert.match(source, /:tabindex="mode === 'code' \? 0 : -1"/);
});
