import assert from 'node:assert/strict';
import test from 'node:test';
import { createTestWindow } from './happy-dom.mjs';

const browserWindow = createTestWindow({ url: 'https://sectile.dev/' });
class FakeResizeObserver {
  constructor(callback) { this.callback = callback; this.elements = new Set(); }
  observe(element) { this.elements.add(element); }
  unobserve(element) { this.elements.delete(element); }
  disconnect() { this.elements.clear(); }
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

const { createSSRApp, h, nextTick } = await import('vue');
const { renderToString } = await import('@vue/server-renderer');
const {
  VirtualizerFooter,
  VirtualizerHeader,
  VirtualizerRoot,
  VirtualizerSurface,
} = await import('../.verification-dist/virtual-core.js');

const strategy = Object.freeze({
  kind: 'hydration-virtual',
  tryQuery: (state, input) => ({
    ok: true,
    value: Object.freeze({
      generation: state.generation,
      contentSize: Object.freeze({ width: 100, height: 80 }),
      viewport: Object.freeze({ ...input.viewport }),
      renderBounds: Object.freeze({ ...input.viewport }),
      placements: Object.freeze([]),
      anchor: null,
    }),
  }),
  tryMeasure: (state) => mutation(state),
  tryMutate: (state) => mutation(state),
  tryScrollTarget: () => ({ ok: true, value: Object.freeze({ x: 0, y: 0 }) }),
});

function mutation(state) {
  return {
    ok: true,
    value: Object.freeze({
      state,
      scrollDelta: Object.freeze({ x: 0, y: 0 }),
    }),
  };
}

test('Virtualizer low-level frame anatomy is identical across SSR and hydration', async () => {
  const component = {
    render: () => h(VirtualizerRoot, {
      defaultState: Object.freeze({ generation: 0 }),
      strategy,
      initialViewport: Object.freeze({ x: 0, y: 0, width: 100, height: 80 }),
    }, {
      default: () => [
        h(VirtualizerHeader, null, { default: () => 'header' }),
        h(VirtualizerSurface, null, { default: () => 'surface' }),
        h(VirtualizerFooter, null, { default: () => 'footer' }),
      ],
    }),
  };
  const html = await renderToString(createSSRApp(component));
  assert.match(
    html,
    /data-part="root"[\s\S]*data-part="header"[\s\S]*data-part="surface"[\s\S]*data-part="footer"/u,
  );
  assert.doesNotMatch(html, /data-part="content"/u);

  const host = document.createElement('div');
  host.innerHTML = html;
  document.body.append(host);
  const warnings = [];
  const app = createSSRApp(component);
  app.config.warnHandler = (message) => { warnings.push(message); };
  try {
    app.mount(host);
    await nextTick();
    await nextTick();
    const parts = [...host.querySelectorAll('[data-scope="virtualizer"]')]
      .map((element) => element.getAttribute('data-part'));
    assert.deepEqual(parts, ['root', 'header', 'surface', 'footer']);
    assert.deepEqual(warnings, []);
  } finally {
    app.unmount();
    host.remove();
  }
});
