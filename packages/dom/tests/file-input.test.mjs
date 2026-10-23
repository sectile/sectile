import assert from 'node:assert/strict';
import test from 'node:test';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { Window } from 'happy-dom';
import { createFileInput, tryCreateFileInput } from '../.verification-dist/form/file-input/connection.js';
import { createForm } from '../.verification-dist/form/connection.js';

function fixture(t) {
  const window = new Window(), { document } = window;
  const form = document.createElement('form'), input = document.createElement('input'), target = document.createElement('div');
  input.type = 'file'; input.name = 'files'; form.append(input, target); document.body.append(form);
  const owners = []; t.after(async () => { for (const owner of owners.reverse()) owner.destroy(); await window.happyDOM.close(); });
  const file = name => new window.File([name], name, { type: 'text/plain' });
  const set = files => { const data = new window.DataTransfer(); for (const file of files) data.items.add(file); input.files = data.files; };
  const own = options => { const owner = createFileInput({ element: input, ...options }); owners.push(owner); return owner; };
  const pick = files => { set(files); input.dispatchEvent(new window.Event('input', { bubbles: true })); input.dispatchEvent(new window.Event('change', { bubbles: true })); };
  // Emulate the documented platform order. HappyDOM reset/FileList is not a
  // physical browser oracle: event dispatch precedes the reset algorithm.
  const reset = () => { const event = new window.Event('reset', { bubbles: true, cancelable: true }); form.dispatchEvent(event); if (!event.defaultPrevented) set([]); return event; };
  return { window, document, form, input, target, file, set, own, pick, reset };
}
function installGlobals(window) {
  const saved = new Map(['FormData', 'Node', 'HTMLElement'].map(key => [key, globalThis[key]]));
  for (const key of saved.keys()) globalThis[key] = window[key];
  return () => { for (const [key, value] of saved) globalThis[key] = value; };
}
test('native file proposals are atomic, deduplicate input/change and preserve binary submission identity', t => {
  const f = fixture(t), one = f.file('one.txt'), two = f.file('two.txt'), rejected = f.file('bad.csv');
  f.input.required = true; f.input.setAttribute('aria-label', 'Attachments');
  const changes = [], errors = [], owner = f.own({ policy: { multiple: true, maxFiles: 2, accept: '.txt' }, onValueChange: (files, source) => changes.push([files, source]), onReject: error => errors.push(error.code) });
  f.pick([one, two]); const snapshot = owner.getSnapshot();
  assert.equal(changes.length, 1); assert.equal(changes[0][1], 'input'); assert.ok(snapshot.state.files[0] === one); assert.ok(Object.isFrozen(snapshot.state.files));
  assert.equal(owner.getSnapshot(), snapshot); assert.equal(f.input.required, true); assert.equal(f.input.getAttribute('aria-label'), 'Attachments');
  f.pick([one, rejected]); assert.equal(owner.getSnapshot(), snapshot); assert.ok(f.input.files[1] === two); assert.deepEqual(errors, ['form-file-type-rejected']);
  const data = new f.window.FormData(f.form); assert.ok(data.getAll('files')[0] === one); assert.ok(data.getAll('files')[1] === two);
  f.input.dispatchEvent(new f.window.Event('cancel')); assert.equal(owner.getSnapshot(), snapshot); assert.equal(changes.length, 1);
  owner.clear(); assert.equal(owner.state.files.length, 0); assert.equal(f.input.files.length, 0);
});
test('controlled refusal restores files before native bubbling and accepts only an explicit reentrant sync', t => {
  const f = fixture(t), first = f.file('first.txt'), next = f.file('next.txt'); let accept = false, owner;
  const proposals = [], bubbled = [];
  owner = f.own({ value: [first], onValueChange: files => { proposals.push(files); assert.ok(f.input.files[0] === first); if (accept) assert.equal(owner.syncControlledValue(files).ok, true); } });
  f.form.addEventListener('change', () => bubbled.push(f.input.files[0]));
  f.pick([next]); assert.ok(owner.state.files[0] === first); assert.ok(bubbled[0] === first); assert.equal(proposals.length, 1);
  accept = true; f.pick([next]); assert.ok(owner.state.files[0] === next); assert.ok(f.input.files[0] === next); assert.ok(bubbled[1] === next); assert.equal(proposals.length, 2);
  const fake = owner.selectFiles([{ name: 'fake.txt', type: 'text/plain', size: 1 }]); assert.equal(fake.ok, false); assert.equal(fake.error.code, 'dom.file-input-file-invalid'); assert.equal(proposals.length, 2);
});
test('throwing callbacks and reentrant publications cannot leave unaccepted native files or stale proposals', t => {
  const f = fixture(t), first = f.file('first.txt'), next = f.file('next.txt'), failure = Error('consumer failed');
  const controlled = f.own({ value: [first], onValueChange() { throw failure; } });
  assert.throws(() => controlled.selectFiles([next]), error => error === failure); assert.ok(f.input.files[0] === first); controlled.destroy();
  let armed = false, owner; const proposals = [];
  owner = f.own({ onUpdate() { if (armed) { armed = false; owner.clear(); } }, onValueChange: files => proposals.push(files) });
  armed = true; owner.selectFiles([next]); assert.equal(owner.state.files.length, 0); assert.equal(f.input.files.length, 0); assert.deepEqual(proposals, [[]]);
});
test('synchronizing an unchanged controlled value repairs native files without publishing a new value or revision', t => {
  const f = fixture(t), file = f.file('accepted.txt'), changes = [], owner = f.own({ value: [file], onValueChange: files => changes.push(files) });
  const before = owner.getSnapshot(); f.set([]);
  assert.equal(owner.syncControlledValue(before.state.files).ok, true); assert.ok(f.input.files[0] === file);
  assert.equal(owner.getSnapshot(), before); assert.equal(changes.length, 0);
});
test('completed reset respects late cancellation and controlled/uncontrolled ownership through explicit read barriers', async t => {
  const f = fixture(t), file = f.file('accepted.txt'), sources = [], owner = f.own({ value: [file], onValueChange: (_files, source) => sources.push(source) });
  const cancel = event => event.preventDefault(); f.form.addEventListener('reset', cancel);
  f.reset(); await Promise.resolve(); assert.deepEqual(sources, []); assert.ok(f.input.files[0] === file);
  f.form.removeEventListener('reset', cancel); f.reset(); assert.equal(f.input.files.length, 0);
  assert.ok(owner.getSnapshot().state.files[0] === file); assert.ok(f.input.files[0] === file); assert.deepEqual(sources, ['reset']);
  await Promise.resolve(); assert.deepEqual(sources, ['reset']); owner.destroy();
  const uncontrolled = f.own({ onValueChange: (_files, source) => sources.push(source) });
  f.reset(); await Promise.resolve(); assert.equal(uncontrolled.state.files.length, 0); assert.equal(f.input.files.length, 0); assert.deepEqual(sources, ['reset', 'reset']);
});
test('Form preparation flushes controlled reset before binary serialization without replacing same-name siblings', t => {
  const f = fixture(t), restore = installGlobals(f.window); t.after(restore);
  const file = f.file('accepted.txt'), owner = f.own({ value: [file] }), text = f.document.createElement('input');
  text.name = 'files'; text.value = 'same-name-sibling'; f.form.append(text);
  const form = createForm({ form: f.form, participants: [{ id: 'attachment', element: f.input, prepareSubmission() { const result = owner.refresh(); if (!result.ok) throw result.error; } }] });
  t.after(() => form.destroy());
  f.reset(); const data = form.getFormData(); const values = data.getAll('files');
  assert.ok(values[0] === file); assert.equal(values[1], 'same-name-sibling'); assert.equal(values.length, 2);
});
test('failed Form preparation prevents native submission and does not leave validation in progress', t => {
  const f = fixture(t), restore = installGlobals(f.window); t.after(restore); const failure = Error('unreconciled native state'); let submitted = 0;
  const form = createForm({ form: f.form, participants: [{ id: 'attachment', element: f.input, prepareSubmission() { throw failure; } }], onSubmit() { submitted++; } });
  t.after(() => form.destroy()); assert.throws(() => form.getFormData(), error => error === failure);
  const event = new f.window.Event('submit', { bubbles: true, cancelable: true });
  // HappyDOM forwards event listener exceptions to its window error channel.
  f.window.addEventListener('error', event => event.preventDefault()); f.form.dispatchEvent(event);
  assert.equal(event.defaultPrevented, true); assert.equal(submitted, 0); assert.notEqual(form.state.validation.status, 'validating');
});
test('readonly and effective fieldset disabled block mutation without rewriting native submission ownership', t => {
  const f = fixture(t), file = f.file('accepted.txt'), owner = f.own({ value: [file], readOnly: true });
  const click = new f.window.Event('click', { cancelable: true }); f.input.dispatchEvent(click); assert.equal(click.defaultPrevented, true);
  assert.equal(owner.clear().error.code, 'interaction-read-only'); assert.equal(f.input.hasAttribute('aria-readonly'), false); assert.equal(f.input.disabled, false);
  assert.ok(new f.window.FormData(f.form).get('files') === file);
  owner.syncInteraction({}); const fieldset = f.document.createElement('fieldset'); fieldset.disabled = true; f.form.append(fieldset); fieldset.append(f.input);
  // HappyDOM's :disabled implementation checks only the element attribute.
  // Supply the inherited platform signal to test the host guard, not to claim
  // that this emulator verifies browser fieldset/legend behavior.
  const matches = f.input.matches.bind(f.input);
  f.input.matches = selector => selector === ':disabled' ? fieldset.disabled || matches(selector) : matches(selector);
  assert.equal(owner.selectFiles([]).error.code, 'interaction-disabled'); assert.equal(f.input.disabled, false);
  fieldset.disabled = false; assert.equal(owner.clear().ok, true);
});
test('drop reads Files only on drop, replaces one batch and rejects directories or unreadable payloads', t => {
  const f = fixture(t), file = f.file('dropped.txt'), first = f.file('first.txt'), errors = [], owner = f.own({ value: [first], dropTarget: f.target, onReject: error => errors.push(error.code), onValueChange: files => owner.syncControlledValue(files) });
  let reads = 0;
  const dispatch = (type, transfer) => { const event = new f.window.Event(type, { bubbles: true, cancelable: true }); Object.defineProperty(event, 'dataTransfer', { value: transfer }); f.target.dispatchEvent(event); return event; };
  const transfer = { types: ['Files'], items: [], get files() { reads++; return [file]; } };
  assert.equal(dispatch('dragover', transfer).defaultPrevented, true); assert.equal(reads, 0);
  dispatch('drop', transfer); assert.equal(reads, 1); assert.ok(owner.state.files[0] === file); assert.ok(f.input.files[0] === file);
  dispatch('drop', { types: ['Files'], items: [{ kind: 'file', webkitGetAsEntry: () => ({ isDirectory: true }) }], get files() { throw Error('directory contents must not be read'); } });
  dispatch('drop', { types: ['Files'], items: [], files: [] });
  assert.deepEqual(errors, ['dom.file-input-directory-rejected', 'dom.file-input-drop-invalid']); assert.ok(owner.state.files[0] === file);
  assert.equal(dispatch('drop', { types: ['text/plain'] }).defaultPrevented, false);
});
test('suspension, target replacement, form reassociation and disposal remove all owned listeners', async t => {
  const f = fixture(t), next = f.document.createElement('div'), nextForm = f.document.createElement('form'), file = f.file('accepted.txt');
  f.document.body.append(next, nextForm); const counts = [];
  for (const target of [f.input, f.target, f.form, next, nextForm]) {
    const listeners = new Map(), add = target.addEventListener.bind(target), remove = target.removeEventListener.bind(target);
    target.addEventListener = (type, listener, options) => { const set = listeners.get(type) ?? new Set(); set.add(listener); listeners.set(type, set); add(type, listener, options); };
    target.removeEventListener = (type, listener, options) => { listeners.get(type)?.delete(listener); remove(type, listener, options); };
    counts.push(() => [...listeners.values()].reduce((sum, set) => sum + set.size, 0));
  }
  const owner = f.own({ value: [file], dropTarget: f.target });
  for (let i = 0; i < 3; i++) { owner.suspend(); owner.suspend(); assert.ok(counts.every(count => count() === 0)); owner.resume(); owner.resume(); assert.deepEqual(counts.map(count => count()), [4, 2, 1, 0, 0]); }
  owner.setDropTarget(next); nextForm.append(f.input); owner.refresh(); assert.deepEqual(counts.map(count => count()), [4, 0, 0, 2, 1]);
  const reset = new f.window.Event('reset', { cancelable: true }); nextForm.dispatchEvent(reset); owner.destroy(); await Promise.resolve();
  assert.ok(counts.every(count => count() === 0)); assert.equal(owner.state.files.length, 0); assert.equal(f.input.hasAttribute('data-scope'), false); assert.ok(f.input.files[0] === file);
});
test('failed native restoration never publishes acceptance, quarantines submission and permits explicit refresh recovery', t => {
  const f = fixture(t), first = f.file('accepted.txt'), unsafe = f.file('unsafe.txt'), errors = [], changes = [];
  const owner = f.own({ value: [first], onValueChange: files => changes.push(files), onReject: error => errors.push(error.code) });
  f.set([unsafe]); const descriptor = Object.getOwnPropertyDescriptor(f.window.HTMLInputElement.prototype, 'files');
  Object.defineProperty(f.input, 'files', { configurable: true, get() { return descriptor.get.call(this); }, set() {} });
  f.input.dispatchEvent(new f.window.Event('input', { bubbles: true }));
  assert.equal(owner.getFaulted(), true); assert.equal(f.input.disabled, true); assert.equal(new f.window.FormData(f.form).has('files'), false);
  assert.ok(owner.state.files[0] === first); assert.equal(changes.length, 0); assert.deepEqual(errors, ['dom.file-input-rollback-failed']);
  delete f.input.files; assert.equal(owner.refresh().ok, true); assert.equal(owner.getFaulted(), false); assert.equal(f.input.disabled, false); assert.ok(f.input.files[0] === first);
});
test('saved disposed file methods and facades release file, input and realm references', () => {
  const result = spawnSync(process.execPath, ['--expose-gc', fileURLToPath(new URL('./file-input-gc.worker.mjs', import.meta.url))], { encoding: 'utf8', timeout: 20000 });
  assert.equal(result.status, 0, result.stderr); assert.match(result.stdout, /released/);
});
test('uncontrolled default files seed construction without proposals and native reset still clears', async t => {
  const f = fixture(t), file = f.file('initial.txt'), changes = [], owner = f.own({ defaultValue: [file], onValueChange: (files, source) => changes.push([files, source]) });
  assert.ok(owner.state.files[0] === file); assert.ok(f.input.files[0] === file); assert.equal(changes.length, 0);
  f.reset(); await Promise.resolve(); assert.equal(owner.state.files.length, 0); assert.deepEqual(changes, [[[], 'reset']]);
});
test('file policy configuration is atomic and keeps canonical matching and native hint defaults with bounded option capture', t => {
  const f = fixture(t), first = f.file('one.txt'), second = f.file('two.txt');
  f.input.accept = '.txt'; f.input.multiple = true;
  const owner = f.own({ defaultValue: [first, second] }), before = owner.getPolicy(), snapshot = owner.getSnapshot();
  assert.equal(owner.syncPolicy({ multiple: false }).error.code, 'form-file-count-exceeded'); assert.equal(owner.getPolicy(), before); assert.equal(f.input.multiple, true);
  assert.equal(owner.syncPolicy({ accept: '.csv', multiple: true }).error.code, 'form-file-type-rejected'); assert.ok(f.input.files[1] === second); assert.equal(f.input.accept, '.txt');
  let reads = 0; const options = { maxFiles: 4, get accept() { reads++; return '.csv'; } };
  assert.equal(owner.syncPolicy(options).error.code, 'form-file-policy-invalid'); assert.equal(reads, 0); assert.equal(owner.getPolicy(), before);
  const valid = { accept: '.txt', multiple: true, maxFiles: 4 }; Object.defineProperty(valid, 'unknown', { enumerable: true, get() { throw Error('unknown options are not copied'); } });
  assert.equal(owner.syncPolicy(valid).ok, true); assert.equal(owner.getPolicy().accept, '.txt'); assert.equal(owner.getPolicy().multiple, true); assert.equal(owner.getPolicy().maxFiles, 4); assert.equal(owner.getSnapshot(), snapshot);
  assert.equal(owner.syncPolicy().ok, true); assert.equal(owner.getPolicy().accept, '.txt'); assert.equal(owner.getPolicy().multiple, true);
});
