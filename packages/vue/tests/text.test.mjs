import assert from 'node:assert/strict';
import test from 'node:test';
import { renderToString } from '@vue/server-renderer';
import { createSSRApp, h } from 'vue';
import { TextField } from '../.verification-dist/text.js';

test('Vue text field renders a native input with HTML form semantics', async () => {
  const app = createSSRApp({
    render: () => h(TextField, {
      defaultValue: '한글',
      name: 'query',
      required: true,
      readonly: true,
      autocomplete: 'off',
    }),
  });
  const html = await renderToString(app);
  assert.match(html, /^<input/);
  assert.match(html, /value="한글"/);
  assert.match(html, /name="query"/);
  assert.match(html, /required/);
  assert.match(html, /readonly/);
  assert.match(html, /data-readonly(?:="")?/);
});

test('Vue text field renders textarea without invalid input type semantics', async () => {
  const app = createSSRApp({
    render: () => h(TextField, { multiline: true, defaultValue: 'Notes' }),
  });
  const html = await renderToString(app);
  assert.match(html, /^<textarea/);
  assert.doesNotMatch(html, /type="text"/);
});
