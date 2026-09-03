import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createAxisMeasurementResolver,
  createVirtualizer,
  virtualSurfaceStyle,
} from '../.verification-dist/virtual.js';

test('DOM virtualizer projects the physical scrollport through the explicit surface frame', () => {
  let observedViewport;
  const fixture = createFixture({
    originY: 120,
    scrollTop: 40,
    clientWidth: 200,
    clientHeight: 100,
    tryQuery: (state, input) => {
      observedViewport = input.viewport;
      return success(plan(state, input.viewport));
    },
  });
  const connection = createVirtualizer({
    ...fixture.options,
    viewportInsets: { top: 10, right: 5, bottom: 20, left: 15 },
  });

  assert.deepEqual(observedViewport, {
    x: 15,
    y: -70,
    width: 180,
    height: 70,
  });
  assert.equal(fixture.scrollport.geometryReads, 1);
  assert.equal(fixture.surface.geometryReads, 1);
  assert.deepEqual(
    fixture.geometryObserver().observed,
    [fixture.scrollport, fixture.surface],
  );
  assert.equal(fixture.scrollport.listenerOptions.get('scroll')?.passive, true);
  connection.disconnect();
});

test('ordinary scroll reuses the cached surface frame without element geometry reads', () => {
  const counters = { query: 0, plan: 0 };
  const fixture = createFixture({
    originY: 100,
    scrollTop: 100,
    tryQuery: (state, input) => {
      counters.query += 1;
      return success(plan(state, input.viewport));
    },
  });
  const connection = createVirtualizer({
    ...fixture.options,
    onPlanChange: () => { counters.plan += 1; },
  });
  fixture.resetEvidence();
  counters.query = 0;
  counters.plan = 0;

  fixture.scrollport.scrollTop = 140;
  fixture.scrollport.dispatch('scroll');
  assert.equal(fixture.pendingFrames(), 1);
  fixture.runFrame();

  assert.equal(fixture.scrollport.geometryReads, 0);
  assert.equal(fixture.surface.geometryReads, 0);
  assert.equal(fixture.scrollport.writes.length, 0);
  assert.equal(counters.query, 1);
  assert.equal(counters.plan, 1);
  assert.equal(connection.getPlan().viewport.y, 40);
  connection.disconnect();
});

test('frame movement before surface entry preserves the physical scroll position', () => {
  const counters = { state: 0, plan: 0 };
  const fixture = createFixture({ originY: 100, scrollTop: 10 });
  const connection = createVirtualizer({
    ...fixture.options,
    onStateChange: () => { counters.state += 1; },
    onPlanChange: () => { counters.plan += 1; },
  });
  assert.equal(connection.getPlan().anchor, null);
  fixture.resetEvidence();
  counters.plan = 0;

  fixture.surface.originY = 130;
  fixture.geometryObserver().emit([{ target: fixture.surface }]);
  fixture.runFrame();

  assert.equal(fixture.scrollport.scrollTop, 10);
  assert.equal(fixture.scrollport.writes.length, 0);
  assert.equal(connection.getPlan().viewport.y, -120);
  assert.equal(connection.getPlan().generation, 0);
  assert.deepEqual(counters, { state: 0, plan: 1 });
  connection.disconnect();
});

