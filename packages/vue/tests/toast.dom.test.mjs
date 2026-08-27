import assert from 'node:assert/strict';
import test from 'node:test';
import { Window } from 'happy-dom';

const browserWindow = new Window({ url: 'http://localhost/' });
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
const { ToastDescription, ToastProvider, ToastRoot, ToastTitle, ToastViewport, useToast } = await import('../dist/toast.js');

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
