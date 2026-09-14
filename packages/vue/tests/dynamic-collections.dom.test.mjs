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
const { GridCell, GridRoot, GridRow } = await import('../.verification-dist/grid.js');
const { ListboxItem, ListboxRoot } = await import('../.verification-dist/listbox.js');
const { MenuItem, MenuRoot, MenuSubContent, MenuButtonRoot, MenuButtonTrigger, MenuButtonContent, MenubarRoot, NavigationMenuRoot } = await import('../.verification-dist/menu.js');
const { PaginationRoot } = await import('../.verification-dist/pagination.js');
const { SelectContent, SelectRoot, SelectTrigger } = await import('../.verification-dist/select.js');
const { ToolbarItem, ToolbarRoot } = await import('../.verification-dist/toolbar.js');
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

test('Vue Grid mounts linearly and projects bounded cursor and selection changes at 1k and 4k cells', async () => {
  for (const size of [1_000, 4_000]) {
    const ids = Array.from({ length: size }, (_, index) => `grid-${index}`);
    const rows = Array.from({ length: size / 1_000 }, (_, row) => ids.slice(row * 1_000, (row + 1) * 1_000));
    const originalSetAttribute = HTMLElement.prototype.setAttribute;
    const originalRemoveAttribute = HTMLElement.prototype.removeAttribute;
    let roleWrites = 0;
    let cellWrites = 0;
    HTMLElement.prototype.setAttribute = function (name, value) {
      if (name === 'role' && value === 'gridcell') roleWrites += 1;
      if (this.hasAttribute('data-sectile-grid-cell')) cellWrites += 1;
      return originalSetAttribute.call(this, name, value);
    };
    HTMLElement.prototype.removeAttribute = function (name) {
      if (this.hasAttribute('data-sectile-grid-cell')) cellWrites += 1;
      return originalRemoveAttribute.call(this, name);
    };
    let mounted;
    try {
      mounted = mount(() => h(GridRoot, { rows, defaultHighlightedValue: ids[0] }, {
        default: () => rows.map((row, index) => h(GridRow, { key: index }, {
          default: () => row.map((id) => h(GridCell, { key: id, value: id }, { default: () => id })),
        })),
      }));
      await settle();
      const root = mounted.host.querySelector('[data-part="root"]');
      const cells = [...root.querySelectorAll('[data-sectile-grid-cell]')];
      assert.equal(cells.length, size);
      assert.equal(roleWrites, size, 'each cell receives one complete registration projection');
      assert.equal(cells[0].tabIndex, 0);
      const query = root.querySelectorAll;
      let discoveries = 0;
      root.querySelectorAll = function (...args) { discoveries += 1; return query.apply(this, args); };
      const checkDelta = async (action) => {
        roleWrites = 0; cellWrites = 0;
        action();
        await settle();
        assert.equal(discoveries, 0, 'ordinary updates do not rediscover mounted cells');
        assert.equal(roleWrites, 0, 'ordinary updates retain stable registration attributes');
        assert.ok(cellWrites <= 32, `${size} cells caused ${cellWrites} writes for one semantic delta`);
      };
      await checkDelta(() => gridKey(root, 'ArrowRight'));
      assert.equal(cells[0].tabIndex, -1);
      assert.equal(cells[1].tabIndex, 0);
      assert.equal(document.activeElement, cells[1]);
      await checkDelta(() => gridKey(root, ' '));
      assert.equal(cells[1].getAttribute('aria-selected'), 'true');
      await checkDelta(() => cells.at(-1).click());
      assert.equal(cells[1].getAttribute('aria-selected'), 'false');
      assert.equal(cells.at(-1).getAttribute('aria-selected'), 'true');
      assert.equal(cells.at(-1).tabIndex, 0);
      assert.equal(document.activeElement, cells.at(-1));
    } finally {
      HTMLElement.prototype.setAttribute = originalSetAttribute;
      HTMLElement.prototype.removeAttribute = originalRemoveAttribute;
      if (mounted !== undefined) unmount(mounted.app, mounted.host);
    }
  }
});

