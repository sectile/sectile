import assert from 'node:assert/strict';
import test from 'node:test';
import { unwrap } from '@sectile/core/result';
import { createRange } from '@sectile/core/range';
import {
  createSlider,
  tryCreateSlider,
  createSliderController,
  toSliderEffect,
  toSliderEvent,
} from '../.verification-dist/slider.js';

test('DOM slider facade constructs a bounded range and owns keyboard ARIA updates', () => {
  const root = new FakeElement();
  let updates = 0;
  const connection = createSlider({
    min: '0',
    max: '1',
    step: '0.25',
    root,
    label: 'Opacity',
    defaultValue: 1,
    onUpdate: () => { updates += 1; },
  });
  assert.equal(connection.getValue(), '0.25');
  assert.equal(root.attributes.get('role'), 'slider');
  assert.equal(root.attributes.get('aria-valuetext'), '0.25');
  assert.equal(root.attributes.get('aria-label'), 'Opacity');
  assert.equal(connection.handleKeyboardEvent(keyboardEvent('ArrowRight')), true);
  assert.equal(connection.handleKeyboardEvent(keyboardEvent('Enter')), false);
  assert.equal(connection.getValue(), '0.5');
  assert.equal(root.attributes.get('aria-valuemin'), '0');
  assert.equal(root.attributes.get('aria-valuemax'), '1');
  assert.equal(root.attributes.get('aria-valuenow'), '0.5');
  assert.equal(root.attributes.get('aria-orientation'), 'horizontal');
  assert.equal(updates, 1);
  connection.disconnect();
  assert.equal(root.listeners.get('keydown')?.size ?? 0, 0);

  const invalid = tryCreateSlider({ min: '1', max: '0', step: '0.25', root: new FakeElement() });
  assert.equal(invalid.ok, false);
});

test('DOM keys map onto slider semantic events', () => {
  assert.equal(toSliderEvent({ key: 'ArrowRight' }), 'increment');
  assert.equal(toSliderEvent({ key: 'ArrowDown' }), 'decrement');
  assert.equal(toSliderEvent({ key: 'PageUp' }), 'page-up');
  assert.equal(toSliderEvent({ key: 'PageDown' }), 'page-down');
  assert.equal(toSliderEvent({ key: 'Home' }), 'home');
  assert.equal(toSliderEvent({ key: 'End' }), 'end');
  assert.equal(toSliderEvent({ key: 'ArrowRight', metaKey: true }), null);
});

test('DOM slider maps pointer position onto an exact tick', () => {
  const root = new FakeElement();
  const connection = createSlider({
    min: '0',
    max: '1',
    step: '0.25',
    root,
  });
  root.emit('pointerdown', pointerEvent(75));
  root.emit('pointerup', pointerEvent(75));
  assert.equal(connection.getSnapshot().state.tick, 3);
  assert.equal(connection.getValue(), '0.75');
});

test('DOM slider preserves a composed public scope and part across refreshes', () => {
  const root = new FakeElement();
  const connection = createSlider({
    min: '0',
    max: '100',
    step: '10',
    root,
    role: 'separator',
    scope: 'window-splitter',
    part: 'handle',
  });
  assert.equal(root.attributes.get('data-scope'), 'window-splitter');
  assert.equal(root.attributes.get('data-part'), 'handle');
  connection.handleKeyboardEvent(keyboardEvent('ArrowRight'));
  assert.equal(root.attributes.get('data-scope'), 'window-splitter');
  assert.equal(root.attributes.get('data-part'), 'handle');
});

test('DOM vertical slider maps its top edge to the upper value', () => {
  const root = new FakeElement();
  const connection = createSlider({
    min: '-1',
    max: '1',
    step: '0.5',
    root,
    orientation: 'vertical',
    formatValue: (value) => `${value} units`,
  });
  root.emit('pointerdown', { clientX: 0, clientY: 0, pointerId: 1, preventDefault() {} });
  assert.equal(connection.getValue(), '1');
  assert.equal(root.attributes.get('aria-valuenow'), '1');
  assert.equal(root.attributes.get('aria-valuetext'), '1 units');
  assert.equal(root.attributes.get('aria-orientation'), 'vertical');
});

test('DOM slider commands project into range effects', () => {
  assert.deepEqual(toSliderEffect({ type: 'announce-tick', tick: 3 }), {
    type: 'set-range-value',
    tick: 3,
  });
});

test('DOM slider controller supports uncontrolled state', () => {
  const controller = unwrap(createSliderController({
    range: range(),
    defaultValue: 1,
  }));
  const result = controller.handleKeyboardInput({ key: 'ArrowRight' });
  assert.equal(result.ok, true);
  assert.equal(result.snapshot.state.tick, 2);
  assert.deepEqual(result.commands, [{ type: 'set-range-value', tick: 2 }]);
});

test('DOM slider controller proposes controlled changes until synchronized', () => {
  const changes = [];
  const controller = unwrap(createSliderController({
    range: range(),
    value: 1,
    onValueChange(change) {
      changes.push(change);
    },
  }));
  const result = controller.handleKeyboardInput({ key: 'ArrowRight' });
  assert.equal(result.ok, true);
  assert.equal(result.snapshot.state.tick, 1);
  assert.deepEqual(result.commands, [{ type: 'set-range-value', tick: 2 }]);
  assert.deepEqual(changes, [{ value: 2, previousValue: 1 }]);
  const synchronized = unwrap(controller.syncControlledValues({ value: 2 }));
  assert.equal(synchronized.state.tick, 2);
});

test('unsupported and stale DOM slider inputs are failure-atomic', () => {
  const controller = unwrap(createSliderController({ range: range() }));
  const initial = controller.getSnapshot();
  const unsupported = controller.handleKeyboardInput({ key: 'Enter' });
  assert.equal(unsupported.ok, false);
  assert.equal(unsupported.snapshot, initial);
  const stale = controller.handleKeyboardInput({ key: 'ArrowRight' }, 1);
  assert.equal(stale.ok, false);
  assert.equal(stale.error.code, 'stale-revision');
  assert.equal(stale.snapshot, initial);
});

function range() {
  return createRange({ origin: '0', step: '0.5', count: 5 });
}

function keyboardEvent(key) {
  return { key, altKey: false, ctrlKey: false, metaKey: false, preventDefault() {} };
}

function pointerEvent(clientX) {
  return { type: 'pointerdown', clientX, pointerId: 1, preventDefault() {} };
}

class FakeElement {
  attributes = new Map();
  listeners = new Map();
  tabIndex = -1;

  addEventListener(type, listener) {
    const listeners = this.listeners.get(type) ?? new Set();
    listeners.add(listener);
    this.listeners.set(type, listeners);
  }

  removeEventListener(type, listener) {
    this.listeners.get(type)?.delete(listener);
  }

  emit(type, event = {}) {
    event.type = type;
    for (const listener of this.listeners.get(type) ?? []) listener(event);
  }

  getBoundingClientRect() {
    return { left: 0, width: 100, top: 0, bottom: 100, height: 100 };
  }

  setPointerCapture() {}

  releasePointerCapture() {}

  setAttribute(name, value) {
    this.attributes.set(name, value);
  }

  removeAttribute(name) {
    this.attributes.delete(name);
  }
}
