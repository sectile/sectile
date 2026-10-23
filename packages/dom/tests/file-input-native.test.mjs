import assert from 'node:assert/strict';
import test from 'node:test';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { Window } from 'happy-dom';
import { createFilePolicy } from '@sectile/form/files';
import { tryCreateNativeFileListBinding } from '../.verification-dist/form/file-input/native-files.js';

function fixture(t) {
  const window = new Window(), input = window.document.createElement('input'); input.type = 'file'; input.multiple = true;
  window.document.body.append(input); t.after(() => window.happyDOM.close());
  const file = name => new window.File([name], name, { type: 'text/plain' });
  const set = files => { const data = new window.DataTransfer(); for (const file of files) data.items.add(file); input.files = data.files; };
  const descriptor = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'files');
  return { window, input, file, set, descriptor };
}
test('native file preflight leaves the real input intact and FileList admission preserves one canonical snapshot', t => {
  const f = fixture(t), first = f.file('first.txt'), next = f.file('next.txt'); f.set([first]);
  f.input.setAttribute('aria-label', 'Attachments'); f.input.setAttribute('name', 'attachments');
  const before = f.input.outerHTML, binding = tryCreateNativeFileListBinding(f.input);
  assert.equal(binding.ok, true); assert.equal(f.input.outerHTML, before); assert.ok(f.input.files[0] === first);
  const admitted = createFilePolicy({ multiple: true, accept: '.txt' }).validate(f.input.files);
  assert.equal(admitted.ok, true); assert.ok(admitted.value.files[0] === first);
  assert.equal(binding.value.write([next], admitted.value.files).ok, true); assert.ok(f.input.files[0] === next);
  binding.value.disconnect();
});
test('native file construction rejects missing capability without clearing existing selections', t => {
  const f = fixture(t), first = f.file('first.txt'); f.set([first]);
  Object.defineProperty(f.window, 'DataTransfer', { configurable: true, value: undefined });
  const result = tryCreateNativeFileListBinding(f.input);
  assert.equal(result.ok, false); assert.equal(result.error.code, 'dom.file-input-capability-missing');
  assert.ok(f.input.files[0] === first); assert.equal(f.input.disabled, false);
});
test('each prepared native FileList is materialized once and the verified list is written', t => {
  const f = fixture(t), first = f.file('first.txt'), next = f.file('next.txt'); f.set([first]);
  const Transfer = f.window.DataTransfer; let created = 0, reads = 0;
  class CountedTransfer extends Transfer {
    constructor() { super(); created++; }
    get files() { reads++; return super.files; }
  }
  Object.defineProperty(f.window, 'DataTransfer', { configurable: true, value: CountedTransfer });
  const result = tryCreateNativeFileListBinding(f.input); assert.equal(result.ok, true);
  assert.equal(result.value.write([next], [first]).ok, true); assert.ok(f.input.files[0] === next);
  assert.ok(created > 0); assert.equal(reads, created); result.value.disconnect();
});
test('native file assignment rejects metadata lookalikes and accepts native files from another simulated realm', t => {
  const f = fixture(t), original = f.file('original.txt'); f.set([original]);
  const binding = tryCreateNativeFileListBinding(f.input).value;
  const forged = binding.write([{ name: 'forged.txt', size: 0, type: 'text/plain' }], [original]);
  assert.equal(forged.ok, false); assert.equal(forged.error.code, 'dom.file-input-file-invalid'); assert.ok(f.input.files[0] === original);
  const other = new Window(); t.after(() => other.happyDOM.close());
  const crossRealm = new other.File(['other'], 'other.txt');
  assert.equal(binding.write([crossRealm], [original]).ok, true); assert.ok(f.input.files[0] === crossRealm);
  binding.disconnect();
});
test('native file assignment restores accepted identities when the proposed setter throws', t => {
  const f = fixture(t), original = f.file('original.txt'), next = f.file('next.txt'); f.set([original]);
  const binding = tryCreateNativeFileListBinding(f.input).value; let writes = 0;
  Object.defineProperty(f.input, 'files', { configurable: true,
    get() { return f.descriptor.get.call(this); }, set(value) { if (++writes === 1) throw Error('write refused'); f.descriptor.set.call(this, value); },
  });
  const result = binding.write([next], [original]); assert.equal(result.ok, false); assert.equal(result.error.code, 'dom.file-input-write-failed');
  assert.equal(writes, 2); assert.ok(f.input.files[0] === original); assert.equal(f.input.disabled, false); assert.equal(binding.faulted, false);
  binding.disconnect();
});
test('native file rollback failure quarantines submission and a verified later write recovers it', t => {
  const f = fixture(t), accepted = f.file('accepted.txt'), unsafe = f.file('unsafe.txt'); f.set([accepted]);
  const binding = tryCreateNativeFileListBinding(f.input).value; f.set([unsafe]);
  Object.defineProperty(f.input, 'files', { configurable: true, get() { return f.descriptor.get.call(this); }, set() {} });
  const result = binding.write([accepted], [accepted]);
  assert.equal(result.ok, false); assert.equal(result.error.code, 'dom.file-input-rollback-failed');
  assert.equal(binding.faulted, true); assert.equal(f.input.files.length, 0); assert.equal(f.input.disabled, true);
  delete f.input.files;
  assert.equal(binding.write([accepted], [accepted]).ok, true); assert.ok(f.input.files[0] === accepted);
  assert.equal(f.input.disabled, false); assert.equal(binding.faulted, false); binding.disconnect();
});
test('native file disposal does not reenable quarantined input and saved writes become inert', t => {
  const f = fixture(t), accepted = f.file('accepted.txt'), unsafe = f.file('unsafe.txt'); f.set([accepted]);
  const binding = tryCreateNativeFileListBinding(f.input).value; f.set([unsafe]);
  Object.defineProperty(f.input, 'files', { configurable: true, get() { return f.descriptor.get.call(this); }, set() {} });
  assert.equal(binding.write([accepted], [accepted]).ok, false); const write = binding.write.bind(binding);
  binding.disconnect(); binding.disconnect(); assert.equal(f.input.disabled, true);
  assert.equal(write([], []).error.code, 'dom.file-input-disconnected'); assert.equal(f.input.files.length, 0);
});
test('a former file binding leaves a caller-repurposed input and its value untouched', t => {
  const f = fixture(t), accepted = f.file('accepted.txt'), binding = tryCreateNativeFileListBinding(f.input).value;
  f.input.type = 'text'; f.input.value = 'Caller-owned replacement';
  const result = binding.write([accepted], []);
  assert.equal(result.ok, false); assert.equal(result.error.code, 'dom.file-input-capability-missing');
  assert.equal(f.input.type, 'text'); assert.equal(f.input.value, 'Caller-owned replacement'); assert.equal(f.input.disabled, false);
  binding.disconnect();
});
test('saved disconnected native file methods release input and realm references in an isolated GC worker', () => {
  const result = spawnSync(process.execPath, ['--expose-gc', fileURLToPath(new URL('./file-input-native-gc.worker.mjs', import.meta.url))], { encoding: 'utf8', timeout: 20000 });
  assert.equal(result.status, 0, result.stderr); assert.match(result.stdout, /released/);
});
