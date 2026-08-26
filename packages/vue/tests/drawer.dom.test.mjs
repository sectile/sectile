import assert from 'node:assert/strict';
import test from 'node:test';
import { Window } from 'happy-dom';

const browserWindow = new Window({ url: 'https://sectile.dev/' });
Object.assign(globalThis, {
  window: browserWindow,
  document: browserWindow.document,
  Node: browserWindow.Node,
  Element: browserWindow.Element,
  HTMLElement: browserWindow.HTMLElement,
  HTMLButtonElement: browserWindow.HTMLButtonElement,
  SVGElement: browserWindow.SVGElement,
  Event: browserWindow.Event,
  MutationObserver: browserWindow.MutationObserver,
  getComputedStyle: browserWindow.getComputedStyle.bind(browserWindow),
});

const { createApp, h, nextTick, ref } = await import('vue');
const { DrawerContent, DrawerHandle, DrawerOverlay, DrawerRoot, DrawerTrigger } = await import('../dist/drawer.js');

function pointer(type, x, y = 0) {
  return new browserWindow.PointerEvent(type, {
    bubbles: true,
    composed: true,
    cancelable: true,
    button: 0,
    pointerId: 1,
    pointerType: 'mouse',
    clientX: x,
    clientY: y,
  });
}

test('Vue drawer forwards handle swipes into controlled dismissal and motion projection', async () => {
  const host = document.createElement('div');
  document.body.append(host);
  const open = ref(true);
  const app = createApp({
    render: () => h(DrawerRoot, {
      open: open.value,
      side: 'right',
      swipeThreshold: 80,
      swipeVelocityThreshold: 99,
      'onUpdate:open': (value) => { open.value = value; },
    }, {
      default: () => [
        h(DrawerOverlay),
        h(DrawerContent, null, { default: () => [h(DrawerHandle), h('button', null, 'Close')] }),
      ],
    }),
  });
  app.mount(host);
  try {
    await nextTick();
    await nextTick();
    const content = host.querySelector('[data-part="content"]');
    const handle = host.querySelector('[data-part="handle"]');
    assert.ok(content instanceof HTMLElement);
    assert.ok(handle instanceof HTMLElement);
    content.getBoundingClientRect = () => ({
      x: 0, y: 0, top: 0, left: 0, right: 320, bottom: 400, width: 320, height: 400,
      toJSON() { return this; },
    });

    handle.dispatchEvent(pointer('pointerdown', 0));
    handle.dispatchEvent(pointer('pointermove', 100));
    assert.equal(content.dataset.swipe, 'move');
    assert.equal(content.style.getPropertyValue('--sectile-drawer-swipe-movement-x'), '100px');
    handle.dispatchEvent(pointer('pointerup', 100));
    await nextTick();
    assert.equal(open.value, false);
    assert.equal(content.dataset.state, 'closed');
  } finally {
    app.unmount();
    host.remove();
  }
});

test('Vue drawer trigger opens uncontrolled content', async () => {
  const host = document.createElement('div');
  document.body.append(host);
  const app = createApp({
    render: () => h(DrawerRoot, null, {
      default: () => [
        h(DrawerTrigger, null, { default: () => 'Open filters' }),
        h(DrawerOverlay),
        h(DrawerContent, null, { default: () => [h(DrawerHandle), h('button', null, 'Done')] }),
      ],
    }),
  });
  app.mount(host);
  try {
    await nextTick();
    const trigger = host.querySelector('[data-part="trigger"]');
    const content = host.querySelector('[data-part="content"]');
    assert.ok(trigger instanceof HTMLButtonElement);
    assert.ok(content instanceof HTMLElement);
    trigger.click();
    await nextTick();
    assert.equal(trigger.getAttribute('aria-expanded'), 'true');
    assert.equal(content.dataset.state, 'open');
    assert.equal(content.hidden, false);
  } finally {
    app.unmount();
    host.remove();
  }
});

test('Vue drawer root ignores scoped-style fallthrough attributes without fragment warnings', async () => {
  const host = document.createElement('div');
  document.body.append(host);
  const warnings = [];
  const app = createApp({
    render: () => h(DrawerRoot, { 'data-v-uidrawer': '' }, {
      default: () => [
        h(DrawerTrigger, null, { default: () => 'Open filters' }),
        h(DrawerContent, null, { default: () => 'Filters' }),
      ],
    }),
  });
  app.config.warnHandler = (message) => { warnings.push(message); };
  app.mount(host);
  try {
    await nextTick();
    assert.deepEqual(warnings, []);
  } finally {
    app.unmount();
    host.remove();
  }
});
