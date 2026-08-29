import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createCollectionComponentController,
  createControlledComponentController,
  createFacadeConnection,
  createSemanticController,
} from '../../.verification-dist/adapter-runtime.js';

test('semantic controller supports opaque state without serialization', () => {
  const initial = Object.freeze({ count: 1n, metadata: new Map([['source', 'test']]) });
  const constructed = createSemanticController({
    initial: { ok: true, value: initial },
    reducer: (state, event) => ({
      ok: true,
      value: Object.freeze({
        state: Object.freeze({ count: state.count + event, metadata: state.metadata }),
        commands: Object.freeze([{ type: 'changed', count: state.count + event }]),
      }),
    }),
    reconcile: (_previous, proposed) => ({ ok: true, value: proposed }),
    toEffect: (command) => command,
  });

  assert.equal(constructed.ok, true);
  const result = constructed.value.handle(2n);
  assert.equal(result.ok, true);
  assert.equal(result.snapshot.state.count, 3n);
  assert.equal(result.snapshot.state.metadata, initial.metadata);
  assert.deepEqual(result.commands, [{ type: 'changed', count: 3n }]);
});

test('controlled component controller preserves external ownership and callback ordering', () => {
  const changes = [];
  const controller = createControlledComponentController({
    controlled: true,
    initial: { ok: true, value: Object.freeze({ value: 1, draft: 1 }) },
    reducer: (state, amount) => ({
      ok: true,
      value: { state: Object.freeze({ value: state.value + amount, draft: state.draft + amount }), commands: [{ type: 'change', value: state.value + amount }] },
    }),
    create: (value, reference) => ({ ok: true, value: Object.freeze({ value, draft: reference.draft }) }),
    read: (state) => state.value,
    onChange: (value, previous) => changes.push([previous, value]),
  });
  assert.equal(controller.ok, true);

  const proposed = controller.value.handle(2);
  assert.equal(proposed.ok, true);
  assert.deepEqual(proposed.snapshot.state, { value: 1, draft: 3 });
  assert.deepEqual(changes, [[1, 3]]);
  const synchronized = controller.value.syncControlledValue(3);
  assert.equal(synchronized.ok, true);
  assert.deepEqual(synchronized.value.state, { value: 3, draft: 3 });

  const uncontrolled = createControlledComponentController({
    controlled: false,
    initial: { ok: true, value: 0 },
    reducer: (state, amount) => ({ ok: true, value: { state: state + amount, commands: [] } }),
    create: (value) => ({ ok: true, value }),
    read: (state) => state,
  });
  assert.equal(uncontrolled.ok, true);
  assert.equal(uncontrolled.value.syncControlledValue(1).error.code, 'uncontrolled-controller-sync');
});

test('collection component controller replaces one domain generation and retains equal owners', () => {
  const first = Object.freeze({ ids: Object.freeze(['a', 'b']) });
  const second = Object.freeze({ ids: Object.freeze(['b', 'c']) });
  const notifications = [];
  const controller = createCollectionComponentController({
    domain: first,
    initial: (domain) => ({ ok: true, value: Object.freeze({ current: domain.ids[0] ?? null }) }),
    reducer: (_domain, state, event) => ({ ok: true, value: { state: Object.freeze({ current: event }), commands: [] } }),
    reconcile: (domain, _previous, proposed) => ({
      ok: true,
      value: Object.freeze({ current: domain.ids.includes(proposed.current) ? proposed.current : domain.ids[0] ?? null }),
    }),
    replaceDomain: (domain, previous) => ({
      ok: true,
      value: Object.freeze({ current: domain.ids.includes(previous.current) ? previous.current : domain.ids[0] ?? null }),
    }),
    notify: (previous, next) => notifications.push([previous.current, next.current]),
  });
  assert.equal(controller.ok, true);
  const initial = controller.value.getSnapshot();
  assert.equal(controller.value.replaceDomain(first).value, initial);
  const replaced = controller.value.replaceDomain(second);
  assert.equal(replaced.ok, true);
  assert.equal(replaced.value.revision, 1);
  assert.equal(replaced.value.state.current, 'b');
  assert.deepEqual(notifications, [['a', 'b']]);
});

test('semantic controller keeps its snapshot when reconciliation rejects', () => {
  const constructed = createSemanticController({
    initial: { ok: true, value: 1 },
    reducer: (state, event) => ({
      ok: true,
      value: { state: state + event, commands: [{ type: 'changed' }] },
    }),
    reconcile: () => ({
      ok: false,
      error: {
        class: 'transition-rejection',
        code: 'rejected-test-state',
        message: 'The proposed test state is rejected.',
      },
    }),
    toEffect: (command) => command,
  });

  assert.equal(constructed.ok, true);
  const previous = constructed.value.getSnapshot();
  const result = constructed.value.handle(1);
  assert.equal(result.ok, false);
  assert.equal(result.error.code, 'rejected-test-state');
  assert.equal(result.snapshot, previous);
  assert.equal(constructed.value.getSnapshot(), previous);
  assert.deepEqual(result.commands, []);
});

