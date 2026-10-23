import assert from 'node:assert/strict';
import test from 'node:test';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createTestWindow } from './happy-dom.mjs';
const window = createTestWindow({ url: 'https://sectile.test/files' });
Object.assign(globalThis, { window, document: window.document, Node: window.Node, Element: window.Element,
  HTMLElement: window.HTMLElement, HTMLInputElement: window.HTMLInputElement, HTMLButtonElement: window.HTMLButtonElement,
  HTMLFormElement: window.HTMLFormElement, SVGElement: window.SVGElement, FormData: window.FormData, MutationObserver: window.MutationObserver });
const { createApp, h, isReactive, KeepAlive, nextTick, shallowRef } = await import('vue');
const { FileInputRoot, FileInputInput, FileInputTrigger, FileInputClear, FileInputDropzone } = await import('../.verification-dist/form/file-input.js');
const { FormRoot, FormField, FormLabel, FormDescription, FormMessage } = await import('../.verification-dist/form.js');
const { provideHostActive } = await import('../.verification-dist/host-provider.js');
const settle = async () => { for (let n = 0; n < 6; n++) await nextTick(); await Promise.resolve(); };
const file = name => new window.File([name], name, { type: 'text/plain' });
function setFiles(input, files) { const transfer = new window.DataTransfer(); for (const file of files) transfer.items.add(file); input.files = transfer.files; }
function pick(input, files) { setFiles(input, files); input.dispatchEvent(new window.Event('input', { bubbles: true })); input.dispatchEvent(new window.Event('change', { bubbles: true })); }
function reset(form) { const event = new window.Event('reset', { bubbles: true, cancelable: true }); form.dispatchEvent(event); if (!event.defaultPrevented) for (const input of form.querySelectorAll('input[type="file"]')) setFiles(input, []); return event; }
function fixture({ controlled = false, initial = [], withForm = false, cached = false, required = false } = {}) {
  const model = shallowRef(initial), policy = shallowRef({ multiple: true, accept: '.txt' }), inputKey = shallowRef(0);
  const inputShown = shallowRef(true);
  const active = shallowRef(true), shown = shallowRef(true), flags = shallowRef({ required }), cancelAction = shallowRef(false), submitOnPatch = shallowRef(false);
  let api, state, formState, accept = false, inputClicks = 0;
  const errors = [], rejects = [], changes = [], submitted = [], submissionStates = [], host = document.createElement('div'); document.body.append(host);
  const Child = { setup() { return () => h(FileInputRoot, {
    ref: value => { api = value; }, ...(controlled ? { modelValue: model.value } : { defaultValue: initial }), policy: policy.value,
    onVnodeUpdated() { if (submitOnPatch.value) { submitOnPatch.value = false; host.querySelector('form')?.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true })); } },
    ...(withForm ? {} : { name: 'files' }),
    'onUpdate:modelValue': files => { changes.push(files); if (accept) model.value = files; }, onReject: error => rejects.push(error.code),
  }, { default: current => { state = current; return [
    inputShown.value ? h(FileInputInput, { key: inputKey.value, 'aria-label': withForm ? undefined : 'Attachments', onClick: () => { inputClicks++; } }) : null,
    h(FileInputTrigger, { onClick: event => { if (cancelAction.value) event.preventDefault(); } }, { default: () => 'Choose files' }),
    h(FileInputClear, { onClick: event => { if (cancelAction.value) event.preventDefault(); } }, { default: () => 'Clear' }),
    h(FileInputDropzone, null, { default: () => 'Drop files' }),
  ]; } }); } };
  const app = createApp({ setup() { provideHostActive(active); return () => {
    const child = cached ? h(KeepAlive, null, { default: () => shown.value ? h(Child) : null }) : shown.value ? h(Child) : null;
    return withForm ? h(FormRoot, { onSubmit: event => { submitted.push(event.formData); submissionStates.push(event.state); return { ok: true }; } }, { default: value => {
      formState = value; return h(FormField, { id: 'attachment', name: 'files', ...flags.value }, { default: () => [
        h(FormLabel, null, { default: () => 'Attachments' }), child, h(FormDescription, null, { default: () => 'Text files' }), h(FormMessage),
      ] });
    } }) : child;
  }; } });
  app.config.errorHandler = error => errors.push(error); app.mount(host);
  return { host, app, model, policy, inputKey, inputShown, active, shown, flags, cancelAction, submitOnPatch, errors, rejects, changes, submitted, submissionStates,
    get api() { return api; }, get state() { return state; }, get formState() { return formState; },
    get input() { return host.querySelector('input[type="file"]'); }, get form() { return host.querySelector('form'); }, get inputClicks() { return inputClicks; },
    accept(value) { accept = value; }, close() { app.unmount(); host.remove(); },
  };
}
test('Vue file input publishes shallow native identity and routes all native Form metadata to one real input', async () => {
  const f = fixture({ withForm: true, required: true });
  try {
    await settle(); assert.equal(f.state.ready, true); const one = file('one.txt'); pick(f.input, [one]); await settle();
    assert.ok(f.state.files[0] === one); assert.equal(isReactive(f.state.files), false); assert.equal(isReactive(f.state.files[0]), false); assert.ok(Object.isFrozen(f.state.files));
    assert.ok(f.api.files[0] === one); assert.equal(f.input.name, 'files'); assert.equal(f.input.required, true);
    const label = f.host.querySelector('label'); assert.equal(label.htmlFor, f.input.id); assert.ok(f.input.id.length > 0);
    assert.ok(f.input.getAttribute('aria-describedby').includes('attachment-description'));
    assert.equal(f.formState.state.fields.length, 1); assert.equal(f.host.querySelectorAll('input').length, 1);
    assert.equal(f.host.querySelector('[data-part="root"][data-scope="file-input"]').hasAttribute('name'), false);
    f.form.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true })); await settle();
    assert.equal(f.submitted.length, 1); assert.ok(f.submitted[0].get('files') === one); assert.deepEqual(f.errors, []);
  } finally { f.close(); }
});
test('Vue controlled file proposals restore native files on refusal and accept only the parent model update', async () => {
  const first = file('first.txt'), next = file('next.txt'), f = fixture({ controlled: true, initial: [first] });
  try {
    await settle(); pick(f.input, [next]); assert.ok(f.input.files[0] === first); await settle();
    assert.ok(f.state.files[0] === first); assert.equal(f.changes.length, 1);
    f.accept(true); pick(f.input, [next]); await settle(); assert.ok(f.input.files[0] === next); assert.ok(f.state.files[0] === next); assert.ok(f.model.value[0] === next);
    assert.deepEqual(f.errors, []);
  } finally { f.close(); }
});
test('Vue file policy changes keep the admitted policy/value on rejection and use one native owner for the next valid selection', async () => {
  const one = file('one.txt'), two = file('two.txt'), f = fixture({ initial: [one, two] });
  try {
    await settle(); const originalInput = f.input;
    f.policy.value = { multiple: false }; await settle(); assert.ok(f.input === originalInput); assert.equal(f.input.multiple, true); assert.equal(f.state.files.length, 2); assert.equal(f.rejects.at(-1), 'form-file-count-exceeded');
    f.api.clear(); await settle(); f.policy.value = { accept: '.csv' }; await settle(); assert.equal(f.input.accept, '.csv'); assert.equal(f.input.multiple, false);
    pick(f.input, [one]); await settle(); assert.equal(f.state.files.length, 0); assert.equal(f.input.files.length, 0); assert.equal(f.rejects.at(-1), 'form-file-type-rejected');
    const csv = file('accepted.csv'); pick(f.input, [csv]); await settle(); assert.ok(f.state.files[0] === csv); assert.deepEqual(f.errors, []);
  } finally { f.close(); }
});
test('rejected file policies do not replace admitted configuration across inactivity or native input replacement', async () => {
  const one = file('one.txt'), two = file('two.txt');
  for (const controlled of [false, true]) {
  const f = fixture({ controlled, initial: [one, two] });
  try {
    await settle(); f.policy.value = { multiple: false }; await settle();
    assert.equal(f.rejects.at(-1), 'form-file-count-exceeded');
    if (controlled) { f.model.value = [file('rejected.csv')]; await settle(); assert.equal(f.rejects.at(-1), 'form-file-type-rejected'); }
    f.active.value = false; await settle(); f.active.value = true; await settle();
    assert.equal(f.state.ready, true); assert.equal(f.input.disabled, false); assert.equal(f.input.multiple, true);
    assert.ok(f.input.files[0] === one); assert.ok(f.input.files[1] === two);
    f.inputKey.value++; await settle();
    assert.equal(f.state.ready, true); assert.equal(f.input.multiple, true); assert.ok(f.input.files[1] === two);
    f.active.value = false; await settle(); f.policy.value = { multiple: true, accept: '.csv' }; await settle();
    f.active.value = true; await settle(); assert.equal(f.input.accept, '.txt'); assert.ok(f.input.files[1] === two);
    assert.equal(f.api.clear(), true); await settle();
    if (controlled) { f.model.value = []; await settle(); }
    f.policy.value = undefined; await settle(); assert.equal(f.input.multiple, false); assert.equal(f.input.accept, '');
    assert.deepEqual(f.errors, []);
  } finally { f.close(); }
  }
});
test('requests made without a native input are admitted on replacement and rejected requests retain the prior accepted state', async () => {
  const first = file('first.txt'), next = file('next.txt'), f = fixture({ controlled: true, initial: [first] });
  try {
    await settle(); f.inputShown.value = false; await settle(); assert.equal(f.input, null);
    f.policy.value = { accept: '.txt', multiple: false }; f.model.value = [next]; await settle();
    f.inputShown.value = true; await settle();
    assert.equal(f.state.ready, true); assert.equal(f.input.multiple, false); assert.ok(f.input.files[0] === next);
    f.inputShown.value = false; await settle();
    f.policy.value = { accept: '.csv' }; f.model.value = [file('invalid.csv')]; await settle();
    f.inputShown.value = true; await settle();
    assert.equal(f.state.ready, true); assert.equal(f.input.accept, '.txt'); assert.ok(f.input.files[0] === next);
    assert.equal(f.rejects.at(-1), 'form-file-type-rejected'); assert.deepEqual(f.errors, []);
  } finally { f.close(); }
});
test('Vue file inputs inherit readonly/disabled/required fields without fake readonly or hidden duplicate submission', async () => {
  const first = file('first.txt'), f = fixture({ withForm: true, initial: [first] });
  try {
    await settle(); f.flags.value = { readonly: true, required: true }; await settle();
    assert.equal(f.state.readonly, true); assert.equal(f.input.hasAttribute('readonly'), false); assert.equal(f.input.hasAttribute('aria-readonly'), false);
    assert.equal(f.api.clear(), false); assert.equal(f.input.disabled, false); assert.ok(new window.FormData(f.form).get('files') === first);
    f.flags.value = { disabled: true }; await settle(); assert.equal(f.input.disabled, true); assert.equal(f.api.open(), false);
    f.flags.value = {}; await settle(); assert.equal(f.input.disabled, false); assert.equal(f.api.clear(), true); await settle(); assert.equal(f.state.files.length, 0); assert.deepEqual(f.errors, []);
  } finally { f.close(); }
});
test('cancelled trigger/clear actions do not invoke the native picker or mutate selection, and drop uses the same proposal owner', async () => {
  const one = file('one.txt'), next = file('next.txt'), f = fixture({ initial: [one] });
  try {
    await settle(); f.cancelAction.value = true; await settle();
    f.host.querySelector('[data-part="trigger"]').click(); f.host.querySelector('[data-part="clear"]').click(); await settle();
    assert.equal(f.inputClicks, 0); assert.ok(f.state.files[0] === one);
    f.cancelAction.value = false; await settle(); f.host.querySelector('[data-part="trigger"]').click(); assert.equal(f.inputClicks, 1);
    const transfer = new window.DataTransfer(); transfer.items.add(next);
    // HappyDOM lists MIME strings instead of the HTML Files format sentinel.
    Object.defineProperty(transfer, 'types', { value: ['Files'] });
    const event = new window.Event('drop', { bubbles: true, cancelable: true }); Object.defineProperty(event, 'dataTransfer', { value: transfer });
    f.host.querySelector('[data-part="dropzone"]').dispatchEvent(event); await settle(); assert.ok(f.state.files[0] === next); assert.ok(f.input.files[0] === next); assert.deepEqual(f.errors, []);
  } finally { f.close(); }
});
test('Vue Form preparation restores refused controlled reset before immediate submission and accepted reset leaves a clean field baseline', async () => {
  const first = file('first.txt'), f = fixture({ controlled: true, initial: [first], withForm: true });
  try {
    await settle(); reset(f.form);
    f.form.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true })); await settle();
    assert.equal(f.submitted.length, 1); assert.ok(f.submitted[0].get('files') === first); assert.ok(f.input.files[0] === first);
    f.accept(true); reset(f.form); await settle(); assert.equal(f.input.files.length, 0); assert.equal(f.state.files.length, 0);
    assert.equal(f.formState.state.fields[0].dirty, false);
    pick(f.input, [first]); await settle(); assert.equal(f.formState.state.fields[0].dirty, true); assert.deepEqual(f.errors, []);
  } finally { f.close(); }
});
test('input replacement and HostActive/KeepAlive retain accepted files, detach native listeners and make saved disposed actions inert', async () => {
  const first = file('first.txt'), f = fixture({ initial: [first], cached: true });
  try {
    await settle(); const initial = f.input, open = f.api.open, clear = f.api.clear, refresh = f.api.refresh;
    f.inputKey.value++; await settle(); assert.notEqual(f.input, initial); assert.ok(f.input.files[0] === first); assert.ok(f.state.files[0] === first);
    setFiles(initial, [file('retired.txt')]); initial.dispatchEvent(new window.Event('input', { bubbles: true })); await settle(); assert.ok(f.state.files[0] === first);
    f.active.value = false; await settle(); assert.equal(open(), false); assert.ok(f.api.files[0] === first); assert.equal(f.host.querySelector('[data-scope="file-input"][data-part="root"]').inert, true);
    f.active.value = true; await settle(); assert.ok(f.input.files[0] === first);
    f.shown.value = false; await settle(); assert.equal(clear(), false); f.shown.value = true; await settle(); assert.ok(f.input.files[0] === first);
    f.close(); assert.equal(open(), false); assert.equal(clear(), false); assert.equal(refresh(), false); assert.deepEqual(f.errors, []);
  } finally { if (f.host.isConnected) f.close(); }
});
test('native admission failure is explicit and a valid policy update can recover without leaving a sticky disabled input', async () => {
  const one = file('one.txt'), f = fixture({ initial: [one] });
  try {
    await settle(); f.shown.value = false; await settle(); f.policy.value = { accept: '.csv' }; f.shown.value = true; await settle();
    assert.equal(f.state.ready, false); assert.equal(f.input.disabled, true); assert.equal(f.rejects.at(-1), 'form-file-type-rejected');
    f.policy.value = { accept: '.txt' }; await settle(); assert.equal(f.state.ready, true); assert.equal(f.input.disabled, false); assert.ok(f.state.files[0] === one);
    f.active.value = false; await settle(); assert.equal(f.input.disabled, false); f.active.value = true; await settle(); assert.equal(f.input.disabled, false); assert.deepEqual(f.errors, []);
  } finally { f.close(); }
});
test('submission during the accepting Vue patch flushes both native files and accepted Form metadata before validation', async () => {
  const next = file('next.txt'), f = fixture({ controlled: true, withForm: true });
  try {
    await settle(); f.accept(true); f.submitOnPatch.value = true; pick(f.input, [next]); await settle();
    assert.equal(f.submitted.length, 1); assert.ok(f.submitted[0].get('files') === next); assert.equal(f.submissionStates[0].dirty, true); assert.deepEqual(f.errors, []);
  } finally { f.close(); }
});
test('saved Vue file action methods release retired native input and selected file references', () => {
  const result = spawnSync(process.execPath, ['--expose-gc', fileURLToPath(new URL('./file-input-gc.worker.mjs', import.meta.url))], { encoding: 'utf8', timeout: 20000 });
  assert.equal(result.status, 0, result.stderr); assert.match(result.stdout, /released/);
});
test('Vue activity and KeepAlive release all four native input listeners before reconnecting', async () => {
  const prototype = window.HTMLInputElement.prototype, add = prototype.addEventListener, remove = prototype.removeEventListener, records = new WeakMap();
  prototype.addEventListener = function(type, listener, options) {
    const types = records.get(this) ?? new Map(), callbacks = types.get(type) ?? new Set(); callbacks.add(listener); types.set(type, callbacks); records.set(this, types); return add.call(this, type, listener, options);
  };
  prototype.removeEventListener = function(type, listener, options) { records.get(this)?.get(type)?.delete(listener); return remove.call(this, type, listener, options); };
  const count = input => [...(records.get(input)?.values() ?? [])].reduce((sum, set) => sum + set.size, 0);
  const f = fixture({ initial: [file('accepted.txt')], cached: true });
  try {
    await settle(); const input = f.input;
    // Four native-owner listeners plus the fixture's authored Vue click handler.
    assert.equal(count(input), 5);
    for (let n = 0; n < 3; n++) {
      f.active.value = false; await settle(); assert.equal(count(input), 1);
      f.active.value = true; await settle(); assert.equal(count(input), 5);
    }
    f.shown.value = false; await settle(); assert.equal(count(input), 1);
    f.shown.value = true; await settle(); assert.equal(count(input), 5); assert.deepEqual(f.errors, []);
    f.close(); assert.equal(count(input), 1);
  } finally {
    if (f.host.isConnected) f.close(); prototype.addEventListener = add; prototype.removeEventListener = remove;
  }
});
