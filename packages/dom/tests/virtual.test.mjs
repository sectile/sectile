import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createAxisMeasurementResolver,
  createVirtualizer,
} from '../dist/virtual.js';

test('DOM virtualizer returns automatic measurement failures from manual flush', () => {
  const fixture = createFixture({
    tryMeasure: () => failure('measurement-generation-stale'),
  });
  const errors = [];
  const connection = createVirtualizer({
    ...fixture.options,
    measure: ({ entry }) => entry.measurement,
    onError: (error) => errors.push(error.code),
  });
  const element = new FakeElement();
  connection.registerItem(element, 'old');
  fixture.itemObserver().emit([{ target: element, measurement: 42 }]);

  const result = connection.flush();

  assert.equal(result.ok, false);
  assert.equal(result.error.code, 'measurement-generation-stale');
  assert.deepEqual(errors, ['measurement-generation-stale']);
  connection.disconnect();
});

test('DOM virtualizer discards queued measurements when an element is recycled', () => {
  let measurementCalls = 0;
  const fixture = createFixture({
    tryMeasure: (state) => {
      measurementCalls += 1;
      return mutation(state);
    },
  });
  const connection = createVirtualizer({
    ...fixture.options,
    measure: ({ entry }) => entry.measurement,
  });
  const element = new FakeElement();
  connection.registerItem(element, 'old');
  fixture.itemObserver().emit([{ target: element, measurement: 'old-size' }]);

  connection.registerItem(element, 'new');
  const result = connection.flush();

  assert.equal(result.ok, true);
  assert.equal(measurementCalls, 0);
  assert.equal(fixture.itemObserver().unobserved.includes(element), true);
  connection.disconnect();
});

test('DOM virtualizer publishes the visible range in the scroll event', () => {
  let queryCalls = 0;
  const fixture = createFixture({
    tryQuery: (state) => {
      queryCalls += 1;
      return success(plan(state));
    },
  });
  const connection = createVirtualizer(fixture.options);

  fixture.options.root.listeners.get('scroll')();

  assert.equal(queryCalls, 2);
  assert.equal(fixture.options.root.frame, null);
  connection.disconnect();
});

test('axis measurement resolver uses the physical border-box rectangle', () => {
  const element = new FakeElement({ width: 120, height: 48 });
  const entry = {
    contentRect: { width: 100, height: 32 },
    target: element,
  };
  const placement = placementFor('old', 3);

  const vertical = createAxisMeasurementResolver('vertical')({
    element,
    entry,
    placement,
    state: {},
  });
  const horizontal = createAxisMeasurementResolver('horizontal')({
    element,
    entry,
    placement,
    state: {},
  });

  assert.deepEqual(vertical, {
    index: 3,
    extent: { kind: 'exact', value: 48 },
  });
  assert.deepEqual(horizontal, {
    index: 3,
    extent: { kind: 'exact', value: 120 },
  });
});

function createFixture(overrides = {}) {
  const root = new FakeRoot();
  const observers = [];
  const state = Object.freeze({ generation: 0 });
  const strategy = {
    kind: 'test',
    tryQuery: overrides.tryQuery ?? ((value) => success(plan(value))),
    tryMeasure: overrides.tryMeasure ?? ((value) => mutation(value)),
    tryMutate: (value) => mutation(value),
    tryScrollTarget: () => success({ x: 0, y: 0 }),
  };
  return {
    options: {
      root,
      state,
      strategy,
      environment: {
        requestFrame: (callback) => {
          root.frame = callback;
          return 1;
        },
        cancelFrame: () => {
          root.frame = null;
        },
        createResizeObserver: (callback) => {
          const observer = new FakeResizeObserver(callback);
          observers.push(observer);
          return observer;
        },
      },
    },
    itemObserver: () => observers[1],
  };
}

function plan(state) {
  return Object.freeze({
    generation: state.generation,
    contentSize: Object.freeze({ width: 100, height: 80 }),
    viewport: Object.freeze({ x: 0, y: 0, width: 100, height: 80 }),
    renderBounds: Object.freeze({ x: 0, y: 0, width: 100, height: 80 }),
    placements: Object.freeze([
      placementFor('old', 0),
      placementFor('new', 1),
    ]),
    anchor: null,
  });
}

function placementFor(id, index) {
  return Object.freeze({
    id,
    index,
    rect: Object.freeze({ x: 0, y: index * 40, width: 100, height: 40 }),
    visible: true,
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
  constructor(callback) {
    this.callback = callback;
  }
  observe(element) {
    this.observed.push(element);
  }
  unobserve(element) {
    this.unobserved.push(element);
  }
  disconnect() {}
  emit(entries) {
    this.callback(entries, this);
  }
}

class FakeElement {
  constructor(rect = { width: 100, height: 40 }) {
    this.rect = rect;
  }
  getBoundingClientRect() {
    return {
      x: 0,
      y: 0,
      top: 0,
      right: this.rect.width,
      bottom: this.rect.height,
      left: 0,
      width: this.rect.width,
      height: this.rect.height,
    };
  }
}

class FakeRoot extends FakeElement {
  clientWidth = 100;
  clientHeight = 80;
  scrollLeft = 0;
  scrollTop = 0;
  listeners = new Map();
  ownerDocument = { defaultView: null };
  frame = null;
  addEventListener(type, listener) {
    this.listeners.set(type, listener);
  }
  removeEventListener(type) {
    this.listeners.delete(type);
  }
  scrollTo({ left, top }) {
    this.scrollLeft = left;
    this.scrollTop = top;
  }
}
