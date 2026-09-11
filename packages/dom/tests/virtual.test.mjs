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

test('document scrollport projects restored fractional page scroll through its own realm', () => {
  let observedViewport;
  const fixture = createDocumentFixture({
    pageX: 10.5,
    pageY: 40.25,
    surfaceX: 30.75,
    surfaceY: 180.5,
    width: 240.5,
    height: 120.25,
    tryQuery: (state, input) => {
      observedViewport = input.viewport;
      return success(plan(state, input.viewport));
    },
  });
  const connection = createVirtualizer({
    ...fixture.options,
    viewportInsets: { top: 5.5, left: 2.25 },
  });

  assert.deepEqual(observedViewport, {
    x: -18,
    y: -134.75,
    width: 238.25,
    height: 114.75,
  });
  assert.equal(fixture.surface.geometryReads, 1);
  assert.equal(fixture.document.listenerCount('scroll'), 1);
  assert.equal(fixture.view.listenerCount('resize'), 1);
  assert.equal(fixture.document.listenerOptions.get('scroll')?.passive, true);
  assert.deepEqual(fixture.geometryObserver().observed, [fixture.surface]);
  connection.disconnect();
});

test('document scrollport normalizes transient negative viewport offsets without shifting the surface origin', () => {
  let observedViewport;
  const fixture = createDocumentFixture({
    pageX: -12.5,
    pageY: -20.25,
    surfaceX: 50,
    surfaceY: 100,
    tryQuery: (state, input) => {
      observedViewport = input.viewport;
      return success(plan(state, input.viewport));
    },
  });
  const connection = createVirtualizer(fixture.options);

  assert.deepEqual(observedViewport, {
    x: -50,
    y: -100,
    width: 100,
    height: 80,
  });
  assert.equal(fixture.surface.geometryReads, 1);
  connection.disconnect();
});

