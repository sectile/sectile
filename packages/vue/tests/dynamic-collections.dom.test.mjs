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
  HTMLInputElement: browserWindow.HTMLInputElement,
  HTMLSelectElement: browserWindow.HTMLSelectElement,
  SVGElement: browserWindow.SVGElement,
  Event: browserWindow.Event,
  MutationObserver: browserWindow.MutationObserver,
});

const { createApp, h, nextTick, ref } = await import('vue');
const { CarouselRoot } = await import('../.verification-dist/carousel.js');
const { CascadeSelectContent, CascadeSelectRoot, CascadeSelectTrigger } = await import('../.verification-dist/cascade-select.js');
const { FeedRoot } = await import('../.verification-dist/feed.js');
const { GridRoot } = await import('../.verification-dist/grid.js');
const { MenuItem, MenuRoot, MenuSubContent } = await import('../.verification-dist/menu.js');
const { PaginationRoot } = await import('../.verification-dist/pagination.js');
const { SelectContent, SelectRoot, SelectTrigger } = await import('../.verification-dist/select.js');
const { ToolbarRoot } = await import('../.verification-dist/toolbar.js');
const { TreeGridRoot } = await import('../.verification-dist/tree-grid.js');

async function settle() {
  await nextTick();
  await nextTick();
}

test('Vue grid reconciles controlled selection and focus after rows change', async () => {
  const rows = ref([['a']]);
  const value = ref('a');
  const highlighted = ref('a');
  const { app, host } = mount(() => h(GridRoot, {
    rows: rows.value,
    modelValue: value.value,
    highlightedValue: highlighted.value,
    'onUpdate:modelValue': (next) => { value.value = next; },
    'onUpdate:highlightedValue': (next) => { highlighted.value = next; },
  }));

  await settle();
  rows.value = [['b']];
  await settle();
  assert.equal(value.value, null);
  assert.equal(highlighted.value, 'b');
  unmount(app, host);
});

test('Vue tree grid drops stale expansion and reconciles cell state', async () => {
  const rows = ref([
    { id: 'root', parentID: null, cells: ['a'] },
    { id: 'leaf', parentID: 'root', cells: ['b'] },
  ]);
  const value = ref('b');
  const expanded = ref(['root']);
  const highlighted = ref('b');
  const { app, host } = mount(() => h(TreeGridRoot, {
    rows: rows.value,
    getCellValue: () => '',
    setCellValue: () => undefined,
    modelValue: value.value,
    expandedValue: expanded.value,
    highlightedValue: highlighted.value,
    'onUpdate:modelValue': (next) => { value.value = next; },
    'onUpdate:expandedValue': (next) => { expanded.value = next; },
    'onUpdate:highlightedValue': (next) => { highlighted.value = next; },
  }));

  await settle();
  rows.value = [{ id: 'other', parentID: null, cells: ['c'] }];
  await settle();
  assert.equal(value.value, null);
  assert.deepEqual(expanded.value, []);
  assert.equal(highlighted.value, 'c');
  unmount(app, host);
});

test('Vue carousel proposes the next valid slide after removal', async () => {
  const slides = ref(['a', 'b']);
  const value = ref('b');
  const { app, host } = mount(() => h(CarouselRoot, {
    slides: slides.value,
    modelValue: value.value,
    'onUpdate:modelValue': (next) => { value.value = next; },
  }));

  await settle();
  slides.value = ['a'];
  await settle();
  assert.equal(value.value, 'a');
  unmount(app, host);
});

test('Vue toolbar reconciles controlled focus after items change', async () => {
  const items = ref(['a', 'b']);
  const value = ref('b');
  const { app, host } = mount(() => h(ToolbarRoot, {
    items: items.value,
    modelValue: value.value,
    'onUpdate:modelValue': (next) => { value.value = next; },
  }));

  await settle();
  items.value = ['a'];
  await settle();
  assert.equal(value.value, 'a');
  unmount(app, host);
});

