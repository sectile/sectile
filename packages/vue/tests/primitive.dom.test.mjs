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
  getCurrentInstance,
  h,
  mergeProps,
  nextTick,
  ref,
  shallowRef,
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

test('Primitive follows a live exposed Element through component roots and retires it on unmount', async () => {
  const tag = ref('button'), visible = ref(true), primitive = shallowRef();
  let delivered, native, reads = 0;
  const Leaf = defineComponent({ inheritAttrs: false, setup(_props, { attrs, expose }) {
    native = shallowRef(null);
    expose({ get element() { reads++; return native.value; } });
    return () => h(Fragment, null, [h(Comment), visible.value ? h(tag.value, mergeProps(attrs, { ref: native }), 'Live') : h(Comment)]);
  } });
  const Delegate = defineComponent({ inheritAttrs: false, setup(_props, { attrs }) { return () => h(Leaf, attrs); } });
  const app = createApp({ render: () => h(Primitive, { asChild: true, ref: primitive, elementRef: value => { delivered = value; } },
    { default: () => h(Delegate) }) });
  const host = document.createElement('div'); document.body.append(host);
  try {
    app.mount(host); await nextTick(); await nextTick();
    assert.equal(primitive.value.element, host.querySelector('button'));
    assert.equal(delivered, primitive.value.element);
    const first = delivered;
    tag.value = 'a'; await nextTick(); await nextTick();
    assert.equal(primitive.value.element, host.querySelector('a'));
    assert.notEqual(delivered, first);
    visible.value = false; await nextTick(); await nextTick();
    assert.equal(primitive.value.element, null); assert.equal(delivered, null);
    visible.value = true; await nextTick(); await nextTick();
    assert.equal(delivered, host.querySelector('a'));
    const publicView = primitive.value;
    app.unmount();
    assert.equal(publicView.element, null); assert.equal(delivered, null);
    const retired = reads;
    native.value = document.createElement('button'); await nextTick();
    assert.equal(reads, retired); assert.equal(publicView.element, null);
  } finally { if (host.__vue_app__) app.unmount(); host.remove(); }
});

test('Primitive refreshes a directly adopted native-root component after its own local update', async () => {
  const tag = ref('button'); let element;
  const Child = defineComponent({ setup() { return () => h(tag.value, null, 'Root'); } });
  const app = createApp({ render: () => h(Primitive, { asChild: true, elementRef: value => { element = value; } }, { default: () => h(Child) }) });
  const host = document.createElement('div'); document.body.append(host);
  try {
    app.mount(host); await nextTick(); assert.equal(element, host.querySelector('button'));
    tag.value = 'a'; await nextTick(); await nextTick(); assert.equal(element, host.querySelector('a'));
  } finally { app.unmount(); host.remove(); }
});

test('Primitive element resolution visits only its component-root chain', async () => {
  const depth = 32, instances = [], published = shallowRef(null);
  let Child = defineComponent({ setup(_props, { expose }) {
    expose({ element: published }); return () => h('button', { ref: published }, 'Leaf');
  } });
  for (let index = 0; index < depth; index++) {
    const Next = Child;
    Child = defineComponent({ setup() { instances.push(getCurrentInstance()); return () => h(Next); } });
  }
  const primitive = shallowRef();
  const app = createApp({ render: () => h(Primitive, { ref: primitive, asChild: true }, { default: () => h(Child) }) });
  const host = document.createElement('div'); document.body.append(host);
  try {
    app.mount(host); await nextTick();
    let reads = 0;
    for (const instance of instances) {
      let tree = instance.subTree;
      Object.defineProperty(instance, 'subTree', { configurable: true, get() { reads++; return tree; }, set(next) { tree = next; } });
    }
    const replacement = document.createElement('button');
    published.value = replacement; await nextTick(); await nextTick();
    assert.equal(primitive.value.element, replacement);
    assert.ok(reads >= depth && reads <= depth * 2 + 4, `${reads} component-root reads for depth ${depth}`);
  } finally { app.unmount(); host.remove(); }
});

test('Primitive exposed payload releases disconnected nodes after nested adoption', async () => {
  if (typeof globalThis.gc !== 'function') {
    const { spawnSync } = await import('node:child_process');
    const { fileURLToPath } = await import('node:url');
    const result = spawnSync(process.execPath, ['--expose-gc', '--test', '--test-name-pattern=Primitive exposed payload releases', fileURLToPath(import.meta.url)],
      { encoding: 'utf8', timeout: 20000 });
    assert.equal(result.status, 0, result.stdout + result.stderr);
    return;
  }
  async function cycle() {
    const primitive = shallowRef(), host = document.createElement('div'); document.body.append(host);
    const app = createApp({ render: () => h(Primitive, { asChild: true, ref: primitive }, {
      default: () => h(Primitive, { asChild: true }, { default: () => h(Fragment, null, [h('button', 'Collect')]) }),
    }) });
    app.mount(host); await nextTick(); await nextTick();
    const weak = new WeakRef(host.querySelector('button')), view = primitive.value.$.exposed;
    app.unmount(); host.remove();
    assert.equal(view.element, null);
    return { weak, view };
  }
  const saved = [];
  for (let index = 0; index < 16; index++) saved.push(await cycle());
  await browserWindow.happyDOM.waitUntilComplete();
  const { setImmediate } = await import('node:timers/promises');
  for (let attempt = 0; attempt < 30; attempt++) {
    await setImmediate(); globalThis.gc(); await setImmediate();
    if (saved.every(({ weak }) => weak.deref() === undefined)) break;
  }
  assert.ok(saved.every(({ weak, view }) => weak.deref() === undefined && view.element === null));
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
