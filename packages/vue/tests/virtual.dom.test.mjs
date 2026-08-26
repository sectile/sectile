import assert from 'node:assert/strict';
import test from 'node:test';
import { Window } from 'happy-dom';

const browserWindow = new Window({ url: 'https://sectile.dev/' });

class FakeResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

browserWindow.ResizeObserver = FakeResizeObserver;
Object.assign(globalThis, {
  window: browserWindow,
  document: browserWindow.document,
  Node: browserWindow.Node,
  Element: browserWindow.Element,
  HTMLElement: browserWindow.HTMLElement,
  SVGElement: browserWindow.SVGElement,
  MutationObserver: browserWindow.MutationObserver,
});

const { createApp, h, nextTick, ref, shallowRef } = await import('vue');
const { VirtualizerContent, VirtualizerRoot } = await import('../dist/virtual.js');

test('Vue virtualizer owns frame-local state and keeps construction options fixed', async () => {
  const host = document.createElement('div');
  document.body.append(host);
  const root = ref();
  const strategy = shallowRef(createStrategy(1));
  const changes = [];
  const warnings = [];
  const previousWarn = console.warn;
  console.warn = (message) => warnings.push(message);
  const app = createApp({
    render: () => h(VirtualizerRoot, {
      ref: root,
      defaultState: Object.freeze({ value: 0, generation: 0 }),
      strategy: strategy.value,
      initialViewport: Object.freeze({ x: 0, y: 0, width: 100, height: 80 }),
      onStateChange: (state) => changes.push(state.value),
    }, {
      default: ({ state }) => h(VirtualizerContent, null, {
        default: () => String(state.value),
      }),
    }),
  });

  try {
    app.mount(host);
    await settle();
    assert.equal(host.textContent, '0');

    const first = root.value.mutate(2);
    await settle();
    assert.equal(first.ok, true);
    assert.equal(host.textContent, '2');
    assert.deepEqual(changes, [2]);

    strategy.value = createStrategy(100);
    await settle();
    assert.equal(warnings.length, 1);
    assert.match(warnings[0], /construction-time options/);

    root.value.mutate(3);
    await settle();
    assert.equal(host.textContent, '5');
    assert.deepEqual(changes, [2, 5]);
  } finally {
    console.warn = previousWarn;
    app.unmount();
    host.remove();
  }
});

async function settle() {
  await nextTick();
  await nextTick();
}

function createStrategy(multiplier) {
  return Object.freeze({
    kind: `test-${multiplier}`,
    tryQuery: (state, input) => success(Object.freeze({
      generation: state.generation,
      contentSize: Object.freeze({ width: 100, height: 80 }),
      viewport: Object.freeze({ ...input.viewport }),
      renderBounds: Object.freeze({ ...input.viewport }),
      placements: Object.freeze([]),
      anchor: null,
    })),
    tryMeasure: (state) => mutation(state),
    tryMutate: (state, { mutation: amount }) => mutation(Object.freeze({
      value: state.value + amount * multiplier,
      generation: state.generation + 1,
    })),
    tryScrollTarget: () => success(Object.freeze({ x: 0, y: 0 })),
  });
}

function mutation(state) {
  return success(Object.freeze({
    state,
    scrollDelta: Object.freeze({ x: 0, y: 0 }),
  }));
}

function success(value) {
  return { ok: true, value };
}