test('Vue pagination clamps a controlled page when total shrinks', async () => {
  const total = ref(100);
  const page = ref(10);
  const { app, host } = mount(() => h(PaginationRoot, {
    total: total.value,
    modelValue: page.value,
    itemsPerPage: 10,
    'onUpdate:modelValue': (next) => { page.value = next; },
  }));

  await settle();
  total.value = 15;
  await settle();
  assert.equal(page.value, 2);
  unmount(app, host);
});

test('Vue select clears a controlled value removed from its items', async () => {
  const items = ref(['a', 'b']);
  const value = ref('b');
  const { app, host } = mount(() => h(SelectRoot, {
    items: items.value,
    modelValue: value.value,
    'onUpdate:modelValue': (next) => { value.value = next; },
  }, { default: () => [h(SelectTrigger), h(SelectContent)] }));

  await settle();
  items.value = ['a'];
  await settle();
  assert.equal(value.value, null);
  unmount(app, host);
});

test('Vue cascade select clears a controlled leaf removed from its tree', async () => {
  const nodes = ref([{ id: 'root', parentID: null }, { id: 'leaf', parentID: 'root' }]);
  const value = ref('leaf');
  const { app, host } = mount(() => h(CascadeSelectRoot, {
    nodes: nodes.value,
    modelValue: value.value,
    'onUpdate:modelValue': (next) => { value.value = next; },
  }, { default: () => [h(CascadeSelectTrigger), h(CascadeSelectContent)] }));

  await settle();
  nodes.value = [{ id: 'other', parentID: null }];
  await settle();
  assert.equal(value.value, null);
  unmount(app, host);
});

test('Vue menu unregisters a conditionally removed submenu from DOM ownership', async () => {
  const showSubmenu = ref(true);
  const items = [{ id: 'file', parentID: null }, { id: 'open', parentID: 'file' }];
  const { app, host } = mount(() => h(MenuRoot, { items, defaultHighlightedValue: 'file' }, {
    default: () => [
      h(MenuItem, { value: 'file' }, { default: () => 'File' }),
      showSubmenu.value
        ? h(MenuSubContent, { for: 'file' }, { default: () => h(MenuItem, { value: 'open' }, { default: () => 'Open' }) })
        : null,
    ],
  }));

  await settle();
  const file = host.querySelector('[data-sectile-menu-id="file"]');
  const submenu = host.querySelector('[data-sectile-submenu-for="file"]');
  assert.ok(file instanceof HTMLElement);
  assert.ok(submenu instanceof HTMLElement);
  file.dispatchEvent(new browserWindow.MouseEvent('click', { bubbles: true }));
  await settle();
  assert.notEqual(file.getAttribute('aria-controls'), null);

  showSubmenu.value = false;
  await settle();
  assert.equal(host.querySelector('[data-sectile-submenu-for="file"]'), null);
  assert.equal(file.getAttribute('aria-controls'), null);
  assert.equal(submenu.style.position, '');
  unmount(app, host);
});

test('Vue menu and feed reconcile internal focus after their domains change', async () => {
  const menuItems = ref([{ id: 'a' }, { id: 'b' }]);
  const feedItems = ref(['a', 'b']);
  let menuHighlight = null;
  let feedHighlight = null;
  const { app, host } = mount(() => h('div', [
    h(MenuRoot, { items: menuItems.value, defaultHighlightedValue: 'b' }, {
      default: (state) => { menuHighlight = state.highlightedValue; return []; },
    }),
    h(FeedRoot, {
      items: feedItems.value,
      defaultHighlightedValue: 'b',
      onHighlight: (next) => { feedHighlight = next; },
    }),
  ]));

  await settle();
  menuItems.value = [{ id: 'a' }];
  feedItems.value = ['a'];
  await settle();
  assert.equal(menuHighlight, 'a');
  assert.equal(feedHighlight, 'a');
  unmount(app, host);
});

function mount(render) {
  const host = document.createElement('div');
  document.body.append(host);
  const app = createApp({ render });
  app.mount(host);
  return { app, host };
}

function unmount(app, host) {
  app.unmount();
  host.remove();
}
