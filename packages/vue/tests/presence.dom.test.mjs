import assert from 'node:assert/strict';
import test from 'node:test';
import { Window } from 'happy-dom';

const browserWindow = new Window({ url: 'https://sectile.dev/' });
Object.assign(globalThis, {
  window: browserWindow, document: browserWindow.document, Node: browserWindow.Node,
  Element: browserWindow.Element, HTMLElement: browserWindow.HTMLElement,
  HTMLButtonElement: browserWindow.HTMLButtonElement, SVGElement: browserWindow.SVGElement,
  Event: browserWindow.Event, MutationObserver: browserWindow.MutationObserver,
  getComputedStyle: browserWindow.getComputedStyle.bind(browserWindow),
});

const { createApp, createSSRApp, h, nextTick, ref } = await import('vue');
const { renderToString } = await import('@vue/server-renderer');
const { DialogClose, DialogContent, DialogRoot } = await import('../dist/dialog.js');
const { AlertDialogContent, AlertDialogOverlay, AlertDialogRoot } = await import('../dist/alert-dialog.js');
const { SelectContent, SelectItem, SelectItemText, SelectPortal, SelectRoot, SelectTrigger, SelectViewport } = await import('../dist/select.js');
const { ToastClose, ToastPortal, ToastProvider, ToastRoot, ToastTitle, ToastViewport } = await import('../dist/toast.js');

test('dialog keeps closed content present until its exit motion completes', async () => {
  const host = document.createElement('div'); document.body.append(host); const open = ref(false);
  const app = createApp({ render: () => h(DialogRoot, { open: open.value, modal: false, 'onUpdate:open': (value) => { open.value = value; } }, { default: () => h(DialogContent, { style: { transitionDuration: '50ms' } }, { default: () => h(DialogClose, null, { default: () => 'Close' }) }) }) });
  app.mount(host); await nextTick(); const content = host.querySelector('[data-part="content"]'); assert.ok(content instanceof HTMLElement); assert.equal(content.hidden, true);
  open.value = true; await nextTick(); await nextTick();
  const close = host.querySelector('[data-part="close"]'); assert.ok(close instanceof HTMLButtonElement); assert.equal(document.activeElement, close);
  open.value = false; await nextTick();
  assert.equal(content.dataset.state, 'closed'); assert.equal(content.hidden, false);
  content.dispatchEvent(new Event('transitionend', { bubbles: true })); await nextTick();
  assert.equal(content.hidden, true);
  app.unmount(); host.remove();
});

test('controlled toast retains its closed item through exit motion and then removes it', async () => {
  const host = document.createElement('div'); document.body.append(host); const toasts = ref([{ id: 'saved', title: '저장됨', durationMs: null }]);
  const app = createApp({ render: () => h(ToastProvider, { toasts: toasts.value, closeLabel: '알림 닫기', 'onUpdate:toasts': (items) => { toasts.value = [...items]; } }, { default: ({ toasts: items }) => h(ToastPortal, { disabled: true }, { default: () => h(ToastViewport, null, { default: () => items.map((item) => h(ToastRoot, { value: item.id, style: { transitionDuration: '50ms' } }, { default: () => [h(ToastTitle), h(ToastClose)] })) }) }) }) });
  app.mount(host);
  try {
    await nextTick(); const close = host.querySelector('[data-part="close"]'); const item = host.querySelector('[data-part="root"]'); assert.ok(close instanceof HTMLButtonElement); assert.ok(item instanceof HTMLElement); assert.equal(close.getAttribute('aria-label'), '알림 닫기');
    close.click(); await nextTick(); await nextTick();
    assert.deepEqual(toasts.value, []); assert.equal(item.dataset.state, 'closed'); assert.equal(item.hidden, false);
    await new Promise((resolve) => setTimeout(resolve, 0)); item.dispatchEvent(new Event('transitionend', { bubbles: true })); await nextTick();
    assert.equal(host.querySelector('[data-part="root"]'), null);
  } finally {
    app.unmount(); host.remove();
  }
});