test('Vue collection cursor deltas execute only changed item consumer slots at 1k and 4k', async () => {
  for (const size of [1_000, 4_000]) {
    const gridIDs = Array.from({ length: size }, (_, index) => `slot-grid-${index}`);
    let gridSlots = 0;
    const grid = mount(() => h(GridRoot, { rows: [gridIDs], defaultHighlightedValue: gridIDs[0] }, {
      default: () => h(GridRow, null, {
        default: () => gridIDs.map((id) => h(GridCell, { key: id, value: id }, {
          default: () => { gridSlots += 1; return id; },
        })),
      }),
    }));
    try {
      await settle();
      gridSlots = 0;
      gridKey(grid.host.querySelector('[data-part="root"]'), 'ArrowRight');
      await settle();
      assert.equal(gridSlots, 2, `${size} Grid cells should execute only the old/new cursor slots`);
    } finally { unmount(grid.app, grid.host); }

    const listboxIDs = Array.from({ length: size }, (_, index) => `slot-listbox-${index}`);
    let listboxSlots = 0;
    const listbox = mount(() => h(ListboxRoot, { items: listboxIDs }, {
      default: () => listboxIDs.map((id) => h(ListboxItem, { key: id, value: id }, {
        default: () => { listboxSlots += 1; return id; },
      })),
    }));
    try {
      await settle();
      listboxSlots = 0;
      listbox.host.querySelector('[role="listbox"]').dispatchEvent(new browserWindow.KeyboardEvent('keydown', {
        key: 'ArrowDown', bubbles: true, cancelable: true,
      }));
      await settle();
      assert.equal(listboxSlots, 2, `${size} Listbox items should execute only the old/new highlight slots`);
    } finally { unmount(listbox.app, listbox.host); }

    const menuItems = Array.from({ length: size }, (_, index) => ({ id: `slot-menu-${index}` }));
    let menuSlots = 0;
    const menu = mount(() => h(MenuRoot, { items: menuItems, defaultHighlightedValue: menuItems[0].id }, {
      default: () => menuItems.map(({ id }) => h(MenuItem, { key: id, value: id }, {
        default: () => { menuSlots += 1; return id; },
      })),
    }));
    try {
      await settle();
      menuSlots = 0;
      menu.host.querySelector('[role="menu"]').dispatchEvent(new browserWindow.KeyboardEvent('keydown', {
        key: 'ArrowDown', bubbles: true, cancelable: true,
      }));
      await settle();
      assert.equal(menuSlots, 2, `${size} Menu items should execute only the old/new highlight slots`);
    } finally { unmount(menu.app, menu.host); }
  }
});

test('Vue collection root slot projections remain reactive after item-local invalidation', async () => {
  const grid = mount(() => h(GridRoot, { rows: [['a', 'b']], defaultHighlightedValue: 'a' }, {
    default: (state) => [
      h('output', { 'data-root-state': 'grid' }, state.highlightedValue ?? ''),
      h(GridRow, null, { default: () => ['a', 'b'].map((id) => h(GridCell, { value: id }, () => id)) }),
    ],
  }));
  try {
    await settle();
    gridKey(grid.host.querySelector('[data-part="root"]'), 'ArrowRight');
    await settle();
    assert.equal(grid.host.querySelector('[data-root-state="grid"]').textContent, 'b');
  } finally { unmount(grid.app, grid.host); }

  const listbox = mount(() => h(ListboxRoot, { items: ['a', 'b'] }, {
    default: (state) => [
      h('output', { 'data-root-state': 'listbox' }, state.highlightedValue ?? ''),
      ...['a', 'b'].map((id) => h(ListboxItem, { value: id }, () => id)),
    ],
  }));
  try {
    await settle();
    listbox.host.querySelector('[role="listbox"]').dispatchEvent(new browserWindow.KeyboardEvent('keydown', {
      key: 'ArrowDown', bubbles: true, cancelable: true,
    }));
    await settle();
    assert.equal(listbox.host.querySelector('[data-root-state="listbox"]').textContent, 'b');
  } finally { unmount(listbox.app, listbox.host); }

  const items = [{ id: 'a' }, { id: 'b' }];
  const menu = mount(() => h(MenuRoot, { items, defaultHighlightedValue: 'a' }, {
    default: (state) => [
      h('output', { 'data-root-state': 'menu' }, state.highlightedValue ?? ''),
      ...items.map(({ id }) => h(MenuItem, { value: id }, () => id)),
    ],
  }));
  try {
    await settle();
    menu.host.querySelector('[role="menu"]').dispatchEvent(new browserWindow.KeyboardEvent('keydown', {
      key: 'ArrowDown', bubbles: true, cancelable: true,
    }));
    await settle();
    assert.equal(menu.host.querySelector('[data-root-state="menu"]').textContent, 'b');
  } finally { unmount(menu.app, menu.host); }
});

