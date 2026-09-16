import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createCollectionComponentController,
  createControlledComponentController,
  createFacadeConnection,
  createHostAdapter,
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

test('controlled component controller drains committed effects before change callbacks', () => {
  for (const controlled of [false, true]) {
    const trace = [];
    const first = new Error('first effect failed');
    const controller = createControlledComponentController({
      controlled,
      initial: { ok: true, value: 0 },
      reducer: (state, amount) => ({
        ok: true, value: { state: state + amount, commands: [{ id: 1 }, { id: 2 }] },
      }),
      create: (value) => ({ ok: true, value }),
      read: (state) => state,
      publishEffect: (command) => {
        trace.push(`effect:${command.id}`);
        assert.equal(controller.value.getSnapshot().revision, 1);
        assert.equal(controller.value.getSnapshot().state, controlled ? 0 : 1);
        throw command.id === 1 ? first : new Error('later effect failed');
      },
      onChange: (value, previous) => {
        trace.push(['change', previous, value]);
        throw new Error('later change failed');
      },
    });
    assert.equal(controller.ok, true);
    assert.throws(() => controller.value.handle(1), (error) => error === first);
    assert.deepEqual(trace, ['effect:1', 'effect:2', ['change', 0, 1]]);
    const committed = controller.value.getSnapshot();
    trace.length = 0;
    assert.equal(controller.value.handle(1, 0).ok, false);
    assert.equal(controller.value.getSnapshot(), committed);
    assert.deepEqual(trace, []);
  }
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
  let notifications = 0;
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
    notify: () => { notifications += 1; },
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
  assert.equal(notifications, 0);
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

test('semantic controller drains notifier cohorts after host effects and preserves the first error', () => {
  const first = new Error('first host effect failed');
  const later = new Error('first application notifier failed');
  const latest = new Error('later application notifier failed');
  const trace = [];
  const constructed = createSemanticController({
    initial: { ok: true, value: 0 },
    reducer: (state) => ({
      ok: true,
      value: { state: state + 1, commands: [{ id: 1 }, { id: 2 }] },
    }),
    toEffect: (command) => ({ ...command, type: 'host-effect' }),
    publishEffect: (effect) => {
      trace.push(`effect:${effect.id}`);
      if (effect.id === 1) throw first;
    },
    notify: [
      (previous, proposed) => { trace.push(`notify:first:${previous}->${proposed}`); throw later; },
      (previous, proposed) => { trace.push(`notify:second:${previous}->${proposed}`); throw latest; },
    ],
    complete: (effects, previous, proposed) => {
      trace.push(`complete:${effects.length}:${previous}->${proposed}`);
      throw new Error('completion failed');
    },
  });
  assert.equal(constructed.ok, true);

  assert.throws(() => constructed.value.handle('increment'), (error) => error === first);
  assert.equal(constructed.value.getSnapshot().state, 1);
  assert.deepEqual(trace, [
    'effect:1',
    'effect:2',
    'notify:first:0->1',
    'notify:second:0->1',
    'complete:2:0->1',
  ]);
});

test('semantic controller notifier cohorts keep the outer proposal stable under reentrancy', () => {
  const trace = [];
  let controller;
  controller = createSemanticController({
    initial: { ok: true, value: 0 },
    reducer: (state, amount) => ({
      ok: true,
      value: { state: state + amount, commands: [] },
    }),
    notify: [
      (previous, proposed) => {
        trace.push(['first', previous, proposed]);
        const synchronized = controller.value.replace({ ok: true, value: 99 });
        assert.equal(synchronized.ok, true);
      },
      (previous, proposed) => {
        trace.push(['second', previous, proposed, controller.value.getSnapshot().state]);
      },
    ],
    toEffect: (command) => command,
  });
  assert.equal(controller.ok, true);

  const outer = controller.value.handle(1);
  assert.equal(outer.ok, true);
  assert.equal(outer.snapshot.state, 1);
  assert.equal(controller.value.getSnapshot().state, 99);
  assert.equal(controller.value.getSnapshot().revision, 2);
  assert.deepEqual(trace, [
    ['first', 0, 1],
    ['second', 0, 1, 99],
  ]);

  trace.length = 0;
  const stale = controller.value.handle(1, 0);
  assert.equal(stale.ok, false);
  assert.deepEqual(trace, []);
});

test('host adapter forwards its stable effect publisher before application notify', () => {
  const trace = [];
  const constructed = createHostAdapter({
    initial: { ok: true, value: 0 },
    decode: (input) => input,
    reducer: (state, amount) => ({
      ok: true,
      value: { state: state + amount, commands: [{ amount }] },
    }),
    project: (command) => ({ type: 'apply', amount: command.amount }),
    publishEffect: (effect) => trace.push(`${effect.type}:${effect.amount}`),
    notify: () => trace.push('notify'),
  });
  assert.equal(constructed.ok, true);

  const result = constructed.value.handleInput(2);
  assert.equal(result.snapshot.state, 2);
  assert.deepEqual(trace, ['apply:2', 'notify']);
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

test('ISSUE-176: nested facade publication supersedes stale outer completion', () => {
  let state = 'a';
  let revision = 0;
  let onUpdate = () => undefined;
  const trace = [];
  const nestedError = new Error('nested subscriber failed');
  const constructed = createFacadeConnection(
    { onUpdate: () => trace.push(`update:${revision}:${state}`) },
    (options) => {
      onUpdate = options.onUpdate;
      return {
        ok: true,
        value: {
          getSnapshot: () => ({ state, revision }),
          handleEvent: (next) => {
            state = next;
            revision += 1;
            onUpdate();
            return true;
          },
        },
      };
    },
  );
  assert.equal(constructed.ok, true);
  const facade = constructed.value;
  let nested = false;
  facade.subscribe((snapshot) => {
    trace.push(`first:${snapshot.revision}:${snapshot.state}`);
    if (!nested && snapshot.revision === 1) {
      nested = true;
      facade.send('c');
    }
  });
  facade.subscribe((snapshot) => {
    trace.push(`second:${snapshot.revision}:${snapshot.state}`);
    if (snapshot.revision === 2) throw nestedError;
  });
  facade.subscribe((snapshot) => trace.push(`third:${snapshot.revision}:${snapshot.state}`));

  assert.throws(() => facade.send('b'), (error) => error === nestedError);
  assert.deepEqual(trace, [
    'first:1:b',
    'first:2:c',
    'second:2:c',
    'third:2:c',
    'update:2:c',
  ]);
  assert.deepEqual(facade.getSnapshot(), { state: 'c', revision: 2 });
});

for (const phase of ['disconnect call', 'disconnect lookup']) {
  test(`facade destruction stays inactive and one-shot after a throwing ${phase}`, () => {
    for (const failure of [new Error('disconnect failed'), undefined, null]) {
      let reads = 0;
      let disconnects = 0;
      let mutations = 0;
      let notifications = 0;
      let notify;
      const snapshot = { state: 0 };
      const constructed = createFacadeConnection({ onUpdate: () => { notifications += 1; } }, (options) => {
        notify = options.onUpdate;
        const target = {
          getSnapshot: () => snapshot,
          handleEvent: () => { mutations += 1; return true; },
          syncControlledValue: () => { mutations += 1; return { ok: true, value: snapshot }; },
          refresh: () => { mutations += 1; },
          get disconnect() {
            reads += 1;
            // Reentrant teardown and stale publication are inert from the outset.
            facade.destroy();
            notify();
            facade.subscribe(() => { notifications += 1; });
            assert.equal(facade.send(1), false);
            if (phase === 'disconnect lookup') throw failure;
            return function () {
              assert.equal(this, target);
              disconnects += 1;
              throw failure;
            };
          },
        };
        return { ok: true, value: target };
      });
      assert.equal(constructed.ok, true);
      const facade = constructed.value;
      const unsubscribe = facade.subscribe(() => { notifications += 1; });
      const handle = facade.handleEvent;

      assert.throws(() => facade.destroy(), (error) => Object.is(error, failure));
      facade.destroy();
      unsubscribe();
      unsubscribe();
      notify();
      assert.equal(facade.send(1), false);
      assert.equal(handle(1), false);
      assert.equal(facade.update(1).error.code, 'connection-destroyed');
      assert.equal(facade.syncControlledValue(1).error.code, 'connection-destroyed');
      facade.refresh();
      assert.equal(facade.getSnapshot(), snapshot);
      assert.equal(reads, 1);
      assert.equal(disconnects, phase === 'disconnect call' ? 1 : 0);
      assert.equal(mutations, 0);
      assert.equal(notifications, 0);
    }
  });
}

test('facade connection completes subscribers before application update and preserves the first error', () => {
  let state = 0;
  let onUpdate = () => undefined;
  const first = new Error('first subscriber failed');
  const later = new Error('application update failed');
  const trace = [];
  const constructed = createFacadeConnection(
    { onUpdate: () => { trace.push('onUpdate'); throw later; } },
    (options) => {
      onUpdate = options.onUpdate;
      return {
        ok: true,
        value: {
          getSnapshot: () => ({ state }),
          handleEvent: (value) => { state = value; onUpdate(); return true; },
        },
      };
    },
  );
  assert.equal(constructed.ok, true);
  constructed.value.subscribe(() => { trace.push('subscriber:first'); throw first; });
  constructed.value.subscribe(() => trace.push('subscriber:second'));

  assert.throws(() => constructed.value.send(3), (error) => error === first);
  assert.equal(constructed.value.state, 3);
  assert.deepEqual(trace, ['subscriber:first', 'subscriber:second', 'onUpdate']);
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
