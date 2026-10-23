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

const { KeepAlive, Teleport, createApp, createSSRApp, defineComponent, h, nextTick, ref, shallowRef } = await import('vue');
const { renderToString } = await import('@vue/server-renderer');
const { DialogClose, DialogContent, DialogOverlay, DialogPortal, DialogRoot, DialogTrigger } = await import('../.verification-dist/overlay/dialog.js');
const { AlertDialogContent, AlertDialogOverlay, AlertDialogPortal, AlertDialogRoot } = await import('../.verification-dist/overlay/alert-dialog.js');
const { DrawerContent, DrawerHandle, DrawerPortal, DrawerRoot } = await import('../.verification-dist/overlay/drawer.js');
const { provideHostPopup, provideHostLayer } = await import('../.verification-dist/host-provider.js');
const { connectLayerHost, reserveLayerPresentation } = await import('@sectile/dom/layer-host');
const { SelectContent, SelectItem, SelectItemIndicator, SelectItemText, SelectPortal, SelectRoot, SelectTrigger, SelectViewport } = await import('../.verification-dist/select.js');
const { ComboboxContent, ComboboxEmpty, ComboboxInput, ComboboxItem, ComboboxRoot } = await import('../.verification-dist/combobox.js');
const { CascadeSelectColumn, CascadeSelectContent, CascadeSelectItem, CascadeSelectItemIndicator, CascadeSelectRoot, CascadeSelectTrigger } = await import('../.verification-dist/cascade-select.js');
const { CascadeListItem, CascadeListItemIndicator, CascadeListRoot } = await import('../.verification-dist/cascade-list.js');
const { ListboxItem, ListboxItemIndicator, ListboxRoot } = await import('../.verification-dist/listbox.js');
const { DatePickerContent, DatePickerGrid, DatePickerRoot, DatePickerTrigger } = await import('../.verification-dist/temporal/date-picker.js');
const { MenuButtonContent, MenuButtonRoot, MenuButtonTrigger, MenuRoot, MenubarRoot, NavigationMenuRoot: InlineNavigationMenuRoot, MenuItem, MenuSubContent } = await import('../.verification-dist/menu.js');
const { PopoverContent, PopoverPortal, PopoverRoot, PopoverTrigger } = await import('../.verification-dist/overlay/popover.js');
const { TooltipContent, TooltipPortal, TooltipRoot, TooltipTrigger } = await import('../.verification-dist/overlay/tooltip.js');

const { ToastClose, ToastPortal, ToastProvider, ToastRoot, ToastTitle, ToastViewport } = await import('../.verification-dist/toast.js');
const { CheckboxIndicator, CheckboxRoot } = await import('../.verification-dist/checkbox.js');
const { RadioGroupIndicator, RadioGroupItem, RadioGroupRoot } = await import('../.verification-dist/radio-group.js');
const { NavigationMenuIndicator } = await import('../.verification-dist/navigation-menu.js');
const { AccordionContent, AccordionItem, AccordionRoot } = await import('../.verification-dist/accordion.js');
const { CarouselRoot, CarouselSlide } = await import('../.verification-dist/carousel.js');
const { DisclosureContent, DisclosureRoot } = await import('../.verification-dist/disclosure.js');
const { TabsContent, TabsRoot } = await import('../.verification-dist/tabs.js');
const { TreeGridCell, TreeGridEditor, TreeGridRoot, TreeGridRow } = await import('../.verification-dist/tree-grid.js');
const { TreeViewGroup, TreeViewItem, TreeViewRoot } = await import('../.verification-dist/tree-view.js');
const { createPopover } = await import('@sectile/dom/popover');
const { HostProvider } = await import('../.verification-dist/host-provider.js');

test('Tooltip keeps pre-connection focus and content hover while maintaining caller description references', async () => {
  const host = document.createElement('div'); document.body.append(host);
  const app = createApp({ render: () => h(TooltipRoot, { unmountOnExit: true, position: false }, { default: () => [
    h(TooltipTrigger, { 'aria-describedby': 'caller-help' }, { default: () => 'Details' }), h(TooltipContent, null, { default: () => 'Extra details' }),
  ] }) });
  app.mount(host);
  try {
    const trigger = host.querySelector('button'); assert.equal(trigger.getAttribute('aria-describedby'), 'caller-help');
    trigger.focus(); await nextTick(); await nextTick();
    const content = host.querySelector('[role="tooltip"]'); assert.ok(content);
    trigger.dispatchEvent(new browserWindow.MouseEvent('mouseleave')); await nextTick();
    assert.ok(host.querySelector('[role="tooltip"]'));
    content.dispatchEvent(new browserWindow.MouseEvent('mouseenter')); trigger.blur(); await nextTick();
    assert.ok(host.querySelector('[role="tooltip"]')); assert.match(trigger.getAttribute('aria-describedby'), /^caller-help sectile-tooltip-/u);
    content.dispatchEvent(new browserWindow.MouseEvent('mouseleave')); await nextTick(); await nextTick();
    assert.equal(trigger.getAttribute('aria-describedby'), 'caller-help');
  } finally { app.unmount(); host.remove(); }
});

test('cached Select retains values and children while paused configuration and nested Portal resources stay inactive', async () => {
  const host = document.createElement('div'), target = document.createElement('div'); document.body.append(host, target);
  const shown = shallowRef(true), value = shallowRef('a'), items = shallowRef(['a', 'b']);
  const requests = [], errors = []; let constructed = 0, restoreQuery;
  const drain = async () => { for (let turn = 0; turn < 8; turn++) await nextTick(); };
  const Child = defineComponent({ setup() { constructed++; return () => h('input', { 'data-select-child': '' }); } });
  const Cached = defineComponent({ setup: () => () => h(SelectRoot, { items: items.value, modelValue: value.value,
    defaultOpen: true, unmountOnExit: true, position: false, 'onUpdate:open': next => requests.push(next),
  }, { default: () => [h(SelectTrigger, {}, { default: () => 'Choose' }), h(SelectPortal, { to: target }, {
    default: () => h(SelectContent, {}, { default: () => [
      ...items.value.map(id => h(SelectItem, { key: id, value: id }, { default: () => id })), h(Child),
      h(PopoverRoot, { defaultOpen: true, position: false, autoFocus: false }, { default: () => h(PopoverPortal,
        { to: target }, { default: () => h(PopoverContent, { 'data-select-nested': '' }) }) }),
    ] }),
  })] }) });
  const Empty = defineComponent({ render: () => null });
  const app = createApp({ render: () => h(KeepAlive, {}, { default: () => shown.value ? h(Cached) : h(Empty) }) });
  app.config.errorHandler = error => errors.push(error);
  const assertOrder = expected => { const root = document.createElement('div'); document.body.append(root);
    const witness = createPopover({ root, defaultOpen: true, position: false, autoFocus: false });
    try { assert.equal(witness.getLayerOrder(), expected); } finally { witness.disconnect(); root.remove(); } };
  app.mount(host);
  try {
    await drain(); const panel = target.querySelector('[data-scope=select][data-part=content]');
    const nested = target.querySelector('[data-select-nested]'), input = panel.querySelector('[data-select-child]');
    input.value = 'Retained'; assertOrder(2);
    for (let turn = 0; turn < 3; turn++) {
      shown.value = false; await drain(); assert.equal(panel.hidden, true); assert.equal(panel.inert, true);
      assert.equal(nested.hidden, true); assertOrder(0); assert.deepEqual(requests, []);
      value.value = turn % 2 ? 'a' : 'b'; items.value = ['a', 'b', 'c']; await drain();
      assert.equal(panel.hidden, true); assert.equal(nested.hidden, true); assertOrder(0);
      shown.value = true; await drain(); assert.equal(panel.hidden, false); assert.equal(nested.hidden, false); assertOrder(2);
      assert.equal(panel.querySelector('[data-select-child]'), input); assert.equal(input.value, 'Retained'); assert.equal(constructed, 1);
      assert.equal(panel.querySelector('[aria-selected=true]').textContent, value.value); assert.equal(panel.querySelectorAll('[role=option]').length, 3);
    }
    shown.value = false; await drain();
    const failure = new Error('Choice renderer projection failed'), query = panel.querySelectorAll;
    restoreQuery = () => { panel.querySelectorAll = query; };
    panel.querySelectorAll = () => { throw failure; };
    shown.value = true; await drain(); assert.equal(errors[0], failure); assert.equal(panel.hidden, true);
    assert.equal(nested.hidden, true); assertOrder(0);
    restoreQuery(); restoreQuery = undefined;
    shown.value = false; await drain(); shown.value = true; await drain();
    assert.equal(panel.hidden, false); assert.equal(nested.hidden, false); assertOrder(2);
    assert.equal(panel.querySelector('[data-select-child]'), input); assert.equal(input.value, 'Retained');
    shown.value = false; await drain(); app.unmount(); assertOrder(0); assert.deepEqual(requests, []);
  } finally { restoreQuery?.(); app.unmount(); host.remove(); target.remove(); }
});

