import assert from 'node:assert/strict';
import { setImmediate } from 'node:timers/promises';
import { Window } from 'happy-dom';
import { tryCreateNativeFileListBinding } from '../.verification-dist/form/file-input/native-files.js';

// A separate process makes real GC available without changing normal tests.
async function releasedBinding() {
  const window = new Window(), input = window.document.createElement('input'); input.type = 'file'; window.document.body.append(input);
  const result = tryCreateNativeFileListBinding(input); assert.equal(result.ok, true);
  const write = result.value.write.bind(result.value), inputReference = new WeakRef(input), realmReference = new WeakRef(window);
  result.value.disconnect(); await window.happyDOM.close();
  return { write, inputReference, realmReference };
}
const retained = await releasedBinding();
for (let attempt = 0; attempt < 20; attempt++) { await setImmediate(); global.gc(); }
assert.equal(retained.write([], []).error.code, 'dom.file-input-disconnected');
assert.ok(retained.inputReference.deref() === undefined, 'detached binding retained the input');
assert.ok(retained.realmReference.deref() === undefined, 'detached binding retained the realm');
console.log('released');
