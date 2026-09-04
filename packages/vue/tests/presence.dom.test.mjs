import assert from 'node:assert/strict';
import test from 'node:test';
import { createTestWindow } from './happy-dom.mjs';

const browserWindow = createTestWindow({ url: 'https://sectile.dev/' });
Object.assign(globalThis, {
  window: browserWindow, document: browserWindow.document, Node: browserWindow.Node,
  Element: browserWindow.Element, HTMLElement: browserWindow.HTMLElement,
  HTMLButtonElement: browserWindow.HTMLButtonElement, HTMLInputElement: browserWindow.HTMLInputElement,
  SVGElement: browserWindow.SVGElement,
  Event: browserWindow.Event, MutationObserver: browserWindow.MutationObserver,
  getComputedStyle: browserWindow.getComputedStyle.bind(browserWindow),
});

const { Teleport, createApp, createSSRApp, defineComponent, h, nextTick, ref, shallowRef } = await import('vue');
const { renderToString } = await import('@vue/server-renderer');
const { DialogClose, DialogContent, DialogOverlay, DialogPortal, DialogRoot } = await import('../.verification-dist/dialog.js');
const { AlertDialogContent, AlertDialogOverlay, AlertDialogRoot } = await import('../.verification-dist/alert-dialog.js');
const { SelectContent, SelectItem, SelectItemText, SelectPortal, SelectRoot, SelectTrigger, SelectViewport } = await import('../.verification-dist/select.js');
const { ComboboxContent, ComboboxInput, ComboboxRoot } = await import('../.verification-dist/combobox.js');
const { CascadeSelectContent, CascadeSelectRoot, CascadeSelectTrigger } = await import('../.verification-dist/cascade-select.js');
const { DatePickerContent, DatePickerGrid, DatePickerRoot, DatePickerTrigger } = await import('../.verification-dist/date-picker.js');
const { MenuButtonContent, MenuButtonRoot, MenuButtonTrigger, MenuItem, MenuSubContent } = await import('../.verification-dist/menu.js');
const { PopoverContent, PopoverPortal, PopoverRoot, PopoverTrigger } = await import('../.verification-dist/popover.js');
const { TooltipContent, TooltipPortal, TooltipRoot, TooltipTrigger } = await import('../.verification-dist/tooltip.js');
const { ToastClose, ToastPortal, ToastProvider, ToastRoot, ToastTitle, ToastViewport } = await import('../.verification-dist/toast.js');

const PopupSurface = defineComponent({
  name: 'PopupSurface',
  inheritAttrs: false,
  setup(_props, { attrs, expose, slots }) {
    const element = shallowRef(null);
    expose({ element });
    return () => h('div', { ...attrs, ref: element }, slots.default?.());
  },
});

test('dialog projects closed presence before measuring exit motion and quarantines retained surfaces', async () => {
  const host = document.createElement('div'); document.body.append(host); const open = ref(false);
  const motion = { transitionProperty: 'opacity, transform', transitionDuration: '5ms, 20ms' };
  const app = createApp({ render: () => h(DialogRoot, { open: open.value, modal: false, 'onUpdate:open': (value) => { open.value = value; } }, { default: () => [
    h(DialogOverlay, { style: motion }),
    h(DialogContent, { style: motion }, { default: () => h(DialogClose, null, { default: () => 'Close' }) }),
  ] }) });
  app.mount(host); await nextTick();
  const content = host.querySelector('[data-part="content"]'); const overlay = host.querySelector('[data-part="overlay"]');
  assert.ok(content instanceof HTMLElement); assert.ok(overlay instanceof HTMLElement); assert.equal(content.hidden, true);
  open.value = true; await nextTick(); await nextTick();
  const close = host.querySelector('[data-part="close"]'); assert.ok(close instanceof HTMLButtonElement); assert.equal(document.activeElement, close);
  open.value = false; await nextTick();
  assert.equal(content.dataset.state, 'closed'); assert.equal(content.hidden, false); assert.equal(content.inert, true); assert.equal(content.getAttribute('aria-hidden'), 'true');
  assert.equal(overlay.hidden, false); assert.equal(overlay.inert, true); assert.equal(overlay.getAttribute('aria-hidden'), 'true');
  await new Promise((resolve) => setTimeout(resolve, 25));
  content.dispatchEvent(new Event('transitionend', { bubbles: true })); overlay.dispatchEvent(new Event('transitionend', { bubbles: true }));
  await nextTick(); await nextTick();
  assert.equal(content.hidden, true); assert.equal(content.inert, false); assert.equal(content.getAttribute('aria-hidden'), null); assert.equal(overlay.hidden, true);
  app.unmount(); host.remove();
});

