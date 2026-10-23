import assert from 'node:assert/strict';
import test from 'node:test';
import { connectSystemAppearance } from '../.verification-dist/appearance.js';

// Simulated native delivery proves resource/translation behavior, not browser media activation.
function fixture() {
  const listeners = new Set(), callbacks = [], values = [];
  let matches = false, failRead = false, failAdd = false, acquisitions = 0;
  const query = { get matches() { if (failRead) throw Error('native read'); return matches; },
    addEventListener(type, callback) { assert.equal(type, 'change'); listeners.add(callback); callbacks.push(callback); if (failAdd) throw Error('native add'); },
    removeEventListener(type, callback) { assert.equal(type, 'change'); listeners.delete(callback); } };
  const document = { nodeType: 9, defaultView: { matchMedia(text) {
    acquisitions++; assert.equal(text, '(prefers-color-scheme: dark)'); return query;
  } } };
  return { document, query, listeners, callbacks, values, options: { document, onChange: value => values.push(value) },
    emit(data) { for (const callback of [...listeners]) callback(data); },
    get acquisitions() { return acquisitions; }, set matches(value) { matches = value; },
    set failRead(value) { failRead = value; }, set failAdd(value) { failAdd = value; } };
}

test('system appearance reads an explicit initial fact, follows native changes and revokes one subscription', () => {
  const f = fixture(), result = connectSystemAppearance(f.options);
  assert.equal(result.ok, true); const connection = result.value;
  assert.equal(connection.appearance, 'light'); assert.equal(f.listeners.size, 1); assert.equal(f.acquisitions, 1);
  assert.deepEqual(f.values, []);
  // Event data is not authority; even a forged payload must reflect the queried native fact.
  f.emit({ matches: true }); assert.deepEqual(f.values, []);
  f.matches = true; f.emit({ matches: false }); f.emit({ matches: false });
  assert.deepEqual(f.values, ['dark']); assert.equal(connection.appearance, 'dark');
  f.matches = false; f.emit(); assert.deepEqual(f.values, ['dark', 'light']);
  connection.disconnect(); connection.disconnect();
  assert.equal(f.listeners.size, 0); assert.equal(connection.appearance, undefined);
  assert.deepEqual(f.values, ['dark', 'light', undefined]);
  for (const callback of f.callbacks) callback({ matches: true });
  assert.deepEqual(f.values, ['dark', 'light', undefined]);
  for (let index = 0; index < 16; index++) {
    f.matches = Boolean(index % 2);
    const next = connectSystemAppearance(f.options).value;
    assert.equal(next.appearance, index % 2 ? 'dark' : 'light'); assert.equal(f.listeners.size, 1);
    next.disconnect(); assert.equal(f.listeners.size, 0);
  }
});

test('unavailable or failing native appearance never leaves a subscription or assumes a light fact', () => {
  const f = fixture();
  assert.equal(connectSystemAppearance({ document: {}, onChange() {} }).error.code, 'dom.appearance-invalid');
  assert.equal(connectSystemAppearance({ document: { nodeType: 9, defaultView: null }, onChange() {} }).error.code, 'dom.appearance-unavailable');
  for (const failure of ['failAdd', 'failRead']) {
    f[failure] = true;
    assert.equal(connectSystemAppearance(f.options).error.code, 'dom.appearance-unavailable');
    assert.equal(f.listeners.size, 0); assert.deepEqual(f.values, []);
    f[failure] = false;
  }
  const connection = connectSystemAppearance(f.options).value;
  f.failRead = true; f.emit();
  assert.equal(connection.appearance, undefined); assert.equal(f.listeners.size, 0); assert.deepEqual(f.values, [undefined]);
  connection.disconnect(); assert.deepEqual(f.values, [undefined]);
  for (const callback of f.callbacks) callback();
  assert.equal(f.listeners.size, 0);
});

test('subscriber failure and reentrant disconnect retire capabilities before further native delivery', () => {
  const f = fixture(); let calls = 0;
  const connection = connectSystemAppearance({ document: f.document, onChange() { calls++; throw Error('subscriber'); } }).value;
  f.matches = true; assert.throws(() => f.emit(), /subscriber/u);
  assert.equal(f.listeners.size, 0); assert.equal(connection.appearance, undefined);
  connection.disconnect(); for (const callback of f.callbacks) callback(); assert.equal(calls, 1);
  let reentrant;
  reentrant = connectSystemAppearance({ document: f.document, onChange(value) {
    f.values.push(value); if (value !== undefined) reentrant.disconnect();
  } }).value;
  f.matches = false; f.emit();
  assert.deepEqual(f.values, ['light', undefined]); assert.equal(f.listeners.size, 0); assert.equal(reentrant.appearance, undefined);
});
