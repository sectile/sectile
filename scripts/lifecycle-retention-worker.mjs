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
import { createVirtualizer } from '../packages/dom/dist/virtual.js';
import { createCheckbox as createTerminalCheckbox } from '../packages/terminal/dist/checkbox.js';

if (typeof globalThis.gc !== 'function') throw new Error('Lifecycle retention requires --expose-gc.');

const window = new Window({ url: 'https://sectile.dev/' });
Object.assign(globalThis, {
  FormData: window.FormData,
  HTMLElement: window.HTMLElement,
  Node: window.Node,
});
const resources = installResourceCounters(window);
const workload = process.env['SECTILE_LIFECYCLE_WORKLOAD'] ?? 'all';
const heapCheck = workload !== 'position-resources';
const batchCount = heapCheck ? 12 : 3;
const warmupBatches = heapCheck ? 2 : 0;
const measuredBatches = heapCheck ? batchCount - warmupBatches : 0;
const baselineListeners = resources.activeListeners();
const baselineRegistry = readPositionSourceRegistryDiagnostics();
const samples = [];
const virtualState = Object.freeze({ generation: 0 });
const virtualStrategy = Object.freeze({
  kind: 'lifecycle-virtual',
  tryQuery: (state, { viewport }) => ({
    ok: true,
    value: Object.freeze({
      generation: state.generation,
      contentSize: Object.freeze({ width: 1, height: 1 }),
      viewport,
      renderBounds: Object.freeze({
        x: Math.max(0, viewport.x),
        y: Math.max(0, viewport.y),
        width: viewport.width,
        height: viewport.height,
      }),
      placements: Object.freeze([]),
      anchor: null,
    }),
  }),
  tryMeasure: (state) => ({
    ok: true,
    value: Object.freeze({ state, scrollDelta: Object.freeze({ x: 0, y: 0 }) }),
  }),
  tryMutate: (state) => ({
    ok: true,
    value: Object.freeze({ state, scrollDelta: Object.freeze({ x: 0, y: 0 }) }),
  }),
  tryScrollTarget: () => ({ ok: true, value: Object.freeze({ x: 0, y: 0 }) }),
});

for (let batch = 0; batch < batchCount; batch += 1) {
  runBatch(window, resources, baselineListeners, baselineRegistry, 1_000);
  window.document.body.replaceChildren();
  forceGC();
  if (heapCheck && batch >= warmupBatches) samples.push(getHeapStatistics().used_heap_size);
}

const early = heapCheck ? median(samples.slice(0, 3)) : null;
const late = heapCheck ? median(samples.slice(-3)) : null;
const noise = heapCheck ? relativeMAD(samples.slice(0, 3)) : null;
const band = noise === null ? null : Math.max(0.05, noise * 3);
if (early !== null && late !== null && band !== null) {
  assert.ok(late <= early * (1 + band), `lifecycle retained heap grew ${late - early} bytes beyond ${(band * 100).toFixed(2)}%`);
}
window.close();
process.stdout.write(`${JSON.stringify({ workload, cyclesPerBatch: 1_000, batchCount, warmupBatches, measuredBatches, heapCheck, earlyMedian: early, lateMedian: late, relativeMAD: noise, band })}\n`);

function runBatch(view, resources, baselineListeners, baselineRegistry, count) {
  const document = view.document;
  for (let index = 0; index < count; index += 1) {
    if (workload === 'all' || workload === 'facade') {
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
    }

    if (workload === 'all' || workload === 'controls') {
      const checkboxElement = document.createElement('button');
      const checkbox = createDOMCheckbox({ element: checkboxElement });
      checkbox.destroy();
      const terminal = createTerminalCheckbox();
      terminal.send('toggle');
      terminal.destroy();
    }

    if (workload === 'all' || workload === 'form') {
      const formElement = document.createElement('form');
      const input = document.createElement('input');
      formElement.append(input);
      const form = createForm({ form: formElement, participants: [{ id: 'field', element: input }] });
      const unsubscribeField = form.subscribeField('field', (field) => field?.dirty ?? false, () => {});
      form.setFieldMeta('field', { dirty: true });
      unsubscribeField();
      form.destroy();
      assert.equal(form.setFieldMeta('field', { dirty: false }), false);
    }

    if (workload === 'all' || workload === 'virtual') {
      const scrollport = document.createElement('div');
      const surface = document.createElement('div');
      const frame = document.createElement('div');
      const item = document.createElement('div');
      scrollport.append(frame, surface);
      surface.append(item);
      const virtualizer = createVirtualizer({
        scrollport,
        surface,
        state: virtualState,
        strategy: virtualStrategy,
        measure: () => null,
      });
      const unregisterFrame = virtualizer.registerFrame(frame);
      const unregisterItem = virtualizer.registerItem(item, 'item');
      virtualizer.refresh();
      virtualizer.disconnect();
      virtualizer.disconnect();
      unregisterFrame();
      unregisterItem();
    }

    if (workload === 'all' || workload === 'position-resources') {
      const reference = document.createElement('button');
      const root = document.createElement('div');
      // Happy DOM retains computed-style getter allocations for connected nodes.
      // Heap retention therefore uses detached nodes, while a separate workload
      // exercises connected ancestor discovery and verifies every resource count.
      if (workload === 'position-resources') document.body.append(reference, root);
      const position = createPositionEngine({ root, reference });
      position.connect();
      position.disconnect();
      reference.remove();
      root.remove();
    }
  }
  if (workload === 'all' || workload === 'position-resources') {
    view.dispatchEvent(new view.Event('scroll'));
    view.dispatchEvent(new view.Event('resize'));
    document.body.dispatchEvent(new view.Event('scroll'));
    document.documentElement.dispatchEvent(new view.Event('scroll'));
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
