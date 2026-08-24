import assert from 'node:assert/strict';
import test from 'node:test';
import { createWindowSplitter } from '../dist/window-splitter.js';

test('DOM window splitter reuses range control with separator projection', () => {
  const root = new FakeElement();
  const splitter = createWindowSplitter({
    root, min: '0', max: '10', step: '1', defaultValue: 5,
  });
  assert.equal(root.attributes.get('role'), 'separator');
  splitter.handleEvent('increment');
  assert.equal(splitter.getSnapshot().state.tick, 6);
});

test('DOM vertical window splitter follows its visual drag and arrow direction', () => {
  const root = new FakeElement();
  const splitter = createWindowSplitter({
    root, track: root, min: '0', max: '100', step: '1', defaultValue: 50,
    orientation: 'vertical',
  });

  root.emit('pointerdown', pointerEvent(75));
  root.emit('pointerup', pointerEvent(75));
  assert.equal(splitter.getSnapshot().state.tick, 75);

  assert.equal(splitter.handleKeyboardEvent(keyboardEvent('ArrowUp')), true);
  assert.equal(splitter.getSnapshot().state.tick, 74);
  assert.equal(splitter.handleKeyboardEvent(keyboardEvent('ArrowDown')), true);
  assert.equal(splitter.getSnapshot().state.tick, 75);
});

test('DOM window splitter measures the pane surface but starts dragging only from its handle', () => {
  const handle = new FakeElement();
  const surface = new FakeElement();
  const splitter = createWindowSplitter({
    root: handle, track: surface, min: '0', max: '100', step: '1', defaultValue: 40,
    orientation: 'vertical',
  });

  surface.emit('pointerdown', pointerEvent(70));
  assert.equal(splitter.getSnapshot().state.tick, 40);

  handle.emit('pointerdown', pointerEvent(70));
  handle.emit('pointerup', pointerEvent(70));
  assert.equal(splitter.getSnapshot().state.tick, 70);
});

function pointerEvent(clientY) {
  return { clientX: 0, clientY, pointerId: 1, preventDefault() {} };
}

function keyboardEvent(key) {
  return { key, altKey: false, ctrlKey: false, metaKey: false, preventDefault() {} };
}

class FakeElement {
  attributes = new Map();
  listeners = new Map();
  tabIndex = -1;

  setAttribute(name, value) { this.attributes.set(name, value); }
  removeAttribute(name) { this.attributes.delete(name); }
  addEventListener(type, listener) {
    const listeners = this.listeners.get(type) ?? new Set();
    listeners.add(listener);
    this.listeners.set(type, listeners);
  }
  removeEventListener(type, listener) { this.listeners.get(type)?.delete(listener); }
  emit(type, event) {
    event.type = type;
    for (const listener of this.listeners.get(type) ?? []) listener(event);
  }
  getBoundingClientRect() {
    return { left: 0, width: 100, top: 0, bottom: 100, height: 100 };
  }
  setPointerCapture() {}
  releasePointerCapture() {}
}