// Existing WI-040 evidence: one mutation and publication.
test('frame and item invalidation compose into one write, query, and publication', () => {
  const counters = {
    resolve: 0,
    measure: 0,
    query: 0,
    state: 0,
    plan: 0,
  };
  const fixture = createFixture({
    originY: 100,
    scrollTop: 100,
    placementIDs: ['item'],
    tryQuery: (state, input) => {
      counters.query += 1;
      return success(plan(state, input.viewport, ['item']));
    },
    tryMeasure: (state, batch) => {
      counters.measure += 1;
      assert.deepEqual(batch.measurements, [5]);
      assert.equal(batch.anchor?.id, 'item');
      return mutation(
        Object.freeze({ generation: state.generation + 1 }),
        { x: 0, y: 5 },
      );
    },
  });
  const connection = createVirtualizer({
    ...fixture.options,
    measure: ({ entry }) => {
      counters.resolve += 1;
      return entry.measurement;
    },
    onStateChange: () => { counters.state += 1; },
    onPlanChange: () => { counters.plan += 1; },
  });
  const item = new FakeElement();
  connection.registerItem(item, 'item');
  fixture.resetEvidence();
  counters.query = 0;
  counters.plan = 0;

  fixture.surface.originY = 120;
  fixture.geometryObserver().emit([{ target: fixture.surface }]);
  fixture.itemObserver().emit([{ target: item, measurement: 5 }]);
  assert.equal(fixture.pendingFrames(), 1);
  fixture.runFrame();

  assert.equal(fixture.scrollport.scrollTop, 125);
  assert.deepEqual(fixture.scrollport.writes, [{ x: 0, y: 125 }]);
  assert.equal(connection.getPlan().viewport.y, 5);
  assert.equal(connection.getState().generation, 1);
  assert.deepEqual(counters, {
    resolve: 1,
    measure: 1,
    query: 1,
    state: 1,
    plan: 1,
  });
  connection.disconnect();
});

test('registered footer invalidation re-queries without mutating state or scrolling', () => {
  const counters = { query: 0, state: 0, plan: 0 };
  const fixture = createFixture({
    originY: 100,
    scrollTop: 100,
    tryQuery: (state, input) => {
      counters.query += 1;
      return success(plan(state, input.viewport));
    },
  });
  const connection = createVirtualizer({
    ...fixture.options,
    onStateChange: () => { counters.state += 1; },
    onPlanChange: () => { counters.plan += 1; },
  });
  const footer = new FakeElement();
  const unregister = connection.registerFrame(footer);
  connection.flush();
  fixture.resetEvidence();
  counters.query = 0;
  counters.plan = 0;

  fixture.geometryObserver().emit([{ target: footer }]);
  fixture.runFrame();

  assert.equal(connection.getState().generation, 0);
  assert.equal(fixture.scrollport.writes.length, 0);
  assert.deepEqual(counters, { query: 1, state: 0, plan: 1 });
  unregister();
  connection.disconnect();
});

test('viewport inset changes preserve an entered anchor through one physical write', () => {
  const fixture = createFixture({ originY: 100, scrollTop: 100 });
  const connection = createVirtualizer(fixture.options);
  assert.equal(connection.getPlan().anchor?.id, 'item');
  fixture.resetEvidence();

  const result = connection.setViewportInsets({ top: 20 });

  assert.equal(result.ok, true);
  assert.deepEqual(fixture.scrollport.writes, [{ x: 0, y: 80 }]);
  assert.equal(fixture.scrollport.scrollTop, 80);
  assert.equal(connection.getPlan().viewport.y, 0);
  connection.disconnect();
});

test('target scrolling converts surface coordinates and clamps only at the physical boundary', () => {
  let targetViewport;
  const fixture = createFixture({
    originY: 100,
    scrollTop: 100,
    scrollHeight: 500,
    clientHeight: 80,
    tryScrollTarget: (_state, _id, viewport) => {
      targetViewport = viewport;
      return success({ x: 0, y: 450 });
    },
  });
  const connection = createVirtualizer({
    ...fixture.options,
    viewportInsets: { top: 20 },
  });
  fixture.resetEvidence();

  const result = connection.scrollTo('item', 'start');

  assert.equal(result.ok, true);
  assert.deepEqual(targetViewport, {
    x: 0,
    y: 20,
    width: 100,
    height: 60,
  });
  assert.deepEqual(fixture.scrollport.writes, [{ x: 0, y: 420 }]);
  assert.deepEqual(result.value, { x: 0, y: 420 });
  assert.equal(connection.getPlan().viewport.y, 340);
  assert.equal(fixture.scrollport.geometryReads, 0);
  assert.equal(fixture.surface.geometryReads, 0);
  connection.disconnect();
});

