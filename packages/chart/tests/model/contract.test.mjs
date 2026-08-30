import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createChartViewState,
  normalizeChartCoordinate,
  tryCreateChartViewState,
  tryNormalizeChartCoordinate,
  tryNormalizeChartRepresentative,
  tryNormalizeChartTemporalValue,
  tryResolveChartIdentity,
  tryResolveChartValue,
  tryValidateChartLayerCoordinate,
} from '../../.verification-dist/contract.js';

test('normalizes axes, temporal values, and mixed stable identities without coercion', () => {
  const date = new Date(1_000);
  const coordinate = normalizeChartCoordinate({
    kind: 'cartesian',
    axes: [
      { id: 'time', orientation: 'x', scale: 'temporal', domain: { kind: 'temporal', minimum: new Date(0), maximum: 2_000 } },
      { id: 1, orientation: 'y', scale: 'linear', domain: { kind: 'numeric', minimum: 0, maximum: 10 } },
    ],
  });
  assert.deepEqual(coordinate.axes.map((axis) => axis.id), ['time', 1]);
  assert.deepEqual(coordinate.axes[0].domain, { kind: 'temporal', minimum: 0, maximum: 2_000 });
  assert.equal(tryNormalizeChartTemporalValue(date).value, 1_000);
  assert.equal(tryNormalizeChartTemporalValue(1_000).value, 1_000);
  assert.equal(tryNormalizeChartTemporalValue('1970-01-01').error.code, 'chart-temporal-invalid');
  assert.equal(tryNormalizeChartTemporalValue(new Date(Number.NaN)).error.code, 'chart-temporal-invalid');
});

test('resolves explicit, declared-field, and canonical values in precedence order', () => {
  const datum = { id: 7, x: 1, alternateX: 2, nested: { y: 3 } };
  assert.equal(tryResolveChartIdentity(datum).value, 7);
  assert.equal(tryResolveChartIdentity(datum, () => 'explicit').value, 'explicit');
  assert.equal(tryResolveChartIdentity({ x: 1 }).error.code, 'chart-identity-missing');
  assert.equal(tryResolveChartValue(datum, { kind: 'numeric', canonicalField: 'x' }).value, 1);
  assert.equal(tryResolveChartValue(datum, { kind: 'numeric', canonicalField: 'x', field: 'alternateX' }).value, 2);
  assert.equal(tryResolveChartValue(datum, {
    kind: 'numeric', canonicalField: 'y', getValue: (value) => value.nested.y,
  }).value, 3);
  assert.equal(tryResolveChartValue({ x: '1' }, { kind: 'numeric', canonicalField: 'x' }).error.code, 'chart-accessor-invalid');
});

test('keeps aggregate metadata separate from datum identity', () => {
  assert.deepEqual(tryNormalizeChartRepresentative({
    kind: 'datum', id: 1,
  }).value, { kind: 'datum', id: 1 });
  assert.deepEqual(tryNormalizeChartRepresentative({
    kind: 'aggregate', reduction: 'density', count: 3,
    bounds: { minimumX: 0, maximumX: 1, minimumY: 2, maximumY: 3 },
  }).value, {
    kind: 'aggregate', reduction: 'density', count: 3,
    bounds: { minimumX: 0, maximumX: 1, minimumY: 2, maximumY: 3 },
  });
  assert.equal(tryNormalizeChartRepresentative({
    kind: 'aggregate', id: 'forged', reduction: 'density', count: 3,
    bounds: { minimumX: 0, maximumX: 1, minimumY: 2, maximumY: 3 },
  }).error.code, 'chart-aggregate-invalid');
});

test('rejects missing, duplicate, incompatible, and over-ceiling Cartesian axes', () => {
  assert.equal(tryNormalizeChartCoordinate({ kind: 'cartesian', axes: [
    { id: 'x', orientation: 'x', scale: 'linear' },
  ] }).error.code, 'chart-axis-missing');
  assert.equal(tryNormalizeChartCoordinate({ kind: 'cartesian', axes: [
    { id: 'axis', orientation: 'x', scale: 'linear' },
    { id: 'axis', orientation: 'y', scale: 'linear' },
  ] }).error.code, 'chart-axis-duplicate');
  assert.equal(tryNormalizeChartCoordinate({ kind: 'cartesian', axes: [
    { id: 'x', orientation: 'x', scale: 'temporal', domain: { kind: 'numeric', minimum: 0, maximum: 1 } },
    { id: 'y', orientation: 'y', scale: 'linear' },
  ] }).error.code, 'chart-domain-invalid');
  assert.equal(tryNormalizeChartCoordinate({ kind: 'cartesian', axes: [
    { id: 'x', orientation: 'x', scale: 'linear' },
    { id: 'y', orientation: 'y', scale: 'linear' },
    { id: 'x2', orientation: 'x', scale: 'linear' },
  ] }, { maxAxes: 2 }).error.code, 'chart-axis-ceiling-exceeded');
  assert.deepEqual(normalizeChartCoordinate({ kind: 'radial' }), { kind: 'radial' });
  assert.equal(tryNormalizeChartCoordinate({ kind: 'radial', axes: [] }).error.code, 'chart-coordinate-mismatch');
});

test('rejects layer and axis references that do not match the coordinate system', () => {
  const coordinate = normalizeChartCoordinate({ kind: 'cartesian', axes: [
    { id: 'x', orientation: 'x', scale: 'linear' },
    { id: 'y', orientation: 'y', scale: 'linear' },
  ] });
  assert.equal(tryValidateChartLayerCoordinate(coordinate, {
    id: 'line', kind: 'line', xAxis: 'missing', yAxis: 'y', data: [],
  }).error.code, 'chart-axis-missing');
  assert.equal(tryValidateChartLayerCoordinate(coordinate, {
    id: 'pie', kind: 'pie', data: [],
  }).error.code, 'chart-coordinate-mismatch');
});

test('creates finite immutable serializable axis view state keyed by StableID', () => {
  const state = createChartViewState([
    {
      axisID: 'time',
      scale: 'temporal',
      base: { kind: 'continuous', minimum: 0, maximum: 100 },
      visible: { kind: 'continuous', minimum: 25, maximum: 75 },
      revision: 1,
    },
    {
      axisID: 2,
      scale: 'categorical',
      base: { kind: 'categorical', start: 0, end: 10 },
      visible: { kind: 'categorical', start: 2, end: 8 },
      revision: 2,
    },
  ], 3);
  assert.equal(Object.isFrozen(state), true);
  assert.equal(Object.isFrozen(state.axes), true);
  assert.deepEqual(JSON.parse(JSON.stringify(state)).axes.map((axis) => axis.axisID), ['time', 2]);
  assert.equal(tryCreateChartViewState([...state.axes, state.axes[0]]).error.code, 'chart-axis-duplicate');
  assert.equal(tryCreateChartViewState([{
    axisID: 'bad',
    scale: 'linear',
    base: { kind: 'continuous', minimum: 0, maximum: 10 },
    visible: { kind: 'continuous', minimum: -1, maximum: 5 },
    revision: 0,
  }]).error.code, 'chart-view-invalid');
});
