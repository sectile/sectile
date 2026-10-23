import assert from 'node:assert/strict';
import test from 'node:test';
import { createSSRApp, h } from 'vue';
import { renderToString } from 'vue/server-renderer';
import { FileInputRoot, FileInputInput, FileInputTrigger, FileInputDropzone } from '../.verification-dist/form/file-input.js';

test('FileInput SSR renders authored metadata without native capability access or fake file values', async () => {
  assert.equal(typeof document, 'undefined'); assert.equal(typeof window, 'undefined');
  const file = new File(['data'], 'authored.txt'); let seen;
  const html = await renderToString(createSSRApp({ render: () => h(FileInputRoot, { modelValue: [file], name: 'files', policy: { accept: '.txt' } }, {
    default: state => { seen = state; return [h(FileInputInput, { value: 'C:/fakepath/file', readonly: true }), h(FileInputTrigger, null, { default: () => 'Choose' }), h(FileInputDropzone, null, { default: () => 'Drop files' })]; },
  }) }));
  assert.equal(seen.ready, false); assert.ok(seen.files[0] === file); assert.equal(seen.totalSize, undefined);
  assert.match(html, /type="file"/u); assert.match(html, /name="files"/u); assert.match(html, /accept=".txt"/u);
  assert.doesNotMatch(html, /fakepath|\svalue=|\sreadonly(?:=|\s|>)/u);
});
test('FileInput parts require their provider and duplicate native inputs are rejected during SSR', async () => {
  const outside = createSSRApp({ render: () => h(FileInputInput) }); outside.config.warnHandler = () => {};
  await assert.rejects(renderToString(outside), /requires FileInputRoot/u);
  const duplicate = createSSRApp({ render: () => h(FileInputRoot, null, { default: () => [h(FileInputInput), h(FileInputInput)] }) }); duplicate.config.warnHandler = () => {};
  await assert.rejects(renderToString(duplicate), /at most one FileInputInput/u);
});
