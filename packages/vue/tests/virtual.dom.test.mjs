import assert from 'node:assert/strict';
import test from 'node:test';
import { createTestWindow } from './happy-dom.mjs';

const browserWindow = createTestWindow({ url: 'https://sectile.dev/' });

class FakeResizeObserver {
  static observers = new Set();

  constructor(callback) {
    this.callback = callback;
    this.elements = new Set();
    FakeResizeObserver.observers.add(this);
  }

  observe(element) { this.elements.add(element); }
  unobserve(element) { this.elements.delete(element); }
  disconnect() { this.elements.clear(); }

  static notify(element) {
    for (const observer of FakeResizeObserver.observers) {
      if (observer.elements.has(element)) {
        observer.callback([{ target: element }], observer);
      }
    }
  }
}

browserWindow.ResizeObserver = FakeResizeObserver;
Object.assign(globalThis, {
  window: browserWindow,
  document: browserWindow.document,
  Node: browserWindow.Node,
  Element: browserWindow.Element,
  HTMLElement: browserWindow.HTMLElement,
  SVGElement: browserWindow.SVGElement,
  MutationObserver: browserWindow.MutationObserver,
});

const { createApp, effectScope, h, nextTick, ref, shallowRef } = await import('vue');
const { VirtualGrid } = await import('../.verification-dist/virtual-grid.js');
const { VirtualList } = await import('../.verification-dist/virtual-list.js');
const { VirtualMasonry } = await import('../.verification-dist/virtual-masonry.js');
const { VirtualSpatial } = await import('../.verification-dist/virtual-spatial.js');
const { VirtualizerFooter, VirtualizerHeader, VirtualizerRoot, VirtualizerSurface, useVirtualizer } = await import('../.verification-dist/virtual-core.js');

test('high-level projection mounts one shared projector and no per-placement VirtualizerItem instances', async () => {
  const host = document.createElement('div');
  document.body.append(host);
  const componentMounts = new Map();
  const items = Object.freeze(Array.from(
    { length: 64 },
    (_unused, id) => Object.freeze({ id, label: `Item ${id}` }),
  ));
  const grid = ref();
  const app = createApp({
    render: () => h(VirtualGrid, {
      ref: grid,
      items,
      getID: (value) => value.id,
      sizePolicy: { kind: 'fixed', extent: 20 },
      lanePolicy: { kind: 'fixed', count: 4 },
      initialViewport: { x: 0, y: 0, width: 200, height: 100 },
      overscan: 0,
    }, {
      item: ({ id }) => String(id),
    }),
  });
  app.mixin({
    beforeCreate() {
      const name = this.$options.name;
      if (typeof name === 'string' && name.startsWith('SectileVirtual')) {
        componentMounts.set(name, (componentMounts.get(name) ?? 0) + 1);
      }
    },
  });

  try {
    app.mount(host);
    await settle();
    assert.equal(componentMounts.get('SectileVirtualizerItem') ?? 0, 0);
    assert.equal(componentMounts.get('SectileVirtualCollectionProjection') ?? 0, 1);
    assert.ok(host.querySelectorAll('[data-virtual-layout="virtual-grid"][data-part="item"]').length > 1);
    assert.equal(grid.value.plan?.placements[0]?.id, 0);
  } finally {
    app.unmount();
    host.remove();
  }
});

test('VirtualList renders intrinsic rows without per-item Sectile wrappers and reconciles keyed data', async () => {
  const heightDescriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientHeight');
  const widthDescriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientWidth');
  Object.defineProperty(HTMLElement.prototype, 'clientHeight', {
    configurable: true,
    get() { return 80; },
  });
  Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
    configurable: true,
    get() { return 120; },
  });
  const host = document.createElement('div');
  document.body.append(host);
  const items = ref(Array.from({ length: 20 }, (_, index) => ({ id: `row-${index}`, label: `Row ${index}` })));
  const list = ref();
  const app = createApp({
    render: () => h(VirtualList, {
      ref: list,
      items: items.value,
      getID: (value) => value.id,
      sizePolicy: { kind: 'estimated', estimate: 20 },
      overscan: 0,
      itemAttributes: (value) => ({ 'data-id': value.id }),
    }, {
      item: ({ value }) => value.label,
    }),
  });

  try {
    app.mount(host);
    await settle();
    const root = host.querySelector('[data-virtual-layout="virtual-list"][data-part="root"]');
    Object.defineProperty(root, 'clientHeight', { configurable: true, value: 80 });
    Object.defineProperty(root, 'clientWidth', { configurable: true, value: 120 });
    root.scrollTo = ({ left = root.scrollLeft, top = root.scrollTop }) => {
      root.scrollLeft = left;
      root.scrollTop = top;
    };
    list.value.flush();
    await settle();
    assert.equal(root.clientHeight, 80);
    assert.equal(list.value.plan.viewport.height, 80);
    assert.equal(list.value.state.crossExtent, 120);
    assert.equal(list.value.plan.contentSize.width, 120);
    assert.deepEqual(
      list.value.plan.placements.map((placement) => placement.rect.width),
      [120, 120, 120, 120],
    );
    assert.equal(root.children.length, 1);
    assert.equal(root.firstElementChild.style.width, '120px');
    assert.equal(root.firstElementChild.children.length, 4);
    assert.equal(root.firstElementChild.firstElementChild.style.width, '120px');
    assert.deepEqual(
      [...root.firstElementChild.children].map((element) => element.dataset.id),
      ['row-0', 'row-1', 'row-2', 'row-3'],
    );

    const firstRow = root.querySelector('[data-id="row-0"]');
    firstRow.getBoundingClientRect = () => ({
      x: 0,
      y: 0,
      top: 0,
      right: 120,
      bottom: 35,
      left: 0,
      width: 120,
      height: 35,
      toJSON() {},
    });
    FakeResizeObserver.notify(firstRow);
    list.value.flush();
    await settle();
    assert.deepEqual(list.value.state.extents.extentAt(0), { kind: 'exact', value: 35 });
    assert.equal(list.value.plan.contentSize.height, 415);

    items.value = [{ id: 'inserted', label: 'Inserted' }, ...items.value];
    await settle();
    assert.equal(root.scrollTop, 20);
    assert.ok(root.querySelector('[data-id="row-0"]') !== null);

    items.value = items.value.slice(1);
    await settle();
    assert.equal(root.scrollTop, 0);
    assert.equal(root.querySelector('[data-id="inserted"]'), null);
    assert.equal(list.value.state.domain.size, 20);
  } finally {
    app.unmount();
    host.remove();
    if (heightDescriptor === undefined) delete HTMLElement.prototype.clientHeight;
    else Object.defineProperty(HTMLElement.prototype, 'clientHeight', heightDescriptor);
    if (widthDescriptor === undefined) delete HTMLElement.prototype.clientWidth;
    else Object.defineProperty(HTMLElement.prototype, 'clientWidth', widthDescriptor);
  }
});