test('cached CascadeSelect preserves branch navigation and rebases invalid navigation through its canonical owner', async () => {
  const host = document.createElement('div'), target = document.createElement('div'); document.body.append(host, target);
  const shown = shallowRef(true), label = shallowRef('Location'), nodes = shallowRef([
    { id: 'asia', parentID: null }, { id: 'europe', parentID: null }, { id: 'seoul', parentID: 'asia' }, { id: 'paris', parentID: 'europe' },
  ]); let state, constructed = 0; const requests = [];
  const drain = async () => { for (let turn = 0; turn < 8; turn++) await nextTick(); };
  const Child = defineComponent({ setup() { constructed++; return () => h('input'); } });
  const Cached = defineComponent({ setup: () => () => h(CascadeSelectRoot, { nodes: nodes.value, label: label.value,
    defaultOpen: true, position: false, 'onUpdate:open': next => requests.push(next),
  }, { default: next => { state = next; return [h(CascadeSelectTrigger), h(Teleport, { to: target }, [h(CascadeSelectContent, {}, {
    default: ({ columns }) => [
      ...columns.map((_, depth) => h(CascadeSelectColumn, { key: depth, depth }, { default: ({ items }) => items.map(id => h(CascadeSelectItem, { key: id, value: id }, { default: () => id })) })), h(Child),
      h(PopoverRoot, { defaultOpen: true, position: false, autoFocus: false }, { default: () => h(PopoverPortal, { to: target }, { default: () => h(PopoverContent, { 'data-cascade-nested': '' }) }) }),
    ],
  })])]; } }) });
  const Empty = defineComponent({ render: () => null });
  const app = createApp({ render: () => h(KeepAlive, {}, { default: () => shown.value ? h(Cached) : h(Empty) }) }); app.mount(host);
  try {
    await drain(); const panel = target.querySelector('[data-scope=cascade-select][data-part=content]'), input = panel.querySelector('input'); input.value = 'Retained';
    panel.querySelector('[data-sectile-cascade-select-id=asia]').click(); await drain(); assert.deepEqual(state.path, ['asia']); assert.equal(state.value, null);
    for (let turn = 0; turn < 3; turn++) {
      shown.value = false; await drain(); assert.equal(panel.hidden, true); assert.equal(panel.inert, true);
      assert.equal(target.querySelector('[data-cascade-nested]').hidden, true);
      label.value = `Location ${turn}`; nodes.value = [...nodes.value]; await drain(); assert.equal(panel.hidden, true);
      shown.value = true; await drain(); assert.equal(panel.hidden, false); assert.deepEqual(state.path, ['asia']); assert.equal(state.value, null);
      assert.equal(state.highlightedValue, 'seoul'); assert.equal(panel.querySelectorAll('[role=listbox]').length, 2);
      assert.equal(panel.querySelector('input'), input); assert.equal(input.value, 'Retained'); assert.equal(constructed, 1);
      assert.equal(target.querySelector('[data-cascade-nested]').hidden, false); assert.deepEqual(requests, []);
    }
    shown.value = false; await drain(); nodes.value = nodes.value.filter(node => node.id === 'europe' || node.id === 'paris'); await drain();
    shown.value = true; await drain(); assert.deepEqual(state.path, []); assert.equal(state.highlightedValue, null);
    assert.equal(panel.querySelectorAll('[role=listbox]').length, 1); assert.equal(panel.querySelector('input'), input); assert.deepEqual(requests, []);
  } finally { app.unmount(); host.remove(); target.remove(); }
});

test('cached menu families preserve submenu navigation and child state across inactive configuration', async () => {
  for (const Root of [MenuRoot, MenubarRoot, InlineNavigationMenuRoot, MenuButtonRoot]) {
    const host = document.createElement('div'), target = document.createElement('div'); document.body.append(host, target);
    const shown = shallowRef(true), label = shallowRef('Actions'); let state, constructed = 0;
    const requests = [], errors = [], isPopup = Root === MenuButtonRoot;
    const drain = async () => { for (let turn = 0; turn < 8; turn++) await nextTick(); };
    const Child = defineComponent({ setup() { constructed++; return () => h('input', { 'data-menu-child': '' }); } });
    const parts = () => [h(MenuItem, { value: 'file' }, { default: () => 'File' }),
      h(Teleport, { to: target }, [h(MenuSubContent, { for: 'file' }, { default: () => [h(MenuItem, { value: 'open' }), h(Child)] })]),
      h(PopoverRoot, { defaultOpen: true, position: false, autoFocus: false }, { default: () => h(PopoverPortal, { to: target }, { default: () => h(PopoverContent, { 'data-menu-nested': '' }) }) }),
    ];
    const Cached = defineComponent({ setup: () => () => h(Root, {
      items: [{ id: 'file', parentID: null }, { id: 'open', parentID: 'file' }],
      label: label.value, ...(isPopup ? { defaultOpen: true, position: false } : {}),
      'onUpdate:open': next => requests.push(next),
    }, { default: next => { state = next; return isPopup ? [h(MenuButtonTrigger), h(Teleport, { to: target }, [h(MenuButtonContent, {}, { default: parts })])] : parts(); } }) });
    const Empty = defineComponent({ render: () => null });
    const app = createApp({ render: () => h(KeepAlive, {}, { default: () => shown.value ? h(Cached) : h(Empty) }) });
    app.config.errorHandler = error => errors.push(error); app.mount(host);
    try {
      await drain(); const panel = (isPopup ? target : host).querySelector('[role=menu], [role=menubar], [role=navigation]');
      panel.querySelector('[data-sectile-menu-id=file]').click(); await drain();
      assert.deepEqual(state.openPath, ['file']);
      const submenu = target.querySelector('[data-sectile-submenu-for=file]'), input = submenu.querySelector('input');
      const nested = target.querySelector('[data-menu-nested]'); input.value = 'Retained';
      for (let cycle = 0; cycle < 3; cycle++) {
        shown.value = false; await drain(); assert.equal(submenu.hidden, true); assert.equal(submenu.inert, true); assert.equal(nested.hidden, true);
        label.value = `Actions ${cycle}`; await drain(); assert.equal(submenu.hidden, true);
        shown.value = true; await drain(); assert.deepEqual(errors, []); assert.deepEqual(state.openPath, ['file']);
        assert.equal(submenu.hidden, false); assert.equal(nested.hidden, false); assert.equal(panel.getAttribute('aria-label'), label.value);
        assert.equal(panel.querySelector('[data-sectile-menu-id=file]').getAttribute('aria-controls'), submenu.id);
        assert.notEqual(submenu.id, '', 'portalled submenu remains registered after reconstruction');
        assert.equal(submenu.querySelector('input'), input); assert.equal(input.value, 'Retained'); assert.equal(constructed, 1);
      }
      assert.deepEqual(requests, []); shown.value = false; await drain(); app.unmount();
    } finally { app.unmount(); host.remove(); target.remove(); }
  }
});

test('choice popups borrow their overlay ancestor and quarantine controlled refusal without changing accepted open', async () => {
  for (const [Root, Trigger, Content, Item, scope, collection] of [
    [SelectRoot, SelectTrigger, SelectContent, SelectItem, 'select', { items: ['a', 'b'] }],
    [CascadeSelectRoot, CascadeSelectTrigger, CascadeSelectContent, CascadeSelectItem, 'cascade-select', { nodes: [{ id: 'a', parentID: null }, { id: 'b', parentID: null }] }],
    [ComboboxRoot, ComboboxInput, ComboboxContent, ComboboxItem, 'combobox', { items: [{ id: 'a', label: 'Alpha' }, { id: 'b', label: 'Beta' }] }],
    [MenuButtonRoot, MenuButtonTrigger, MenuButtonContent, MenuItem, 'menu-button', { items: [{ id: 'a', parentID: null }, { id: 'b', parentID: null }] }],
  ]) {
  const host = document.createElement('div'), target = document.createElement('div'); document.body.append(host, target);
  const parentOpen = shallowRef(false), childOpen = shallowRef(true), requests = [];
  const drain = async () => { for (let turn = 0; turn < 8; turn++) await nextTick(); };
  const app = createApp({ render: () => h(DialogRoot, { open: parentOpen.value, autoFocus: false }, {
    default: () => h(DialogPortal, { to: target }, { default: () => h(DialogContent, {}, {
      default: () => h(Root, { ...collection, defaultValue: 'a', open: childOpen.value, position: false,
        'onUpdate:open': next => requests.push(next) }, { default: () => [h(Trigger, {}, { default: () => 'Choose' }),
        h(Teleport, { to: target }, [h(Content, {}, { default: () => [h(Item, { value: 'a' }), h(Item, { value: 'b' })] })])] }),
    }) }),
  }) });
  app.mount(host);
  try {
    await drain(); const panel = target.querySelector(`[data-scope=${scope}][data-part=content]`); assert.equal(panel.hidden, true);
    parentOpen.value = true; await drain(); assert.equal(panel.hidden, false);
    document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    await drain(); assert.deepEqual(requests, [false]); assert.equal(childOpen.value, true); assert.equal(panel.hidden, false);
    parentOpen.value = false; await drain(); assert.deepEqual(requests, [false, false]); assert.equal(childOpen.value, true);
    assert.equal(panel.hidden, true); assert.equal(panel.inert, true);
    parentOpen.value = true; await drain(); assert.equal(panel.hidden, false);
    parentOpen.value = false; await drain(); childOpen.value = false; await drain(); childOpen.value = true; await drain();
    assert.equal(panel.hidden, true); parentOpen.value = true; await drain(); assert.equal(panel.hidden, false);
  } finally { app.unmount(); host.remove(); target.remove(); }
  assert.equal(document.querySelectorAll('[data-sectile-focus-guard]').length, 0);
  }
});