test('recycled item registrations discard stale entries and stale disposers', () => {
  let measurementCalls = 0;
  const fixture = createFixture({
    placementIDs: ['old', 'new'],
    tryMeasure: (state) => {
      measurementCalls += 1;
      return mutation(state);
    },
  });
  const connection = createVirtualizer({
    ...fixture.options,
    measure: ({ entry }) => entry.measurement,
  });
  const item = new FakeElement();
  const unregisterOld = connection.registerItem(item, 'old');
  fixture.itemObserver().emit([{ target: item, measurement: 'old-size' }]);

  const unregisterNew = connection.registerItem(item, 'new');
  unregisterOld();
  connection.flush();
  assert.equal(measurementCalls, 0);

  fixture.itemObserver().emit([{ target: item, measurement: 'new-size' }]);
  fixture.runFrame();
  assert.equal(measurementCalls, 1);
  assert.equal(fixture.itemObserver().unobserved.includes(item), true);
  unregisterNew();
  connection.disconnect();
});

test('automatic measurement failures remain observable from manual flush', () => {
  const fixture = createFixture({
    placementIDs: ['item'],
    tryMeasure: () => failure('measurement-generation-stale'),
  });
  const errors = [];
  const connection = createVirtualizer({
    ...fixture.options,
    measure: ({ entry }) => entry.measurement,
    onError: (error) => errors.push(error.code),
  });
  const item = new FakeElement();
  connection.registerItem(item, 'item');
  fixture.itemObserver().emit([{ target: item, measurement: 42 }]);

  const result = connection.flush();

  assert.equal(result.ok, false);
  assert.equal(result.error.code, 'measurement-generation-stale');
  assert.deepEqual(errors, ['measurement-generation-stale']);
  connection.disconnect();
});

test('disconnect releases every owned resource and rejects stale callbacks', () => {
  const counters = { query: 0, plan: 0 };
  const fixture = createFixture({
    placementIDs: ['item'],
    tryQuery: (state, input) => {
      counters.query += 1;
      return success(plan(state, input.viewport, ['item']));
    },
  });
  const connection = createVirtualizer({
    ...fixture.options,
    measure: ({ entry }) => entry.measurement,
    onPlanChange: () => { counters.plan += 1; },
  });
  const frameRegion = new FakeElement();
  const item = new FakeElement();
  const unregisterFrame = connection.registerFrame(frameRegion);
  const unregisterItem = connection.registerItem(item, 'item');
  const staleFrame = fixture.peekFrame();
  fixture.resetEvidence();
  counters.query = 0;
  counters.plan = 0;

  connection.disconnect();
  connection.disconnect();
  staleFrame?.(0);
  fixture.geometryObserver().emit([{ target: frameRegion }]);
  fixture.itemObserver().emit([{ target: item, measurement: 1 }]);
  unregisterFrame();
  unregisterItem();

  assert.equal(fixture.scrollport.listeners.size, 0);
  assert.equal(fixture.geometryObserver().disconnected, true);
  assert.equal(fixture.itemObserver().disconnected, true);
  assert.equal(fixture.pendingFrames(), 0);
  assert.equal(fixture.scrollport.writes.length, 0);
  assert.deepEqual(counters, { query: 0, plan: 0 });
});

test('observer construction failure disconnects the previously created observer', () => {
  const fixture = createFixture({ failObserverAt: 2 });

  assert.throws(
    () => createVirtualizer(fixture.options),
    /observer construction failure/u,
  );
  assert.equal(fixture.geometryObserver().disconnected, true);
  assert.equal(fixture.scrollport.listeners.size, 0);
  assert.equal(fixture.pendingFrames(), 0);
});

