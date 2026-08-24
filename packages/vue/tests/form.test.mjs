import assert from 'node:assert/strict';
import test from 'node:test';
import { renderToString } from '@vue/server-renderer';
import { createSSRApp, h } from 'vue';
import {
  FormDescription,
  FormField,
  FormLabel,
  FormMessage,
  FormRoot,
  FormSubmit,
  FormSummary,
} from '../dist/form.js';

test('Vue Form renders native semantics and stable compound part boundaries during SSR', async () => {
  const app = createSSRApp({
    render: () => h(FormRoot, { action: '/account', method: 'post' }, {
      default: ({ status }) => [
        h(FormSummary, null, { default: () => `Status: ${status}` }),
        h(FormField, { id: 'email', name: 'email' }, {
          default: () => [
            h(FormLabel, null, { default: () => 'Email address' }),
            h(FormDescription, null, { default: () => 'Used for release notices.' }),
            h('input', {
              id: 'email-control',
              name: 'email',
              type: 'email',
              required: true,
              'aria-describedby': 'email-description email-message',
            }),
            h(FormMessage),
          ],
        }),
        h(FormSubmit, null, { default: () => 'Save account' }),
      ],
    }),
  });

  const html = await renderToString(app);
  assert.match(html, /^<form/);
  assert.match(html, /action="\/account"/);
  assert.match(html, /method="post"/);
  assert.match(html, /data-scope="form"/);
  for (const part of ['root', 'summary', 'field', 'label', 'description', 'message', 'submit']) {
    assert.match(html, new RegExp(`data-part="${part}"`));
  }
  assert.match(html, /for="email-control"/);
  assert.match(html, /id="email-control"/);
  assert.match(html, /aria-describedby="email-description email-message"/);
  assert.match(html, /type="submit"/);
  assert.match(html, /role="alert"/);
});
