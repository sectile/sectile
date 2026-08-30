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

test('initial values seed state without claiming controlled ownership', () => {
  const controller = createChartController({ ...options(), initialValues: { cursor: 1 } });
  assert.equal(controller.getSnapshot().state.cursor, 1);
  const moved = controller.dispatch({ type: 'set-cursor', id: '1' }).value;
  assert.equal(moved.snapshot.state.cursor, '1');
  assert.equal(moved.commands.some((command) => command.type === 'cursor-change-requested'), false);
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

const definition = (data) => ({
  coordinate: { kind: 'cartesian', axes: [
    { id: 7, orientation: 'x', scale: 'temporal', field: 'recordedAt' },
    { id: 'value', orientation: 'y', scale: 'linear', field: 'amount' },
  ] },
  layers: [{ kind: 'line', id: 'series', data, xAxis: 7, yAxis: 'value' }],
});

test('controller owns declarative definitions and axis-domain view capabilities', () => {
  const controller = createChartController({
    definition: definition([
      { id: 1, recordedAt: new Date(0), amount: 4 },
      { id: '2', recordedAt: 1_000, amount: 8 },
    ]),
    viewCapabilities: [{ axisID: 7, minimumSpan: 1 }],
  });
  assert.equal(controller.getDefinition().axes[0].id, 7);
  assert.deepEqual(controller.getModel().identities, [1, '2']);
  assert.equal(controller.getSnapshot().state.view.axes[0].axisID, 7);

  const projection = controller.project({ viewport: { width: 320, height: 180 } }).value;
  assert.equal(projection.layers[0].layerID, 'series');
});

test('declarative replacement repairs only changed layers and reconciles the retained view', () => {
  const initialData = [
    { id: 1, recordedAt: 0, amount: 4 },
    { id: 2, recordedAt: 1_000, amount: 8 },
  ];
  const controller = createChartController({
    definition: definition(initialData),
    viewCapabilities: [{ axisID: 7, update: 'preserve' }],
  });
  const priorLayer = controller.getModel().layerAt(0);
  const replaced = controller.replaceDefinition(definition([
    initialData[0], initialData[1], { id: 3, recordedAt: 2_000, amount: 12 },
  ])).value;
  assert.equal(replaced.state.generation, 1);
  assert.notEqual(controller.getModel().layerAt(0), priorLayer);
  assert.equal(controller.getDefinition().diagnostics.resolvedDatums, 3);
  assert.equal(replaced.state.view.axes[0].base.maximum, 2_000);
});