test('VirtualList measures only changed or newly rendered identities after keyed reconciliation', async () => {
  const heightDescriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientHeight');
  const widthDescriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientWidth');
  const boundsDescriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'getBoundingClientRect');
  Object.defineProperty(HTMLElement.prototype, 'clientHeight', {
    configurable: true,
    get() { return 80; },
  });
  Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
    configurable: true,
    get() { return 120; },
  });
  let itemReads = 0;
  Object.defineProperty(HTMLElement.prototype, 'getBoundingClientRect', {
    configurable: true,
    value() {
      const height = Number(this.dataset.height);
      if (!Number.isFinite(height) || height <= 0) {
        return boundsDescriptor?.value?.call(this) ?? {
          x: 0, y: 0, top: 0, right: 0, bottom: 0, left: 0,
          width: 0, height: 0, toJSON() {},
        };
      }
      itemReads += 1;
      return {
        x: 0, y: 0, top: 0, right: 120, bottom: height, left: 0,
        width: 120, height, toJSON() {},
      };
    },
  });
  const host = document.createElement('div');
  document.body.append(host);
  const list = ref();
  const items = shallowRef(Array.from({ length: 20 }, (_, index) => ({
    id: `row-${index}`,
    label: `Row ${index}`,
    height: 20,
  })));
  const app = createApp({
    render: () => h(VirtualList, {
      ref: list,
      items: items.value,
      getID: (value) => value.id,
      sizePolicy: { kind: 'estimated', estimate: 20 },
      overscan: 0,
      itemAttributes: (value) => ({
        'data-id': value.id,
        'data-height': String(value.height),
      }),
    }, { item: ({ value }) => value.label }),
  });

  try {
    app.mount(host);
    await settle();
    const renderedRows = [...host.querySelectorAll('[data-virtual-layout="virtual-list"] [data-part="item"]')];
    assert.equal(renderedRows.length, 4);
    renderedRows.forEach((element) => FakeResizeObserver.notify(element));
    list.value.flush();
    await settle();
    assert.equal(itemReads, 4);
    for (let index = 0; index < 4; index += 1) {
      assert.deepEqual(list.value.state.extents.extentAt(index), { kind: 'exact', value: 20 });
    }

    itemReads = 0;
    const domain = list.value.state.domain;
    items.value = items.value.map((item, index) => index === 0
      ? { ...item, label: 'Changed row' }
      : item);
    await settle();
    assert.equal(itemReads, 0);
    assert.equal(list.value.state.domain, domain);
    assert.deepEqual(list.value.state.extents.extentAt(0), { kind: 'unknown', fallback: 20 });
    FakeResizeObserver.notify(host.querySelector('[data-id="row-0"]'));
    list.value.flush();
    await settle();
    assert.equal(itemReads, 1);
    assert.equal(list.value.state.domain, domain);
    assert.deepEqual(list.value.state.extents.extentAt(0), { kind: 'exact', value: 20 });

    itemReads = 0;
    items.value = [
      items.value[0],
      { id: 'inserted', label: 'Inserted', height: 35 },
      ...items.value.slice(1),
    ];
    await settle();
    const inserted = host.querySelector('[data-id="inserted"]');
    assert.ok(inserted !== null);
    FakeResizeObserver.notify(inserted);
    list.value.flush();
    await settle();
    assert.equal(itemReads, 1);
    assert.deepEqual(list.value.state.extents.extentAt(1), { kind: 'exact', value: 35 });
  } finally {
    app.unmount();
    host.remove();
    if (heightDescriptor === undefined) delete HTMLElement.prototype.clientHeight;
    else Object.defineProperty(HTMLElement.prototype, 'clientHeight', heightDescriptor);
    if (widthDescriptor === undefined) delete HTMLElement.prototype.clientWidth;
    else Object.defineProperty(HTMLElement.prototype, 'clientWidth', widthDescriptor);
    if (boundsDescriptor === undefined) delete HTMLElement.prototype.getBoundingClientRect;
    else Object.defineProperty(HTMLElement.prototype, 'getBoundingClientRect', boundsDescriptor);
  }
});