test('alert-dialog overlay interaction does not dismiss a destructive decision', async () => {
  const host = document.createElement('div'); document.body.append(host); const open = ref(true);
  const app = createApp({ render: () => h(AlertDialogRoot, { open: open.value, 'onUpdate:open': (value) => { open.value = value; } }, { default: () => [h(AlertDialogOverlay), h(AlertDialogContent, null, { default: () => h('button', null, 'Keep open') })] }) });
  app.mount(host);
  try {
    await nextTick(); const overlay = host.querySelector('[data-part="overlay"]'); assert.ok(overlay instanceof HTMLElement);
    overlay.click(); await nextTick();
    assert.equal(open.value, true);
  } finally {
    app.unmount(); host.remove();
  }
});

test('portalled Select keeps typeahead, selection, and positioning connected', async () => {
  const host = document.createElement('div'); const portal = document.createElement('div'); document.body.append(host, portal);
  const selected = ref(null); const open = ref(false); const highlighted = ref(null);
  const app = createApp({ render: () => h(SelectRoot, {
    items: ['alpha', 'beta', 'gamma'], modelValue: selected.value, open: open.value,
    textValue: (id) => ({ alpha: 'Apple', beta: 'Banana', gamma: 'Grape' })[id],
    'onUpdate:modelValue': (value) => { selected.value = value; }, 'onUpdate:open': (value) => { open.value = value; },
    onHighlight: (value) => { highlighted.value = value; },
  }, { default: () => [
    h(SelectTrigger, null, { default: () => 'Choose' }),
    h(SelectPortal, { to: portal }, { default: () => h(SelectContent, null, { default: () => h(SelectViewport, null, { default: () => ['alpha', 'beta', 'gamma'].map((value) => h(SelectItem, { value }, { default: () => h(SelectItemText, null, { default: () => value }) })) }) }) }),
  ] }) });
  app.mount(host);
  try {
    await nextTick(); const trigger = host.querySelector('[data-part="trigger"]'); assert.ok(trigger instanceof HTMLButtonElement);
    trigger.click(); await nextTick(); await new Promise((resolve) => setTimeout(resolve, 0));
    const content = portal.querySelector('[data-part="content"]'); assert.ok(content instanceof HTMLElement); assert.equal(content.hidden, false); assert.equal(content.style.position, 'fixed');
    content.dispatchEvent(new browserWindow.KeyboardEvent('keydown', { key: 'b', bubbles: true, cancelable: true })); await nextTick();
    assert.equal(highlighted.value, 'beta');
    content.dispatchEvent(new browserWindow.KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true })); await nextTick();
    assert.equal(selected.value, 'beta'); assert.equal(open.value, false);
  } finally {
    app.unmount(); host.remove(); portal.remove();
  }
});

test('SSR teleports hydrate Select and Toast without mismatch warnings', async () => {
  const component = {
    render: () => h('div', null, [
      h(SelectRoot, { items: ['alpha', 'beta'], defaultOpen: true, position: false }, { default: () => [
        h(SelectTrigger, null, { default: () => 'Choose' }),
        h(SelectPortal, { to: '#overlays' }, { default: () => h(SelectContent, null, { default: () => h(SelectViewport, null, { default: () => ['alpha', 'beta'].map((value) => h(SelectItem, { value }, { default: () => value })) }) }) }),
      ] }),
      h(ToastProvider, { toasts: [{ id: 'saved', title: 'Saved', durationMs: null }] }, { default: ({ toasts }) => h(ToastPortal, { to: '#overlays' }, { default: () => h(ToastViewport, null, { default: () => toasts.map((toast) => h(ToastRoot, { value: toast.id }, { default: () => [h(ToastTitle), h(ToastClose)] })) }) }) }),
    ]),
  };
  const context = {};
  const html = await renderToString(createSSRApp(component), context);
  const host = document.createElement('div'); const overlays = document.createElement('div'); overlays.id = 'overlays';
  host.innerHTML = html; overlays.innerHTML = context.teleports?.['#overlays'] ?? '';
  document.body.append(host, overlays);
  const warnings = [];
  const app = createSSRApp(component); app.config.warnHandler = (message) => { warnings.push(message); };
  app.mount(host); await nextTick();
  try {
    assert.deepEqual(warnings, []);
    assert.equal(host.querySelector('[data-part="content"]'), null);
    assert.equal(overlays.querySelectorAll('[data-part="content"]').length, 1);
    assert.equal(overlays.querySelectorAll('[data-scope="toast"][data-part="root"]').length, 1);
  } finally {
    app.unmount(); host.remove(); overlays.remove();
  }
});
