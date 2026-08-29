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

const { createApp, h, nextTick, ref, shallowRef } = await import('vue');
const { VirtualGrid } = await import('../.verification-dist/virtual-grid.js');
const { VirtualList } = await import('../.verification-dist/virtual-list.js');
const { VirtualMasonry } = await import('../.verification-dist/virtual-masonry.js');
const { VirtualSpatial } = await import('../.verification-dist/virtual-spatial.js');
const { VirtualizerContent, VirtualizerRoot } = await import('../.verification-dist/virtual-core.js');

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
      getKey: (value) => value.id,
      estimateSize: 20,
      overscan: 0,
      itemAttributes: (value) => ({ 'data-id': value.id }),
    }, {
      default: ({ value }) => value.label,
    }),
  });

  try {
    app.mount(host);
    await settle();
    const root = host.querySelector('[data-scope="virtual-list"][data-part="root"]');
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
    assert.equal(root.children.length, 1);
    assert.equal(root.firstElementChild.children.length, 4);
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

test('VirtualList keeps the layout domain for value-only replacements and measures the changed row once', async () => {
  const heightDescriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientHeight');
  const widthDescriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientWidth');
  Object.defineProperty(HTMLElement.prototype, 'clientHeight', { configurable: true, get() { return 80; } });
  Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, get() { return 120; } });
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
      getKey: (value) => value.id,
      estimateSize: 20,
      overscan: 0,
      itemAttributes: (value) => ({
        'data-id': value.id,
        style: { height: `${value.height}px` },
      }),
    }, { default: ({ value }) => value.label }),
  });

  try {
    app.mount(host);
    await settle();
    const root = host.querySelector('[data-scope="virtual-list"][data-part="root"]');
    root.scrollTo = ({ left = root.scrollLeft, top = root.scrollTop }) => {
      root.scrollLeft = left;
      root.scrollTop = top;
    };
    list.value.flush();
    await settle();
    const firstRow = root.querySelector('[data-id="row-0"]');
    firstRow.getBoundingClientRect = () => {
      const height = Number.parseFloat(firstRow.style.height);
      return {
        x: 0,
        y: 0,
        top: 0,
        right: 120,
        bottom: height,
        left: 0,
        width: 120,
        height,
        toJSON() {},
      };
    };
    FakeResizeObserver.notify(firstRow);
    list.value.flush();
    await settle();

    const domain = list.value.state.domain;
    const generation = list.value.state.generation;
    items.value = items.value.map((item, index) => index === 0
      ? { ...item, label: 'Changed row', height: 40 }
      : item);
    await settle();

    assert.equal(list.value.state.domain, domain);
    assert.equal(list.value.state.generation, generation + 1);
    assert.deepEqual(list.value.state.extents.extentAt(0), { kind: 'exact', value: 40 });
    assert.match(firstRow.textContent, /Changed row/);

    FakeResizeObserver.notify(firstRow);
    list.value.flush();
    await settle();
    assert.equal(list.value.state.generation, generation + 1);
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
        getKey: (value) => value.id,
        itemSize: 20,
        overscan: 0,
      }, { default: ({ key }) => key }),
      h(VirtualList, {
        ref: automatic,
        items,
        getKey: (value) => value.id,
        overscan: 0,
        itemAttributes: () => ({ 'data-automatic': '' }),
      }, { default: ({ key }) => key }),
    ]),
  });

  try {
    app.mount(host);
    await settle();
    fixed.value.flush();
    automatic.value.flush();
    await settle();
    assert.deepEqual(fixed.value.state.extents.extentAt(0), { kind: 'exact', value: 20 });
    assert.equal(fixed.value.plan.contentSize.height, 400);
    assert.deepEqual(automatic.value.state.extents.extentAt(10), { kind: 'unknown', fallback: 35 });
    assert.equal(automatic.value.plan.contentSize.height, 700);

    const fixedRow = host.querySelectorAll('[data-scope="virtual-list"][data-part="root"]')[0]
      .querySelector('[data-part="item"]');
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
        getKey: (value) => value.id,
        laneCount: 2,
        minLaneSize: 50,
        initialViewport: { x: 0, y: 0, width: 120, height: 100 },
        overscan: 0,
        itemAttributes: (value) => ({ 'data-bootstrap-height': String(value.height) }),
      }, { default: ({ key }) => key }),
      h(VirtualMasonry, {
        ref: masonry,
        items,
        getKey: (value) => value.id,
        laneCount: 2,
        minLaneSize: 50,
        initialViewport: { x: 0, y: 0, width: 120, height: 100 },
        overscan: 0,
        itemAttributes: (value) => ({ 'data-bootstrap-height': String(value.height) }),
      }, { default: ({ key }) => key }),
    ]),
  });

  try {
    app.mount(host);
    await settle();
    await settle();
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
  const items = ref(Array.from({ length: 12 }, (_, index) => ({ id: `grid-${index}` })));
  const app = createApp({
    render: () => h(VirtualGrid, {
      ref: grid,
      items: items.value,
      getKey: (value) => value.id,
      estimateSize: 20,
      minLaneSize: 50,
      maxLaneCount: 6,
      laneGap: 10,
      initialViewport: { x: 0, y: 0, width: 120, height: 100 },
      overscan: 0,
    }, { default: ({ key, row, column }) => `${key}:${row}:${column}` }),
  });

  try {
    app.mount(host);
    await settle();
    assert.equal(grid.value.state.columns.size, 2);
    assert.equal(grid.value.state.rows.size, 6);
    assert.match(host.textContent, /grid-0:0:0/);
    assert.match(host.textContent, /grid-1:0:1/);

    const first = host.querySelector('[data-virtual-layout="virtual-grid"][data-part="item"]');
    first.getBoundingClientRect = () => ({
      x: 0, y: 0, top: 0, right: 55, bottom: 35, left: 0,
      width: 55, height: 35, toJSON() {},
    });
    FakeResizeObserver.notify(first);
    grid.value.flush();
    await settle();
    assert.deepEqual(grid.value.state.rows.extentAt(0), { kind: 'exact', value: 35 });

    const root = host.querySelector('[data-scope="virtualizer"][data-part="root"]');
    Object.defineProperty(root, 'clientWidth', { configurable: true, value: 240 });
    Object.defineProperty(root, 'clientHeight', { configurable: true, value: 100 });
    FakeResizeObserver.notify(root);
    grid.value.flush();
    await settle();
    await settle();
    assert.equal(grid.value.state.columns.size, 4);
    assert.equal(grid.value.state.rows.size, 3);

    items.value = [{ id: 'grid-new' }, ...items.value];
    await settle();
    assert.equal(grid.value.state.regions.size, 13);
    assert.equal(grid.value.state.regions.at(0).id, 'grid-new');
    assert.equal(grid.value.state.regions.at(4).row, 1);
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
      getKey: (value) => value.id,
      estimateSize: 20,
      minLaneSize: 50,
      laneGap: 10,
      initialViewport: { x: 0, y: 0, width: 120, height: 100 },
      overscan: 0,
    }, { default: ({ key, lane }) => `${key}:${lane}` }),
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
  } finally {
    app.unmount();
    host.remove();
    if (heightDescriptor === undefined) delete HTMLElement.prototype.clientHeight;
    else Object.defineProperty(HTMLElement.prototype, 'clientHeight', heightDescriptor);
    if (widthDescriptor === undefined) delete HTMLElement.prototype.clientWidth;
    else Object.defineProperty(HTMLElement.prototype, 'clientWidth', widthDescriptor);
  }
});

