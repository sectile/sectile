import assert from 'node:assert/strict';
import test from 'node:test';
import { createChartController } from '../../.verification-dist/controller.js';
import { cloneChartProjection } from '../../.verification-dist/projection.js';
import { createLinearScale } from '../../.verification-dist/scale.js';

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

test('CHT-04: controlled ownership remains shape-stable and converges only through sync', () => {
  const controller = createChartController({ ...options(), controlled: { cursor: 1 } });
  const commands = [];
  controller.subscribeCommands((command) => commands.push(command.type));
  const requested = controller.dispatch({ type: 'set-cursor', id: '1' }).value;
  assert.equal(requested.snapshot.revision, 0);
  assert.equal(requested.snapshot.state.cursor, 1);
  assert.equal(requested.commands[0].type, 'cursor-change-requested');
  assert.deepEqual(commands, ['cursor-change-requested']);
  const synced = controller.syncControlledValues({ cursor: '1' }).value;
  assert.equal(synced.revision, 1);
  assert.equal(synced.state.cursor, '1');
  assert.deepEqual(commands, [
    'cursor-change-requested', 'render-requested', 'focus-datum', 'announce-datum',
  ]);
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

test('snapshot subscriptions publish committed state once and release idempotently', () => {
  const controller = createChartController(options());
  const revisions = [];
  const unsubscribe = controller.subscribeSnapshots((snapshot) => revisions.push(snapshot.revision));
  controller.dispatch({ type: 'set-active', id: 1 });
  controller.dispatch({ type: 'set-active', id: 1 });
  controller.applyPatch({ operations: [{ type: 'insert', layerID: 'points', index: 2, data: [{ id: 2, x: 2, y: 2 }] }] });
  assert.deepEqual(revisions, [1, 2]);
  unsubscribe(); unsubscribe();
  controller.dispatch({ type: 'set-active', id: '1' });
  assert.deepEqual(revisions, [1, 2]);
});

test('CHT-06: publication records serialize reentrant transitions after the active record', () => {
  const controller = createChartController(options());
  const order = [];
  controller.subscribeSnapshots((snapshot) => {
    order.push(`snapshot:${snapshot.revision}`);
    if (snapshot.revision === 1) {
      const nested = controller.applyPatch({
        operations: [{ type: 'insert', layerID: 'points', index: 2, data: [{ id: 2, x: 2, y: 2 }] }],
      });
      assert.equal(nested.ok, true);
      assert.equal(nested.value.revision, 2);
    }
  });
  controller.subscribeCommands((command) => order.push(`command:${command.type}:${command.generation}`));

  const outer = controller.dispatch({ type: 'set-active', id: 1 }).value;
  assert.equal(outer.snapshot.revision, 1);
  assert.equal(controller.getSnapshot().revision, 2);
  assert.deepEqual(order, [
    'snapshot:1',
    'command:render-requested:0',
    'snapshot:2',
    'command:render-requested:1',
  ]);
});

test('publication drains every captured listener and rethrows the first user error', () => {
  const controller = createChartController(options());
  const first = new Error('first snapshot failure');
  const second = new Error('later command failure');
  const calls = [];
  controller.subscribeSnapshots(() => { calls.push('snapshot:first'); throw first; });
  controller.subscribeSnapshots(() => calls.push('snapshot:second'));
  controller.subscribeCommands(() => { calls.push('command:first'); throw second; });
  controller.subscribeCommands(() => calls.push('command:second'));

  assert.throws(() => controller.dispatch({ type: 'set-active', id: 1 }), (error) => error === first);
  assert.equal(controller.getSnapshot().revision, 1);
  assert.deepEqual(calls, ['snapshot:first', 'snapshot:second', 'command:first', 'command:second']);
});

test('publication rejects the 1,025th synchronous cascade before state commit', () => {
  const controller = createChartController(options());
  let rejection;
  controller.subscribeCommands((command) => {
    if (command.type !== 'render-requested' || rejection !== undefined) return;
    const active = controller.getSnapshot().state.activeDatum;
    const nested = controller.dispatch({ type: 'set-active', id: active === 1 ? '1' : 1 });
    if (!nested.ok) rejection = nested.error;
  });

  const outer = controller.dispatch({ type: 'set-active', id: 1 }).value;
  assert.equal(outer.snapshot.revision, 1);
  assert.equal(controller.getSnapshot().revision, 1_024);
  assert.equal(rejection.code, 'chart-publication-ceiling-exceeded');
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
  assert.equal(projection.layerRevisions[0].layerID, 'series');
  const explicitView = controller.getSnapshot().state.view;
  const externalFirst = controller.project({ viewport: { width: 320, height: 180 }, view: explicitView }).value;
  const externalSecond = controller.project({ viewport: { width: 320, height: 180 }, view: explicitView }).value;
  assert.notEqual(externalSecond, externalFirst);
});

test('CHT-05: declarative projection cache is equivalent and bypasses ineligible inputs', () => {
  const controller = createChartController({
    definition: definition([
      { id: 1, recordedAt: 0, amount: 4 },
      { id: 2, recordedAt: 1_000, amount: 8 },
    ]),
  });
  const compactInsets = { top: 10, right: 10, bottom: 10, left: 10 };
  const wideInsets = { top: 20, right: 20, bottom: 20, left: 20 };
  const first = controller.project({ viewport: { width: 320, height: 180 }, insets: compactInsets }).value;
  const repeated = controller.project({ viewport: { width: 320, height: 180 }, insets: { ...compactInsets } }).value;
  const uncached = controller.project({
    viewport: { width: 320, height: 180 }, insets: compactInsets,
    view: controller.getSnapshot().state.view,
  }).value;
  const second = controller.project({ viewport: { width: 320, height: 180 }, insets: wideInsets }).value;
  assert.equal(repeated, first);
  assert.notEqual(uncached, first);
  const comparableProjection = projection => ({
    ...projection,
    layout: projection.layout && {
      ...projection.layout,
      axes: projection.layout.axes.map(({ scale, geometryScale, ...axis }) => ({
        ...axis,
        scale: { kind: scale.kind, range: scale.range },
        geometryScale: { kind: geometryScale.kind, range: geometryScale.range },
      })),
    },
  });
  assert.deepEqual(comparableProjection(uncached), comparableProjection(first));
  for (let index = 0; index < first.layout.axes.length; index += 1) {
    const cachedAxis = first.layout.axes[index];
    const uncachedAxis = uncached.layout.axes[index];
    for (const tick of cachedAxis.ticks) {
      assert.equal(uncachedAxis.scale.normalize(tick.value), cachedAxis.scale.normalize(tick.value));
      assert.equal(uncachedAxis.scale.invert(tick.position), cachedAxis.scale.invert(tick.position));
    }
  }
  assert.notEqual(second, first);
  assert.equal(first.layout.plot.x, 10);
  assert.equal(second.layout.plot.x, 20);

  const withPrevious = controller.project({
    viewport: { width: 320, height: 180 },
    insets: wideInsets,
    previous: second,
  }).value;
  assert.notEqual(withPrevious, second);
  assert.deepEqual(withPrevious.delta, { enter: [], update: [], exit: [] });

  const modelController = createChartController(options());
  const xScale = createLinearScale({ minimum: 0, maximum: 1 }, { start: 0, end: 320 });
  const yScale = createLinearScale({ minimum: 0, maximum: 1 }, { start: 180, end: 0 });
  const customFirst = modelController.project({ viewport: { width: 320, height: 180 }, xScale, yScale }).value;
  const customSecond = modelController.project({ viewport: { width: 320, height: 180 }, xScale, yScale }).value;
  assert.notEqual(customSecond, customFirst);
});

test('projection clones cannot contaminate the retained controller cache', () => {
  const controller = createChartController(options());
  const first = controller.project({ viewport: { width: 320, height: 180 } }).value;
  const cloned = cloneChartProjection(first);
  const original = first.batches[0].positions[0];
  cloned.batches[0].positions[0] = original + 100;

  const repeated = controller.project({ viewport: { width: 320, height: 180 } }).value;
  assert.equal(repeated, first);
  assert.equal(repeated.batches[0].positions[0], original);
  controller.dispose();
});

test('controlled values and nested capabilities remain isolated from caller mutation', () => {
  const selection = { type: 'points', ids: [1] };
  const modelController = createChartController({ ...options(), controlled: { selection } });
  selection.ids[0] = '1';
  modelController.applyPatch({
    operations: [{ type: 'insert', layerID: 'points', index: 2, data: [{ id: 2, x: 2, y: 2 }] }],
  });
  assert.deepEqual(modelController.getSnapshot().state.selection, { type: 'points', ids: [1] });

  const syncedSelection = { type: 'points', ids: ['1'] };
  modelController.syncControlledValues({ selection: syncedSelection });
  syncedSelection.ids[0] = 1;
  modelController.applyPatch({
    operations: [{ type: 'insert', layerID: 'points', index: 3, data: [{ id: 3, x: 3, y: 3 }] }],
  });
  assert.deepEqual(modelController.getSnapshot().state.selection, { type: 'points', ids: ['1'] });

  const initial = { kind: 'continuous', minimum: 0, maximum: 500 };
  const capabilities = [{ axisID: 7, initial, update: 'reset' }];
  const definitionController = createChartController({
    definition: definition([
      { id: 1, recordedAt: 0, amount: 4 },
      { id: 2, recordedAt: 1_000, amount: 8 },
    ]),
    viewCapabilities: capabilities,
  });
  initial.maximum = 1_000;
  capabilities[0].update = 'preserve';
  definitionController.replaceDefinition(definition([
    { id: 1, recordedAt: 0, amount: 4 },
    { id: 2, recordedAt: 1_000, amount: 8 },
    { id: 3, recordedAt: 2_000, amount: 12 },
  ]));
  const axis = definitionController.getSnapshot().state.view.axes[0];
  assert.equal(axis.initial.maximum, 500);
  assert.equal(axis.visible.maximum, 500);
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
