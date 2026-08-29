import assert from 'node:assert/strict';
import test from 'node:test';
import { renderToString } from '@vue/server-renderer';
import { createSSRApp, h, nextTick, ref } from 'vue';
import {
  SpinButtonDecrement,
  SpinButtonIncrement,
  SpinButtonInput,
  SpinButtonRoot,
} from '../.verification-dist/spin-button.js';
import { createHostNode, createTestRenderer } from './renderer.mjs';

class TestHTMLInputElement {
  constructor() {
    this.type = 'input';
    this.text = '';
    this.props = {};
    this.children = [];
    this.parent = null;
    this.value = '';
    this.disabled = false;
    this.readOnly = false;
    this.listeners = new Map();
  }

  addEventListener(type, listener) { this.listeners.set(type, listener); }
  removeEventListener(type) { this.listeners.delete(type); }
  setAttribute(name, value) { this.props[name] = value; }
}

test('Vue spin button renders a native input and optional compound controls', async () => {
  const app = createSSRApp({
    render: () => h(SpinButtonRoot, {
      min: '-1', max: '2', step: '0.5', defaultValue: '0', label: 'Opacity',
    }, {
      default: () => [
        h(SpinButtonDecrement, null, { default: () => 'Decrease' }),
        h(SpinButtonInput, { name: 'opacity' }),
        h(SpinButtonIncrement, null, { default: () => 'Increase' }),
      ],
    }),
  });
  const html = await renderToString(app);
  assert.match(html, /role="spinbutton"/);
  assert.match(html, /aria-valuemin="-1"/);
  assert.match(html, /aria-valuemax="2"/);
  assert.match(html, /aria-valuenow="0"/);
  assert.match(html, /name="opacity"/);
  assert.match(html, /data-part="decrement"/);
  assert.match(html, /data-part="increment"/);
});

test('Vue spin button forwards its host input before connecting the DOM adapter', () => {
  const previousHTMLInputElement = globalThis.HTMLInputElement;
  globalThis.HTMLInputElement = TestHTMLInputElement;

  try {
    const renderer = createTestRenderer({
      createElement: (type) => type === 'input' ? new TestHTMLInputElement() : createHostNode(type),
    });
    const app = renderer.createApp({
      render: () => h(SpinButtonRoot, {
        min: 0,
        max: 10,
        defaultValue: 3,
        label: 'Quantity',
      }, {
        default: () => h(SpinButtonInput),
      }),
    });
    const container = createHostNode('root');

    app.mount(container);

    const input = container.children[0].children[0];
    assert.ok(input instanceof TestHTMLInputElement);
    assert.equal(input.props['aria-valuenow'], '3');
    assert.equal(input.props['aria-label'], 'Quantity');
    assert.deepEqual([...input.listeners.keys()].sort(), ['blur', 'input', 'keydown']);
  } finally {
    if (previousHTMLInputElement === undefined) delete globalThis.HTMLInputElement;
    else globalThis.HTMLInputElement = previousHTMLInputElement;
  }
});

test('Vue spin button reconfigures interaction when readonly changes', async () => {
  const previousHTMLInputElement = globalThis.HTMLInputElement;
  globalThis.HTMLInputElement = TestHTMLInputElement;

  try {
    const readonly = ref(true);
    const updates = [];
    const renderer = createTestRenderer({
      createElement: (type) => type === 'input' ? new TestHTMLInputElement() : createHostNode(type),
    });
    const app = renderer.createApp({
      render: () => h(SpinButtonRoot, {
        min: 0,
        max: 10,
        modelValue: 3,
        readonly: readonly.value,
        'onUpdate:modelValue': (value) => updates.push(value),
      }, {
        default: () => [
          h(SpinButtonDecrement),
          h(SpinButtonInput),
          h(SpinButtonIncrement),
        ],
      }),
    });
    const container = createHostNode('root');

    app.mount(container);
    const root = container.children[0];
    const input = root.children[1];
    const increment = root.children[2];

    input.value = '4';
    input.listeners.get('input')();
    input.listeners.get('blur')();
    assert.deepEqual(updates, []);

    readonly.value = false;
    await nextTick();

    input.value = '4';
    input.listeners.get('input')();
    input.listeners.get('blur')();
    assert.deepEqual(updates, ['4']);

    increment.props.onClick({ defaultPrevented: false });
    assert.deepEqual(updates, ['4', '4']);

    await nextTick();
    app.unmount();
    await nextTick();
  } finally {
    if (previousHTMLInputElement === undefined) delete globalThis.HTMLInputElement;
    else globalThis.HTMLInputElement = previousHTMLInputElement;
  }
});