test('axis measurement and surface style use physical item and plan geometry', () => {
  const element = new FakeElement({ width: 120, height: 48 });
  const entry = {
    contentRect: { width: 100, height: 32 },
    target: element,
  };
  const placement = placementFor('item', 3, 120);

  assert.deepEqual(
    createAxisMeasurementResolver('vertical')({
      element,
      entry,
      placement,
      state: {},
    }),
    { index: 3, extent: { kind: 'exact', value: 48 } },
  );
  assert.deepEqual(
    createAxisMeasurementResolver('horizontal')({
      element,
      entry,
      placement,
      state: {},
    }),
    { index: 3, extent: { kind: 'exact', value: 120 } },
  );
  assert.deepEqual(
    virtualSurfaceStyle(plan({ generation: 0 }, viewport(0))),
    { position: 'relative', width: '100px', height: '500px' },
  );
});

function createFixture(options = {}) {
  const scrollport = new FakeScrollport({
    width: options.clientWidth ?? 100,
    height: options.clientHeight ?? 80,
    scrollWidth: options.scrollWidth ?? 500,
    scrollHeight: options.scrollHeight ?? 500,
    scrollLeft: options.scrollLeft ?? 0,
    scrollTop: options.scrollTop ?? 0,
  });
  const surface = new FakeSurface(scrollport, {
    x: options.originX ?? 0,
    y: options.originY ?? 0,
    width: options.surfaceWidth ?? 100,
    height: options.surfaceHeight ?? 500,
  });
  const observers = [];
  const frames = new Map();
  let nextFrame = 0;
  const state = Object.freeze({ generation: 0 });
  const placementIDs = options.placementIDs ?? ['item'];
  const strategy = Object.freeze({
    kind: 'test',
    tryQuery: options.tryQuery ?? ((value, input) =>
      success(plan(value, input.viewport, placementIDs))),
    tryMeasure: options.tryMeasure ?? ((value) => mutation(value)),
    tryMutate: options.tryMutate ?? ((value) => mutation(value)),
    tryScrollTarget: options.tryScrollTarget ?? (() => success({ x: 0, y: 0 })),
  });
  return {
    scrollport,
    surface,
    options: {
      scrollport,
      surface,
      state,
      strategy,
      environment: {
        requestFrame: (callback) => {
          const id = ++nextFrame;
          frames.set(id, callback);
          return id;
        },
        cancelFrame: (id) => {
          frames.delete(id);
        },
        createResizeObserver: (callback) => {
          const ordinal = observers.length + 1;
          if (options.failObserverAt === ordinal) {
            throw new Error('observer construction failure');
          }
          const observer = new FakeResizeObserver(callback);
          observers.push(observer);
          return observer;
        },
      },
    },
    geometryObserver: () => observers[0],
    itemObserver: () => observers[1],
    pendingFrames: () => frames.size,
    peekFrame: () => frames.values().next().value ?? null,
    runFrame: () => {
      const first = frames.entries().next().value;
      assert.notEqual(first, undefined, 'expected a scheduled frame');
      const [id, callback] = first;
      frames.delete(id);
      callback(0);
    },
    resetEvidence: () => {
      scrollport.geometryReads = 0;
      surface.geometryReads = 0;
      scrollport.writes.length = 0;
    },
  };
}

function plan(state, localViewport, ids = ['item']) {
  const placements = ids.map((id, index) => {
    const placement = placementFor(id, index, index * 40);
    return Object.freeze({
      ...placement,
      visible: rectanglesIntersect(placement.rect, localViewport),
    });
  });
  const anchorPlacement = placements.find(({ visible }) => visible) ?? null;
  return Object.freeze({
    generation: state.generation,
    contentSize: Object.freeze({ width: 100, height: 500 }),
    viewport: Object.freeze({ ...localViewport }),
    renderBounds: Object.freeze({
      x: Math.max(0, localViewport.x),
      y: Math.max(0, localViewport.y),
      width: Math.max(0, localViewport.width),
      height: Math.max(0, localViewport.height),
    }),
    placements: Object.freeze(placements),
    anchor: anchorPlacement === null
      ? null
      : Object.freeze({
          id: anchorPlacement.id,
          viewportOffset: Object.freeze({
            x: anchorPlacement.rect.x - localViewport.x,
            y: anchorPlacement.rect.y - localViewport.y,
          }),
        }),
  });
}