test('Vue Grid cell refs preserve disabled changes, recycled identities, removal and remount', async () => {
  const rows = [['a', 'b', 'c']];
  const id = ref('b');
  const disabled = ref(true);
  const visible = ref(true);
  let snapshot;
  const { app, host } = mount(() => h(GridRoot, { rows, defaultHighlightedValue: 'a' }, {
    default: (state) => {
      snapshot = state;
      return h(GridRow, null, { default: () => [
        h(GridCell, { key: 'a', value: 'a' }),
        visible.value ? h(GridCell, { key: 'recycled', value: id.value, disabled: disabled.value }) : null,
      ] });
    },
  }));
  try {
    await settle();
    const root = host.querySelector('[data-part="root"]');
    const cell = host.querySelector('[data-sectile-grid-cell="b"]');
    assert.equal(cell.getAttribute('aria-disabled'), 'true');
    cell.click();
    await settle();
    assert.equal(snapshot.value, null);
    disabled.value = false;
    await settle();
    assert.equal(cell.hasAttribute('aria-disabled'), false);
    cell.click();
    await settle();
    assert.equal(snapshot.value, 'b');
    assert.equal(cell.tabIndex, 0);
    id.value = 'c';
    await settle();
    assert.equal(host.querySelector('[data-sectile-grid-cell="c"]'), cell);
    assert.equal(cell.getAttribute('aria-colindex'), '3');
    assert.equal(cell.tabIndex, -1);
    cell.click();
    await settle();
    assert.equal(snapshot.value, 'c');
    disabled.value = true;
    await settle();
    visible.value = false;
    await settle();
    assert.equal(cell.tabIndex, -1, 'removed host releases its roving tab stop');
    let detachedFocus = 0;
    cell.focus = () => { detachedFocus += 1; };
    gridKey(root, 'ArrowLeft');
    await settle();
    assert.equal(snapshot.highlightedValue, 'b');
    gridKey(root, 'ArrowRight');
    await settle();
    assert.equal(snapshot.highlightedValue, 'c', 'unmounted disabled host releases its local eligibility state');
    assert.equal(detachedFocus, 0);
    disabled.value = false;
    visible.value = true;
    await settle();
    const remounted = host.querySelector('[data-sectile-grid-cell="c"]');
    assert.notEqual(remounted, cell);
    assert.equal(remounted.tabIndex, 0);
    assert.equal(remounted.getAttribute('aria-selected'), 'true');
    assert.equal(remounted.hasAttribute('aria-disabled'), false);
  } finally { unmount(app, host); }
});

