import assert from 'node:assert/strict';
import test from 'node:test';
import { createTestWindow } from './happy-dom.mjs';

const browserWindow = createTestWindow({ url: 'http://localhost/' });
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
});

const { createApp, defineComponent, h, nextTick, ref } = await import('vue');
const { ToastClose, ToastDescription, ToastProvider, ToastRoot, ToastTitle, ToastViewport, useToast } = await import('../.verification-dist/toast.js');

async function settle() {
  await nextTick();
  await nextTick();
}

test('useToast exposes user-rendered toast state and commands to setup descendants', async (t) => {
  let toast;
  const Consumer = defineComponent({
    setup() { toast = useToast(); return () => null; },
  });
  const { app, host } = mount(() => h(ToastProvider, { defaultDurationMs: null }, {
    default: ({ toasts }) => [
      h(Consumer),
      h(ToastViewport, { class: 'user-viewport' }, {
        default: () => toasts.map((item) => h(ToastRoot, { value: item.id, class: 'user-toast' }, {
          default: () => [h(ToastTitle), h(ToastDescription)],
        })),
      }),
    ],
  }));
  t.after(() => unmount(app, host));
  await settle();

  toast.toast({ id: 'manual', title: 'Request pending', description: 'Waiting', durationMs: null });
  await settle();
  assert.equal(toast.toasts.value[0].title, 'Request pending');
  assert.match(host.textContent, /Request pending/);
  assert.equal(host.querySelector('.user-toast').dataset.kind, 'info');

  toast.update('manual', { title: 'Manually updated', kind: 'product-specific' });
  await settle();
  assert.equal(toast.toasts.value[0].title, 'Manually updated');
  assert.equal(toast.toasts.value[0].kind, 'product-specific');
  assert.equal(host.querySelector('.user-toast').dataset.kind, 'product-specific');
  toast.dismiss('manual');

  const result = await completeRequest(toast, 'request', async () => ({ version: '1.0.0' }));
  await settle();
  assert.deepEqual(result, { version: '1.0.0' });
  assert.equal(toast.toasts.value.find((item) => item.id === 'request').title, 'Request complete');
  assert.equal(host.querySelector('[data-sectile-toast-item="request"]').dataset.kind, 'success');

  const failure = new Error('Deployment failed');
  await assert.rejects(completeRequest(toast, 'failure', async () => { throw failure; }), (error) => error === failure);
  await settle();
  assert.equal(toast.toasts.value.find((item) => item.id === 'failure').kind, 'error');

  toast.dismissAll();
  await new Promise((resolve) => setTimeout(resolve, 0));
  await settle();
  assert.equal(toast.toasts.value.length, 0);
});

test('controlled Vue toast accepts timeout removal after its internal countdown', async (t) => {
  const toasts = ref([{ id: 'test', title: 'Test', durationMs: 1 }]);
  const { app, host } = mount(() => h(ToastProvider, {
    toasts: toasts.value,
    'onUpdate:toasts': (items) => { toasts.value = [...items]; },
  }, {
    default: ({ toasts: items }) => h(ToastViewport, null, {
      default: () => items.map((item) => h(ToastRoot, { value: item.id }, { default: () => h(ToastTitle) })),
    }),
  }));
  t.after(() => unmount(app, host));
  await settle();
  await new Promise((resolve) => setTimeout(resolve, 150));
  await settle();
  assert.deepEqual(toasts.value, []);
});