test('dialog reopen cancels the prior exit and preserves the retained content node', async () => {
  const host = document.createElement('div'); document.body.append(host); const open = ref(true);
  const app = createApp({ render: () => h(DialogRoot, { open: open.value, modal: false, 'onUpdate:open': (value) => { open.value = value; } }, { default: () => h(DialogContent, { style: { transitionProperty: 'all', transitionDuration: '100ms' } }, { default: () => 'Retained' }) }) });
  app.mount(host);
  try {
    await nextTick(); await nextTick();
    const content = host.querySelector('[data-part="content"]'); assert.ok(content instanceof HTMLElement);
    open.value = false; await nextTick();
    assert.equal(content.hidden, false); assert.equal(content.inert, true); assert.equal(content.getAttribute('aria-hidden'), 'true');
    open.value = true; await nextTick();
    const reopened = host.querySelector('[data-part="content"]');
    assert.equal(reopened, content); assert.equal(content.hidden, false); assert.equal(content.inert, false); assert.equal(content.getAttribute('aria-hidden'), null);
    content.dispatchEvent(new Event('transitionend', { bubbles: true })); await nextTick();
    assert.equal(content.hidden, false); assert.equal(content.dataset.state, 'open');
  } finally {
    app.unmount(); host.remove();
  }
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

test('dialog emits a cancellable interact-outside event for its overlay', async () => {
  const host = document.createElement('div'); document.body.append(host); const open = ref(true); let outsideCalls = 0;
  const app = createApp({ render: () => h(DialogRoot, {
    open: open.value,
    'onUpdate:open': (value) => { open.value = value; },
    onInteractOutside: (event) => { outsideCalls += 1; if (outsideCalls === 1) event.preventDefault(); },
  }, { default: () => [h(DialogOverlay), h(DialogContent, null, { default: () => h('button', null, 'Close') })] }) });
  app.mount(host);
  try {
    await nextTick(); const overlay = host.querySelector('[data-part="overlay"]'); assert.ok(overlay instanceof HTMLElement); assert.equal(overlay.inert, false); assert.equal(overlay.getAttribute('aria-hidden'), 'true');
    overlay.dispatchEvent(new browserWindow.PointerEvent('pointerdown', { bubbles: true, composed: true })); await nextTick();
    assert.equal(outsideCalls, 1); assert.equal(open.value, true);
    overlay.dispatchEvent(new browserWindow.PointerEvent('pointerdown', { bubbles: true, composed: true })); await nextTick();
    assert.equal(outsideCalls, 2); assert.equal(open.value, false);
  } finally {
    app.unmount(); host.remove();
  }
});

test('component-backed popup parts keep their connection and focus across reactive slot updates', async () => {
  const host = document.createElement('div'); document.body.append(host); const query = ref(''); const surfaceKey = ref(0);
  const app = createApp({ render: () => h(DialogRoot, { defaultOpen: true, modal: false }, { default: () => h(DialogContent, { as: PopupSurface, key: surfaceKey.value }, {
    default: () => [
      h(DialogClose, null, { default: () => 'Close' }),
      h('input', { value: query.value }),
    ],
  }) }) });
  const warnings = [];
  app.config.warnHandler = (message) => { warnings.push(message); };
  app.mount(host);
  try {
    await nextTick(); await nextTick();
    const input = host.querySelector('input'); const content = host.querySelector('[data-part="content"]');
    assert.ok(input instanceof HTMLInputElement); assert.ok(content instanceof HTMLElement);
    input.focus(); assert.equal(document.activeElement, input);
    query.value = 'a'; await nextTick(); await nextTick();
    assert.equal(host.querySelector('[data-part="content"]'), content);
    assert.equal(document.activeElement, input);
    assert.deepEqual(warnings, []);

    surfaceKey.value += 1; await nextTick(); await nextTick();
    const replacement = host.querySelector('[data-part="content"]'); const close = host.querySelector('[data-part="close"]');
    assert.ok(replacement instanceof HTMLElement); assert.ok(close instanceof HTMLButtonElement);
    assert.notEqual(replacement, content);
    assert.equal(document.activeElement, close);
  } finally {
    app.unmount(); host.remove();
  }
});

test('portalled Select keeps typeahead, selection, and exit presence connected', async () => {
  const host = document.createElement('div'); const portal = document.createElement('div'); document.body.append(host, portal);
  const selected = ref(null); const open = ref(false); const highlighted = ref(null);
  const app = createApp({ render: () => h(SelectRoot, {
    items: ['alpha', 'beta', 'gamma'], modelValue: selected.value, open: open.value,
    unmountOnExit: true, position: false,
    textValue: (id) => ({ alpha: 'Apple', beta: 'Banana', gamma: 'Grape' })[id],
    'onUpdate:modelValue': (value) => { selected.value = value; }, 'onUpdate:open': (value) => { open.value = value; },
    onHighlight: (value) => { highlighted.value = value; },
  }, { default: () => [
    h(SelectTrigger, null, { default: () => 'Choose' }),
    h(SelectPortal, { to: portal }, { default: () => h(SelectContent, { style: { transitionProperty: 'opacity', transitionDuration: '20ms' } }, { default: () => h(SelectViewport, null, { default: () => ['alpha', 'beta', 'gamma'].map((value) => h(SelectItem, { value }, { default: () => h(SelectItemText, null, { default: () => value }) })) }) }) }),
  ] }) });
  app.mount(host);
  try {
    await nextTick(); const trigger = host.querySelector('[data-part="trigger"]'); assert.ok(trigger instanceof HTMLButtonElement);
    trigger.click(); await nextTick(); await nextTick();
    const content = portal.querySelector('[data-part="content"]'); assert.ok(content instanceof HTMLElement); assert.equal(content.hidden, false); assert.equal(content.style.position, '');
    content.dispatchEvent(new browserWindow.KeyboardEvent('keydown', { key: 'b', bubbles: true, cancelable: true })); await nextTick();
    assert.equal(highlighted.value, 'beta');
    content.dispatchEvent(new browserWindow.KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true })); await nextTick();
    assert.equal(selected.value, 'beta'); assert.equal(open.value, false);
    assert.equal(portal.querySelector('[data-part="content"]'), content); assert.equal(content.hidden, false); assert.equal(content.inert, true); assert.equal(content.getAttribute('aria-hidden'), 'true');
    await new Promise((resolve) => setTimeout(resolve, 25)); content.dispatchEvent(new Event('transitionend', { bubbles: true })); await nextTick(); await nextTick();
    assert.equal(portal.querySelector('[data-part="content"]'), null);
  } finally {
    app.unmount(); host.remove(); portal.remove();
  }
});