test('Vue Grid preserves every controlled ownership shape, edit callbacks and unmount cleanup', async () => {
  for (let mask = 0; mask < 8; mask += 1) {
    const rows = [['a', 'b']];
    const value = ref(null);
    const highlight = ref('a');
    const mode = ref('navigation');
    const readonly = ref(false);
    const disabled = ref(false);
    const edits = [];
    let snapshot;
    let acceptsSelection = true;
    const { app, host } = mount(() => h(GridRoot, {
      rows, defaultHighlightedValue: 'a', readonly: readonly.value, disabled: disabled.value,
      ...(mask & 1 ? { modelValue: value.value } : {}),
      ...(mask & 2 ? { highlightedValue: highlight.value } : {}),
      ...(mask & 4 ? { editMode: mode.value } : {}),
      'onUpdate:modelValue': (next) => { if (acceptsSelection) value.value = next; },
      'onUpdate:highlightedValue': (next) => { highlight.value = next; },
      'onUpdate:editMode': (next) => { mode.value = next; },
      onEditStart: (id) => edits.push(['start', id]),
      onEditCommit: (id) => edits.push(['commit', id]),
      onEditCancel: (id) => edits.push(['cancel', id]),
    }, { default: (state) => {
      snapshot = state;
      return h(GridRow, null, { default: () => rows[0].map((id) => h(GridCell, { key: id, value: id })) });
    } }));
    let unmounted = false;
    try {
      await settle();
      const root = host.querySelector('[data-part="root"]');
      const a = host.querySelector('[data-sectile-grid-cell="a"]');
      const b = host.querySelector('[data-sectile-grid-cell="b"]');
      gridKey(root, 'ArrowRight');
      await settle();
      assert.equal(snapshot.highlightedValue, 'b');
      assert.equal(b.tabIndex, 0);
      gridKey(root, ' ');
      await settle();
      assert.equal(snapshot.value, 'b');
      assert.equal(b.getAttribute('aria-selected'), 'true');
      for (const key of ['F2', 'Enter', 'F2', 'Escape']) {
        gridKey(root, key);
        await settle();
      }
      assert.deepEqual(edits, [['start', 'b'], ['commit', 'b'], ['start', 'b'], ['cancel', 'b']]);
      assert.equal(snapshot.editMode, 'navigation');
      acceptsSelection = false;
      a.click();
      await settle();
      assert.equal(snapshot.value, mask & 1 ? 'b' : 'a');
      assert.equal(b.getAttribute('aria-selected'), mask & 1 ? 'true' : 'false');
      readonly.value = true;
      await settle();
      const selected = snapshot.value;
      b.click(); gridKey(root, 'F2');
      await settle();
      assert.equal(snapshot.value, selected);
      assert.equal(edits.length, 4);
      gridKey(root, 'ArrowRight');
      await settle();
      assert.equal(snapshot.highlightedValue, 'b', 'read-only still permits navigation');
      disabled.value = true;
      await settle();
      gridKey(root, 'ArrowLeft');
      await settle();
      assert.equal(snapshot.highlightedValue, 'b');
      disabled.value = false;
      await settle();
      let focusCalls = 0;
      for (const cell of [a, b]) {
        const focus = cell.focus;
        cell.focus = function (...args) { focusCalls += 1; return focus.apply(this, args); };
      }
      gridKey(root, 'ArrowLeft');
      const beforeUnmount = focusCalls;
      unmount(app, host); unmounted = true;
      await settle();
      assert.equal(focusCalls, beforeUnmount, 'queued focus is inert after unmount');
      const editsBefore = edits.length;
      gridKey(root, 'F2'); b.click();
      await settle();
      assert.equal(edits.length, editsBefore, 'detached root has no live edit listeners');
    } finally { if (!unmounted) unmount(app, host); }
  }
});