test('VirtualList projects horizontal cross geometry from the surface viewport', async () => {
  const heightDescriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientHeight');
  const widthDescriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientWidth');
  Object.defineProperty(HTMLElement.prototype, 'clientHeight', { configurable: true, get() { return 60; } });
  Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, get() { return 80; } });
  const host = document.createElement('div');
  document.body.append(host);
  const list = ref();
  const items = Array.from({ length: 8 }, (_unused, index) => ({ id: index }));
  const app = createApp({
    render: () => h(VirtualList, {
      ref: list,
      items,
      getID: (value) => value.id,
      sizePolicy: { kind: 'fixed', extent: 20 },
      axis: 'horizontal',
      overscan: 0,
      initialViewport: { x: 0, y: 0, width: 80, height: 60 },
    }, { item: ({ id }) => String(id) }),
  });

  try {
    app.mount(host);
    await settle();
    const root = host.querySelector('[data-virtual-layout="virtual-list"][data-part="root"]');
    const surface = root.querySelector('[data-part="surface"]');
    assert.equal(list.value.state.crossExtent, 60);
    assert.deepEqual(list.value.plan.contentSize, { width: 160, height: 60 });
    assert.deepEqual(
      list.value.plan.placements.map((placement) => placement.rect.height),
      [60, 60, 60, 60],
    );
    assert.equal(surface.style.height, '60px');
    assert.equal(surface.firstElementChild.style.height, '60px');
  } finally {
    app.unmount();
    host.remove();
    if (heightDescriptor === undefined) delete HTMLElement.prototype.clientHeight;
    else Object.defineProperty(HTMLElement.prototype, 'clientHeight', heightDescriptor);
    if (widthDescriptor === undefined) delete HTMLElement.prototype.clientWidth;
    else Object.defineProperty(HTMLElement.prototype, 'clientWidth', widthDescriptor);
  }
});

test('VirtualList separates fixed sizes from automatic DOM measurement', async () => {
  const heightDescriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientHeight');
  const widthDescriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientWidth');
  const boundsDescriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'getBoundingClientRect');
  Object.defineProperty(HTMLElement.prototype, 'clientHeight', {
    configurable: true,
    get() { return 80; },
  });
  Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
    configurable: true,
    get() { return 120; },
  });
  Object.defineProperty(HTMLElement.prototype, 'getBoundingClientRect', {
    configurable: true,
    value() {
      if (this.dataset.automatic === '') return {
        x: 0, y: 0, top: 0, right: 120, bottom: 35, left: 0,
        width: 120, height: 35, toJSON() {},
      };
      return boundsDescriptor?.value?.call(this) ?? {
        x: 0, y: 0, top: 0, right: 0, bottom: 0, left: 0,
        width: 0, height: 0, toJSON() {},
      };
    },
  });
  const host = document.createElement('div');
  document.body.append(host);
  const fixed = ref();
  const automatic = ref();
  const items = Array.from({ length: 20 }, (_, index) => ({ id: `fixed-${index}` }));
  const app = createApp({
    render: () => h('div', [
      h(VirtualList, {
        ref: fixed,
        items,
        getID: (value) => value.id,
        sizePolicy: { kind: 'fixed', extent: 20 },
        overscan: 0,
      }, { item: ({ id }) => id }),
      h(VirtualList, {
        ref: automatic,
        items,
        getID: (value) => value.id,
        sizePolicy: { kind: 'measured' },
        overscan: 0,
        itemAttributes: () => ({ 'data-automatic': '' }),
      }, { item: ({ id }) => id }),
    ]),
  });

  try {
    app.mount(host);
    const roots = host.querySelectorAll('[data-virtual-layout="virtual-list"][data-part="root"]');
    const automaticRoot = roots[1];
    const automaticSurface = automaticRoot.querySelector('[data-part="surface"]');
    assert.equal(automaticRoot.getAttribute('data-phase'), 'bootstrap');
    await settle();
    await settle();
    fixed.value.flush();
    automatic.value.flush();
    await settle();
    assert.equal(host.querySelectorAll('[data-virtual-layout="virtual-list"][data-part="root"]')[1], automaticRoot);
    assert.equal(automaticRoot.querySelector('[data-part="surface"]'), automaticSurface);
    assert.equal(automaticRoot.getAttribute('data-phase'), 'ready');
    assert.deepEqual(fixed.value.state.extents.extentAt(0), { kind: 'exact', value: 20 });
    assert.equal(fixed.value.plan.contentSize.height, 400);
    assert.deepEqual(automatic.value.state.extents.extentAt(10), { kind: 'unknown', fallback: 35 });
    assert.equal(automatic.value.plan.contentSize.height, 700);

    const fixedRow = roots[0].querySelector('[data-part="item"]');
    Object.defineProperty(fixedRow, 'getBoundingClientRect', {
      configurable: true,
      value: () => ({
        x: 0,
        y: 0,
        top: 0,
        right: 120,
        bottom: 35,
        left: 0,
        width: 120,
        height: 35,
        toJSON() {},
      }),
    });
    FakeResizeObserver.notify(fixedRow);
    fixed.value.flush();
    await settle();
    assert.deepEqual(fixed.value.state.extents.extentAt(0), { kind: 'exact', value: 20 });
  } finally {
    app.unmount();
    host.remove();
    if (heightDescriptor === undefined) delete HTMLElement.prototype.clientHeight;
    else Object.defineProperty(HTMLElement.prototype, 'clientHeight', heightDescriptor);
    if (widthDescriptor === undefined) delete HTMLElement.prototype.clientWidth;
    else Object.defineProperty(HTMLElement.prototype, 'clientWidth', widthDescriptor);
    if (boundsDescriptor === undefined) delete HTMLElement.prototype.getBoundingClientRect;
    else Object.defineProperty(HTMLElement.prototype, 'getBoundingClientRect', boundsDescriptor);
  }
});