test('MenuButton content and submenu retain presence through exit motion', async () => {
  const host = document.createElement('div'); document.body.append(host);
  const items = [{ id: 'file', parentID: null }, { id: 'new', parentID: 'file' }];
  const motion = { transitionProperty: 'opacity', transitionDuration: '20ms' };
  const app = createApp({ render: () => h(MenuButtonRoot, {
    items, defaultOpen: true, position: false,
  }, { default: () => [
    h(MenuButtonTrigger, null, { default: () => 'Actions' }),
    h(MenuButtonContent, { style: motion }, { default: () => [
      h(MenuItem, { value: 'file' }, { default: () => 'File' }),
      h(MenuSubContent, { for: 'file', style: motion }, { default: () => h(MenuItem, { value: 'new' }, { default: () => 'New' }) }),
    ] }),
  ] }) });
  app.mount(host);
  try {
    await nextTick(); await nextTick();
    const trigger = host.querySelector('[data-part="trigger"]');
    const content = host.querySelector('[data-part="content"]');
    const file = host.querySelector('[data-sectile-menu-id="file"]');
    const child = host.querySelector('[data-sectile-menu-id="new"]');
    const submenu = host.querySelector('[data-part="sub-content"]');
    assert.ok(trigger instanceof HTMLButtonElement); assert.ok(content instanceof HTMLElement);
    assert.ok(file instanceof HTMLElement); assert.ok(child instanceof HTMLElement); assert.ok(submenu instanceof HTMLElement);
    assert.equal(content.hidden, false); assert.equal(submenu.hidden, true);

    file.click(); await nextTick(); await nextTick();
    assert.equal(submenu.dataset.state, 'open'); assert.equal(submenu.hidden, false);
    assert.equal(document.activeElement, child);

    trigger.click(); await nextTick();
    assert.equal(content.dataset.state, 'closed'); assert.equal(content.hidden, false); assert.equal(content.inert, true); assert.equal(content.getAttribute('aria-hidden'), 'true');
    assert.equal(submenu.dataset.state, 'closed'); assert.equal(submenu.hidden, false); assert.equal(submenu.inert, true); assert.equal(submenu.getAttribute('aria-hidden'), 'true');

    await new Promise((resolve) => setTimeout(resolve, 25));
    content.dispatchEvent(new Event('transitionend', { bubbles: true }));
    submenu.dispatchEvent(new Event('transitionend', { bubbles: true }));
    await nextTick(); await nextTick();
    assert.equal(content.hidden, true); assert.equal(content.inert, false); assert.equal(content.getAttribute('aria-hidden'), null);
    assert.equal(submenu.hidden, true); assert.equal(submenu.inert, false); assert.equal(submenu.getAttribute('aria-hidden'), null);

    trigger.click(); await nextTick(); await nextTick();
    assert.equal(content.dataset.state, 'open'); assert.equal(content.hidden, false);
    assert.equal(document.activeElement, file);
  } finally {
    app.unmount(); host.remove();
  }
});

