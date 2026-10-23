import assert from 'node:assert/strict';
import { setImmediate } from 'node:timers/promises';
import { Window } from 'happy-dom';
import { createFileInput } from '../.verification-dist/form/file-input/connection.js';

async function dispose() {
  const window = new Window(), input = window.document.createElement('input'); input.type = 'file'; window.document.body.append(input);
  const file = new window.File(['payload'], 'retained.txt');
  const owner = createFileInput({ element: input, value: [file], onValueChange: () => input.focus(), onReject: () => window.close() });
  const references = [new WeakRef(input), new WeakRef(window), new WeakRef(file)], refresh = owner.refresh;
  owner.destroy(); await window.happyDOM.close(); return { owner, refresh, references };
}
const held = await dispose();
for (let index = 0; index < 20; index++) { await setImmediate(); global.gc(); }
assert.equal(held.owner.state.files.length, 0); held.refresh();
for (const reference of held.references) assert.equal(reference.deref(), undefined, 'disposed file owner retained input, realm or file');
console.log('released');