test('VirtualList keeps frame anatomy stable across empty and ready phases', async () => {
  const heightDescriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientHeight');
  const widthDescriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientWidth');
  Object.defineProperty(HTMLElement.prototype, 'clientHeight', { configurable: true, get() { return 80; } });
  Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, get() { return 120; } });
  const host = document.createElement('div');
  document.body.append(host);
  const items = ref([]);
  const list = ref();
  const app = createApp({
    render: () => h(VirtualList, {
      ref: list,
      items: items.value,
      getID: (value) => value.id,
      sizePolicy: { kind: 'fixed', extent: 20 },
      overscan: 0,
      initialViewport: { x: 0, y: 0, width: 120, height: 80 },
    }, {
      header: () => h('span', { 'data-list-header': '' }, 'Header'),
      item: ({ id }) => h('span', { 'data-list-item': id }, String(id)),
      empty: () => h('span', { 'data-list-empty': '' }, 'Empty'),
      footer: () => h('span', { 'data-list-footer': '' }, 'Footer'),
    }),
  });

  try {
    app.mount(host);
    await settle();
    const root = host.querySelector('[data-virtual-layout="virtual-list"][data-part="root"]');
    const header = root.querySelector('[data-part="header"]');
    const surface = root.querySelector('[data-part="surface"]');
    const footer = root.querySelector('[data-part="footer"]');
    assert.equal(root.getAttribute('data-phase'), 'empty');
    assert.ok(surface.querySelector('[data-list-empty]') !== null);

    items.value = [{ id: 1 }];
    await settle();
    assert.equal(host.querySelector('[data-virtual-layout="virtual-list"][data-part="root"]'), root);
    assert.equal(root.querySelector('[data-part="header"]'), header);
    assert.equal(root.querySelector('[data-part="surface"]'), surface);
    assert.equal(root.querySelector('[data-part="footer"]'), footer);
    assert.equal(root.getAttribute('data-phase'), 'ready');
    assert.equal(surface.querySelector('[data-list-empty]'), null);
    assert.equal(surface.querySelector('[data-list-item]')?.textContent, '1');
    assert.equal(list.value.state.domain.at(0), 1);
  } finally {
    app.unmount();
    host.remove();
    if (heightDescriptor === undefined) delete HTMLElement.prototype.clientHeight;
    else Object.defineProperty(HTMLElement.prototype, 'clientHeight', heightDescriptor);
    if (widthDescriptor === undefined) delete HTMLElement.prototype.clientWidth;
    else Object.defineProperty(HTMLElement.prototype, 'clientWidth', widthDescriptor);
  }
});

test('VirtualGrid and VirtualMasonry bootstrap unknown sizes from rendered items', async () => {
  const heightDescriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientHeight');
  const widthDescriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientWidth');
  const boundsDescriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'getBoundingClientRect');
  Object.defineProperty(HTMLElement.prototype, 'clientHeight', { configurable: true, get() { return 100; } });
  Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, get() { return 120; } });
  Object.defineProperty(HTMLElement.prototype, 'getBoundingClientRect', {
    configurable: true,
    value() {
      if (this.dataset.bootstrapHeight !== undefined) {
        const height = Number(this.dataset.bootstrapHeight);
        return {
          x: 0, y: 0, top: 0, right: 55, bottom: height, left: 0,
          width: 55, height, toJSON() {},
        };
      }
      return boundsDescriptor?.value?.call(this) ?? {
        x: 0, y: 0, top: 0, right: 0, bottom: 0, left: 0,
        width: 0, height: 0, toJSON() {},
      };
    },
  });
  const host = document.createElement('div');
  document.body.append(host);
  const grid = ref();
  const masonry = ref();
  const items = Array.from({ length: 12 }, (_, index) => ({
    id: `automatic-${index}`,
    height: index % 2 === 0 ? 30 : 50,
  }));
  const app = createApp({
    render: () => h('div', [
      h(VirtualGrid, {
        ref: grid,
        items,
        getID: (value) => value.id,
        sizePolicy: { kind: 'measured' },
        lanePolicy: { kind: 'fixed', count: 2 },
        initialViewport: { x: 0, y: 0, width: 120, height: 100 },
        overscan: 0,
        itemAttributes: (value) => ({ 'data-bootstrap-height': String(value.height) }),
      }, { item: ({ id }) => id }),
      h(VirtualMasonry, {
        ref: masonry,
        items,
        getID: (value) => value.id,
        sizePolicy: { kind: 'measured' },
        lanePolicy: { kind: 'fixed', count: 2 },
        initialViewport: { x: 0, y: 0, width: 120, height: 100 },
        overscan: 0,
        itemAttributes: (value) => ({ 'data-bootstrap-height': String(value.height) }),
      }, { item: ({ id }) => id }),
    ]),
  });

  try {
    app.mount(host);
    const gridRoot = host.querySelector('[data-virtual-layout="virtual-grid"][data-part="root"]');
    const gridSurface = host.querySelector('[data-virtual-layout="virtual-grid"] [data-part="surface"]');
    const masonryRoot = host.querySelector('[data-virtual-layout="virtual-masonry"][data-part="root"]');
    const masonrySurface = host.querySelector('[data-virtual-layout="virtual-masonry"] [data-part="surface"]');
    assert.equal(gridRoot?.getAttribute('data-phase'), 'bootstrap');
    assert.equal(masonryRoot?.getAttribute('data-phase'), 'bootstrap');
    await settle();
    await settle();
    assert.equal(host.querySelector('[data-virtual-layout="virtual-grid"][data-part="root"]'), gridRoot);
    assert.equal(host.querySelector('[data-virtual-layout="virtual-grid"] [data-part="surface"]'), gridSurface);
    assert.equal(host.querySelector('[data-virtual-layout="virtual-masonry"][data-part="root"]'), masonryRoot);
    assert.equal(host.querySelector('[data-virtual-layout="virtual-masonry"] [data-part="surface"]'), masonrySurface);
    assert.equal(gridRoot?.getAttribute('data-phase'), 'ready');
    assert.equal(masonryRoot?.getAttribute('data-phase'), 'ready');
    assert.deepEqual(grid.value.state.rows.extentAt(4), { kind: 'unknown', fallback: 50 });
    assert.deepEqual(masonry.value.state.extents.extentAt(4), { kind: 'unknown', fallback: 40 });
  } finally {
    app.unmount();
    host.remove();
    if (heightDescriptor === undefined) delete HTMLElement.prototype.clientHeight;
    else Object.defineProperty(HTMLElement.prototype, 'clientHeight', heightDescriptor);
    if (widthDescriptor === undefined) delete HTMLElement.prototype.clientWidth;
    else Object.defineProperty(HTMLElement.prototype, 'clientWidth', widthDescriptor);
    if (boundsDescriptor === undefined) delete HTMLElement.prototype.getBoundingClientRect;
    else Object.defineProperty(HTMLElement.prototype, 'getBoundingClientRect', boundsDescriptor);
  }
});