test('Combobox, CascadeSelect, and DatePicker content retain presence through exit motion', async () => {
  const host = document.createElement('div'); document.body.append(host);
  const comboboxOpen = ref(true); const cascadeOpen = ref(true); const pickerOpen = ref(true);
  const motion = { transitionProperty: 'opacity', transitionDuration: '20ms' };
  const app = createApp({ render: () => [
    h(ComboboxRoot, {
      items: [{ id: 'seoul', label: 'Seoul' }], open: comboboxOpen.value, position: false,
      'onUpdate:open': (value) => { comboboxOpen.value = value; },
    }, { default: () => [h(ComboboxInput), h(ComboboxContent, { style: motion })] }),
    h(CascadeSelectRoot, {
      nodes: [{ id: 'asia', parentID: null }, { id: 'seoul', parentID: 'asia' }], open: cascadeOpen.value, position: false,
      'onUpdate:open': (value) => { cascadeOpen.value = value; },
    }, { default: () => [h(CascadeSelectTrigger), h(CascadeSelectContent, { style: motion })] }),
    h(DatePickerRoot, {
      open: pickerOpen.value, position: false, referenceDate: { year: 2026, month: 9, day: 5 },
      'onUpdate:open': (value) => { pickerOpen.value = value; },
    }, { default: () => [
      h(DatePickerTrigger),
      h(DatePickerContent, { style: motion }, { default: () => h(DatePickerGrid) }),
    ] }),
  ] });
  app.mount(host);
  try {
    await nextTick(); await nextTick();
    const contents = [
      host.querySelector('[data-scope="combobox"][data-part="content"]'),
      host.querySelector('[data-scope="cascade-select"][data-part="content"]'),
      host.querySelector('[data-scope="date"][data-part="content"]'),
    ];
    for (const content of contents) {
      assert.ok(content instanceof HTMLElement); assert.equal(content.hidden, false);
    }

    comboboxOpen.value = false; cascadeOpen.value = false; pickerOpen.value = false;
    await nextTick();
    for (const content of contents) {
      assert.equal(content.dataset.state, 'closed'); assert.equal(content.hidden, false);
      assert.equal(content.inert, true); assert.equal(content.getAttribute('aria-hidden'), 'true');
    }

    await new Promise((resolve) => setTimeout(resolve, 25));
    for (const content of contents) content.dispatchEvent(new Event('transitionend', { bubbles: true }));
    await nextTick(); await nextTick();
    for (const content of contents) {
      assert.equal(content.hidden, true); assert.equal(content.inert, false); assert.equal(content.getAttribute('aria-hidden'), null);
    }

    comboboxOpen.value = true; cascadeOpen.value = true; pickerOpen.value = true;
    await nextTick(); await nextTick();
    for (const content of contents) {
      assert.equal(content.dataset.state, 'open'); assert.equal(content.hidden, false);
    }
  } finally {
    app.unmount(); host.remove();
  }
});

