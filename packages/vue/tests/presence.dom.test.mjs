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
const { SelectContent, SelectItem, SelectItemIndicator, SelectItemText, SelectPortal, SelectRoot, SelectTrigger, SelectViewport } = await import('../.verification-dist/select.js');
const { ComboboxContent, ComboboxEmpty, ComboboxInput, ComboboxRoot } = await import('../.verification-dist/combobox.js');
const { CascadeSelectContent, CascadeSelectItem, CascadeSelectItemIndicator, CascadeSelectRoot, CascadeSelectTrigger } = await import('../.verification-dist/cascade-select.js');
const { CascadeListItem, CascadeListItemIndicator, CascadeListRoot } = await import('../.verification-dist/cascade-list.js');
const { ListboxItem, ListboxItemIndicator, ListboxRoot } = await import('../.verification-dist/listbox.js');
const { DatePickerContent, DatePickerGrid, DatePickerRoot, DatePickerTrigger } = await import('../.verification-dist/date-picker.js');
const { MenuButtonContent, MenuButtonRoot, MenuButtonTrigger, MenuItem, MenuSubContent } = await import('../.verification-dist/menu.js');
const { PopoverContent, PopoverPortal, PopoverRoot, PopoverTrigger } = await import('../.verification-dist/popover.js');
const { TooltipContent, TooltipPortal, TooltipRoot, TooltipTrigger } = await import('../.verification-dist/tooltip.js');
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

const PopupSurface = defineComponent({
  name: 'PopupSurface',
  inheritAttrs: false,
  setup(_props, { attrs, expose, slots }) {
    const element = shallowRef(null);
    expose({ element });
    return () => h('div', { ...attrs, ref: element }, slots.default?.());
  },
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
