import assert from 'node:assert/strict';
import test from 'node:test';
import { createTimer } from '../dist/timer.js';

test('DOM timer projects parts and owns native action buttons', () => {
  const root = new FakeElement(); const minutes = new FakeElement(); const start = new FakeElement(); const pause = new FakeElement();
  const timer = createTimer({ root, countdown: true, startMs: 60_000, intervalMs: 60_000 });
  timer.setItemAttributes(minutes, 'minutes'); timer.setActionAttributes(start, 'start'); timer.setActionAttributes(pause, 'pause');
  assert.equal(root.attributes.get('role'), 'timer'); assert.equal(minutes.textContent, '01'); assert.equal(pause.disabled, true);
  start.dispatch('click'); assert.equal(timer.getSnapshot().state.running, true); assert.equal(pause.disabled, false);
  timer.handleEvent({ type: 'tick', elapsedMs: 60_000 }); assert.deepEqual(timer.getSnapshot().state, { valueMs: 0, running: false, completed: true }); timer.disconnect();
});

class FakeElement { attributes = new Map(); listeners = new Map(); dataset = {}; disabled = false; type = ''; textContent = ''; setAttribute(name, value) { this.attributes.set(name, value); } removeAttribute(name) { this.attributes.delete(name); } addEventListener(type, listener) { const set = this.listeners.get(type) ?? new Set(); set.add(listener); this.listeners.set(type, set); } removeEventListener(type, listener) { this.listeners.get(type)?.delete(listener); } dispatch(type) { for (const listener of this.listeners.get(type) ?? []) listener({}); } }