test('Combobox, CascadeSelect, MenuButton, and DatePicker share Select positioning defaults and manual opt-out', async () => {
  const host = document.createElement('div'); const portal = document.createElement('div'); document.body.append(host, portal); const position = ref(true);
  const selectOpen = ref(true); const comboboxOpen = ref(true); const cascadeOpen = ref(true); const menuOpen = ref(true); const pickerOpen = ref(true);
  const app = createApp({ render: () => [
    h(SelectRoot, {
      items: ['seoul'], open: selectOpen.value,
      position: position.value, side: 'top', strategy: 'fixed', avoidCollisions: false,
      'onUpdate:open': (value) => { selectOpen.value = value; },
    }, { default: () => [h(SelectTrigger), h(SelectPortal, { to: portal }, { default: () => h(SelectContent) })] }),
    h(ComboboxRoot, {
      items: [{ id: 'seoul', label: 'Seoul' }], open: comboboxOpen.value,
      position: position.value, side: 'top', strategy: 'fixed', avoidCollisions: false,
      'onUpdate:open': (value) => { comboboxOpen.value = value; },
    }, { default: () => [h(ComboboxInput), h(Teleport, { to: portal }, h(ComboboxContent))] }),
    h(CascadeSelectRoot, {
      nodes: [{ id: 'asia', parentID: null }, { id: 'seoul', parentID: 'asia' }], open: cascadeOpen.value,
      position: position.value, side: 'top', strategy: 'fixed', avoidCollisions: false,
      'onUpdate:open': (value) => { cascadeOpen.value = value; },
    }, { default: () => [h(CascadeSelectTrigger), h(Teleport, { to: portal }, h(CascadeSelectContent))] }),
    h(MenuButtonRoot, {
      items: [{ id: 'seoul', parentID: null }], open: menuOpen.value,
      position: position.value, side: 'top', strategy: 'fixed', avoidCollisions: false,
      'onUpdate:open': (value) => { menuOpen.value = value; },
    }, { default: () => [h(MenuButtonTrigger), h(Teleport, { to: portal }, h(MenuButtonContent, null, { default: () => h(MenuItem, { value: 'seoul' }) }))] }),
    h(DatePickerRoot, {
      open: pickerOpen.value, position: position.value, side: 'top', strategy: 'fixed', avoidCollisions: false,
      referenceDate: { year: 2026, month: 9, day: 5 },
      'onUpdate:open': (value) => { pickerOpen.value = value; },
    }, { default: () => [
      h(DatePickerTrigger),
      h(Teleport, { to: portal }, h(DatePickerContent, null, { default: () => h(DatePickerGrid) })),
    ] }),
  ] });
  app.mount(host);
  try {
    await nextTick(); await nextTick(); await new Promise((resolve) => setTimeout(resolve, 0));
    const contents = portal.querySelectorAll('[data-part="content"]');
    assert.equal(contents.length, 5);
    assert.equal(host.querySelectorAll('[data-part="content"]').length, 0);
    for (const content of contents) {
      assert.equal(content.style.position, 'fixed');
      assert.equal(content.style.visibility, '');
      assert.equal(content.dataset.side, 'top');
    }

    selectOpen.value = false; comboboxOpen.value = false; cascadeOpen.value = false; menuOpen.value = false; pickerOpen.value = false;
    await nextTick(); await nextTick();
    for (const content of contents) {
      assert.equal(content.hidden, true);
      assert.equal(content.dataset.positionRoute, undefined);
    }

    selectOpen.value = true; comboboxOpen.value = true; cascadeOpen.value = true; menuOpen.value = true; pickerOpen.value = true;
    await nextTick(); await nextTick(); await new Promise((resolve) => setTimeout(resolve, 0));
    for (const content of contents) {
      assert.equal(content.hidden, false);
      assert.equal(content.style.position, 'fixed');
      assert.equal(content.dataset.side, 'top');
    }

    position.value = false; await nextTick(); await nextTick();
    for (const content of contents) {
      assert.equal(content.style.position, '');
      assert.equal(content.style.left, '');
      assert.equal(content.style.top, '');
      assert.equal(content.dataset.positionRoute, undefined);
    }
  } finally {
    app.unmount(); host.remove(); portal.remove();
  }
});