test('semantic controller commits before notification and preserves nested revisions', () => {
  let controlled;
  controlled = createSemanticController({
    initial: { ok: true, value: false },
    reducer: (state) => ({
      ok: true,
      value: { state: !state, commands: [] },
    }),
    reconcile: (previous) => ({ ok: true, value: previous }),
    notify: (_previous, proposed) => {
      const synchronized = controlled.value.replace({ ok: true, value: proposed });
      assert.equal(synchronized.ok, true);
    },
    toEffect: (command) => command,
  });
  assert.equal(controlled.ok, true);

  const controlledResult = controlled.value.handle('toggle');
  assert.equal(controlledResult.ok, true);
  assert.equal(controlledResult.snapshot.state, false);
  assert.equal(controlled.value.getSnapshot().state, true);
  assert.equal(controlled.value.getSnapshot().revision, 2);

  let nested = false;
  let uncontrolled;
  uncontrolled = createSemanticController({
    initial: { ok: true, value: 0 },
    reducer: (state, amount) => ({
      ok: true,
      value: { state: state + amount, commands: [] },
    }),
    notify: () => {
      if (nested) return;
      nested = true;
      const result = uncontrolled.value.handle(1);
      assert.equal(result.ok, true);
    },
    toEffect: (command) => command,
  });
  assert.equal(uncontrolled.ok, true);

  const outer = uncontrolled.value.handle(1);
  assert.equal(outer.ok, true);
  assert.equal(outer.snapshot.state, 1);
  assert.equal(uncontrolled.value.getSnapshot().state, 2);
  assert.equal(uncontrolled.value.getSnapshot().revision, 2);
});

test('semantic controller retains its committed snapshot when notification throws', () => {
  const constructed = createSemanticController({
    initial: { ok: true, value: 0 },
    reducer: (state) => ({ ok: true, value: { state: state + 1, commands: [] } }),
    notify: () => { throw new Error('observer failed'); },
    toEffect: (command) => command,
  });
  assert.equal(constructed.ok, true);

  assert.throws(() => constructed.value.handle('increment'), /observer failed/);
  assert.equal(constructed.value.getSnapshot().state, 1);
  assert.equal(constructed.value.getSnapshot().revision, 1);
});

test('facade connection exposes live state, subscriptions, and idempotent destruction', () => {
  let state = 0;
  let onUpdate = () => undefined;
  let disconnects = 0;
  const constructed = createFacadeConnection(
    {},
    (options) => {
      onUpdate = options.onUpdate;
      return {
        ok: true,
        value: {
          getSnapshot: () => ({ state }),
          handleEvent: (value) => {
            state = value;
            onUpdate();
            return true;
          },
          disconnect: () => { disconnects += 1; },
        },
      };
    },
  );

  assert.equal(constructed.ok, true);
  const snapshots = [];
  constructed.value.subscribe((snapshot) => snapshots.push(snapshot.state));
  assert.equal(constructed.value.send(3), true);
  assert.equal(constructed.value.state, 3);
  assert.deepEqual(snapshots, [3]);
  constructed.value.destroy();
  constructed.value.destroy();
  assert.equal(constructed.value.send(4), false);
  assert.equal(disconnects, 1);
});

test('facade connection retains stable method wrappers across repeated property reads', () => {
  const constructed = createFacadeConnection({}, () => ({
    ok: true,
    value: {
      getSnapshot: () => ({ state: 0 }),
      handleEvent: () => true,
      updateValue: () => ({ ok: true, value: 1 }),
      disconnect: () => undefined,
    },
  }));
  assert.equal(constructed.ok, true);

  assert.equal(constructed.value.send, constructed.value.send);
  assert.equal(constructed.value.update, constructed.value.update);
  assert.equal(constructed.value.handleEvent, constructed.value.handleEvent);
  assert.equal(constructed.value.updateValue, constructed.value.updateValue);
  constructed.value.destroy();
});

test('destroyed facade connections reject every mutation path and new subscription', () => {
  let state = 0;
  let onUpdate = () => undefined;
  let updates = 0;
  const constructed = createFacadeConnection(
    { onUpdate: () => { updates += 1; } },
    (options) => {
      onUpdate = options.onUpdate;
      return {
        ok: true,
        value: {
          getSnapshot: () => ({ state }),
          handleEvent: (value) => { state = value; onUpdate(); return true; },
          syncControlledValue: (value) => {
            state = value;
            onUpdate();
            return { ok: true, value: { state } };
          },
          refresh: () => { state += 100; onUpdate(); },
          disconnect: () => undefined,
        },
      };
    },
  );
  assert.equal(constructed.ok, true);
  const directHandle = constructed.value.handleEvent;
  const snapshots = [];

  constructed.value.destroy();
  constructed.value.subscribe((snapshot) => snapshots.push(snapshot.state));
  assert.equal(constructed.value.send(1), false);
  assert.equal(directHandle(2), false);
  assert.equal(constructed.value.handleEvent(3), false);
  assert.equal(constructed.value.syncControlledValue(4).error.code, 'connection-destroyed');
  assert.equal(constructed.value.update(5).error.code, 'connection-destroyed');
  constructed.value.refresh();

  assert.equal(constructed.value.state, 0);
  assert.equal(constructed.value.getSnapshot().state, 0);
  assert.deepEqual(snapshots, []);
  assert.equal(updates, 0);
});
