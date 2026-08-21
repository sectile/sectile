import assert from 'node:assert/strict';
import test from 'node:test';
import { unwrap } from '@sectile/primitives/result';
import { createMultiThumbSlider } from '../dist/multi-thumb-slider.js';

test('DOM multi-thumb slider projects constrained thumb values', () => {
  const root = new FakeElement(); const low = new FakeElement(); const high = new FakeElement();
  const slider = unwrap(createMultiThumbSlider({ root, thumbs: ['low', 'high'], min: '0', max: '10', step: '1', defaultValues: [2, 8], policies: { minGap: 2 } }));
  slider.setThumbAttributes(low, 'low'); slider.setThumbAttributes(high, 'high'); slider.handleEvent('end');
  assert.deepEqual(slider.getSnapshot().state.ticks, [6, 8]);
  assert.equal(low.attributes.get('aria-valuenow'), '6'); assert.equal(high.attributes.get('aria-valuenow'), '8');
});

class FakeElement {
  attributes = new Map(); listeners = new Map(); tabIndex = -1;
  setAttribute(name, value) { this.attributes.set(name, value); }
  addEventListener(type, listener) { const listeners = this.listeners.get(type) ?? new Set(); listeners.add(listener); this.listeners.set(type, listeners); }
  removeEventListener(type, listener) { this.listeners.get(type)?.delete(listener); }
  getBoundingClientRect() { return { left: 0, width: 100 }; }
}