test('portalled Popover and Tooltip leave document flow before insertion', async () => {
  const host = document.createElement('div'); const portal = document.createElement('div'); document.body.append(host, portal);
  const inserted = capturePositionedContentInsertions(portal);
  const popoverText = ref('Popover'); const position = ref(true);
  const app = createApp({ render: () => [
    h(PopoverRoot, { unmountOnExit: true, hideWhenDetached: false, position: position.value }, { default: () => [
      h(PopoverTrigger, null, { default: () => 'Open' }),
      h(PopoverPortal, { to: portal }, { default: () => h(PopoverContent, null, { default: () => popoverText.value }) }),
    ] }),
    h(TooltipRoot, { unmountOnExit: true, hideWhenDetached: false, position: position.value }, { default: () => [
      h(TooltipTrigger, null, { default: () => 'Info' }),
      h(TooltipPortal, { to: portal }, { default: () => h(TooltipContent, null, { default: () => 'Tooltip' }) }),
    ] }),
  ] });
  app.mount(host);
  try {
    await nextTick();
    const triggers = host.querySelectorAll('[data-part="trigger"]');
    assert.equal(triggers.length, 2);
    triggers[0].dispatchEvent(new Event('click', { bubbles: true }));
    triggers[1].dispatchEvent(new Event('mouseenter', { bubbles: true }));
    await nextTick(); await nextTick(); await new Promise((resolve) => setTimeout(resolve, 0));

    assert.deepEqual(inserted, [
      { scope: 'popover', position: 'absolute', visibility: 'hidden' },
      { scope: 'tooltip', position: 'absolute', visibility: 'hidden' },
    ]);
    const contents = portal.querySelectorAll('[data-part="content"]');
    assert.equal(contents.length, 2);
    for (const content of contents) {
      assert.equal(content.style.position, 'absolute');
      assert.equal(content.style.visibility, '');
    }
    popoverText.value = 'Updated'; await nextTick();
    assert.equal(contents[0].textContent, 'Updated');
    assert.equal(contents[0].style.visibility, '');
    position.value = false; await nextTick(); await nextTick();
    for (const content of contents) {
      assert.equal(content.style.position, '');
      assert.equal(content.style.left, '');
      assert.equal(content.style.top, '');
      assert.equal(content.dataset.positionRoute, undefined);
    }
  } finally {
    app.unmount(); host.remove(); portal.remove();
  }
});

test('positioned popup without a reference remains available for manual layout', async () => {
  const host = document.createElement('div'); document.body.append(host);
  const app = createApp({ render: () => h(PopoverRoot, { defaultOpen: true, unmountOnExit: true }, {
    default: () => h(PopoverContent, null, { default: () => 'Manual' }),
  }) });
  app.mount(host);
  try {
    await nextTick(); await nextTick();
    const content = host.querySelector('[data-part="content"]');
    assert.ok(content instanceof HTMLElement);
    assert.equal(content.style.visibility, '');
  } finally {
    app.unmount(); host.remove();
  }
});