function placementFor(id, index, y) {
  return Object.freeze({
    id,
    index,
    rect: Object.freeze({ x: 0, y, width: 100, height: 40 }),
    visible: true,
  });
}

function viewport(y) {
  return Object.freeze({ x: 0, y, width: 100, height: 80 });
}

function rectanglesIntersect(left, right) {
  return left.x < right.x + right.width
    && right.x < left.x + left.width
    && left.y < right.y + right.height
    && right.y < left.y + left.height;
}

function mutation(state, scrollDelta = { x: 0, y: 0 }) {
  return success(Object.freeze({
    state,
    scrollDelta: Object.freeze(scrollDelta),
  }));
}

function success(value) {
  return { ok: true, value };
}

function failure(code) {
  return {
    ok: false,
    error: {
      class: 'transition-rejection',
      code,
      message: code,
    },
  };
}

class FakeResizeObserver {
  observed = [];
  unobserved = [];
  disconnected = false;

  constructor(callback) {
    this.callback = callback;
  }

  observe(element) {
    if (!this.observed.includes(element)) this.observed.push(element);
  }

  unobserve(element) {
    this.unobserved.push(element);
    this.observed = this.observed.filter((candidate) => candidate !== element);
  }

  disconnect() {
    this.disconnected = true;
    this.observed = [];
  }

  emit(entries) {
    this.callback(entries, this);
  }
}

class FakeElement {
  geometryReads = 0;

  constructor(rect = { x: 0, y: 0, width: 100, height: 40 }) {
    this.rect = {
      x: rect.x ?? 0,
      y: rect.y ?? 0,
      width: rect.width,
      height: rect.height,
    };
  }

  getBoundingClientRect() {
    this.geometryReads += 1;
    return domRect(this.rect.x, this.rect.y, this.rect.width, this.rect.height);
  }
}

class FakeSurface extends FakeElement {
  constructor(scrollport, rect) {
    super(rect);
    this.scrollport = scrollport;
    this.originX = rect.x;
    this.originY = rect.y;
  }

  getBoundingClientRect() {
    this.geometryReads += 1;
    return domRect(
      this.scrollport.rect.x + this.scrollport.clientLeft
        + this.originX - this.scrollport.scrollLeft,
      this.scrollport.rect.y + this.scrollport.clientTop
        + this.originY - this.scrollport.scrollTop,
      this.rect.width,
      this.rect.height,
    );
  }
}

class FakeScrollport extends FakeElement {
  clientLeft = 0;
  clientTop = 0;
  listeners = new Map();
  listenerOptions = new Map();
  ownerDocument = { defaultView: null };
  writes = [];

  constructor(options) {
    super({ x: 0, y: 0, width: options.width, height: options.height });
    this.clientWidth = options.width;
    this.clientHeight = options.height;
    this.scrollWidth = options.scrollWidth;
    this.scrollHeight = options.scrollHeight;
    this.scrollLeft = options.scrollLeft;
    this.scrollTop = options.scrollTop;
  }

  addEventListener(type, listener, options) {
    this.listeners.set(type, listener);
    this.listenerOptions.set(type, options);
  }

  removeEventListener(type, listener) {
    if (this.listeners.get(type) === listener) this.listeners.delete(type);
    this.listenerOptions.delete(type);
  }

  dispatch(type) {
    this.listeners.get(type)?.();
  }

  scrollTo({ left, top }) {
    this.scrollLeft = left;
    this.scrollTop = top;
    this.writes.push({ x: left, y: top });
  }
}

function domRect(x, y, width, height) {
  return {
    x,
    y,
    top: y,
    right: x + width,
    bottom: y + height,
    left: x,
    width,
    height,
  };
}
