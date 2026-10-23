import assert from 'node:assert/strict';
import test from 'node:test';
import { createSSRApp, h } from 'vue';
import { renderToString } from 'vue/server-renderer';
import { useFileUpload, useFileUploadGroup } from '../.verification-dist/form/file-upload.js';
test('Vue upload SSR keeps native admission/transport unavailable and accesses no AbortController', async () => {
  assert.equal(typeof window, 'undefined'); const previous = Object.getOwnPropertyDescriptor(globalThis, 'AbortController'); let calls = 0;
  Object.defineProperty(globalThis, 'AbortController', { configurable: true, get() { throw Error('SSR must not construct native upload resources'); } });
  try {
    const html = await renderToString(createSSRApp({ setup() {
      const upload = useFileUpload({ file: { name: 'server.txt', type: 'text/plain', size: 1 }, adapter() { calls++; return { result: Promise.resolve('never') }; } });
      const group = useFileUploadGroup({ items: [{ id: 'server', file: { name: 'server.txt', type: 'text/plain', size: 1 } }], adapter() { calls++; return { result: Promise.resolve('never') }; } });
      const row = group.useItem('server');
      assert.equal(group.snapshot.value, undefined); assert.equal(group.ready.value, false); assert.equal(row.value, undefined);
      assert.equal(group.getItem('server'), undefined);
      assert.equal(group.start().error.code, 'dom.file-upload-group-inactive');
      assert.equal(upload.snapshot.value, undefined); assert.equal(upload.error.value, undefined); assert.equal(upload.ready.value, false);
      assert.equal(upload.start().error.code, 'dom.file-upload-inactive'); return () => h('output', 'pending');
    } }));
    assert.match(html, /pending/u); assert.equal(calls, 0);
  } finally { if (previous) Object.defineProperty(globalThis, 'AbortController', previous); else delete globalThis.AbortController; }
});
test('Vue upload requires an owning component setup', () => {
  assert.throws(() => useFileUpload({ file: { name: 'a', size: 0, type: '' }, adapter() {} }), error => error.code === 'vue.file-upload-scope-required');
  assert.throws(() => useFileUploadGroup({ items: [], adapter() {} }), error => error.code === 'vue.file-upload-scope-required');
});