test('VirtualGrid derives responsive columns and reconciles declarative items', async () => {
  const heightDescriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientHeight');
  const widthDescriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientWidth');
  Object.defineProperty(HTMLElement.prototype, 'clientHeight', { configurable: true, get() { return 100; } });
  Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, get() { return 120; } });
  const host = document.createElement('div');
  document.body.append(host);
  const grid = ref();
  const stateChanges = [];
  const planChanges = [];
  const items = ref(Array.from({ length: 12 }, (_, index) => ({ id: `grid-${index}` })));
  const app = createApp({
    render: () => h(VirtualGrid, {
      ref: grid,
      items: items.value,
      getID: (value) => value.id,
      sizePolicy: { kind: 'estimated', estimate: 20 },
      lanePolicy: { kind: 'responsive', minExtent: 50, maxCount: 6, gap: 10 },
      initialViewport: { x: 0, y: 0, width: 120, height: 100 },
      overscan: 0,
      onStateChange: (state) => stateChanges.push(state),
      onPlanChange: (plan) => planChanges.push(plan),
    }, {
      header: () => h('div', { 'data-grid-header': '' }, 'Grid header'),
      item: ({ id, row, column }) => `${id}:${row}:${column}`,
    }),
  });

  try {
    app.mount(host);
    await settle();
    assert.equal(grid.value.state.columns.size, 2);
    assert.equal(grid.value.state.rows.size, 6);
    assert.match(host.textContent, /grid-0:0:0/);
    assert.match(host.textContent, /grid-1:0:1/);

    const first = host.querySelector('[data-virtual-layout="virtual-grid"][data-part="item"]');
    const second = host.querySelectorAll('[data-virtual-layout="virtual-grid"][data-part="item"]')[1];
    first.getBoundingClientRect = () => ({
      x: 0, y: 0, top: 0, right: 55, bottom: 35, left: 0,
      width: 55, height: 35, toJSON() {},
    });
    second.getBoundingClientRect = () => ({
      x: 55, y: 0, top: 0, right: 110, bottom: 45, left: 55,
      width: 55, height: 45, toJSON() {},
    });
    const generation = grid.value.state.generation;
    stateChanges.length = 0;
    planChanges.length = 0;
    FakeResizeObserver.notify(first);
    FakeResizeObserver.notify(second);
    grid.value.flush();
    await settle();
    assert.deepEqual(grid.value.state.rows.extentAt(0), { kind: 'exact', value: 45 });
    assert.equal(grid.value.state.generation, generation + 1);
    assert.equal(stateChanges.length, 1);
    assert.equal(planChanges.length, 1);

    stateChanges.length = 0;
    planChanges.length = 0;
    FakeResizeObserver.notify(first);
    FakeResizeObserver.notify(second);
    grid.value.flush();
    await settle();
    assert.equal(grid.value.state.generation, generation + 1);
    assert.equal(stateChanges.length, 0);
    assert.equal(planChanges.length, 0);

    const frameStableState = grid.value.state;
    const frameStableGeneration = grid.value.state.generation;
    const header = host.querySelector('[data-grid-header]')?.parentElement;
    assert.ok(header !== null && header !== undefined);
    FakeResizeObserver.notify(header);
    grid.value.flush();
    await settle();
    assert.equal(grid.value.state, frameStableState);
    assert.equal(grid.value.state.generation, frameStableGeneration);
    assert.equal(grid.value.state.columns.size, 2);

    const root = host.querySelector('[data-scope="virtualizer"][data-part="root"]');
    Object.defineProperty(root, 'clientWidth', { configurable: true, value: 240 });
    Object.defineProperty(root, 'clientHeight', { configurable: true, value: 100 });
    FakeResizeObserver.notify(root);
    grid.value.flush();
    await settle();
    await settle();
    assert.equal(grid.value.state.columns.size, 4);
    assert.equal(grid.value.state.rows.size, 3);

    const retainedRowExtent = grid.value.state.rows.extentAt(1);
    items.value = [{ id: 'grid-new' }, ...items.value];
    await settle();
    assert.equal(grid.value.state.regions.size, 13);
    assert.equal(grid.value.state.regions.at(0).id, 'grid-new');
    assert.equal(grid.value.state.regions.at(4).row, 1);
    assert.equal(grid.value.state.rows.extentAt(1), retainedRowExtent);
  } finally {
    app.unmount();
    host.remove();
    if (heightDescriptor === undefined) delete HTMLElement.prototype.clientHeight;
    else Object.defineProperty(HTMLElement.prototype, 'clientHeight', heightDescriptor);
    if (widthDescriptor === undefined) delete HTMLElement.prototype.clientWidth;
    else Object.defineProperty(HTMLElement.prototype, 'clientWidth', widthDescriptor);
  }
});

