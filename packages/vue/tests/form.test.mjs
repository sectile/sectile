import assert from 'node:assert/strict';
import test from 'node:test';
import { renderToString } from '@vue/server-renderer';
import { createSSRApp, h } from 'vue';
import {
  FormDescription,
  FormField,
  FormLabel,
  FormMessage,
  FormReset,
  FormRoot,
  FormSubmit,
  FormSummary,
  defineFormSubmission,
} from '../dist/form.js';

test('Vue defineFormSubmission keeps schema and handler atomic for v-bind', () => {
  const schema = { '~standard': { version: 1, vendor: 'test', validate: () => ({ value: {} }) } };
  const onSubmit = () => ({ ok: true });
  const submission = defineFormSubmission({ schema, onSubmit });
  assert.deepEqual(submission, { schema, onSubmit });
  assert.equal(Object.isFrozen(submission), true);
});

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
        h(FormReset, null, { default: () => 'Reset account' }),
        h(FormSubmit, null, { default: () => 'Save account' }),
      ],
    }),
  });

  const html = await renderToString(app);
  assert.match(html, /^<form/);
  assert.match(html, /action="\/account"/);
  assert.match(html, /method="post"/);
  assert.match(html, /data-scope="form"/);
  for (const part of ['root', 'summary', 'field', 'label', 'description', 'message', 'reset', 'submit']) {
    assert.match(html, new RegExp(`data-part="${part}"`));
  }
  assert.match(html, /for="email-control"/);
  assert.match(html, /id="email-control"/);
  assert.match(html, /aria-describedby="email-description email-message"/);
  assert.match(html, /type="submit"/);
  assert.match(html, /type="reset"/);
  assert.match(html, /role="alert"/);
});