test('controlled Vue toast handles reorder, concurrent exits, and same-ID reactivation without stale removal', async (t) => {
  const a = { id: 'a', title: 'A', durationMs: null };
  const b = { id: 'b', title: 'B', durationMs: null };
  const toasts = ref([a, b]);
  const { app, host } = mount(() => h(ToastProvider, { toasts: toasts.value }, {
    default: ({ toasts: items }) => h(ToastViewport, null, {
      default: () => items.map((item) => h(ToastRoot, { key: item.id, value: item.id, style: { transitionProperty: 'opacity', transitionDuration: '5ms' } }, {
        default: () => [h(ToastTitle), h(ToastClose)],
      })),
    }),
  }));
  t.after(() => unmount(app, host));
  await settle();

  const firstA = host.querySelector('[data-sectile-toast-item="a"]');
  const firstB = host.querySelector('[data-sectile-toast-item="b"]');
  assert.ok(firstA instanceof HTMLElement); assert.ok(firstB instanceof HTMLElement);
  toasts.value = [b, a];
  await settle();
  assert.deepEqual([...host.querySelectorAll('[data-sectile-toast-item]')].map((item) => item.dataset.sectileToastItem), ['b', 'a']);
  assert.equal(host.querySelector('[data-sectile-toast-item="a"]'), firstA);
  assert.equal(host.querySelector('[data-sectile-toast-item="b"]'), firstB);

  toasts.value = [];
  await settle();
  assert.equal(firstA.dataset.state, 'closed'); assert.equal(firstB.dataset.state, 'closed');
  assert.equal(firstA.hidden, false); assert.equal(firstB.hidden, false);
  assert.equal(firstA.inert, true); assert.equal(firstB.inert, true);
  assert.equal(firstA.getAttribute('aria-hidden'), 'true'); assert.equal(firstB.getAttribute('aria-hidden'), 'true');

  toasts.value = [{ ...a, title: 'A again' }];
  await settle();
  assert.equal(host.querySelector('[data-sectile-toast-item="a"]'), firstA);
  assert.equal(firstA.dataset.state, 'open'); assert.equal(firstA.inert, false); assert.equal(firstA.getAttribute('aria-hidden'), null);

  await new Promise((resolve) => setTimeout(resolve, 10));
  firstB.dispatchEvent(new Event('transitionend', { bubbles: true }));
  firstA.dispatchEvent(new Event('transitionend', { bubbles: true }));
  await settle();
  assert.equal(host.querySelector('[data-sectile-toast-item="b"]'), null);
  assert.equal(host.querySelector('[data-sectile-toast-item="a"]'), firstA);
  assert.equal(firstA.dataset.state, 'open');
});

test('uncontrolled Vue toast survives viewport replacement without resurrecting exited items', async (t) => {
  let toast;
  const showViewport = ref(true);
  const viewportKey = ref(0);
  const Consumer = defineComponent({ setup() { toast = useToast(); return () => null; } });
  const { app, host } = mount(() => h(ToastProvider, { defaultDurationMs: null }, {
    default: ({ toasts }) => [
      h(Consumer),
      showViewport.value
        ? h(ToastViewport, { key: viewportKey.value }, {
            default: () => toasts.map((item) => h(ToastRoot, { key: item.id, value: item.id }, { default: () => [h(ToastTitle), h(ToastClose)] })),
          })
        : null,
    ],
  }));
  t.after(() => unmount(app, host));
  await settle();
  toast.toast({ id: 'kept', title: 'Kept', durationMs: null });
  await settle();
  assert.ok(host.querySelector('[data-sectile-toast-item="kept"]') instanceof HTMLElement);

  showViewport.value = false;
  await settle();
  assert.equal(host.querySelector('[data-part="viewport"]'), null);
  assert.equal(toast.toasts.value.map((item) => item.id).includes('kept'), true);

  viewportKey.value += 1;
  showViewport.value = true;
  await settle();
  assert.ok(host.querySelector('[data-sectile-toast-item="kept"]') instanceof HTMLElement);
  assert.deepEqual(toast.toasts.value.map((item) => item.id), ['kept']);

  toast.dismiss('kept');
  await settle();
  assert.equal(host.querySelector('[data-sectile-toast-item="kept"]'), null);
  assert.deepEqual(toast.toasts.value, []);
});

test('useToast rejects setup outside ToastProvider', () => {
  const host = document.createElement('div');
  document.body.append(host);
  const app = createApp(defineComponent({ setup() { useToast(); return () => null; } }));
  const warnings = [];
  app.config.warnHandler = (message) => { warnings.push(message); };
  assert.throws(() => app.mount(host), /useToast must be used inside ToastProvider/);
  assert.ok(warnings.some((message) => message.includes('injection')));
  host.remove();
});

async function completeRequest(toast, id, request) {
  toast.toast({ id, title: 'Request pending', durationMs: null });
  try {
    const result = await request();
    toast.update(id, { title: 'Request complete', kind: 'success', durationMs: null });
    return result;
  } catch (error) {
    toast.update(id, { title: 'Request failed', description: String(error), kind: 'error', durationMs: null });
    throw error;
  }
}

function mount(render) {
  const host = document.createElement('div');
  document.body.append(host);
  const app = createApp({ render });
  app.mount(host);
  return { app, host };
}

function unmount(app, host) {
  if (host.isConnected) app.unmount();
  host.remove();
}
