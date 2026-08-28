import assert from 'node:assert/strict';
import test from 'node:test';
import { renderToString } from '@vue/server-renderer';
import { createSSRApp, h } from 'vue';
import {
  EditableArea,
  EditableCancelTrigger,
  EditableEditTrigger,
  EditableInput,
  EditablePreview,
  EditableRoot,
  EditableSubmitTrigger,
} from '../.verification-dist/editable.js';

test('Vue editable renders native compound parts and HTML readonly spelling', async () => {
  const app = createSSRApp({
    render: () => h(EditableRoot, { defaultValue: 'Release title', readonly: true, name: 'title' }, {
      default: ({ value }) => h(EditableArea, null, {
        default: () => [
          h(EditablePreview, null, () => value),
          h(EditableInput),
          h(EditableEditTrigger, null, () => 'Edit'),
          h(EditableSubmitTrigger, null, () => 'Save'),
          h(EditableCancelTrigger, null, () => 'Cancel'),
        ],
      }),
    }),
  });
  const html = await renderToString(app);
  assert.match(html, /data-scope="editable"/);
  assert.match(html, /data-part="preview"/);
  assert.match(html, /value="Release title"/);
  assert.match(html, /readonly/);
  assert.match(html, /hidden/);
});