test('VirtualMasonry measures natural item heights and preserves declarative order', async () => {
  const heightDescriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientHeight');
  const widthDescriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientWidth');
  Object.defineProperty(HTMLElement.prototype, 'clientHeight', { configurable: true, get() { return 100; } });
  Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, get() { return 120; } });
  const host = document.createElement('div');
  document.body.append(host);
  const masonry = ref();
  const items = ref(Array.from({ length: 12 }, (_, index) => ({ id: `card-${index}` })));
  const app = createApp({
    render: () => h(VirtualMasonry, {
      ref: masonry,
      items: items.value,
      getID: (value) => value.id,
      sizePolicy: { kind: 'estimated', estimate: 20 },
      lanePolicy: { kind: 'responsive', minExtent: 50, maxCount: 6, gap: 10 },
      initialViewport: { x: 0, y: 0, width: 120, height: 100 },
      overscan: 0,
    }, {
      header: () => h('div', { 'data-masonry-header': '' }, 'Masonry header'),
      item: ({ id, lane }) => `${id}:${lane}`,
      empty: () => h('div', { 'data-masonry-empty': '' }, 'Masonry empty'),
      footer: () => h('div', { 'data-masonry-footer': '' }, 'Masonry footer'),
    }),
  });

  try {
    app.mount(host);
    await settle();
    assert.equal(masonry.value.state.laneCount, 2);
    const first = host.querySelector('[data-virtual-layout="virtual-masonry"][data-part="item"]');
    first.getBoundingClientRect = () => ({
      x: 0, y: 0, top: 0, right: 55, bottom: 35, left: 0,
      width: 55, height: 35, toJSON() {},
    });
    FakeResizeObserver.notify(first);
    masonry.value.flush();
    await settle();
    assert.deepEqual(masonry.value.state.extents.extentAt(0), { kind: 'exact', value: 35 });

    const frameStableState = masonry.value.state;
    const frameStableGeneration = frameStableState.generation;
    const header = host.querySelector('[data-masonry-header]')?.parentElement;
    assert.ok(header !== null && header !== undefined);
    FakeResizeObserver.notify(header);
    masonry.value.flush();
    await settle();
    assert.equal(masonry.value.state, frameStableState);
    assert.equal(masonry.value.state.generation, frameStableGeneration);
    assert.equal(masonry.value.state.laneCount, 2);

    const root = host.querySelector('[data-virtual-layout="virtual-masonry"][data-part="root"]');
    Object.defineProperty(root, 'clientWidth', { configurable: true, value: 240 });
    Object.defineProperty(root, 'clientHeight', { configurable: true, value: 100 });
    FakeResizeObserver.notify(root);
    masonry.value.flush();
    await settle();
    await settle();
    assert.equal(masonry.value.state.laneCount, 4);

    items.value = [{ id: 'card-new' }, ...items.value];
    await settle();
    assert.equal(masonry.value.state.domain.at(0), 'card-new');
    assert.equal(masonry.value.state.domain.size, 13);
    assert.deepEqual(masonry.value.state.extents.extentAt(1), { kind: 'exact', value: 35 });

    const surface = root.querySelector('[data-part="surface"]');
    const footer = host.querySelector('[data-masonry-footer]')?.parentElement;
    assert.ok(surface !== null);
    assert.ok(footer !== null && footer !== undefined);
    items.value = [];
    await settle();
    assert.equal(host.querySelector('[data-virtual-layout="virtual-masonry"][data-part="root"]'), root);
    assert.equal(root.querySelector('[data-part="surface"]'), surface);
    assert.equal(host.querySelector('[data-masonry-footer]')?.parentElement, footer);
    assert.equal(root.getAttribute('data-phase'), 'empty');
    assert.ok(surface.querySelector('[data-masonry-empty]') !== null);
    assert.equal(masonry.value.state.domain.size, 0);
  } finally {
    app.unmount();
    host.remove();
    if (heightDescriptor === undefined) delete HTMLElement.prototype.clientHeight;
    else Object.defineProperty(HTMLElement.prototype, 'clientHeight', heightDescriptor);
    if (widthDescriptor === undefined) delete HTMLElement.prototype.clientWidth;
    else Object.defineProperty(HTMLElement.prototype, 'clientWidth', widthDescriptor);
  }
});