test('cached popup families suspend teleported presentation while preserving accepted models and child state', async () => {
  const drain = async () => { for (let turn = 0; turn < 5; turn++) await nextTick(); };
  for (const [Root, Content, Portal] of [[DialogRoot, DialogContent, DialogPortal], [AlertDialogRoot, AlertDialogContent, AlertDialogPortal],
    [DrawerRoot, DrawerContent, DrawerPortal], [PopoverRoot, PopoverContent, PopoverPortal], [TooltipRoot, TooltipContent, TooltipPortal]]) {
    const host = document.createElement('div'), target = document.createElement('div'); document.body.append(host, target);
    const shown = shallowRef(true); let paint, constructed = 0, closed = 0, requests = 0;
    const Child = defineComponent({ setup() { constructed++; const count = shallowRef(0);
      return () => h('button', { onClick: () => { count.value++; } }, String(count.value)); } });
    const Cached = defineComponent({ setup: () => () => h(Root, { defaultOpen: true, modal: true, position: false, autoFocus: false,
      unmountOnExit: true, onAfterClose: () => { closed++; }, 'onUpdate:open': () => { requests++; } }, {
      default: value => { paint = value.presentation; return h(Portal, { to: target }, { default: () => h(Content,
        { style: { transitionProperty: 'opacity', transitionDuration: '1s' } }, { default: () => h(Child) }) }); },
    }) });
    const Empty = defineComponent({ render: () => null });
    const app = createApp({ render: () => h(KeepAlive, {}, { default: () => shown.value ? h(Cached) : h(Empty) }) });
    app.mount(host);
    try {
      await drain(); const panel = target.querySelector('[data-part=content]'), button = panel.querySelector('button');
      button.click(); await drain(); assert.equal(button.textContent, '1'); let generation = paint.generation;
      for (let turn = 0; turn < 3; turn++) {
        shown.value = false; await drain();
        assert.equal(panel.hidden, true); assert.equal(panel.inert, true); assert.equal(panel.dataset.state, 'open');
        assert.equal(document.querySelectorAll('[data-sectile-focus-guard]').length, 0);
        const witness = createPopover({ root: document.createElement('div'), defaultOpen: true, position: false, autoFocus: false });
        try { assert.equal(witness.getLayerOrder(), 0, 'cached root returns canonical layer capacity'); } finally { witness.disconnect(); }
        document.dispatchEvent(new browserWindow.KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); await drain();
        assert.equal(requests, 0); assert.equal(closed, 0);
        shown.value = true; await drain(); assert.equal(target.querySelector('[data-part=content]'), panel);
        assert.equal(panel.hidden, false); assert.equal(panel.inert, false); assert.equal(button.textContent, '1');
        assert.equal(constructed, 1); assert.ok(paint.generation > generation); generation = paint.generation;
      }
      document.dispatchEvent(new browserWindow.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      shown.value = false; await drain(); assert.equal(closed, 0, 'suspension cancels the pending exit completion');
      shown.value = true; await drain(); assert.equal(closed, 1, 'accepted exit completes once after reactivation');
      await drain(); assert.equal(closed, 1); assert.equal(requests, 1);
    } finally { app.unmount(); host.remove(); target.remove(); }
    assert.equal(document.querySelectorAll('[data-sectile-focus-guard]').length, 0);
  }
});

test('cached nested popups resume parent admission before descendants and complete accepted inactive closure once', async () => {
  const host = document.createElement('div'), target = document.createElement('div'); document.body.append(host, target);
  const shown = shallowRef(true), open = shallowRef(true); let parent, child, completed = 0;
  const drain = async () => { for (let turn = 0; turn < 6; turn++) await nextTick(); };
  const Cached = defineComponent({ setup: () => () => h(DialogRoot, { open: open.value, modal: false, autoFocus: false,
    onAfterClose: () => { completed++; } }, { default: value => { parent = value.presentation;
      return h(DialogPortal, { to: target }, { default: () => h(DialogContent, {}, { default: () => h(PopoverRoot, {
        defaultOpen: true, autoFocus: false, position: false,
      }, { default: value => { child = value.presentation; return h(PopoverPortal, { to: target }, { default: () => h(PopoverContent) }); } }) }) });
    } }) });
  const Empty = defineComponent({ render: () => null });
  const app = createApp({ render: () => h(KeepAlive, {}, { default: () => shown.value ? h(Cached) : h(Empty) }) });
  app.mount(host);
  try {
    await drain(); const generation = parent.generation;
    shown.value = false; await drain(); assert.equal(completed, 0);
    shown.value = true; await drain(); assert.ok(parent.generation > generation); assert.equal(parent.order, 0); assert.equal(child.order, 1);
    shown.value = false; await drain(); open.value = false; await drain(); assert.equal(completed, 0);
    shown.value = true; await drain(); assert.equal(completed, 1);
    await drain(); assert.equal(completed, 1);
    assert.equal(target.querySelector('[data-scope=popover][data-part=content]').hidden, true, 'accepted inactive ancestor closure cannot revive a child as an independent layer');
    open.value = true; await drain(); assert.equal(parent.order, 0); assert.equal(child.order, 1);
    assert.equal(target.querySelector('[data-scope=popover][data-part=content]').hidden, false);
  } finally { app.unmount(); host.remove(); target.remove(); }
});

test('controlled ancestor refusal preserves the child model without independent native revival', async () => {
  const host = document.createElement('div'), target = document.createElement('div'); document.body.append(host, target);
  const parentOpen = shallowRef(false), childOpen = shallowRef(true); let child, completed = 0; const reasons = [];
  const drain = async () => { for (let turn = 0; turn < 6; turn++) await nextTick(); };
  const app = createApp({ render: () => h(DialogRoot, { open: parentOpen.value, autoFocus: false }, {
    default: () => h(DialogPortal, { to: target }, { default: () => h(DialogContent, {}, { default: () => h(DialogRoot, {
      open: childOpen.value, autoFocus: false, onCloseRequest: reason => reasons.push(reason), onAfterClose: () => { completed++; },
    }, { default: state => { child = state.presentation; return h(DialogPortal, { to: target }, { default: () => h(DialogContent,
      { 'data-refused-child': '' }, { default: () => h('input') }) }); } }) }) }),
  }) });
  const originalOverflow = document.body.style.overflow; app.mount(host);
  try {
    await drain(); const panel = target.querySelector('[data-refused-child]'), input = panel.querySelector('input');
    assert.equal(panel.hidden, true); assert.equal(child, undefined, 'an initially closed ancestor grants no native admission');
    parentOpen.value = true; await drain(); const generation = child.generation;
    input.value = 'Retained'; parentOpen.value = false; await drain();
    assert.equal(childOpen.value, true); assert.deepEqual(reasons, ['ancestor-closed']); assert.equal(completed, 0);
    assert.equal(panel.hidden, true); assert.equal(panel.inert, true); assert.equal(child.order, null);
    assert.equal(document.body.style.overflow, originalOverflow); assert.equal(document.querySelectorAll('[data-sectile-focus-guard]').length, 0);
    parentOpen.value = true; await drain(); assert.equal(panel.hidden, false); assert.ok(child.generation > generation); assert.equal(child.order, 1);
    assert.equal(panel.querySelector('input'), input); assert.equal(input.value, 'Retained');
    parentOpen.value = false; await drain(); childOpen.value = false; await drain(); assert.equal(completed, 1); assert.equal(panel.hidden, true);
    childOpen.value = true; await drain(); assert.equal(panel.hidden, true); assert.equal(child.order, null);
    parentOpen.value = true; await drain(); assert.equal(panel.hidden, false); assert.equal(child.order, 1); assert.equal(completed, 1);
  } finally { app.unmount(); host.remove(); target.remove(); }
  assert.equal(document.querySelectorAll('[data-sectile-focus-guard]').length, 0); assert.equal(document.body.style.overflow, originalOverflow);
});

test('portalled popup families borrow their logical parent despite child-first mounting and reconnect', async () => {
  const host = document.createElement('div'), target = document.createElement('div'); document.body.append(host, target);
  const open = shallowRef(true); let parent, child;
  const app = createApp({ render: () => h(DialogRoot, { defaultOpen: true, label: 'Parent', modal: false, autoFocus: false }, {
    default: state => { parent = state.presentation; return h(DialogPortal, { to: target }, { default: () => h(DialogContent, {}, {
      default: () => h(PopoverRoot, { open: open.value, label: 'Child', position: false, autoFocus: false }, {
        default: state => { child = state.presentation; return h(PopoverPortal, { to: target }, { default: () => h(PopoverContent) }); },
      }),
    }) }); },
  }) });
  const settle = async () => { await nextTick(); await nextTick(); await nextTick(); };
  try {
    app.mount(host); await settle(); assert.equal(parent.order, 0); assert.equal(child.order, 1);
    const generation = child.generation; open.value = false; await settle();
    open.value = true; await settle(); assert.ok(child.generation > generation); assert.equal(parent.order, 0); assert.equal(child.order, 1);
  } finally { app.unmount(); host.remove(); target.remove(); }
  const witness = createPopover({ root: document.createElement('div'), defaultOpen: true, position: false, autoFocus: false });
  try { assert.equal(witness.getLayerOrder(), 0); } finally { witness.disconnect(); }
});

test('reactive drawer direction and gesture settings preserve native focus and active or exiting generation', async () => {
  const host = document.createElement('div'); document.body.append(host);
  const open = shallowRef(true), side = shallowRef('bottom'), enabled = shallowRef(true), threshold = shallowRef(80), disabled = shallowRef(true); let paint;
  const app = createApp({ render: () => h(DrawerRoot, { open: open.value, side: side.value, swipeToDismiss: enabled.value,
    swipeThreshold: threshold.value, disabled: disabled.value, modal: false, autoFocus: false }, {
    default: slot => { paint = slot.presentation; return h(DrawerContent, { style: { transitionProperty: 'opacity', transitionDuration: '1s' } },
      { default: () => [h(DrawerHandle), h('input')] }); },
  }) });
  app.mount(host);
  try {
    await nextTick(); await nextTick(); const active = paint, content = host.querySelector('[data-part="content"]'), input = content.querySelector('input'); input.focus();
    side.value = 'right'; enabled.value = false; threshold.value = 40; await nextTick(); await nextTick();
    assert.equal(paint, active); assert.equal(host.querySelector('[data-part="content"]'), content); assert.equal(document.activeElement, input);
    assert.equal(content.getAttribute('data-side'), 'right');
    open.value = false; await nextTick(); const exit = paint; assert.equal(exit.phase, 'exiting');
    side.value = 'left'; enabled.value = true; threshold.value = 20; await nextTick(); await nextTick();
    assert.equal(paint, exit); assert.equal(content.getAttribute('data-side'), 'left'); assert.equal(exit.generation, active.generation);
    disabled.value = false; open.value = true; await nextTick(); await nextTick();
    assert.equal(content.getAttribute('data-side'), 'left'); assert.equal(paint.phase, 'active');
  } finally { app.unmount(); host.remove(); }
});

test('reactive dialog behavior updates preserve current paint and focus and configure the next opening', async () => {
  const host = document.createElement('div'); document.body.append(host);
  const open = shallowRef(true), modal = shallowRef(false), trap = shallowRef(false), label = shallowRef('Before'), description = shallowRef('help'), target = shallowRef(), restore = shallowRef(true), disabled = shallowRef(false); let paint;
  const app = createApp({ render: () => h(DialogRoot, { open: open.value, modal: modal.value, trapFocus: trap.value,
    label: label.value, describedBy: description.value, initialFocus: target.value, restoreFocus: restore.value, disabled: disabled.value, 'onUpdate:open': value => { open.value = value; } },
  { default: value => { paint = value.presentation; return [h(DialogTrigger), h(DialogContent,
    { style: { transitionProperty: 'opacity', transitionDuration: '1s' } }, { default: () => [h('input'), h('input')] })]; } }) });
  app.mount(host);
  try {
    await nextTick(); await nextTick(); const active = paint;
    const content = host.querySelector('[data-part="content"]'), [first, second] = content.querySelectorAll('input'); second.focus();
    assert.equal(content.getAttribute('aria-describedby'), 'help');
    disabled.value = true; await nextTick(); await nextTick();
    assert.equal(paint, active); assert.equal(document.activeElement, second);
    assert.equal(content.getAttribute('aria-disabled'), 'true'); assert.equal(host.querySelector('[data-part="trigger"]').disabled, true);
    modal.value = true; trap.value = true; label.value = 'After'; description.value = null; target.value = first; await nextTick(); await nextTick();
    assert.equal(paint, active); assert.equal(document.activeElement, second); assert.equal(host.querySelector('[data-part="content"]'), content);
    assert.equal(content.getAttribute('aria-label'), 'After'); assert.equal(document.querySelectorAll('[data-sectile-focus-guard]').length, 2);
    assert.equal(content.hasAttribute('aria-describedby'), false, 'rendering and native behavior share description removal');
    restore.value = false; open.value = false; await nextTick(); const exit = paint; assert.equal(exit.phase, 'exiting');
    assert.equal(document.activeElement === second, true, 'same-update restoreFocus=false keeps focus on the current input');
    modal.value = false; trap.value = false; target.value = second; disabled.value = false; await nextTick(); await nextTick();
    assert.equal(paint, exit); assert.equal(exit.generation, active.generation);
    assert.equal(document.querySelectorAll('[data-sectile-focus-guard]').length, 0);
    open.value = true; await nextTick(); await nextTick(); assert.equal(document.activeElement, second);
  } finally { app.unmount(); host.remove(); }
});

test('reactive popup position updates keep active and retained generations, content and focus', async () => {
  for (const [Root, Content, Trigger] of [[PopoverRoot, PopoverContent, PopoverTrigger], [TooltipRoot, TooltipContent, TooltipTrigger]]) {
    const host = document.createElement('div'); document.body.append(host);
    const open = shallowRef(true), position = shallowRef(false), side = shallowRef('bottom'); let paint;
    const app = createApp({ render: () => h(Root, { open: open.value, position: position.value, side: side.value,
      autoFocus: false, avoidCollisions: false, 'onUpdate:open': value => { open.value = value; } },
    { default: value => { paint = value.presentation; return [h(Trigger), h(Content,
      { style: { transitionProperty: 'opacity', transitionDuration: '1s' } }, { default: () => h('input') })]; } }) });
    app.mount(host);
    try {
      await nextTick(); await nextTick(); const active = paint;
      const content = host.querySelector('[data-part="content"]'), input = host.querySelector('input'); input.focus();
      position.value = true; side.value = 'top'; await nextTick(); await nextTick();
      assert.equal(paint, active); assert.equal(host.querySelector('[data-part="content"]'), content);
      assert.equal(document.activeElement, input); assert.equal(content.style.position, 'absolute');
      open.value = false; await nextTick(); const exit = paint; assert.equal(exit.phase, 'exiting');
      position.value = false; side.value = 'left'; await nextTick(); await nextTick();
      assert.equal(paint, exit); assert.equal(exit.generation, active.generation);
      assert.equal(content.style.position, ''); assert.equal(content.dataset.positionRoute, undefined);
    } finally { app.unmount(); host.remove(); }
  }
});

test('reactive popup dismissal updates keep active and retained generations and native content', async () => {
  const host = document.createElement('div'); document.body.append(host);
  const escape = shallowRef(false), outside = shallowRef(false), open = shallowRef(true); let presentation;
  const app = createApp({ render: () => h(PopoverRoot, { open: open.value, closeOnEscape: escape.value,
    closeOnInteractOutside: outside.value, position: false, autoFocus: false, 'onUpdate:open': value => { open.value = value; } },
    { default: slot => { presentation = slot.presentation; return h(PopoverContent,
      { style: { transitionProperty: 'opacity', transitionDuration: '1s' } }, { default: () => h('input') }); } }) });
  app.mount(host);
  try {
    await nextTick(); await nextTick(); const initial = presentation, content = host.querySelector('[data-part="content"]'), input = host.querySelector('input');
    input.focus(); escape.value = true; outside.value = true; await nextTick();
    assert.equal(presentation, initial); assert.equal(document.activeElement, input); assert.equal(host.querySelector('input'), input);
    escape.value = false; outside.value = false; await nextTick();
    document.dispatchEvent(new browserWindow.KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); await nextTick();
    assert.equal(open.value, true); assert.equal(presentation, initial);
    open.value = false; await nextTick(); await nextTick(); const exit = presentation;
    escape.value = true; outside.value = true; await nextTick();
    assert.equal(presentation, exit); assert.equal(presentation.generation, initial.generation);
    assert.equal(host.querySelector('[data-part="content"]'), content);
  } finally { app.unmount(); host.remove(); }
});

test('popup provider transfers active and retained participation without reopening generations', async () => {
  const host = document.createElement('div'); document.body.append(host);
  const policy = { key: 'vue-provider', capacity: 1 };
  const first = connectLayerHost({ element: host, policy }).value, second = connectLayerHost({ element: host, policy }).value;
  const target = shallowRef(first), open = shallowRef(true); let presentation;
  const app = createApp({ render: () => h(HostProvider, { layerHost: target }, { default: () => h(PopoverRoot,
    { open: open.value, position: false, autoFocus: false }, { default: slot => { presentation = slot.presentation;
      return h(PopoverContent, { style: { transitionProperty: 'opacity', transitionDuration: '20ms' } }); } }) }) });
  app.mount(host);
  try {
    await nextTick(); await nextTick(); const generation = presentation.generation;
    assert.equal(presentation.hostOrder, 0);
    target.value = second; await nextTick(); assert.equal(presentation.generation, generation);
    first.disconnect();
    assert.equal(second.reconfigure(policy, [second]).ok, true);
    open.value = false; await nextTick(); await nextTick(); assert.equal(presentation.phase, 'exiting');
    const panel = host.querySelector('[data-part="content"]');
    target.value = undefined; await nextTick();
    assert.equal(presentation.phase, 'exiting'); assert.equal(presentation.generation, generation); assert.equal(presentation.hostOrder, undefined);
    assert.equal(second.reconfigure({ key: 'vue-provider', capacity: 0 }, [second]).ok, true);
    await new Promise(resolve => setTimeout(resolve, 25)); panel.dispatchEvent(new Event('transitionend')); await nextTick();
    assert.equal(presentation.phase, 'closed');
  } finally { app.unmount(); host.remove(); first.disconnect(); second.disconnect(); }
});

test('explicit unavailable popup provider does not inherit parent admission and recovers when supplied', async () => {
  const host = document.createElement('div'); document.body.append(host);
  const capability = connectLayerHost({ element: host, policy: { key: 'blocked-provider', capacity: 1 } }).value;
  const target = shallowRef(null), errors = []; let presentation;
  const app = createApp({ render: () => h(HostProvider, { layerHost: capability }, { default: () => h(HostProvider, { layerHost: target }, {
    default: () => h(PopoverRoot, { defaultOpen: true, position: false, autoFocus: false }, {
      default: slot => { presentation = slot.presentation; return h(PopoverContent); },
    }),
  }) }) });
  app.config.errorHandler = error => errors.push(error);
  app.mount(host);
  try {
    await nextTick(); await nextTick();
    assert.equal(presentation, undefined); assert.equal(errors.length, 1); assert.equal(errors[0].code, 'dom.layer-host-unavailable');
    target.value = capability; await nextTick(); await nextTick(); await nextTick();
    assert.equal(presentation.phase, 'active'); assert.equal(presentation.hostOrder, 0);
  } finally { app.unmount(); host.remove(); capability.disconnect(); }
});

test('popup presentation retains the backdrop after a zero-motion panel unmounts', async () => {
  const host = document.createElement('div'); document.body.append(host);
  const open = shallowRef(true); let presentation;
  const app = createApp({ render: () => h(DialogRoot, { open: open.value, modal: false, unmountOnExit: true }, {
    default: (slot) => {
      presentation = slot.presentation;
      return [h(DialogContent, null, { default: () => 'Panel' }), h(DialogOverlay, { style: { transitionProperty: 'opacity', transitionDuration: '20ms' } })];
    },
  }) });
  let witness;
  app.mount(host);
  try {
    await nextTick(); await nextTick();
    assert.equal(presentation.phase, 'active');
    const generation = presentation.generation;
    open.value = false; await nextTick(); await nextTick();
    assert.equal(host.querySelector('[data-part="content"]'), null);
    const overlay = host.querySelector('[data-part="overlay"]');
    assert.ok(overlay); assert.equal(overlay.inert, true);
    assert.equal(presentation.phase, 'exiting'); assert.equal(presentation.generation, generation);
    witness = createPopover({ root: document.createElement('div'), defaultOpen: true, position: false, autoFocus: false });
    const snapshots = []; witness.subscribeLayerPresentation(value => snapshots.push(value));
    assert.equal(snapshots.at(-1).order, 1, 'the backdrop still owns its canonical paint slot');
    await new Promise(resolve => setTimeout(resolve, 25));
    overlay.dispatchEvent(new Event('transitionend')); await nextTick(); await nextTick();
    assert.equal(presentation.phase, 'closed'); assert.equal(host.querySelector('[data-part="overlay"]'), null);
    assert.equal(snapshots.at(-1).order, 0);
  } finally { app.unmount(); host.remove(); witness?.disconnect(); }
});

test('popup presentation waits for both parts and preserves controlled rejection and reopened generations', async () => {
  const host = document.createElement('div'); document.body.append(host);
  const open = shallowRef(true), showOverlay = shallowRef(true); let presentation; const requests = [], reasons = [];
  const motion = { transitionProperty: 'opacity', transitionDuration: '20ms' };
  const layerHost = connectLayerHost({ element: host, policy: { key: 'invocation-bridge', capacity: 1 } }).value;
  const reservation = reserveLayerPresentation({ element: host, layerHost }).value;
  const accepted = [], causes = []; let requestClose, detached = 0, completed = 0;
  const app = createApp({ setup() {
    provideHostLayer(layerHost);
    provideHostPopup({ reservation, attach(close) { requestClose = close; }, onCloseRequest(reason) { causes.push(reason); },
      onOpenChange(value) { accepted.push(value); }, onAfterClose() { completed++; }, detach() { detached++; reservation.release(); } });
    return () => h(DialogRoot, { open: open.value, modal: false, 'onUpdate:open': value => requests.push(value), onCloseRequest: reason => reasons.push(reason) }, {
    default: slot => {
      presentation = slot.presentation;
      return [h(DialogContent, { style: motion }, { default: () => h(DialogClose, null, { default: () => 'Close' }) }), showOverlay.value ? h(DialogOverlay, { style: motion }) : null];
    },
  }); } });
  app.mount(host);
  try {
    await nextTick(); await nextTick();
    const initial = presentation;
    assert.deepEqual(accepted, [true], 'initial acceptance follows native reservation consumption');
    assert.equal(reserveLayerPresentation({ element: host, layerHost }).error.code, 'dom.layer-host-capacity');
    host.querySelector('[data-part="close"]').click(); await nextTick();
    assert.deepEqual(requests, [false]); assert.equal(presentation, initial, 'rejected controlled close publishes no replacement');
    assert.deepEqual(reasons, ['close-button'], 'cause notification is a request, not accepted closure');
    assert.deepEqual(causes, ['close-button']); assert.deepEqual(accepted, [true]);
    requestClose(); await nextTick(); assert.deepEqual(causes, ['close-button', 'programmatic']); assert.deepEqual(accepted, [true]);
    document.dispatchEvent(new browserWindow.KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); await nextTick();
    assert.equal(causes.at(-1), 'escape'); assert.deepEqual(accepted, [true]);
    open.value = false; await nextTick(); await nextTick(); assert.equal(presentation.phase, 'exiting');
    assert.deepEqual(accepted, [true, false]); assert.equal(completed, 0, 'accepted close precedes decorative removal');
    const panel = host.querySelector('[data-part="content"]'), backdrop = host.querySelector('[data-part="overlay"]');
    await new Promise(resolve => setTimeout(resolve, 25));
    panel.dispatchEvent(new Event('transitionend')); await nextTick();
    assert.equal(panel.hidden, true); assert.equal(presentation.phase, 'exiting', 'panel completion alone cannot release the backdrop');
    open.value = true; await nextTick(); await nextTick();
    assert.equal(presentation.phase, 'active'); assert.ok(presentation.generation > initial.generation);
    assert.deepEqual(accepted, [true, false, true]);
    const reopened = presentation.generation;
    backdrop.dispatchEvent(new Event('transitionend')); await nextTick();
    assert.equal(presentation.phase, 'active'); assert.equal(presentation.generation, reopened);
    open.value = false; await nextTick(); await nextTick();
    showOverlay.value = false; await nextTick();
    assert.equal(presentation.phase, 'exiting', 'disposing the backdrop still waits for the panel');
    await new Promise(resolve => setTimeout(resolve, 25)); panel.dispatchEvent(new Event('transitionend')); await nextTick(); await nextTick();
    assert.equal(presentation.phase, 'closed');
    assert.equal(completed, 1);
    const next = reserveLayerPresentation({ element: host, layerHost }); assert.equal(next.ok, true); next.value.release();
  } finally { app.unmount(); host.remove(); layerHost.disconnect(); }
  assert.equal(detached, 1);
});

test('one invocation binding is isolated from nested and sibling popup roots', async () => {
  const host = document.createElement('div'); document.body.append(host);
  const changes = [], causes = []; let attached = 0, detached = 0;
  const app = createApp({ setup() {
    provideHostPopup({ attach() { attached++; }, onOpenChange(value) { changes.push(value); }, onCloseRequest(reason) { causes.push(reason); }, onAfterClose() {}, detach() { detached++; } });
    return () => [h(DialogRoot, { defaultOpen: true, modal: false, autoFocus: false }, {
      default: () => h(DialogContent, null, { default: () => h(DialogRoot, { defaultOpen: true, modal: false, autoFocus: false }, {
        default: () => h(DialogContent, null, { default: () => h(DialogClose, { 'data-nested-close': '' }, { default: () => 'Nested close' }) }),
      }) }),
    }), h(DrawerRoot, { defaultOpen: true, modal: false, autoFocus: false }, { default: () => h(DrawerContent, null, { default: () => 'Sibling' }) })];
  } });
  app.mount(host);
  try {
    await nextTick(); await nextTick();
    assert.equal(attached, 1); assert.deepEqual(changes, [true]);
    host.querySelector('[data-nested-close]').click(); await nextTick(); await nextTick();
    assert.deepEqual(causes, []); assert.deepEqual(changes, [true]);
  } finally { app.unmount(); host.remove(); }
  assert.equal(detached, 1);
});

test('popup option replacement waits for retained exit and applies latest props on reopen', async () => {
  for (const unmountOnExit of [false, true]) {
    const host = document.createElement('div'); document.body.append(host);
    const open = shallowRef(true), label = shallowRef('Initial panel'); let presentation, witness, closed = 0;
    const motion = { transitionProperty: 'opacity', transitionDuration: '20ms' };
    const app = createApp({ render: () => h(DialogRoot, { open: open.value, label: label.value, modal: false, autoFocus: false, unmountOnExit, onAfterClose() { closed++; } }, {
      default: slot => { presentation = slot.presentation; return [h(DialogContent, { style: motion }), h(DialogOverlay, { style: motion })]; },
    }) });
    app.mount(host);
    try {
      await nextTick(); await nextTick(); const generation = presentation.generation;
      open.value = false; await nextTick(); await nextTick();
      const panel = host.querySelector('[data-part="content"]'), backdrop = host.querySelector('[data-part="overlay"]');
      witness = createPopover({ root: document.createElement('div'), defaultOpen: true, position: false, autoFocus: false });
      let order; witness.subscribeLayerPresentation(snapshot => { order = snapshot.order; });
      for (const value of ['Intermediate panel', 'Latest panel']) {
        label.value = value; await nextTick(); await nextTick();
        assert.equal(presentation.phase, 'exiting'); assert.equal(presentation.generation, generation);
        assert.equal(order, 1, 'reactive replacement must not release unfinished paint');
      }
      await new Promise(resolve => setTimeout(resolve, 25));
      panel.dispatchEvent(new Event('transitionend')); await nextTick(); await nextTick();
      assert.equal(presentation.phase, 'exiting'); assert.equal(order, 1);
      assert.equal(closed, 0, 'completion waits for both Presence owners');
      backdrop.dispatchEvent(new Event('transitionend')); await nextTick(); await nextTick();
      assert.equal(order, 0, 'both Presence owners completed the original generation');
      assert.equal(closed, 1);
      backdrop.dispatchEvent(new Event('transitionend')); await nextTick(); assert.equal(closed, 1);
      assert.notEqual(presentation?.phase, 'exiting');
      open.value = true; await nextTick(); await nextTick(); await nextTick();
      assert.equal(presentation.phase, 'active'); assert.ok(presentation.generation > generation);
      assert.equal(host.querySelector('[data-part="content"]').getAttribute('aria-label'), 'Latest panel');
      open.value = false; await nextTick(); await nextTick();
      const interrupted = presentation.generation, stalePanel = host.querySelector('[data-part="content"]');
      label.value = 'Reopened panel'; await nextTick(); await nextTick();
      assert.equal(presentation.phase, 'exiting'); assert.equal(presentation.generation, interrupted);
      open.value = true; await nextTick(); await nextTick(); await nextTick();
      assert.equal(presentation.phase, 'active'); assert.ok(presentation.generation > interrupted);
      assert.equal(host.querySelector('[data-part="content"]').getAttribute('aria-label'), 'Reopened panel');
      const reopened = presentation.generation;
      stalePanel.dispatchEvent(new Event('transitionend')); await nextTick();
      assert.equal(presentation.phase, 'active'); assert.equal(presentation.generation, reopened);
    } finally { app.unmount(); host.remove(); witness?.disconnect(); }
    assert.equal(closed, 1, 'interrupted exit and owner disposal do not report a completed visual close');
  }
});

test('popup zero-motion completion and owner unmount leave no retained paint slots', async () => {
  for (const moving of [false, true, true]) {
    const host = document.createElement('div'); document.body.append(host);
    const open = shallowRef(true); let presentation, closed = 0;
    const app = createApp({ render: () => h(PopoverRoot, { open: open.value, position: false, autoFocus: false, onAfterClose() { closed++; } }, {
      default: slot => { presentation = slot.presentation; return h(PopoverContent, moving ? { style: { transitionProperty: 'opacity', transitionDuration: '100ms' } } : null); },
    }) });
    app.mount(host);
    try {
      await nextTick(); await nextTick(); assert.equal(presentation.order, 0);
      open.value = false; await nextTick(); await nextTick();
      assert.equal(presentation.phase, moving ? 'exiting' : 'closed');
      assert.equal(closed, moving ? 0 : 1);
    } finally { app.unmount(); host.remove(); }
    assert.equal(closed, moving ? 0 : 1, 'disposal is not a completed exit');
    const witness = createPopover({ root: document.createElement('div'), defaultOpen: true, position: false, autoFocus: false });
    try {
      const snapshots = []; witness.subscribeLayerPresentation(value => snapshots.push(value));
      assert.equal(snapshots[0].order, 0, 'unmount releases the retained generation, including cancelled motion');
    } finally { witness.disconnect(); }
  }
});

const PopupSurface = defineComponent({
  name: 'PopupSurface',
  inheritAttrs: false,
  setup(_props, { attrs, expose, slots }) {
    const element = shallowRef(null);
    expose({ element });
    return () => h('div', { ...attrs, ref: element }, slots.default?.());
  },
});

test('dialog Escape policy updates while open and preserves independent explicit close', async () => {
  const host = document.createElement('div'); document.body.append(host);
  const open = ref(true); const closeOnEscape = ref(false); let requests = 0;
  const app = createApp({ render: () => h(DialogRoot, {
    open: open.value, modal: false, closeOnEscape: closeOnEscape.value, closeOnInteractOutside: false,
    'onUpdate:open': (value) => { requests++; open.value = value; },
  }, { default: () => h(DialogContent, null, { default: () => h(DialogClose, null, { default: () => 'Close' }) }) }) });
  app.mount(host);
  const escape = () => document.dispatchEvent(new browserWindow.KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
  try {
    await nextTick(); await nextTick();
    escape(); await nextTick(); assert.equal(open.value, true); assert.equal(requests, 0);
    closeOnEscape.value = true; await nextTick(); await nextTick();
    escape(); await nextTick(); await nextTick(); assert.equal(open.value, false); assert.equal(requests, 1);
    closeOnEscape.value = false; open.value = true; await nextTick(); await nextTick();
    escape(); await nextTick(); assert.equal(open.value, true); assert.equal(requests, 1);
    host.querySelector('[data-part="close"]').click(); await nextTick(); await nextTick();
    assert.equal(open.value, false); assert.equal(requests, 2);
  } finally { app.unmount(); host.remove(); }
  escape(); assert.equal(requests, 2, 'unmounted connection no longer receives Escape');
});

test('checkbox indicator retains exit motion and cancels stale completion on reopen', async () => {
  const host = document.createElement('div'); document.body.append(host); const checked = ref(true);
  const motion = { transitionProperty: 'opacity', transitionDuration: '20ms' };
  const app = createApp({ render: () => h(CheckboxRoot, {
    modelValue: checked.value,
    'onUpdate:modelValue': (value) => { checked.value = value; },
  }, { default: () => h(CheckboxIndicator, { style: motion }, { default: () => '✓' }) }) });
  app.mount(host);
  try {
    await nextTick(); await nextTick();
    const indicator = host.querySelector('[data-scope="checkbox"][data-part="indicator"]');
    assert.ok(indicator instanceof HTMLElement); assert.equal(indicator.hidden, false); assert.equal(indicator.dataset.state, 'checked');

    checked.value = false; await nextTick();
    assert.equal(indicator.dataset.state, 'unchecked'); assert.equal(indicator.hidden, false);
    checked.value = true; await nextTick();
    assert.equal(host.querySelector('[data-part="indicator"]'), indicator); assert.equal(indicator.dataset.state, 'checked'); assert.equal(indicator.hidden, false);
    await new Promise((resolve) => setTimeout(resolve, 25)); indicator.dispatchEvent(new Event('transitionend', { bubbles: true })); await nextTick();
    assert.equal(indicator.hidden, false, 'stale exit completion stays cancelled after reopen');

    checked.value = false; await nextTick();
    await new Promise((resolve) => setTimeout(resolve, 25)); indicator.dispatchEvent(new Event('transitionend', { bubbles: true })); await nextTick(); await nextTick();
    assert.equal(indicator.dataset.state, 'unchecked'); assert.equal(indicator.hidden, true);
  } finally {
    app.unmount(); host.remove();
  }
});

test('radio indicator supports forcePresent while zero-motion indicators hide immediately', async () => {
  const host = document.createElement('div'); document.body.append(host); const value = ref('a');
  const app = createApp({ render: () => h(RadioGroupRoot, {
    items: ['a', 'b'], modelValue: value.value, 'onUpdate:modelValue': (next) => { value.value = next; },
  }, { default: () => [
    h(RadioGroupItem, { value: 'a' }, { default: () => h(RadioGroupIndicator, { forcePresent: true }, { default: () => 'A' }) }),
    h(RadioGroupItem, { value: 'b' }, { default: () => h(RadioGroupIndicator, null, { default: () => 'B' }) }),
  ] }) });
  app.mount(host);
  try {
    await nextTick(); await nextTick();
    const indicators = [...host.querySelectorAll('[data-scope="radio-group"][data-part="indicator"]')];
    const first = indicators[0]; const second = indicators[1];
    assert.ok(first instanceof HTMLElement); assert.ok(second instanceof HTMLElement);
    assert.equal(first.hidden, false); assert.equal(first.dataset.state, 'checked'); assert.equal(second.hidden, true);

    value.value = 'b'; await nextTick(); await nextTick();
    assert.equal(first.dataset.state, 'unchecked'); assert.equal(first.hidden, false, 'forcePresent never derives hidden from inactive state');
    assert.equal(second.dataset.state, 'checked'); assert.equal(second.hidden, false);

    value.value = 'a'; await nextTick(); await nextTick();
    assert.equal(second.dataset.state, 'unchecked'); assert.equal(second.hidden, true, 'zero-motion inactive indicator completes immediately');
  } finally {
    app.unmount(); host.remove();
  }
});

test('navigation menu indicator retains CSS animation before hiding', async () => {
  const host = document.createElement('div'); document.body.append(host); const open = ref(true);
  const motion = { animationName: 'indicator-exit', animationDuration: '20ms', animationIterationCount: '1' };
  const app = createApp({ render: () => h(NavigationMenuIndicator, { open: open.value, style: motion }) });
  app.mount(host);
  try {
    await nextTick(); await nextTick();
    const indicator = host.querySelector('[data-scope="navigation-menu"][data-part="indicator"]');
    assert.ok(indicator instanceof HTMLElement); assert.equal(indicator.hidden, false); assert.equal(indicator.dataset.state, 'visible');
    open.value = false; await nextTick();
    assert.equal(indicator.dataset.state, 'hidden'); assert.equal(indicator.hidden, false);
    await new Promise((resolve) => setTimeout(resolve, 25)); indicator.dispatchEvent(new Event('animationend', { bubbles: true })); await nextTick(); await nextTick();
    assert.equal(indicator.hidden, true);
  } finally {
    app.unmount(); host.remove();
  }
});

test('listbox indicator registry measures only the changed exit at high cardinality', async () => {
  const host = document.createElement('div'); document.body.append(host);
  const items = Array.from({ length: 1_000 }, (_, index) => `item-${index}`);
  const value = ref(items[0]);
  const motion = { transitionProperty: 'opacity', transitionDuration: '20ms' };
  const app = createApp({ render: () => h(ListboxRoot, {
    items, modelValue: value.value, 'onUpdate:modelValue': (next) => { value.value = next; },
  }, { default: () => items.map((item) => h(ListboxItem, { value: item, key: item }, {
    default: () => h(ListboxItemIndicator, { style: motion }, { default: () => '✓' }),
  })) }) });
  app.mount(host);
  try {
    await nextTick(); await nextTick();
    const options = [...host.querySelectorAll('[role="option"]')];
    const indicators = options.map((option) => option.querySelector('[data-part="item-indicator"]'));
    const exits = new Map();
    let animationReads = 0;
    for (const indicator of indicators) {
      assert.ok(indicator instanceof HTMLElement);
      const exit = deferred();
      exits.set(indicator, exit);
      indicator.getAnimations = () => {
        animationReads += 1;
        return [fakeAnimation(exit.promise, 20)];
      };
    }

    value.value = items[1];
    await nextTick(); await nextTick();
    assert.equal(animationReads, 1, 'only the previously selected indicator inspects exit animations');

    const first = indicators[0];
    const second = indicators[1];
    assert.ok(first instanceof HTMLElement); assert.ok(second instanceof HTMLElement);
    assert.equal(first.dataset.state, 'unchecked'); assert.equal(first.hidden, false);
    assert.equal(second.dataset.state, 'checked'); assert.equal(second.hidden, false);
    for (let index = 2; index < indicators.length; index += 1) {
      const indicator = indicators[index];
      assert.ok(indicator instanceof HTMLElement); assert.equal(indicator.hidden, true);
    }

    exits.get(first)?.resolve();
    await Promise.resolve(); await Promise.resolve(); await nextTick(); await nextTick();
    assert.equal(first.hidden, true);
  } finally {
    app.unmount(); host.remove();
  }
});

test('Select and both cascade hosts retain only the previous item indicator through exit motion', async () => {
  const host = document.createElement('div'); document.body.append(host);
  const items = ['alpha', 'beta'];
  const nodes = items.map((id) => ({ id, parentID: null }));
  const selectValue = ref('alpha'); const listValue = ref('alpha'); const cascadeValue = ref('alpha');
  const motion = { transitionProperty: 'opacity', transitionDuration: '20ms' };
  const renderSelectItems = () => items.map((value) => h(SelectItem, { value, key: value }, {
    default: () => [h(SelectItemText, null, { default: () => value }), h(SelectItemIndicator, { style: motion }, { default: () => '✓' })],
  }));
  const app = createApp({ render: () => [
    h(SelectRoot, {
      items, modelValue: selectValue.value, defaultOpen: true, position: false,
      'onUpdate:modelValue': (value) => { selectValue.value = value; },
    }, { default: () => [h(SelectTrigger), h(SelectContent, null, { default: () => h(SelectViewport, null, { default: renderSelectItems }) })] }),
    h(CascadeListRoot, {
      nodes, modelValue: listValue.value, 'onUpdate:modelValue': (value) => { listValue.value = value; },
    }, { default: () => items.map((value) => h(CascadeListItem, { value, key: value }, {
      default: () => h(CascadeListItemIndicator, { style: motion }, { default: () => '✓' }),
    })) }),
    h(CascadeSelectRoot, {
      nodes, modelValue: cascadeValue.value, defaultOpen: true, position: false,
      'onUpdate:modelValue': (value) => { cascadeValue.value = value; },
    }, { default: () => [h(CascadeSelectTrigger), h(CascadeSelectContent, null, { default: () => items.map((value) => h(CascadeSelectItem, { value, key: value }, {
      default: () => h(CascadeSelectItemIndicator, { style: motion }, { default: () => '✓' }),
    })) })] }),
  ] });
  app.mount(host);
  try {
    await nextTick(); await nextTick();
    const scopes = ['select', 'cascade-list', 'cascade-select'];
    const exiting = [];
    const exits = [];
    for (const scope of scopes) {
      const indicators = [...host.querySelectorAll(`[data-scope="${scope}"][data-part="item-indicator"]`)];
      assert.equal(indicators.length, 2);
      const first = indicators[0];
      assert.ok(first instanceof HTMLElement);
      const exit = deferred();
      first.getAnimations = () => [fakeAnimation(exit.promise, 20)];
      exiting.push(first);
      exits.push(exit);
    }

    selectValue.value = 'beta'; listValue.value = 'beta'; cascadeValue.value = 'beta';
    await nextTick(); await nextTick();
    for (const scope of scopes) {
      const indicators = [...host.querySelectorAll(`[data-scope="${scope}"][data-part="item-indicator"]`)];
      const first = indicators[0]; const second = indicators[1];
      assert.ok(first instanceof HTMLElement); assert.ok(second instanceof HTMLElement);
      assert.equal(first.dataset.state, 'unchecked'); assert.equal(first.hidden, false);
      assert.equal(second.dataset.state, 'checked'); assert.equal(second.hidden, false);
    }
    for (const exit of exits) exit.resolve();
    await Promise.resolve(); await Promise.resolve(); await nextTick(); await nextTick();
    for (const indicator of exiting) assert.equal(indicator.hidden, true);
  } finally {
    app.unmount(); host.remove();
  }
});

test('structural content retains exit motion while inactive semantics are quarantined immediately', async () => {
  const host = document.createElement('div'); document.body.append(host);
  const disclosureOpen = ref(true);
  const accordionValue = ref('a');
  const tabValue = ref('a');
  const expanded = ref(['root']);
  const motion = { transitionProperty: 'opacity', transitionDuration: '20ms' };
  const treeNodes = [{ id: 'root', parentID: null }, { id: 'leaf', parentID: 'root' }];
  const app = createApp({ render: () => [
    h(DisclosureRoot, { modelValue: disclosureOpen.value, 'onUpdate:modelValue': (value) => { disclosureOpen.value = value; } }, {
      default: () => h(DisclosureContent, { style: motion }, { default: () => 'Disclosure' }),
    }),
    h(AccordionRoot, { items: ['a'], modelValue: accordionValue.value, 'onUpdate:modelValue': (value) => { accordionValue.value = value; } }, {
      default: () => h(AccordionItem, { value: 'a' }, { default: () => h(AccordionContent, { style: motion }, { default: () => 'Accordion' }) }),
    }),
    h(TabsRoot, { items: ['a', 'b'], modelValue: tabValue.value, 'onUpdate:modelValue': (value) => { tabValue.value = value; } }, {
      default: () => [
        h(TabsContent, { value: 'a', style: motion }, { default: () => 'A' }),
        h(TabsContent, { value: 'b' }, { default: () => 'B' }),
      ],
    }),
    h(TreeViewRoot, { nodes: treeNodes, expandedValues: expanded.value, 'onUpdate:expandedValues': (value) => { expanded.value = value; } }, {
      default: () => [
        h(TreeViewItem, { value: 'root' }),
        h(TreeViewGroup, { for: 'root', style: motion }, { default: () => h(TreeViewItem, { value: 'leaf' }) }),
      ],
    }),
  ] });
  app.mount(host);
  try {
    await nextTick(); await nextTick();
    const content = [
      host.querySelector('[data-scope="disclosure"][data-part="content"]'),
      host.querySelector('[data-scope="accordion"][data-part="content"]'),
      host.querySelector('[data-scope="tabs"][data-part="content"][data-state="active"]'),
      host.querySelector('[data-scope="tree-view"][data-part="group"]'),
    ];
    for (const element of content) { assert.ok(element instanceof HTMLElement); assert.equal(element.hidden, false); }

    disclosureOpen.value = false;
    accordionValue.value = '';
    tabValue.value = 'b';
    expanded.value = [];
    await nextTick(); await nextTick();

    for (const element of content) {
      assert.equal(element.hidden, false);
      assert.equal(element.inert, true);
      assert.equal(element.getAttribute('aria-hidden'), 'true');
    }
    assert.equal(content[0].dataset.state, 'closed');
    assert.equal(content[1].dataset.state, 'closed');
    assert.equal(content[2].dataset.state, 'inactive');
    assert.equal(content[3].dataset.state, 'closed');

    await new Promise((resolve) => setTimeout(resolve, 25));
    for (const element of content) element.dispatchEvent(new Event('transitionend', { bubbles: true }));
    await nextTick(); await nextTick();
    for (const element of content) {
      assert.equal(element.hidden, true);
      assert.equal(element.inert, false);
      assert.equal(element.getAttribute('aria-hidden'), null);
    }
  } finally {
    app.unmount(); host.remove();
  }
});

test('forcePresent keeps inactive structural content rendered but quarantined', async () => {
  const host = document.createElement('div'); document.body.append(host);
  const value = ref('a');
  const app = createApp({ render: () => h(TabsRoot, { items: ['a', 'b'], modelValue: value.value, 'onUpdate:modelValue': (next) => { value.value = next; } }, {
    default: () => h(TabsContent, { value: 'a', forcePresent: true }, { default: () => 'A' }),
  }) });
  app.mount(host);
  try {
    await nextTick();
    const content = host.querySelector('[data-scope="tabs"][data-part="content"]');
    assert.ok(content instanceof HTMLElement); assert.equal(content.hidden, false); assert.equal(content.inert, false);
    value.value = 'b'; await nextTick(); await nextTick();
    assert.equal(content.dataset.state, 'inactive'); assert.equal(content.hidden, false);
    assert.equal(content.inert, true); assert.equal(content.getAttribute('aria-hidden'), 'true');
  } finally {
    app.unmount(); host.remove();
  }
});

test('carousel crossfade keeps only the active slide interactive and AT-visible', async () => {
  const host = document.createElement('div'); document.body.append(host);
  const value = ref('a');
  const motion = { transitionProperty: 'opacity', transitionDuration: '20ms' };
  const app = createApp({ render: () => h(CarouselRoot, { slides: ['a', 'b'], modelValue: value.value, 'onUpdate:modelValue': (next) => { value.value = next; } }, {
    default: () => [
      h(CarouselSlide, { value: 'a', style: motion }, { default: () => h('button', null, 'A') }),
      h(CarouselSlide, { value: 'b' }, { default: () => h('button', null, 'B') }),
    ],
  }) });
  app.mount(host);
  try {
    await nextTick(); await nextTick();
    const slides = [...host.querySelectorAll('[data-scope="carousel"][data-part="slide"]')];
    const first = slides[0]; const second = slides[1];
    assert.ok(first instanceof HTMLElement); assert.ok(second instanceof HTMLElement);
    assert.equal(first.hidden, false); assert.equal(first.inert, false); assert.equal(second.hidden, true);

    value.value = 'b'; await nextTick(); await nextTick();
    assert.equal(first.dataset.state, 'inactive'); assert.equal(first.hidden, false);
    assert.equal(first.inert, true); assert.equal(first.getAttribute('aria-hidden'), 'true');
    assert.equal(second.dataset.state, 'active'); assert.equal(second.hidden, false);
    assert.equal(second.inert, false); assert.equal(second.getAttribute('aria-hidden'), null);

    await new Promise((resolve) => setTimeout(resolve, 25)); first.dispatchEvent(new Event('transitionend', { bubbles: true }));
    await nextTick(); await nextTick();
    assert.equal(first.hidden, true); assert.equal(first.inert, false); assert.equal(first.getAttribute('aria-hidden'), null);
  } finally {
    app.unmount(); host.remove();
  }
});

test('combobox empty status suppresses stale live-region semantics during retained exit and reopen', async () => {
  const host = document.createElement('div'); document.body.append(host);
  const inputValue = ref('zzz');
  const motion = { transitionProperty: 'opacity', transitionDuration: '20ms' };
  const app = createApp({ render: () => h(ComboboxRoot, {
    items: [{ id: 'alpha', label: 'Alpha' }],
    inputValue: inputValue.value,
    policies: { matches: (label, query) => label.toLowerCase().includes(query.toLowerCase()) },
    'onUpdate:inputValue': (value) => { inputValue.value = value; },
  }, { default: () => [
    h(ComboboxInput),
    h(ComboboxEmpty, { style: motion }, { default: () => 'No results' }),
  ] }) });
  app.mount(host);
  try {
    await nextTick(); await nextTick();
    const empty = host.querySelector('[data-scope="combobox"][data-part="empty"]');
    assert.ok(empty instanceof HTMLElement);
    assert.equal(empty.dataset.state, 'visible'); assert.equal(empty.hidden, false);
    assert.equal(empty.getAttribute('role'), 'status'); assert.equal(empty.getAttribute('aria-live'), null);

    inputValue.value = '';
    await nextTick(); await nextTick();
    assert.equal(empty.dataset.state, 'hidden'); assert.equal(empty.hidden, false); assert.equal(empty.inert, true);
    assert.equal(empty.getAttribute('role'), null); assert.equal(empty.getAttribute('aria-live'), 'off'); assert.equal(empty.getAttribute('aria-hidden'), 'true');

    inputValue.value = 'zzz';
    await nextTick(); await nextTick();
    assert.equal(host.querySelector('[data-part="empty"]'), empty);
    assert.equal(empty.dataset.state, 'visible'); assert.equal(empty.hidden, false); assert.equal(empty.inert, false);
    assert.equal(empty.getAttribute('role'), 'status'); assert.equal(empty.getAttribute('aria-live'), null); assert.equal(empty.getAttribute('aria-hidden'), null);

    inputValue.value = '';
    await nextTick(); await nextTick();
    await new Promise((resolve) => setTimeout(resolve, 25)); empty.dispatchEvent(new Event('transitionend', { bubbles: true }));
    await nextTick(); await nextTick();
    assert.equal(empty.hidden, true); assert.equal(empty.inert, false);
    assert.equal(empty.getAttribute('role'), null); assert.equal(empty.getAttribute('aria-live'), 'off'); assert.equal(empty.getAttribute('aria-hidden'), null);
  } finally {
    app.unmount(); host.remove();
  }
});

test('tree-grid editor retains visual exit without retaining focus or edit semantics', async () => {
  const host = document.createElement('div'); document.body.append(host);
  const rows = [{ id: 'root', parentID: null, cells: ['name'] }];
  const values = new Map([['name', 'Root']]);
  const editMode = ref('navigation');
  const motion = { transitionProperty: 'opacity', transitionDuration: '20ms' };
  const app = createApp({ render: () => h(TreeGridRoot, {
    rows,
    defaultHighlightedValue: 'name',
    editMode: editMode.value,
    'onUpdate:editMode': (value) => { editMode.value = value; },
    getCellValue: (id) => values.get(id) ?? '',
    setCellValue: (id, value) => values.set(id, value),
  }, { default: () => h(TreeGridRow, { value: 'root', rowIndex: 1 }, {
    default: () => h(TreeGridCell, { value: 'name', columnIndex: 1 }, {
      default: () => h(TreeGridEditor, { for: 'name', style: motion }),
    }),
  }) }) });
  app.mount(host);
  try {
    await nextTick(); await nextTick();
    const root = host.querySelector('[data-scope="tree-grid"][data-part="root"]');
    const cell = host.querySelector('[data-scope="tree-grid"][data-part="cell"]');
    const editor = host.querySelector('[data-scope="tree-grid"][data-part="editor"]');
    assert.ok(root instanceof HTMLElement); assert.ok(cell instanceof HTMLElement); assert.ok(editor instanceof HTMLInputElement);
    assert.equal(editor.dataset.state, 'idle'); assert.equal(editor.hidden, true);

    root.dispatchEvent(new browserWindow.KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    await nextTick(); await Promise.resolve(); await nextTick();
    assert.equal(editor.dataset.state, 'editing'); assert.equal(editor.hidden, false); assert.equal(editor.inert, false);
    assert.equal(document.activeElement, editor);

    root.dispatchEvent(new browserWindow.KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    await nextTick(); await Promise.resolve(); await nextTick();
    assert.equal(editor.dataset.state, 'idle'); assert.equal(editor.hidden, false);
    assert.equal(editor.inert, true); assert.equal(editor.getAttribute('aria-hidden'), 'true'); assert.equal(editor.tabIndex, -1);
    assert.notEqual(document.activeElement, editor);

    root.dispatchEvent(new browserWindow.KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    await nextTick(); await Promise.resolve(); await nextTick();
    assert.equal(host.querySelector('[data-part="editor"]'), editor);
    assert.equal(editor.dataset.state, 'editing'); assert.equal(editor.hidden, false); assert.equal(editor.inert, false);
    assert.equal(editor.getAttribute('aria-hidden'), null); assert.equal(document.activeElement, editor);
    await new Promise((resolve) => setTimeout(resolve, 25)); editor.dispatchEvent(new Event('transitionend', { bubbles: true })); await nextTick();
    assert.equal(editor.hidden, false, 'reopen cancels the stale editor exit');

    editor.value = 'Renamed';
    editor.dispatchEvent(new Event('input', { bubbles: true }));
    editor.dispatchEvent(new browserWindow.KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    await nextTick(); await Promise.resolve(); await nextTick();
    assert.equal(values.get('name'), 'Renamed');
    assert.equal(editor.dataset.state, 'idle'); assert.equal(editor.hidden, false); assert.equal(editor.inert, true);
    assert.notEqual(document.activeElement, editor);
    await new Promise((resolve) => setTimeout(resolve, 25)); editor.dispatchEvent(new Event('transitionend', { bubbles: true }));
    await nextTick(); await nextTick();
    assert.equal(editor.hidden, true); assert.equal(editor.inert, false); assert.equal(editor.getAttribute('aria-hidden'), null);
  } finally {
    app.unmount(); host.remove();
  }
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

test('open dialog configuration updates preserve focus and keep autofocus for the next open', async () => {
  const host = document.createElement('div'); const outside = document.createElement('button'); document.body.append(host, outside);
  const open = ref(true); const label = ref('First label'); const side = ref('bottom');
  const app = createApp({ render: () => h(DialogRoot, {
    open: open.value,
    label: label.value,
    side: side.value,
    modal: false,
    'onUpdate:open': (value) => { open.value = value; },
  }, { default: () => h(DialogContent, null, { default: () => [
    h('button', { id: 'first-focus' }, 'First'),
    h('button', { id: 'second-focus' }, 'Second'),
  ] }) }) });
  app.mount(host);
  try {
    await nextTick(); await nextTick();
    const first = host.querySelector('#first-focus'); const second = host.querySelector('#second-focus');
    assert.ok(first instanceof HTMLButtonElement); assert.ok(second instanceof HTMLButtonElement);
    assert.equal(document.activeElement, first);

    second.focus(); assert.equal(document.activeElement, second);
    label.value = 'Second label'; await nextTick(); await nextTick();
    assert.equal(document.activeElement, second);

    side.value = 'top'; await nextTick(); await nextTick();
    assert.equal(document.activeElement, second);

    open.value = false; await nextTick(); await nextTick();
    outside.focus(); assert.equal(document.activeElement, outside);
    open.value = true; await nextTick(); await nextTick();
    assert.equal(document.activeElement, first);
  } finally {
    app.unmount(); host.remove(); outside.remove();
  }
});

test('controlled toast retains its closed item through exit motion and then removes it', async () => {
  const host = document.createElement('div'); document.body.append(host); const toasts = ref([{ id: 'saved', title: '저장됨', durationMs: null }]);
  const app = createApp({ render: () => h(ToastProvider, { toasts: toasts.value, closeLabel: '알림 닫기', 'onUpdate:toasts': (items) => { toasts.value = [...items]; } }, { default: ({ toasts: items }) => h(ToastPortal, { disabled: true }, { default: () => h(ToastViewport, null, { default: () => items.map((item) => h(ToastRoot, { value: item.id, style: { transitionDuration: '50ms' } }, { default: () => [h(ToastTitle), h(ToastClose)] })) }) }) }) });
  app.mount(host);
  try {
    await nextTick(); const close = host.querySelector('[data-part="close"]'); const item = host.querySelector('[data-part="root"]'); assert.ok(close instanceof HTMLButtonElement); assert.ok(item instanceof HTMLElement); assert.equal(close.getAttribute('aria-label'), '알림 닫기');
    close.focus(); assert.equal(document.activeElement === close, true);
    close.click(); await nextTick(); await nextTick();
    assert.equal(document.activeElement === host.querySelector('[data-part="viewport"]'), true);
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
    await new Promise((resolve) => browserWindow.requestAnimationFrame(resolve));
    await nextTick();
    assert.equal(submenu.dataset.state, 'open'); assert.equal(submenu.hidden, false);
    assert.equal(document.activeElement === child, true, 'positioned submenu focuses its child after layout');

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

function deferred() {
  let resolve;
  const promise = new Promise((next) => { resolve = next; });
  return { promise, resolve };
}

function fakeAnimation(finished, endTime) {
  return { finished, playState: 'running', effect: { getComputedTiming: () => ({ endTime }) } };
}

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