function gridKey(root, key) {
  root.dispatchEvent(new browserWindow.KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
}

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

test('ISSUE-127: Vue toolbar keeps controlled null semantic state while DOM owns one entry', async () => {
  const value = ref(null);
  const updates = [];
  const { app, host } = mount(() => h(ToolbarRoot, {
    items: ['a', 'b'],
    modelValue: value.value,
    'onUpdate:modelValue': (next) => { updates.push(next); value.value = next; },
  }, {
    default: () => [h(ToolbarItem, { value: 'a' }), h(ToolbarItem, { value: 'b' })],
  }));

  await settle();
  const items = () => [...host.querySelectorAll('[data-part="item"]')];
  assert.deepEqual(items().map((element) => element.tabIndex), [0, -1]);
  assert.equal(value.value, null);
  assert.deepEqual(updates, []);

  value.value = 'b';
  await settle();
  assert.deepEqual(items().map((element) => element.tabIndex), [-1, 0]);
  assert.deepEqual(updates, []);

  value.value = null;
  await settle();
  assert.deepEqual(items().map((element) => element.tabIndex), [0, -1]);
  assert.equal(value.value, null);
  assert.deepEqual(updates, []);
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

test('Vue menu families mount many submenu surfaces with linear branch projection', async () => {
  for (const Root of [MenuRoot, MenuButtonRoot, MenubarRoot, NavigationMenuRoot]) {
    for (const size of [16, 64, 128]) {
      const branches = Array.from({ length: size }, (_, index) => `branch-${index}`);
      const items = branches.flatMap((id) => [{ id }, { id: `${id}-leaf`, parentID: id }]);
      const setAttribute = HTMLElement.prototype.setAttribute;
      let branchWrites = 0;
      HTMLElement.prototype.setAttribute = function (name, value) {
        if (name === 'aria-haspopup' && value === 'menu') branchWrites += 1;
        return setAttribute.call(this, name, value);
      };
      let mounted;
      let surfaces = [];
      try {
        const content = () => branches.flatMap((id) => [
          h(MenuItem, { key: id, value: id }),
          h(MenuSubContent, { key: `${id}-surface`, for: id }, {
            default: () => h(MenuItem, { value: `${id}-leaf` }),
          }),
        ]);
        mounted = mount(() => h(Root, {
          items, ...(Root === MenuButtonRoot ? { defaultOpen: true, position: false } : {}),
        }, { default: () => Root === MenuButtonRoot
          ? [h(MenuButtonTrigger), h(MenuButtonContent, null, { default: content })] : content(),
        }));
        await settle();
        surfaces = [...mounted.host.querySelectorAll('[data-sectile-submenu-for]')];
        assert.equal(surfaces.length, size);
        assert.ok(branchWrites <= 4 * size + 2, `${Root.name}: ${size} branches caused ${branchWrites} projections`);
        for (const surface of surfaces) {
          const id = surface.dataset.sectileSubmenuFor;
          const anchor = mounted.host.querySelector(`[data-sectile-menu-id="${id}"]`);
          assert.equal(anchor.getAttribute('aria-controls'), surface.id);
          assert.notEqual(surface.id, '');
        }
      } finally {
        HTMLElement.prototype.setAttribute = setAttribute;
        if (mounted !== undefined) unmount(mounted.app, mounted.host);
      }
      await settle();
      for (const surface of surfaces) assert.equal(surface.id, '', 'unmount releases generated submenu identity');
    }
  }
});

test('Vue menu bulk mount keeps item registration projection work linear', async () => {
  const size = 256;
  const items = Array.from({ length: size }, (_, index) => ({ id: `item-${index}`, parentID: null }));
  const originalSetAttribute = HTMLElement.prototype.setAttribute;
  let menuItemRoleWrites = 0;
  HTMLElement.prototype.setAttribute = function setAttribute(name, value) {
    if (name === 'role' && value === 'menuitem') menuItemRoleWrites += 1;
    return originalSetAttribute.call(this, name, value);
  };
  let mounted;
  try {
    mounted = mount(() => h(MenuRoot, { items, defaultHighlightedValue: 'item-0' }, {
      default: () => items.map(({ id }) => h(MenuItem, { value: id }, { default: () => id })),
    }));
    await settle();
    const elements = [...mounted.host.querySelectorAll('[data-sectile-menu-id]')];
    assert.equal(elements.length, size);
    assert.equal(elements[0].tabIndex, 0);
    assert.equal(elements[size - 1].tabIndex, -1);
    assert.ok(menuItemRoleWrites <= size * 4, `menuitem role writes ${menuItemRoleWrites} exceeded linear bound`);
  } finally {
    HTMLElement.prototype.setAttribute = originalSetAttribute;
    if (mounted !== undefined) unmount(mounted.app, mounted.host);
  }
});

for (const Root of [MenuRoot, MenuButtonRoot, MenubarRoot, NavigationMenuRoot]) {
  test(`Vue ${Root.name} routes adopted item descendants without scanning unrelated hosts`, async () => {
    const items = Array.from({ length: 256 }, (_, index) => ({ id: `route-${index}`, parentID: null }));
    const invoked = [];
    const content = () => [
      h('span', { 'data-unmatched': '' }, 'Separator'),
      ...items.map(({ id }) => h(MenuItem, { value: id, asChild: true }, {
        default: () => h('button', null, [h('span', { 'data-target': id }, id)]),
      })),
    ];
    const { app, host } = mount(() => h(Root, {
      items, onInvoke: (id) => invoked.push(id),
      ...(Root === MenuButtonRoot ? { defaultOpen: true, position: false } : {}),
    }, { default: () => Root === MenuButtonRoot
      ? [h(MenuButtonTrigger), h(MenuButtonContent, null, { default: content })]
      : content(),
    }));
    try {
      await settle();
      let containsCalls = 0;
      for (const item of host.querySelectorAll('[data-sectile-menu-id]')) {
        const contains = item.contains;
        item.contains = function (target) { containsCalls += 1; return contains.call(this, target); };
      }
      host.querySelector('[data-unmatched]').dispatchEvent(new browserWindow.MouseEvent('click', { bubbles: true }));
      await settle();
      assert.deepEqual(invoked, []);
      assert.equal(containsCalls, 0);
      host.querySelector('[data-target="route-255"]').dispatchEvent(new browserWindow.MouseEvent('click', { bubbles: true }));
      await settle();
      assert.deepEqual(invoked, ['route-255']);
      assert.equal(containsCalls, 0);
    } finally { unmount(app, host); }
  });
}

for (const Root of [MenuRoot, MenuButtonRoot, MenubarRoot, NavigationMenuRoot]) {
  test(`Vue ${Root.name} projects cursor deltas without rediscovering registered parts`, async () => {
    const items = Array.from({ length: 1_024 }, (_, index) => ({ id: `delta-${index}` }));
    const content = () => items.map(({ id }) => h(MenuItem, { key: id, value: id }, { default: () => id }));
    const invoked = [];
    const { app, host } = mount(() => h(Root, {
      items, defaultHighlightedValue: 'delta-0', onInvoke: (id) => invoked.push(id),
      ...(Root === MenuButtonRoot ? { defaultOpen: true, position: false } : {}),
    }, { default: () => Root === MenuButtonRoot
      ? [h(MenuButtonTrigger), h(MenuButtonContent, null, { default: content })] : content(),
    }));
    try {
      await settle();
      const elements = [...host.querySelectorAll('[data-sectile-menu-id]')];
      const root = elements[0].parentElement;
      const query = root.querySelectorAll;
      let discoveries = 0;
      let attributeWrites = 0;
      root.querySelectorAll = function (...args) { discoveries += 1; return query.apply(this, args); };
      for (const element of elements) {
        const setAttribute = element.setAttribute;
        element.setAttribute = function (name, value) {
          if (name === 'role' || name === 'aria-disabled') attributeWrites += 1;
          return setAttribute.call(this, name, value);
        };
      }
      const key = Root === MenubarRoot || Root === NavigationMenuRoot ? 'ArrowRight' : 'ArrowDown';
      elements[0].dispatchEvent(new browserWindow.KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
      await settle();
      assert.equal(elements[0].tabIndex, -1);
      assert.equal(elements[1].tabIndex, 0);
      assert.equal(elements[1].hasAttribute('data-highlighted'), true);
      assert.equal(discoveries, 0);
      assert.equal(attributeWrites, 0);
      elements.at(-1).click();
      await settle();
      assert.deepEqual(invoked, ['delta-1023']);
      assert.equal(elements[1].tabIndex, -1);
      assert.equal(elements.at(-1).tabIndex, -1);
      assert.equal(discoveries, 0, 'click publication and presence completion do not scan parts');
      assert.equal(attributeWrites, 0);
    } finally { unmount(app, host); }
  });
}

test('Vue menu registers a later-mounted item without a semantic refresh scan', async () => {
  const show = ref(false);
  const invoked = [];
  const { app, host } = mount(() => h(MenuRoot, {
    items: [{ id: 'first' }, { id: 'later' }], onInvoke: (id) => invoked.push(id),
  }, { default: () => [h(MenuItem, { value: 'first' }), show.value ? h(MenuItem, { value: 'later' }) : null] }));
  try {
    await settle();
    show.value = true;
    await settle();
    host.querySelector('[data-sectile-menu-id="later"]').click();
    await settle();
    assert.deepEqual(invoked, ['later']);
  } finally { unmount(app, host); }
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