test('VirtualSpatial mounted size ownership preserves application position and frame-local geometry', async () => {
  const heightDescriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientHeight');
  const widthDescriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientWidth');
  Object.defineProperty(HTMLElement.prototype, 'clientHeight', { configurable: true, get() { return 100; } });
  Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, get() { return 120; } });
  const host = document.createElement('div');
  document.body.append(host);
  const spatial = ref();
  const items = ref([
    { id: 'node-a', x: 0, y: 0, z: 2 },
    { id: 'node-b', x: 60, y: 20, z: 1 },
  ]);
  const getRect = (value) => ({ x: value.x, y: value.y, width: 20, height: 20 });
  const getZIndex = (value) => value.z;
  const app = createApp({
    render: () => h(VirtualSpatial, {
      ref: spatial,
      items: items.value,
      getID: (value) => value.id,
      getRect,
      getZIndex,
      sizeOwnership: 'mounted',
      initialViewport: { x: 0, y: 0, width: 120, height: 100 },
      overscan: 0,
    }, {
      header: () => h('div', { 'data-spatial-header': '' }, 'Spatial header'),
      item: ({ id, zIndex }) => `${id}:${zIndex}`,
      empty: () => h('div', { 'data-spatial-empty': '' }, 'Spatial empty'),
      footer: () => h('div', { 'data-spatial-footer': '' }, 'Spatial footer'),
    }),
  });

  try {
    app.mount(host);
    await settle();
    assert.match(host.textContent, /node-b:1node-a:2/);
    const root = host.querySelector('[data-virtual-layout="virtual-spatial"][data-part="root"]');
    assert.ok(root !== null);
    const surface = root.querySelector('[data-part="surface"]');
    const header = root.querySelector('[data-part="header"]');
    const footer = root.querySelector('[data-part="footer"]');
    const first = root.querySelector('[data-part="item"]');
    assert.ok(surface !== null);
    assert.ok(header !== null);
    assert.ok(footer !== null);
    assert.ok(first !== null);
    first.getBoundingClientRect = () => ({
      x: 60, y: 20, top: 20, right: 90, bottom: 60, left: 60,
      width: 30, height: 40, toJSON() {},
    });
    FakeResizeObserver.notify(first);
    spatial.value.flush();
    await settle();
    const measuredID = first.textContent.split(':')[0];
    const measuredIndex = spatial.value.state.domain.indexOf(measuredID);
    assert.notEqual(measuredIndex, null);
    const measured = spatial.value.state.items.at(measuredIndex);
    assert.equal(measured.rect.width, 30);
    assert.equal(measured.rect.height, 40);

    const frameStableState = spatial.value.state;
    const frameStableGeneration = frameStableState.generation;
    FakeResizeObserver.notify(header);
    spatial.value.flush();
    await settle();
    assert.equal(spatial.value.state, frameStableState);
    assert.equal(spatial.value.state.generation, frameStableGeneration);
    assert.equal(spatial.value.state.items.at(measuredIndex).rect.width, 30);

    items.value = [
      { ...items.value[1], x: 80 },
      { ...items.value[0], x: 30 },
    ];
    await settle();
    assert.deepEqual(spatial.value.state.domain.ids, ['node-b', 'node-a']);
    assert.equal(spatial.value.state.items.at(0).rect.x, 80);
    assert.equal(spatial.value.state.items.at(0).rect.width, 30);
    assert.equal(spatial.value.state.items.at(0).rect.height, 40);
    assert.equal(spatial.value.state.items.at(1).rect.x, 30);

    items.value = [];
    await settle();
    assert.equal(host.querySelector('[data-virtual-layout="virtual-spatial"][data-part="root"]'), root);
    assert.equal(root.querySelector('[data-part="surface"]'), surface);
    assert.equal(root.querySelector('[data-part="header"]'), header);
    assert.equal(root.querySelector('[data-part="footer"]'), footer);
    assert.equal(root.getAttribute('data-phase'), 'empty');
    assert.ok(surface.querySelector('[data-spatial-empty]') !== null);
  } finally {
    app.unmount();
    host.remove();
    if (heightDescriptor === undefined) delete HTMLElement.prototype.clientHeight;
    else Object.defineProperty(HTMLElement.prototype, 'clientHeight', heightDescriptor);
    if (widthDescriptor === undefined) delete HTMLElement.prototype.clientWidth;
    else Object.defineProperty(HTMLElement.prototype, 'clientWidth', widthDescriptor);
  }
});

test('VirtualSpatial declared size ownership keeps application rectangles authoritative', async () => {
  const host = document.createElement('div');
  document.body.append(host);
  const spatial = ref();
  const app = createApp({
    render: () => h(VirtualSpatial, {
      ref: spatial,
      items: [{ id: 1 }],
      getID: (value) => value.id,
      getRect: () => ({ x: 5, y: 7, width: 25, height: 15 }),
      sizeOwnership: 'declared',
      initialViewport: { x: 0, y: 0, width: 100, height: 80 },
      overscan: 0,
    }, { item: ({ id }) => String(id) }),
  });

  try {
    app.mount(host);
    await settle();
    const item = host.querySelector('[data-virtual-layout="virtual-spatial"][data-part="item"]');
    assert.ok(item !== null);
    assert.deepEqual(spatial.value.state.items.at(0).rect, { x: 5, y: 7, width: 25, height: 15 });
    assert.equal(item.style.width, '25px');
    assert.equal(item.style.height, '15px');
    item.getBoundingClientRect = () => ({
      x: 5, y: 7, top: 7, right: 95, bottom: 77, left: 5,
      width: 90, height: 70, toJSON() {},
    });
    FakeResizeObserver.notify(item);
    spatial.value.flush();
    await settle();
    assert.deepEqual(spatial.value.state.items.at(0).rect, { x: 5, y: 7, width: 25, height: 15 });
  } finally {
    app.unmount();
    host.remove();
  }
});

test('declarative virtual collections resolve only the changed keyed window', async () => {
  const host = document.createElement('div');
  document.body.append(host);
  const source = Array.from({ length: 1_000 }, (_, index) => ({
    id: `item-${index}`,
    x: index % 100,
    y: Math.floor(index / 100),
  }));
  const items = ref(source);
  const spatial = ref();
  const keyCalls = { list: 0, grid: 0, masonry: 0, spatial: 0 };
  let rectCalls = 0;
  const key = (scope) => (value) => {
    keyCalls[scope] += 1;
    return value.id;
  };
  const keys = {
    list: key('list'),
    grid: key('grid'),
    masonry: key('masonry'),
    spatial: key('spatial'),
  };
  const getRect = (value) => {
    rectCalls += 1;
    return { x: value.x, y: value.y, width: 1, height: 1 };
  };
  const app = createApp({
    render: () => h('div', [
      h(VirtualList, {
        items: items.value,
        getID: keys.list,
        sizePolicy: { kind: 'fixed', extent: 20 },
        initialViewport: { x: 0, y: 0, width: 20, height: 20 },
      }, { item: ({ id }) => id }),
      h(VirtualGrid, {
        items: items.value,
        getID: keys.grid,
        sizePolicy: { kind: 'fixed', extent: 20 },
        lanePolicy: { kind: 'fixed', count: 2 },
        initialViewport: { x: 0, y: 0, width: 40, height: 20 },
      }, { item: ({ id }) => id }),
      h(VirtualMasonry, {
        items: items.value,
        getID: keys.masonry,
        sizePolicy: { kind: 'fixed', extent: 20 },
        lanePolicy: { kind: 'fixed', count: 2 },
        initialViewport: { x: 0, y: 0, width: 40, height: 20 },
      }, { item: ({ id }) => id }),
      h(VirtualSpatial, {
        ref: spatial,
        items: items.value,
        getID: keys.spatial,
        getRect,
        sizeOwnership: 'declared',
        initialViewport: { x: 0, y: 0, width: 20, height: 20 },
      }, { item: ({ id }) => id }),
    ]),
  });

  try {
    app.mount(host);
    await settle();
    Object.keys(keyCalls).forEach((scope) => { keyCalls[scope] = 0; });
    rectCalls = 0;
    items.value = [{ id: 'inserted', x: 0, y: 0 }, ...source];
    await settle();
    assert.deepEqual(keyCalls, { list: 1, grid: 1, masonry: 1, spatial: 1 });
    assert.equal(rectCalls, 1);

    Object.keys(keyCalls).forEach((scope) => { keyCalls[scope] = 0; });
    rectCalls = 0;
    const changed = [...items.value];
    changed[501] = { ...changed[501], x: 777, y: 888 };
    items.value = changed;
    await settle();
    assert.deepEqual(keyCalls, { list: 1, grid: 1, masonry: 1, spatial: 1 });
    assert.equal(rectCalls, 1);
    assert.equal(spatial.value.state.items.at(501).rect.x, 777);
    assert.equal(spatial.value.state.items.at(501).rect.y, 888);
  } finally {
    app.unmount();
    host.remove();
  }
});