test('VirtualSpatial measures DOM size while data owns position and z-order', async () => {
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
  const app = createApp({
    render: () => h(VirtualSpatial, {
      ref: spatial,
      items: items.value,
      getKey: (value) => value.id,
      getRect: (value) => ({ x: value.x, y: value.y, width: 20, height: 20 }),
      getZIndex: (value) => value.z,
      initialViewport: { x: 0, y: 0, width: 120, height: 100 },
      overscan: 0,
    }, { default: ({ key, zIndex }) => `${key}:${zIndex}` }),
  });

  try {
    app.mount(host);
    await settle();
    assert.match(host.textContent, /^node-b:1node-a:2/);
    const first = host.querySelector('[data-virtual-layout="virtual-spatial"][data-part="item"]');
    first.getBoundingClientRect = () => ({
      x: 60, y: 20, top: 20, right: 90, bottom: 60, left: 60,
      width: 30, height: 40, toJSON() {},
    });
    FakeResizeObserver.notify(first);
    spatial.value.flush();
    await settle();
    const measured = spatial.value.state.items.toArray().find((item) => item.id === first.textContent.split(':')[0]);
    assert.equal(measured.rect.width, 30);
    assert.equal(measured.rect.height, 40);

    items.value = [items.value[1], { ...items.value[0], x: 30 }];
    await settle();
    assert.deepEqual(spatial.value.state.domain.ids, ['node-b', 'node-a']);
    assert.equal(spatial.value.state.items.at(1).rect.x, 30);
  } finally {
    app.unmount();
    host.remove();
    if (heightDescriptor === undefined) delete HTMLElement.prototype.clientHeight;
    else Object.defineProperty(HTMLElement.prototype, 'clientHeight', heightDescriptor);
    if (widthDescriptor === undefined) delete HTMLElement.prototype.clientWidth;
    else Object.defineProperty(HTMLElement.prototype, 'clientWidth', widthDescriptor);
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
        getKey: keys.list,
        itemSize: 20,
        initialViewport: { x: 0, y: 0, width: 20, height: 20 },
      }, { default: ({ key: id }) => id }),
      h(VirtualGrid, {
        items: items.value,
        getKey: keys.grid,
        itemSize: 20,
        laneCount: 2,
        initialViewport: { x: 0, y: 0, width: 40, height: 20 },
      }, { default: ({ key: id }) => id }),
      h(VirtualMasonry, {
        items: items.value,
        getKey: keys.masonry,
        itemSize: 20,
        laneCount: 2,
        initialViewport: { x: 0, y: 0, width: 40, height: 20 },
      }, { default: ({ key: id }) => id }),
      h(VirtualSpatial, {
        items: items.value,
        getKey: keys.spatial,
        getRect,
        measureSize: false,
        initialViewport: { x: 0, y: 0, width: 20, height: 20 },
      }, { default: ({ key: id }) => id }),
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
      default: ({ state }) => h(VirtualizerContent, null, {
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
