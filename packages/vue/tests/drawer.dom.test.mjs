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
  HTMLButtonElement: browserWindow.HTMLButtonElement,
  SVGElement: browserWindow.SVGElement,
  Event: browserWindow.Event,
  MutationObserver: browserWindow.MutationObserver,
  getComputedStyle: browserWindow.getComputedStyle.bind(browserWindow),
});

const { createApp, h, nextTick, ref, shallowRef, onMounted, onBeforeUnmount } = await import('vue');
const { DrawerContent, DrawerHandle, DrawerOverlay, DrawerPortal, DrawerRoot, DrawerTrigger } = await import('../.verification-dist/overlay/drawer.js');

test('Drawer retained inline projection transfers one subtree and releases popup resources', async () => {
  const host = document.createElement('div'), sidebar = document.createElement('aside'), overlays = document.createElement('div');
  document.body.append(host, sidebar, overlays);
  const placement = shallowRef('inline'), open = shallowRef(false);
  let mounted = 0, unmounted = 0, accepted;
  const nativeListeners = new Map();
  const add = document.addEventListener.bind(document), remove = document.removeEventListener.bind(document);
  document.addEventListener = (type, listener, options) => {
    if (type === 'keydown' || type === 'pointerdown') { const items = nativeListeners.get(type) ?? new Set(); items.add(listener); nativeListeners.set(type, items); }
    add(type, listener, options);
  };
  document.removeEventListener = (type, listener, options) => { nativeListeners.get(type)?.delete(listener); remove(type, listener, options); };
  const listenerCount = () => [...nativeListeners.values()].reduce((total, items) => total + items.size, 0);
  const child = { setup() {
    onMounted(() => { mounted++; }); onBeforeUnmount(() => { unmounted++; });
    return () => h('nav', { 'aria-label': 'Workspace' }, [h('input', { value: 'Search projects' }), h('a', { href: '#project' }, 'Project')]);
  } };
  const app = createApp({ render: () => h(DrawerRoot, {
    presentation: placement.value, open: open.value, unmountOnExit: false,
    'onUpdate:open': value => { open.value = value; },
  }, { default: state => {
    accepted = state.placement;
    return [h(DrawerTrigger, null, { default: () => 'Navigation' }), h(DrawerPortal, { to: state.placement === 'inline' ? sidebar : overlays }, {
      default: () => [h(DrawerOverlay), h(DrawerContent, null, { default: () => [h(DrawerHandle), h(child)] })],
    })];
  } }) });
  const settle = async () => { for (let i = 0; i < 5; i++) await nextTick(); };
  app.mount(host);
  try {
    await settle();
    const content = sidebar.querySelector('[data-part="content"]'), input = sidebar.querySelector('input');
    assert.ok(content); input.value = 'Retained value'; content.scrollTop = 37; input.focus();
    assert.equal(content.hidden, false); assert.equal(content.hasAttribute('role'), false);
    assert.equal(content.hasAttribute('aria-modal'), false); assert.equal(content.inert, false);
    assert.equal(document.activeElement, input); assert.equal(document.body.style.overflow, '');
    assert.equal(listenerCount(), 0);
    host.querySelector('[data-part="trigger"]').click(); await settle(); assert.equal(open.value, false);
    for (let index = 0; index < 12; index++) {
      placement.value = 'overlay'; await settle();
      assert.equal(overlays.querySelector('[data-part="content"]'), content);
      host.querySelector('[data-part="trigger"]').click(); await settle();
      assert.equal(open.value, true); assert.equal(content.getAttribute('role'), 'dialog');
      assert.equal(content.getAttribute('aria-modal'), 'true'); assert.equal(document.body.style.overflow, 'hidden');
      open.value = false; await settle(); placement.value = 'inline'; await settle();
      assert.equal(accepted, 'inline'); assert.equal(sidebar.querySelector('[data-part="content"]'), content);
      assert.equal(content.querySelector('input'), input); assert.equal(input.value, 'Retained value');
      assert.equal(content.scrollTop, 37); assert.equal(content.hidden, false); assert.equal(content.hasAttribute('role'), false);
      assert.equal(document.body.style.overflow, ''); assert.equal(document.querySelectorAll('[data-sectile-focus-guard]').length, 0);
      assert.equal(listenerCount(), 0);
      assert.equal(sidebar.querySelector('[data-part="overlay"]').hidden, true);
    }
    // The same render may return to overlay and request its first opening.
    placement.value = 'overlay'; open.value = true; await settle();
    assert.equal(accepted, 'overlay'); assert.equal(content.hidden, false); assert.equal(content.getAttribute('aria-modal'), 'true');
    assert.equal(mounted, 1); assert.equal(unmounted, 0);
  } finally {
    app.unmount(); host.remove(); sidebar.remove(); overlays.remove();
    document.addEventListener = add; document.removeEventListener = remove;
  }
  assert.equal(unmounted, 1); assert.equal(document.body.style.overflow, '');
  assert.equal(listenerCount(), 0);
  assert.equal(document.querySelectorAll('[data-sectile-focus-guard]').length, 0);
});

