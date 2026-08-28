import assert from 'node:assert/strict';
import test from 'node:test';
import { createTestWindow } from './happy-dom.mjs';

const browserWindow = createTestWindow({ url: 'https://sectile.dev/' });
Object.assign(globalThis, {
  window: browserWindow,
  document: browserWindow.document,
  Node: browserWindow.Node,
  Element: browserWindow.Element,
  HTMLElement: browserWindow.HTMLElement,
  SVGElement: browserWindow.SVGElement,
  Event: browserWindow.Event,
});

const {
  Comment,
  Fragment,
  createApp,
  createSSRApp,
  defineComponent,
  h,
  mergeProps,
  nextTick,
  ref,
  renderSlot,
} = await import('vue');
const { renderToString } = await import('@vue/server-renderer');
const { Primitive } = await import('../.verification-dist/primitive.js');

test('Primitive resolves native, exposed, and simple component element refs', async () => {
  const refs = { native: null, exposed: null, fallback: null };
  const ExposedComponent = defineComponent({
    inheritAttrs: false,
    setup(_props, { attrs, expose }) {
      const element = ref(null);
      expose({ element });
      return () => h(Fragment, null, [
        h(Comment),
        h('button', mergeProps(attrs, { ref: element }), 'Exposed'),
      ]);
    },
  });
  const SimpleComponent = defineComponent({
    setup() {
      return () => h('button', null, 'Fallback');
    },
  });
  const app = createApp({
    render: () => h('div', null, [
      h(Primitive, { asChild: true, role: 'button', elementRef: (value) => { refs.native = value; } }, {
        default: () => h('button', { id: 'native' }, 'Native'),
      }),
      h(Primitive, { asChild: true, role: 'button', elementRef: (value) => { refs.exposed = value; } }, {
        default: () => h(ExposedComponent, { id: 'exposed' }),
      }),
      h(Primitive, { asChild: true, role: 'button', elementRef: (value) => { refs.fallback = value; } }, {
        default: () => h(SimpleComponent, { id: 'fallback' }),
      }),
    ]),
  });
  const host = document.createElement('div');
  document.body.append(host);
  app.mount(host);
  await nextTick();
  try {
    assert.equal(refs.native, host.querySelector('#native'));
    assert.equal(refs.exposed, host.querySelector('#exposed'));
    assert.equal(refs.fallback, host.querySelector('#fallback'));
    assert.equal(refs.exposed.getAttribute('role'), 'button');
    assert.equal(refs.fallback.getAttribute('role'), 'button');
  } finally {
    app.unmount();
    host.remove();
  }
});

test('Primitive rejects a component with no exposed or single element root', () => {
  const MultiRoot = defineComponent({
    inheritAttrs: false,
    setup() {
      return () => h(Fragment, null, [h('span', null, 'One'), h('span', null, 'Two')]);
    },
  });
  const app = createApp({
    render: () => h(Primitive, { asChild: true, elementRef: () => {} }, {
      default: () => h(MultiRoot),
    }),
  });
  app.config.warnHandler = () => {};
  const host = document.createElement('div');
  document.body.append(host);
  let mounted = false;
  try {
    assert.throws(() => {
      app.mount(host);
      mounted = true;
    }, /must expose `element` or render one element root/);
  } finally {
    if (mounted) app.unmount();
    host.remove();
  }
});

test('Primitive preserves scoped slotted projection through nested fragments', async () => {
  const ScopedForwarder = defineComponent({
    inheritAttrs: false,
    setup(_props, { attrs, slots }) {
      return () => h(Primitive, { ...attrs, asChild: true }, {
        default: () => renderSlot(slots, 'default'),
      });
    },
  });
  ScopedForwarder.__scopeId = 'data-v-primitive';
  const app = createApp({
    render: () => h(ScopedForwarder, { role: 'button' }, {
      default: () => h(Fragment, { key: 'outer' }, [
        h(Comment),
        h(Fragment, { key: 'inner' }, [h('button', { id: 'scoped' }, 'Scoped')]),
      ]),
    }),
  });
  const host = document.createElement('div');
  document.body.append(host);
  app.mount(host);
  await nextTick();
  try {
    const button = host.querySelector('#scoped');
    assert.ok(button instanceof HTMLElement);
    assert.equal(button.getAttribute('role'), 'button');
    assert.equal(button.hasAttribute('data-v-primitive-s'), true);
  } finally {
    app.unmount();
    host.remove();
  }
});

test('[HYD-01] Primitive hydrates a nested adopted slot without warnings', async () => {
  const component = {
    render: () => h(Primitive, { asChild: true, role: 'checkbox', 'aria-checked': 'false' }, {
      default: () => h(Fragment, { key: 'outer' }, [
        h(Comment, null, 'slot-start'),
        h(Fragment, { key: 'inner' }, [h('button', { id: 'hydrated' }, 'Hydrated')]),
        h(Comment, null, 'slot-end'),
      ]),
    }),
  };
  const html = await renderToString(createSSRApp(component));
  const host = document.createElement('div');
  host.innerHTML = html;
  document.body.append(host);
  const warnings = [];
  const app = createSSRApp(component);
  app.config.warnHandler = (message) => { warnings.push(message); };
  app.mount(host);
  await nextTick();
  try {
    const button = host.querySelector('#hydrated');
    assert.ok(button instanceof HTMLElement);
    assert.equal(button.getAttribute('role'), 'checkbox');
    assert.equal(button.getAttribute('aria-checked'), 'false');
    assert.deepEqual(warnings, []);
  } finally {
    app.unmount();
    host.remove();
  }
});
