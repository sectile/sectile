import assert from 'node:assert/strict';
import { setImmediate } from 'node:timers/promises';
import { Window } from 'happy-dom';
globalThis.__VUE_DEVTOOLS_GLOBAL_HOOK__ = { emit() {} };
const window = new Window(); Object.assign(globalThis, { window, document: window.document, Node: window.Node, Element: window.Element,
  HTMLElement: window.HTMLElement, HTMLInputElement: window.HTMLInputElement, SVGElement: window.SVGElement,
  FormData: window.FormData, MutationObserver: window.MutationObserver });
const { createApp, h, nextTick, useTemplateRef } = await import('vue');
const { FileInputRoot, FileInputInput, FileInputTrigger, FileInputDropzone } = await import('../.verification-dist/form/file-input.js');
const { FormRoot, FormField, useFormControl } = await import('../.verification-dist/form.js');
async function dispose() {
  const file = new window.File(['payload'], 'retired.txt'), host = document.createElement('div'); document.body.append(host); let api, input, trigger, dropzone, refreshValue;
  const Probe = { setup() {
    const element = useTemplateRef('probe');
    // Opaque caller metadata is retained by this registered callback; this
    // exercises callback cleanup, not native file submission for the probe.
    const participation = useFormControl({ element, getValue: () => file }); refreshValue = participation.refreshValue;
    return () => h('input', { ref: 'probe' });
  } };
  const app = createApp({ render: () => h(FormRoot, null, { default: () => [
    h(FormField, { name: 'files' }, { default: () => h(FileInputRoot, { defaultValue: [file], ref: value => { api = value; } }, { default: () => [
      h(FileInputInput, { ref: value => { input = value; } }), h(FileInputTrigger, { ref: value => { trigger = value; } }), h(FileInputDropzone, { ref: value => { dropzone = value; } }),
    ] }) }), h(FormField, { name: 'probe' }, { default: () => h(Probe) }),
  ] }) });
  app.mount(host); for (let n = 0; n < 6; n++) await nextTick();
  assert.ok(api.input.files[0] === file);
  const getters = [input, trigger, dropzone].map(part => Object.getOwnPropertyDescriptor(part, 'element')?.get); assert.ok(getters.every(value => typeof value === 'function'));
  const held = { open: api.open, clear: api.clear, refresh: api.refresh, refreshValue, getters, input: new WeakRef(api.input), file: new WeakRef(file) };
  app.unmount(); host.remove(); await nextTick(); return held;
}
const held = await dispose();
for (let i = 0; i < 20; i++) { await setImmediate(); global.gc(); }
assert.equal(held.open(), false); assert.equal(held.clear(), false); assert.equal(held.refresh(), false);
held.refreshValue?.(); for (const getter of held.getters) assert.equal(getter(), null);
assert.equal(held.input.deref(), undefined, 'saved Vue file action retained native input');
assert.equal(held.file.deref(), undefined, 'saved Vue file action retained selected file');
// Vue's renderer intentionally retains its ambient document; that is not a
// per-component realm-lifetime witness. Native binding realm GC is tested below.
await window.happyDOM.close(); console.log('released');
