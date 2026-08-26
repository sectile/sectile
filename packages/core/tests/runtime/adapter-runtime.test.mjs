import assert from 'node:assert/strict';
import test from 'node:test';
import {
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