test('useVirtualizer returns controlled not-connected results until both host elements mount', () => {
  const scope = effectScope();
  let virtualizer;
  scope.run(() => {
    virtualizer = useVirtualizer({
      state: shallowRef(Object.freeze({ value: 0, generation: 0 })),
      strategy: createStrategy(1),
      initialViewport: Object.freeze({ x: 0, y: 0, width: 100, height: 80 }),
    });
  });

  try {
    for (const result of [
      virtualizer.flush(),
      virtualizer.mutate(1),
      virtualizer.measure([]),
      virtualizer.scrollTo('missing'),
    ]) {
      assert.equal(result.ok, false);
      assert.equal(result.error.code, 'virtualizer-not-connected');
    }
  } finally {
    scope.stop();
  }
});

test('Vue low-level virtualizer keeps root, header, surface, and footer anatomy stable', async () => {
  const host = document.createElement('div');
  document.body.append(host);
  const root = ref();
  const app = createApp({
    render: () => h(VirtualizerRoot, {
      ref: root,
      defaultState: Object.freeze({ value: 0, generation: 0 }),
      strategy: createStrategy(1),
      initialViewport: Object.freeze({ x: 0, y: 0, width: 100, height: 80 }),
    }, {
      default: () => [
        h(VirtualizerHeader, null, { default: () => 'header' }),
        h(VirtualizerSurface, null, { default: () => 'surface' }),
        h(VirtualizerFooter, null, { default: () => 'footer' }),
      ],
    }),
  });

  try {
    app.mount(host);
    await settle();
    const parts = [...host.querySelectorAll('[data-scope="virtualizer"]')]
      .map((element) => element.getAttribute('data-part'));
    assert.deepEqual(parts, ['root', 'header', 'surface', 'footer']);
    assert.equal(root.value.scrollport.value.getAttribute('data-part'), 'root');
    assert.equal(root.value.surface.value.getAttribute('data-part'), 'surface');
    assert.equal(root.value.flush().ok, true);
  } finally {
    app.unmount();
    host.remove();
  }
});

test('Vue virtualizer owns frame-local state and keeps construction options fixed', async () => {
  const host = document.createElement('div');
  document.body.append(host);
  const root = ref();
  const strategy = shallowRef(createStrategy(1));
  const changes = [];
  const warnings = [];
  const previousWarn = console.warn;
  console.warn = (message) => warnings.push(message);
  const app = createApp({
    render: () => h(VirtualizerRoot, {
      ref: root,
      defaultState: Object.freeze({ value: 0, generation: 0 }),
      strategy: strategy.value,
      initialViewport: Object.freeze({ x: 0, y: 0, width: 100, height: 80 }),
      onStateChange: (state) => changes.push(state.value),
    }, {
      default: ({ state }) => h(VirtualizerSurface, null, {
        default: () => String(state.value),
      }),
    }),
  });

  try {
    app.mount(host);
    await settle();
    assert.equal(host.textContent, '0');

    const first = root.value.mutate(2);
    await settle();
    assert.equal(first.ok, true);
    assert.equal(host.textContent, '2');
    assert.deepEqual(changes, [2]);

    strategy.value = createStrategy(100);
    await settle();
    assert.equal(warnings.length, 1);
    assert.match(warnings[0], /construction-time options/);

    root.value.mutate(3);
    await settle();
    assert.equal(host.textContent, '5');
    assert.deepEqual(changes, [2, 5]);
  } finally {
    console.warn = previousWarn;
    app.unmount();
    host.remove();
  }
});

async function settle() {
  await nextTick();
  await nextTick();
}

function createStrategy(multiplier) {
  return Object.freeze({
    kind: `test-${multiplier}`,
    tryQuery: (state, input) => success(Object.freeze({
      generation: state.generation,
      contentSize: Object.freeze({ width: 100, height: 80 }),
      viewport: Object.freeze({ ...input.viewport }),
      renderBounds: Object.freeze({ ...input.viewport }),
      placements: Object.freeze([]),
      anchor: null,
    })),
    tryMeasure: (state) => mutation(state),
    tryMutate: (state, { mutation: amount }) => mutation(Object.freeze({
      value: state.value + amount * multiplier,
      generation: state.generation + 1,
    })),
    tryScrollTarget: () => success(Object.freeze({ x: 0, y: 0 })),
  });
}

function mutation(state) {
  return success(Object.freeze({
    state,
    scrollDelta: Object.freeze({ x: 0, y: 0 }),
  }));
}

function success(value) {
  return { ok: true, value };
}
