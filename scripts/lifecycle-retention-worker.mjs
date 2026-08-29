import assert from 'node:assert/strict';
import { getHeapStatistics } from 'node:v8';
import { Window } from '../packages/dom/node_modules/happy-dom/lib/index.js';
import { createFacadeConnection } from '../packages/core/dist/adapter-runtime.js';
import { unwrap } from '../packages/core/dist/result.js';
import { createCheckbox as createDOMCheckbox } from '../packages/dom/dist/checkbox.js';
import { createForm } from '../packages/dom/dist/form.js';
import {
  createPositionEngine,
  readPositionSourceRegistryDiagnostics,
} from '../packages/dom/dist/internal/positioning/engine.js';
import { createCheckbox as createTerminalCheckbox } from '../packages/terminal/dist/checkbox.js';

if (typeof globalThis.gc !== 'function') throw new Error('Lifecycle retention requires --expose-gc.');

const window = new Window({ url: 'https://sectile.dev/' });
Object.assign(globalThis, {
  FormData: window.FormData,
  HTMLElement: window.HTMLElement,
  Node: window.Node,
});
const resources = installResourceCounters(window);
const baselineListeners = resources.activeListeners();
const baselineRegistry = readPositionSourceRegistryDiagnostics();
const samples = [];

for (let batch = 0; batch < 12; batch += 1) {
  runBatch(window, resources, baselineListeners, baselineRegistry, 1_000);
  window.document.body.replaceChildren();
  forceGC();
  if (batch >= 2) samples.push(getHeapStatistics().used_heap_size);
}

const early = median(samples.slice(0, 3));
const late = median(samples.slice(-3));
const noise = relativeMAD(samples.slice(0, 3));
const band = Math.max(0.05, noise * 3);
assert.ok(late <= early * (1 + band), `lifecycle retained heap grew ${late - early} bytes beyond ${(band * 100).toFixed(2)}%`);
window.close();
process.stdout.write(`${JSON.stringify({ cyclesPerBatch: 1_000, warmupBatches: 2, measuredBatches: 10, earlyMedian: early, lateMedian: late, relativeMAD: noise, band })}\n`);

function runBatch(view, resources, baselineListeners, baselineRegistry, count) {
  const document = view.document;
  for (let index = 0; index < count; index += 1) {
    const facade = unwrap(createFacadeConnection({}, (options) => {
      let state = 0;
      return { ok: true, value: {
        getSnapshot: () => ({ state }),
        handleEvent: () => { state += 1; options.onUpdate?.(); return true; },
        disconnect() {},
      } };
    }));
    const unsubscribe = facade.subscribe(() => {});
    facade.send('toggle');
    unsubscribe();
    facade.destroy();

    const checkboxElement = document.createElement('button');
    const checkbox = createDOMCheckbox({ element: checkboxElement });
    checkbox.destroy();
    const terminal = createTerminalCheckbox();
    terminal.send('toggle');
    terminal.destroy();

    const formElement = document.createElement('form');
    const input = document.createElement('input');
    formElement.append(input);
    const form = createForm({ form: formElement, participants: [{ id: 'field', element: input }] });
    const unsubscribeField = form.subscribeField('field', (field) => field?.dirty ?? false, () => {});
    form.setFieldMeta('field', { dirty: true });
    unsubscribeField();
    form.destroy();
    assert.equal(form.setFieldMeta('field', { dirty: false }), false);

    const reference = document.createElement('button');
    const root = document.createElement('div');
    document.body.append(reference, root);
    const position = createPositionEngine({ root, reference });
    position.connect();
    position.disconnect();
    reference.remove();
    root.remove();
  }
  assert.equal(resources.activeListeners(), baselineListeners);
  assert.equal(resources.activeObservers(), 0);
  assert.equal(resources.pendingFrames(), 0);
  assert.deepEqual(readPositionSourceRegistryDiagnostics(), baselineRegistry);
}

function installResourceCounters(view) {
  const listeners = new WeakMap();
  let activeListeners = 0;
  const prototype = view.EventTarget.prototype;
  const add = prototype.addEventListener;
  const remove = prototype.removeEventListener;
  prototype.addEventListener = function (type, listener, options) {
    if (listener !== null) {
      let byType = listeners.get(this);
      if (byType === undefined) { byType = new Map(); listeners.set(this, byType); }
      const active = byType.get(type) ?? new Set();
      if (!active.has(listener)) { active.add(listener); activeListeners += 1; }
      byType.set(type, active);
    }
    return add.call(this, type, listener, options);
  };
  prototype.removeEventListener = function (type, listener, options) {
    if (listener !== null && listeners.get(this)?.get(type)?.delete(listener) === true) activeListeners -= 1;
    return remove.call(this, type, listener, options);
  };
  let activeObservers = 0;
  class Observer {
    active = true;
    constructor() { activeObservers += 1; }
    observe() {}
    unobserve() {}
    disconnect() { if (!this.active) return; this.active = false; activeObservers -= 1; }
  }
  view.ResizeObserver = Observer;
  view.IntersectionObserver = Observer;
  let frameSequence = 0;
  const frames = new Map();
  view.requestAnimationFrame = (callback) => { const id = ++frameSequence; frames.set(id, callback); return id; };
  view.cancelAnimationFrame = (id) => { frames.delete(id); };
  return {
    activeListeners: () => activeListeners,
    activeObservers: () => activeObservers,
    pendingFrames: () => frames.size,
  };
}

function forceGC() { for (let index = 0; index < 4; index += 1) globalThis.gc(); }
function median(values) { const sorted = [...values].sort((a, b) => a - b); return sorted[Math.floor(sorted.length / 2)]; }
function relativeMAD(values) {
  const center = median(values);
  if (center === 0) return 0;
  return median(values.map((value) => Math.abs(value - center))) / center;
}