test('ordinary document scroll reuses the cached frame without geometry or range reads', () => {
  const counters = { query: 0, plan: 0 };
  const fixture = createDocumentFixture({
    pageY: 100,
    surfaceY: 100,
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

  fixture.setPageScroll(0, 140);
  fixture.document.dispatch('scroll');
  fixture.document.dispatch('scroll');
  assert.equal(fixture.pendingFrames(), 1);
  fixture.runFrame();

  assert.equal(fixture.surface.geometryReads, 0);
  assert.equal(fixture.scrollingElement.rangeReads, 0);
  assert.equal(fixture.view.writes.length, 0);
  assert.equal(counters.query, 1);
  assert.equal(counters.plan, 1);
  assert.equal(connection.getPlan().viewport.y, 40);
  connection.disconnect();
});

test('document viewport resize coalesces with page scroll and refreshes the surface frame once', () => {
  const counters = { query: 0, plan: 0 };
  const fixture = createDocumentFixture({
    pageY: 100,
    surfaceY: 100,
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

  fixture.document.documentElement.clientHeight = 64.5;
  fixture.setPageScroll(0, 120.25);
  fixture.view.dispatch('resize');
  fixture.document.dispatch('scroll');
  assert.equal(fixture.pendingFrames(), 1);
  fixture.runFrame();

  assert.equal(fixture.surface.geometryReads, 1);
  assert.equal(fixture.scrollingElement.rangeReads, 0);
  assert.equal(counters.query, 1);
  assert.equal(counters.plan, 1);
  assert.equal(connection.getPlan().viewport.height, 64.5);
  connection.disconnect();
});

test('document target scrolling delegates maximum clamping to the browser and reads settled page coordinates', () => {
  const fixture = createDocumentFixture({
    pageY: 100,
    surfaceY: 200,
    maximumY: 600,
    tryScrollTarget: () => success({ x: 0, y: 500 }),
  });
  const connection = createVirtualizer(fixture.options);
  fixture.resetEvidence();

  const result = connection.scrollTo('item', 'start');

  assert.equal(result.ok, true);
  assert.deepEqual(fixture.view.writes, [{ left: 0, top: 700, behavior: 'instant' }]);
  assert.equal(fixture.view.scrollY, 600);
  assert.deepEqual(result.value, { x: 0, y: 600 });
  assert.equal(connection.getPlan().viewport.y, 400);
  assert.equal(fixture.scrollingElement.rangeReads, 0);
  assert.equal(fixture.surface.geometryReads, 0);
  connection.disconnect();
});

test('document measurement correction and rejected settlement share one rollback coordinate owner', () => {
  let reject = false;
  const fixture = createDocumentFixture({
    pageY: 200,
    surfaceY: 200,
    placementIDs: ['item'],
    tryQuery: (state, input) => reject
      ? failure('virtual-layout-window-mismatch')
      : success(plan(state, input.viewport, ['item'])),
    tryMeasure: (state, batch) => {
      assert.deepEqual(batch.measurements, [5]);
      return mutation(Object.freeze({ generation: state.generation + 1 }), { x: 0, y: 5 });
    },
  });
  const connection = createVirtualizer({
    ...fixture.options,
    measure: ({ entry }) => entry.measurement,
  });
  const item = new FakeElement();
  item.ownerDocument = fixture.document;
  connection.registerItem(item, 'item');
  fixture.resetEvidence();

  fixture.itemObserver().emit([{ target: item, measurement: 5 }]);
  fixture.runFrame();
  assert.deepEqual(fixture.view.writes, [{ left: 0, top: 205, behavior: 'instant' }]);
  assert.equal(fixture.view.scrollY, 205);

  fixture.resetEvidence();
  reject = true;
  fixture.itemObserver().emit([{ target: item, measurement: 5 }]);
  fixture.runFrame();
  assert.deepEqual(fixture.view.writes, [
    { left: 0, top: 210, behavior: 'instant' },
    { left: 0, top: 205, behavior: 'instant' },
  ]);
  assert.equal(fixture.view.scrollY, 205);
  assert.equal(connection.getState().generation, 1);
  connection.disconnect();
});

test('document refresh remeasures external page-flow movement without scroll polling', () => {
  const fixture = createDocumentFixture({ pageY: 0, surfaceY: 300 });
  const connection = createVirtualizer(fixture.options);
  assert.equal(connection.getPlan().anchor, null);
  fixture.resetEvidence();

  fixture.surface.pageY = 350.5;
  connection.refresh();
  fixture.runFrame();

  assert.equal(fixture.surface.geometryReads, 1);
  assert.equal(connection.getPlan().viewport.y, -350.5);
  assert.equal(fixture.view.writes.length, 0);
  connection.disconnect();
});

test('document host rejects unusable and cross-document owners before retaining resources', () => {
  const missingView = createDocumentFixture();
  missingView.document.defaultView = null;
  assert.throws(() => createVirtualizer(missingView.options), /browser view and scrolling element/u);
  assert.equal(missingView.observerCount(), 0);
  assert.equal(missingView.document.listenerCount('scroll'), 0);

  const missingScroller = createDocumentFixture();
  missingScroller.document.scrollingElement = null;
  assert.throws(() => createVirtualizer(missingScroller.options), /browser view and scrolling element/u);
  assert.equal(missingScroller.observerCount(), 0);

  const crossDocument = createDocumentFixture();
  crossDocument.surface.ownerDocument = new FakeDocument();
  assert.throws(() => createVirtualizer(crossDocument.options), /scrollport document/u);
  assert.equal(crossDocument.observerCount(), 0);

  const collapsed = createDocumentFixture();
  collapsed.options.surface = collapsed.document.documentElement;
  assert.throws(() => createVirtualizer(collapsed.options), /distinct physical owners/u);
  assert.equal(collapsed.observerCount(), 0);
});

test('document disconnect removes host listeners and makes queued callbacks inert', () => {
  const counters = { query: 0, plan: 0 };
  const fixture = createDocumentFixture({
    tryQuery: (state, input) => {
      counters.query += 1;
      return success(plan(state, input.viewport));
    },
  });
  const connection = createVirtualizer({
    ...fixture.options,
    onPlanChange: () => { counters.plan += 1; },
  });
  const staleFrame = fixture.peekFrame();
  fixture.document.dispatch('scroll');
  const queued = fixture.peekFrame();
  fixture.resetEvidence();
  counters.query = 0;
  counters.plan = 0;

  connection.disconnect();
  connection.disconnect();
  staleFrame?.(0);
  queued?.(0);
  fixture.document.dispatch('scroll');
  fixture.view.dispatch('resize');

  assert.equal(fixture.document.listenerCount('scroll'), 0);
  assert.equal(fixture.view.listenerCount('resize'), 0);
  assert.equal(fixture.geometryObserver().disconnected, true);
  assert.equal(fixture.itemObserver().disconnected, true);
  assert.equal(fixture.pendingFrames(), 0);
  assert.deepEqual(counters, { query: 0, plan: 0 });
});

test('same-document document hosts scale with one constant listener pair per connection', () => {
  for (const count of [1, 8, 32]) {
    const shared = createDocumentHostSharedFixture();
    const connections = [];
    let queries = 0;
    for (let index = 0; index < count; index += 1) {
      const surface = shared.surface(100 + index * 600);
      connections.push(createVirtualizer({
        scrollport: shared.document,
        surface,
        state: Object.freeze({ generation: 0 }),
        strategy: Object.freeze({
          kind: 'test',
          tryQuery: (state, input) => {
            queries += 1;
            return success(plan(state, input.viewport));
          },
          tryMeasure: (state) => mutation(state),
          tryMutate: (state) => mutation(state),
          tryScrollTarget: () => success({ x: 0, y: 0 }),
        }),
        environment: shared.environment,
      }));
    }
    queries = 0;
    shared.document.dispatch('scroll');
    shared.document.dispatch('scroll');
    assert.equal(shared.document.listenerCount('scroll'), count);
    assert.equal(shared.view.listenerCount('resize'), count);
    assert.equal(shared.pendingFrames(), count);
    shared.runFrames();
    assert.equal(queries, count);
    for (const connection of connections) connection.disconnect();
    assert.equal(shared.document.listenerCount('scroll'), 0);
    assert.equal(shared.view.listenerCount('resize'), 0);
    assert.equal(shared.pendingFrames(), 0);
  }
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

for (const [operation, target, stateChanged] of [
  ['mutate', { x: 35, y: 140 }, true],
  ['measure', { x: 15, y: 120 }, true],
  ['setState', { x: 10, y: 130 }, true],
  ['setOverscan', { x: 15, y: 120 }, true],
  ['setViewportInsets', { x: 10, y: 90 }, false],
  ['flush', { x: 15, y: 120 }, true],
  ['scheduled measurement', { x: 15, y: 120 }, true],
  ['scheduled geometry', { x: 10, y: 130 }, false],
  ['scrollTo', { x: 35, y: 140 }, false],
]) {
  test(`virtual ${operation} restores rejected scroll settlement before reporting and can retry`, () => {
    const rejected = failure('virtual-layout-window-mismatch');
    const nextState = Object.freeze({ generation: 1 });
    let reject = false;
    let queries = 0;
    const fixture = createFixture({
      originY: 100, scrollLeft: 10, scrollTop: 110,
      tryQuery: (state, input) => {
        queries += 1;
        return reject ? rejected : success(plan(state, input.viewport));
      },
      tryMutate: () => mutation(nextState, { x: 25, y: 30 }),
      tryMeasure: (_state, batch) => {
        assert.deepEqual(batch.measurements, [5]);
        return mutation(nextState, { x: 5, y: 10 });
      },
      tryScrollTarget: () => success({ x: 35, y: 40 }),
    });
    const trace = [];
    const connection = createVirtualizer({
      ...fixture.options,
      measure: ({ entry }) => entry.measurement,
      onStateChange: () => trace.push('state'),
      onPlanChange: () => trace.push('plan'),
      onError: (error) => {
        assert.equal(error, rejected.error);
        assert.equal(connection.getState(), beforeState);
        assert.equal(connection.getPlan(), beforePlan);
        assert.deepEqual([fixture.scrollport.scrollLeft, fixture.scrollport.scrollTop], [10, 110]);
        trace.push('error');
      },
    });
    const beforeState = connection.getState();
    const beforePlan = connection.getPlan();
    const item = new FakeElement();
    connection.registerItem(item, 'item');
    const queueMeasurement = () => fixture.itemObserver().emit([{ target: item, measurement: 5 }]);
    const actions = {
      mutate: () => connection.mutate({ type: 'change' }),
      measure: () => connection.measure([5]),
      setState: () => {
        fixture.surface.originY = 120;
        connection.refresh();
        return connection.setState(nextState);
      },
      setOverscan: () => { queueMeasurement(); return connection.setOverscan(10); },
      setViewportInsets: () => connection.setViewportInsets({ top: 20 }),
      flush: () => { queueMeasurement(); return connection.flush(); },
      'scheduled measurement': () => { queueMeasurement(); fixture.runFrame(); },
      'scheduled geometry': () => {
        fixture.surface.originY = 120;
        fixture.geometryObserver().emit([{ target: fixture.surface }]);
        fixture.runFrame();
      },
      scrollTo: () => connection.scrollTo('item', 'start'),
    };

    reject = true;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      trace.length = 0;
      queries = 0;
      fixture.resetEvidence();
      const result = actions[operation]();
      if (!operation.startsWith('scheduled')) {
        assert.equal(result.ok, false);
        assert.equal(result.error, rejected.error);
      }
      assert.equal(connection.getState(), beforeState);
      assert.equal(connection.getPlan(), beforePlan);
      assert.deepEqual(fixture.scrollport.writes, [target, { x: 10, y: 110 }]);
      assert.deepEqual(trace, ['error']);
      assert.equal(queries, 1);
      assert.equal(fixture.pendingFrames(), 0);
    }

    reject = false;
    trace.length = 0;
    queries = 0;
    fixture.resetEvidence();
    const accepted = actions[operation]();
    if (!operation.startsWith('scheduled')) assert.equal(accepted.ok, true);
    assert.deepEqual(fixture.scrollport.writes, [target]);
    assert.deepEqual([fixture.scrollport.scrollLeft, fixture.scrollport.scrollTop], [target.x, target.y]);
    assert.equal(connection.getState(), stateChanged ? nextState : beforeState);
    assert.notEqual(connection.getPlan(), beforePlan);
    assert.equal(connection.getPlan().generation, stateChanged ? 1 : 0);
    assert.deepEqual(trace, stateChanged ? ['state', 'plan'] : ['plan']);
    assert.equal(queries, 1);
    connection.disconnect();
    assert.equal(fixture.pendingFrames(), 0);
    assert.equal(fixture.scrollport.listeners.size, 0);
    assert.deepEqual(fixture.geometryObserver().observed, []);
    assert.deepEqual(fixture.itemObserver().observed, []);
  });
}

for (const phase of ['query rejection', 'invalid viewport', 'query throw', 'reader throw', 'writer throw']) {
  test(`virtual scroll rollback uses custom coordinates after ${phase}, even when onError throws`, () => {
    for (const operation of ['mutate', 'scrollTo']) {
      let broken = false;
      const original = new Error(phase);
      const errorCallback = new Error('onError failed');
      const writes = [];
      const reported = [];
      const fixture = createFixture({
        originY: 100, scrollLeft: -10, scrollTop: 110,
        scrollWidth: 45, clientWidth: 20,
        tryQuery: (state, input) => {
          if (broken && phase === 'query throw') throw original;
          if (broken && phase === 'query rejection') return failure('virtual-layout-window-mismatch');
          return success(plan(state, input.viewport));
        },
        tryMutate: () => mutation(Object.freeze({ generation: 1 }), { x: 25, y: 30 }),
        tryScrollTarget: () => success({ x: 35, y: 40 }),
      });
      // Reuse one viewport object to exercise snapshot isolation at the host boundary.
      const viewport = {};
      const connection = createVirtualizer({
        ...fixture.options,
        readViewport: (scrollport) => {
          if (broken && scrollport.scrollLeft !== -10 && phase === 'reader throw') throw original;
          return Object.assign(viewport, {
            x: -scrollport.scrollLeft, y: scrollport.scrollTop,
            width: broken && scrollport.scrollLeft !== -10 && phase === 'invalid viewport' ? -1 : 20,
            height: 80,
          });
        },
        writeScroll: (scrollport, point) => {
          writes.push({ ...point });
          // Model normalized RTL coordinates and host-side scroll snapping.
          scrollport.scrollTo({ left: -Math.floor(point.x / 10) * 10, top: point.y });
          if (broken && point.x !== 10 && phase === 'writer throw') throw original;
        },
        onError: (error) => {
          reported.push(error.code);
          assert.deepEqual([fixture.scrollport.scrollLeft, fixture.scrollport.scrollTop], [-10, 110]);
          assert.equal(connection.getPlan(), beforePlan);
          assert.equal(connection.getState(), beforeState);
          throw errorCallback;
        },
      });
      const beforePlan = connection.getPlan();
      const beforeState = connection.getState();
      const run = () => operation === 'mutate'
        ? connection.mutate({ type: 'change' }) : connection.scrollTo('item');
      broken = true;
      const reportedFailure = phase === 'query rejection' || phase === 'invalid viewport';
      assert.throws(run, (error) => error === (reportedFailure ? errorCallback : original));
      assert.deepEqual(writes, [{ x: 25, y: 140 }, { x: 10, y: 110 }]);
      assert.deepEqual([fixture.scrollport.scrollLeft, fixture.scrollport.scrollTop], [-10, 110]);
      assert.equal(connection.getPlan(), beforePlan);
      assert.equal(connection.getState(), beforeState);
      assert.deepEqual(reported, reportedFailure
        ? [phase === 'query rejection' ? 'virtual-layout-window-mismatch' : 'virtual-layout-geometry-invalid']
        : []);

      broken = false;
      writes.length = 0;
      assert.equal(run().ok, true);
      assert.deepEqual(writes, [{ x: 25, y: 140 }]);
      assert.deepEqual(connection.getPlan().viewport, { x: 20, y: 40, width: 20, height: 80 });
      connection.disconnect();
    }
  });
}

test('accepted virtual scroll settlement stays committed when plan publication throws', () => {
  let failPublication = false;
  const error = new Error('plan callback failed');
  const nextState = Object.freeze({ generation: 1 });
  const fixture = createFixture({
    tryMutate: () => mutation(nextState, { x: 25, y: 30 }),
  });
  const connection = createVirtualizer({
    ...fixture.options,
    onPlanChange: () => { if (failPublication) throw error; },
  });
  failPublication = true;
  assert.throws(() => connection.mutate({ type: 'change' }), (thrown) => thrown === error);
  assert.equal(connection.getState(), nextState);
  assert.deepEqual(fixture.scrollport.writes, [{ x: 25, y: 30 }]);
  assert.deepEqual(connection.getPlan().viewport, { x: 25, y: 30, width: 100, height: 80 });
  connection.disconnect();
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

function createDocumentFixture(options = {}) {
  const document = new FakeDocument({
    width: options.width ?? 100,
    height: options.height ?? 80,
    pageX: options.pageX ?? 0,
    pageY: options.pageY ?? 0,
    maximumX: options.maximumX ?? 1_000,
    maximumY: options.maximumY ?? 1_000,
  });
  const surface = new FakeDocumentSurface(document, {
    x: options.surfaceX ?? 0,
    y: options.surfaceY ?? 0,
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
  const environment = {
    requestFrame: (callback) => {
      const id = ++nextFrame;
      frames.set(id, callback);
      return id;
    },
    cancelFrame: (id) => {
      frames.delete(id);
    },
    createResizeObserver: (callback) => {
      const observer = new FakeResizeObserver(callback);
      observers.push(observer);
      return observer;
    },
  };
  return {
    document,
    view: document.defaultView,
    scrollingElement: document.scrollingElement,
    surface,
    options: { scrollport: document, surface, state, strategy, environment },
    geometryObserver: () => observers[0],
    itemObserver: () => observers[1],
    observerCount: () => observers.length,
    pendingFrames: () => frames.size,
    peekFrame: () => frames.values().next().value ?? null,
    runFrame: () => {
      const first = frames.entries().next().value;
      assert.notEqual(first, undefined, 'expected a scheduled frame');
      const [id, callback] = first;
      frames.delete(id);
      callback(0);
    },
    setPageScroll: (x, y) => {
      document.defaultView.scrollX = x;
      document.defaultView.scrollY = y;
      document.scrollingElement.scrollLeft = x;
      document.scrollingElement.scrollTop = y;
    },
    resetEvidence: () => {
      surface.geometryReads = 0;
      document.defaultView.writes.length = 0;
      document.scrollingElement.rangeReads = 0;
    },
  };
}

function createDocumentHostSharedFixture() {
  const document = new FakeDocument({ width: 100, height: 80, maximumY: 100_000 });
  const observers = [];
  const frames = new Map();
  let nextFrame = 0;
  return {
    document,
    view: document.defaultView,
    surface: (pageY) => new FakeDocumentSurface(document, {
      x: 0, y: pageY, width: 100, height: 500,
    }),
    environment: {
      requestFrame: (callback) => {
        const id = ++nextFrame;
        frames.set(id, callback);
        return id;
      },
      cancelFrame: (id) => { frames.delete(id); },
      createResizeObserver: (callback) => {
        const observer = new FakeResizeObserver(callback);
        observers.push(observer);
        return observer;
      },
    },
    pendingFrames: () => frames.size,
    runFrames: () => {
      const pending = [...frames.values()];
      frames.clear();
      for (const callback of pending) callback(0);
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

class FakeEventSource {
  listeners = new Map();
  listenerOptions = new Map();

  addEventListener(type, listener, options) {
    let listeners = this.listeners.get(type);
    if (listeners === undefined) {
      listeners = new Set();
      this.listeners.set(type, listeners);
    }
    listeners.add(listener);
    this.listenerOptions.set(type, options);
  }

  removeEventListener(type, listener) {
    const listeners = this.listeners.get(type);
    listeners?.delete(listener);
    if (listeners?.size === 0) this.listeners.delete(type);
    if (!this.listeners.has(type)) this.listenerOptions.delete(type);
  }

  listenerCount(type) {
    return this.listeners.get(type)?.size ?? 0;
  }

  dispatch(type) {
    for (const listener of [...(this.listeners.get(type) ?? [])]) listener();
  }
}

class FakeScrollingElement {
  rangeReads = 0;
  scrollLeft = 0;
  scrollTop = 0;

  constructor(maximumX, maximumY, width, height) {
    this.maximumX = maximumX;
    this.maximumY = maximumY;
    this.width = width;
    this.height = height;
  }

  get scrollWidth() {
    this.rangeReads += 1;
    return this.maximumX + this.width;
  }

  get scrollHeight() {
    this.rangeReads += 1;
    return this.maximumY + this.height;
  }
}

class FakeWindow extends FakeEventSource {
  writes = [];
  scrollX = 0;
  scrollY = 0;

  constructor(scrollingElement, options) {
    super();
    this.scrollingElement = scrollingElement;
    this.innerWidth = options.width;
    this.innerHeight = options.height;
    this.maximumX = options.maximumX;
    this.maximumY = options.maximumY;
    this.scrollX = options.pageX;
    this.scrollY = options.pageY;
    scrollingElement.scrollLeft = options.pageX;
    scrollingElement.scrollTop = options.pageY;
  }

  scrollTo({ left = this.scrollX, top = this.scrollY, behavior }) {
    this.writes.push({ left, top, behavior });
    this.scrollX = Math.min(Math.max(0, left), this.maximumX);
    this.scrollY = Math.min(Math.max(0, top), this.maximumY);
    this.scrollingElement.scrollLeft = this.scrollX;
    this.scrollingElement.scrollTop = this.scrollY;
  }
}

class FakeDocument extends FakeEventSource {
  nodeType = 9;

  constructor(options = {}) {
    super();
    const width = options.width ?? 100;
    const height = options.height ?? 80;
    const maximumX = options.maximumX ?? 1_000;
    const maximumY = options.maximumY ?? 1_000;
    this.documentElement = { clientWidth: width, clientHeight: height };
    this.body = {};
    this.scrollingElement = new FakeScrollingElement(maximumX, maximumY, width, height);
    this.defaultView = new FakeWindow(this.scrollingElement, {
      width,
      height,
      maximumX,
      maximumY,
      pageX: options.pageX ?? 0,
      pageY: options.pageY ?? 0,
    });
  }
}

class FakeDocumentSurface {
  geometryReads = 0;

  constructor(document, rect) {
    this.ownerDocument = document;
    this.pageX = rect.x;
    this.pageY = rect.y;
    this.rect = { width: rect.width, height: rect.height };
  }

  getBoundingClientRect() {
    this.geometryReads += 1;
    return domRect(
      this.pageX - this.ownerDocument.defaultView.scrollX,
      this.pageY - this.ownerDocument.defaultView.scrollY,
      this.rect.width,
      this.rect.height,
    );
  }
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
