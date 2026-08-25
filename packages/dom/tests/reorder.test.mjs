import assert from 'node:assert/strict';
import test from 'node:test';
import { createReorder } from '../dist/reorder.js';

test('DOM sequence reorder maps keyboard and pointer placement onto stable identities', () => {
  const root = new FakeElement();
  const elements = ['a', 'b', 'c'].map((id, index) => new FakeElement(index * 40));
  const changes = [];
  const reorder = createReorder({
    root,
    ids: ['a', 'b', 'c'],
    onOrderChange: (ids) => changes.push([...ids]),
  });
  elements.forEach((element, index) => reorder.setItemAttributes(element, ['a', 'b', 'c'][index]));

  root.emit('keydown', keyboard(elements[1], 'ArrowUp'));
  assert.deepEqual(reorder.getSnapshot().state.ids, ['b', 'a', 'c']);
  assert.equal(elements[1].attributes.get('aria-posinset'), '1');

  root.emit('pointerdown', pointer(elements[1], 1, 5));
  root.emit('pointermove', pointer(elements[2], 1, 115));
  root.emit('pointerup', pointer(elements[2], 1, 115));
  assert.deepEqual(reorder.getSnapshot().state.ids, ['a', 'c', 'b']);
  assert.deepEqual(changes, [['b', 'a', 'c'], ['a', 'c', 'b']]);
  reorder.disconnect();
});

test('DOM tree reorder supports sibling movement, indent, and outdent', () => {
  const root = new FakeElement();
  const a = new FakeElement(0);
  const b = new FakeElement(40);
  const c = new FakeElement(80);
  const reorder = createReorder({
    root,
    nodes: [
      { id: 'a', parentID: null },
      { id: 'b', parentID: null },
      { id: 'c', parentID: null },
    ],
  });
  reorder.setItemAttributes(a, 'a');
  reorder.setItemAttributes(b, 'b');
  reorder.setItemAttributes(c, 'c');

  root.emit('keydown', keyboard(c, 'ArrowUp'));
  assert.deepEqual(reorder.getSnapshot().state.nodes.map((node) => node.id), ['a', 'c', 'b']);
  root.emit('keydown', keyboard(c, 'ArrowRight'));
  assert.equal(reorder.getSnapshot().state.nodes.find((node) => node.id === 'c').parentID, 'a');
  root.emit('keydown', keyboard(c, 'ArrowLeft'));
  assert.equal(reorder.getSnapshot().state.nodes.find((node) => node.id === 'c').parentID, null);
});

function keyboard(target, key) {
  return { target, key, altKey: true, ctrlKey: false, metaKey: false, preventDefault() {} };
}
function pointer(target, pointerId, clientY) {
  return { target, pointerId, clientX: 0, clientY, button: 0, preventDefault() {} };
}

class FakeElement {
  attributes = new Map();
  dataset = {};
  listeners = new Map();
  tabIndex = -1;
  focused = false;
  constructor(top = 0) { this.top = top; }
  setAttribute(name, value) { this.attributes.set(name, value); }
  addEventListener(type, listener) {
    const listeners = this.listeners.get(type) ?? new Set();
    listeners.add(listener);
    this.listeners.set(type, listeners);
  }
  removeEventListener(type, listener) { this.listeners.get(type)?.delete(listener); }
  emit(type, event) { for (const listener of this.listeners.get(type) ?? []) listener(event); }
  contains(target) { return target === this; }
  getBoundingClientRect() { return { left: 0, top: this.top, width: 100, height: 20 }; }
  setPointerCapture() {}
  releasePointerCapture() {}
  focus() { this.focused = true; }
}
