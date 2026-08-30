import assert from 'node:assert/strict';
import test from 'node:test';
import { createChartController } from '../../.verification-dist/controller.js';

const options = () => ({ model: { layers: [{ id: 'points', profile: 'point', data: [
  { id: 1, x: 0, y: 0 }, { id: '1', x: 1, y: 1 },
] }] } });

test('controller serializes model and interaction transitions by revision', () => {
  const controller = createChartController(options());
  const initial = controller.getSnapshot();
  const noOp = controller.dispatch({ type: 'set-active', id: null }).value;
  assert.equal(noOp.snapshot, initial);

  const focused = controller.dispatch({ type: 'move-focus', direction: 'next' }).value;
  assert.equal(focused.snapshot.revision, 1);
  assert.equal(focused.snapshot.state.cursor, 1);
  assert.equal(controller.dispatch({ type: 'move-focus', direction: 'next' }, 0).error.code, 'stale-revision');

  const patched = controller.applyPatch({
    operations: [{ type: 'insert', layerID: 'points', index: 2, data: [{ id: 2, x: 2, y: 2 }] }],
  }).value;
  assert.equal(patched.revision, 2);
  assert.equal(patched.state.generation, 1);
  assert.equal(controller.getModel().size, 3);
});

test('controlled ownership remains shape-stable and converges only through sync', () => {
  const controller = createChartController({ ...options(), controlled: { cursor: 1 } });
  const requested = controller.dispatch({ type: 'set-cursor', id: '1' }).value;
  assert.equal(requested.snapshot.revision, 0);
  assert.equal(requested.snapshot.state.cursor, 1);
  assert.equal(requested.commands[0].type, 'cursor-change-requested');
  const synced = controller.syncControlledValues({ cursor: '1' }).value;
  assert.equal(synced.revision, 1);
  assert.equal(synced.state.cursor, '1');
  assert.equal(controller.syncControlledValues({}).error.code, 'chart-controller-invalid');
});

test('command subscriptions release exactly once and dispose clears controller resources', () => {
  const controller = createChartController(options());
  const commands = [];
  const unsubscribe = controller.subscribeCommands((command) => commands.push(command.type));
  controller.dispatch({ type: 'set-active', id: 1 });
  assert.deepEqual(commands, ['render-requested']);
  unsubscribe(); unsubscribe();
  controller.dispatch({ type: 'set-active', id: '1' });
  assert.deepEqual(commands, ['render-requested']);
  controller.dispose(); controller.dispose();
  assert.equal(controller.dispatch({ type: 'set-active', id: 1 }).error.code, 'chart-controller-disposed');
  assert.equal(controller.project({ viewport: { width: 100, height: 100 } }).error.code, 'chart-controller-disposed');
});

test('controller projection consumes the canonical interaction view transform', () => {
  const controller = createChartController(options());
  const input = { viewport: { width: 100, height: 100 } };
  const first = controller.project(input).value;
  assert.equal(controller.project(input).value, first);
  controller.dispatch({ type: 'set-selection', selection: { type: 'points', ids: [1] } });
  assert.equal(controller.project(input).value, first);
  const before = first.batches[0].positions[0];
  controller.dispatch({ type: 'pan', x: 10, y: 0 });
  const after = controller.project({ viewport: { width: 100, height: 100 } }).value.batches[0].positions[0];
  assert.equal(after - before, 10);
  assert.notEqual(controller.project(input).value, first);
});