test('Drawer inline transfer waits for accepted closure and current exit, preserving refusal and reopen', async () => {
  const host = document.createElement('div'); document.body.append(host);
  const placement = shallowRef('overlay'), open = shallowRef(true), owner = shallowRef();
  const requests = [], errors = []; let state;
  const app = createApp({ render: () => h(DrawerRoot, {
    ref: owner, presentation: placement.value, open: open.value, unmountOnExit: false,
    'onUpdate:open': value => { requests.push(value); },
  }, { default: value => { state = value; return [h(DrawerTrigger), h(DrawerContent, {
    style: { transitionProperty: 'opacity', transitionDuration: '20ms' },
  }, { default: () => h('input') })]; } }) });
  app.config.errorHandler = error => { errors.push(error); };
  const settle = async () => { for (let i = 0; i < 5; i++) await nextTick(); };
  app.mount(host);
  try {
    await settle(); const content = host.querySelector('[data-part="content"]'), input = content.querySelector('input');
    owner.value.requestClose(); await settle();
    assert.deepEqual(requests, [false]); assert.equal(state.open, true); assert.equal(state.placement, 'overlay');
    placement.value = 'inline'; await settle();
    assert.ok(errors.some(error => /closed, retained/.test(error.message)));
    assert.equal(state.placement, 'overlay'); assert.equal(content.getAttribute('aria-modal'), 'true');
    placement.value = 'overlay'; await settle();
    open.value = false; placement.value = 'inline'; await settle();
    assert.equal(state.presentation.phase, 'exiting'); assert.equal(state.placement, 'overlay');
    assert.equal(content.inert, true);
    placement.value = 'overlay'; open.value = true; await settle();
    const active = state.presentation;
    await new Promise(resolve => setTimeout(resolve, 25));
    content.dispatchEvent(new Event('transitionend', { bubbles: true })); await settle();
    assert.equal(state.presentation, active); assert.equal(state.placement, 'overlay'); assert.equal(state.open, true);
    open.value = false; placement.value = 'inline'; await settle();
    assert.equal(state.placement, 'overlay');
    // Cancelling the desired target while closed exit is pending cannot transfer it.
    placement.value = 'overlay'; await settle();
    await new Promise(resolve => setTimeout(resolve, 25));
    content.dispatchEvent(new Event('transitionend', { bubbles: true })); await settle();
    assert.equal(state.placement, 'overlay'); assert.equal(content.hidden, true);
    placement.value = 'inline'; await settle();
    assert.equal(state.placement, 'inline'); assert.equal(content.hidden, false); assert.equal(content.inert, false);
    assert.equal(content.querySelector('input'), input); assert.equal(content.hasAttribute('role'), false);
    open.value = true; await settle();
    assert.equal(state.open, false); assert.equal(state.placement, 'inline');
    // Correcting the rejected placement must reconsider the still-requested open value.
    placement.value = 'overlay'; await settle();
    assert.equal(state.open, true); assert.equal(state.placement, 'overlay');
    assert.equal(content.getAttribute('aria-modal'), 'true');
  } finally { app.unmount(); host.remove(); }
  assert.equal(document.body.style.overflow, '');
});

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
  const side = ref('bottom');
  const app = createApp({
    render: () => h(DrawerRoot, {
      open: open.value,
      side: side.value,
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
    side.value = 'right'; await nextTick(); await nextTick();
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

test('Vue drawer content forwards final samples, cancellation and controlled refusal without replacing keyboard close', async () => {
  const host = document.createElement('div'); document.body.append(host);
  const open = shallowRef(true), requests = [], reasons = []; let accept = false;
  const app = createApp({ render: () => h(DrawerRoot, {
    open: open.value, side: 'bottom', swipeVelocityThreshold: 99,
    'onUpdate:open': value => { requests.push(value); if (accept) open.value = value; },
    onCloseRequest: reason => reasons.push(reason),
  }, { default: () => h(DrawerContent, null, { default: () => [h('input'), h('div', { 'data-test': 'body' }, 'Details')] }) }) });
  const settle = async () => { for (let i = 0; i < 4; i++) await nextTick(); };
  app.mount(host);
  try {
    await settle();
    const content = host.querySelector('[data-part="content"]'), body = host.querySelector('[data-test="body"]'), input = host.querySelector('input');
    content.getBoundingClientRect = () => ({ height: 400, width: 320 });
    const send = (target, type, y) => target.dispatchEvent(pointer(type, 0, y));
    send(input, 'pointerdown', 0); send(input, 'pointermove', 120); send(input, 'pointerup', 120);
    assert.deepEqual(requests, []);
    send(body, 'pointerdown', 0); send(body, 'pointermove', 120); send(body, 'pointercancel', 120);
    assert.equal(content.dataset.swipe, 'cancel'); assert.deepEqual(requests, []);
    send(body, 'pointerdown', 0); send(body, 'pointermove', 120); send(body, 'pointerup', 20);
    assert.deepEqual(requests, []); assert.equal(open.value, true);
    send(body, 'pointerdown', 0); send(body, 'pointermove', 20); send(body, 'pointerup', 120);
    await settle();
    assert.deepEqual(requests, [false]); assert.equal(open.value, true);
    assert.deepEqual(reasons, ['swipe']);
    assert.equal(content.dataset.state, 'open');
    accept = true;
    document.dispatchEvent(new browserWindow.KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    await settle();
    assert.deepEqual(requests, [false, false]); assert.equal(open.value, false);
    assert.deepEqual(reasons, ['swipe', 'escape']);
    assert.equal(content.dataset.state, 'closed');
  } finally { app.unmount(); host.remove(); }
  assert.equal(document.body.style.overflow, '');
  assert.equal(document.querySelectorAll('[data-sectile-focus-guard]').length, 0);
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