test('deferred portals resolve targets rendered later in the same mount tick', async () => {
  const host = document.createElement('div'); document.body.append(host);
  const app = createApp({
    render: () => h('div', null, [
      h(DialogRoot, { modal: false }, { default: () => h(DialogPortal, { to: '#late-popup', defer: true }, { default: () => h('span', { id: 'deferred-popup' }, 'Popup') }) }),
      h(SelectRoot, { items: [] }, { default: () => h(SelectPortal, { to: '#late-select', defer: true }, { default: () => h('span', { id: 'deferred-select' }, 'Select') }) }),
      h(ToastProvider, null, { default: () => h(ToastPortal, { to: '#late-toast', defer: true }, { default: () => h('span', { id: 'deferred-toast' }, 'Toast') }) }),
      h('div', { id: 'late-popup' }),
      h('div', { id: 'late-select' }),
      h('div', { id: 'late-toast' }),
    ]),
  });
  const warnings = [];
  app.config.warnHandler = (message) => { warnings.push(message); };
  app.mount(host); await nextTick();
  try {
    assert.deepEqual(warnings, []);
    assert.equal(host.querySelector('#late-popup')?.querySelector('#deferred-popup')?.textContent, 'Popup');
    assert.equal(host.querySelector('#late-select')?.querySelector('#deferred-select')?.textContent, 'Select');
    assert.equal(host.querySelector('#late-toast')?.querySelector('#deferred-toast')?.textContent, 'Toast');
  } finally {
    app.unmount(); host.remove();
  }
});

test('provider and portal roots ignore scoped-style fallthrough attributes without warnings', async () => {
  const host = document.createElement('div'); document.body.append(host);
  const app = createApp({
    render: () => h('div', null, [
      h(DialogRoot, { modal: false }, { default: () => h(DialogPortal, { disabled: true, 'data-v-popup': '' }, { default: () => h('span', null, 'Dialog') }) }),
      h(SelectRoot, { items: [] }, { default: () => h(SelectPortal, { disabled: true, 'data-v-select': '' }, { default: () => h('span', null, 'Select') }) }),
      h(ToastProvider, { 'data-v-toast-provider': '' }, { default: () => h(ToastPortal, { disabled: true, 'data-v-toast-portal': '' }, { default: () => h('span', null, 'Toast') }) }),
    ]),
  });
  const warnings = [];
  app.config.warnHandler = (message) => { warnings.push(message); };
  app.mount(host); await nextTick();
  try {
    assert.deepEqual(warnings, []);
  } finally {
    app.unmount(); host.remove();
  }
});

test('[HYD-02] SSR teleports hydrate Select and Toast without mismatch warnings', async () => {
  const component = {
    render: () => h('div', null, [
      h(SelectRoot, { items: ['alpha', 'beta'], defaultOpen: true, position: false }, { default: () => [
        h(SelectTrigger, null, { default: () => 'Choose' }),
        h(SelectPortal, { to: '#overlays', defer: true }, { default: () => h(SelectContent, null, { default: () => h(SelectViewport, null, { default: () => ['alpha', 'beta'].map((value) => h(SelectItem, { value }, { default: () => value })) }) }) }),
      ] }),
      h(ToastProvider, { toasts: [{ id: 'saved', title: 'Saved', durationMs: null }] }, { default: ({ toasts }) => h(ToastPortal, { to: '#overlays', defer: true }, { default: () => h(ToastViewport, null, { default: () => toasts.map((toast) => h(ToastRoot, { value: toast.id }, { default: () => [h(ToastTitle), h(ToastClose)] })) }) }) }),
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

function capturePositionedContentInsertions(target) {
  const inserted = [];
  const insertBefore = target.insertBefore;
  target.insertBefore = function (node, anchor) {
    if (node instanceof HTMLElement && node.dataset.part === 'content') {
      inserted.push({ scope: node.dataset.scope, position: node.style.position, visibility: node.style.visibility });
    }
    return insertBefore.call(this, node, anchor);
  };
  return inserted;
}
