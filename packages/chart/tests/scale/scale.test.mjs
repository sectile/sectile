import assert from 'node:assert/strict';
import test from 'node:test';
import {
  composeChartViewTransforms,
  createContinuousColorScale,
  createCategoricalScale,
  createChartViewTransform,
  createLinearScale,
  createLogarithmicScale,
  createOrdinalColorScale,
  createTemporalScale,
  invertChartCoordinate,
  MAX_CHART_TICKS,
  transformChartCoordinate,
  tryCreateCategoricalScale,
  tryCreateLinearScale,
} from '../../.verification-dist/scale.js';

test('linear and temporal scales invert finite positions with bounded ticks', () => {
  for (const scale of [
    createLinearScale({ minimum: -10, maximum: 10 }, { start: 0, end: 100 }),
    createTemporalScale({ minimum: 1_000, maximum: 2_000 }, { start: 100, end: 0 }),
  ]) {
    const middle = scale.kind === 'temporal' ? 1_500 : 0;
    assert.equal(scale.invert(scale.normalize(middle)), middle);
    assert.equal(scale.ticks(7).length, 7);
    assert.equal(Object.isFrozen(scale.ticks(2)), true);
    assert.equal(scale.tryTicks(MAX_CHART_TICKS + 1).error.code, 'chart-tick-ceiling-exceeded');
  }
});

test('projects continuous and stable ordinal renderer-neutral colors', () => {
  const continuous = createContinuousColorScale({ minimum: 0, maximum: 10 }, [
    { offset: 0, color: [0, 0, 0, 1] },
    { offset: 1, color: [1, 1, 1, 1] },
  ]);
  assert.deepEqual(continuous.color(5), [0.5, 0.5, 0.5, 1]);
  const ordinal = createOrdinalColorScale([[1, 0, 0, 1], [0, 0, 1, 1]]);
  assert.deepEqual(ordinal.color('series'), ordinal.color('series'));
  const categories = createCategoricalScale({ values: [1, '1'] }, { start: 0, end: 100 });
  assert.equal(categories.normalize(1), 25);
  assert.equal(categories.normalize('1'), 75);
});

test('logarithmic scale maps powers and rejects non-positive domains', () => {
  const scale = createLogarithmicScale({ minimum: 1, maximum: 1_000 }, { start: 0, end: 300 });
  assert.ok(Math.abs(scale.normalize(10) - 100) < 1e-10);
  assert.ok(Math.abs(scale.invert(200) - 100) < 1e-10);
  assert.deepEqual(scale.ticks(4).map((tick) => tick.value), [1, 10, 100, 1_000]);
  assert.equal(tryCreateLinearScale({ minimum: 1, maximum: 1 }, { start: 0, end: 1 }).error.code, 'chart-scale-invalid');
});

test('categorical scale uses stable bands without conflating category values', () => {
  const scale = createCategoricalScale({ values: ['1', '01', 'a'] }, { start: 0, end: 300 });
  assert.equal(scale.normalize('1'), 50);
  assert.equal(scale.invert(150), '01');
  assert.equal(scale.normalize('missing'), null);
  assert.equal(scale.ticks(2).length, 2);
  assert.equal(tryCreateCategoricalScale({ values: ['a', 'a'] }, { start: 0, end: 1 }).error.code, 'chart-scale-invalid');
});

test('view transforms compose and invert without semantic drift', () => {
  const first = createChartViewTransform({ xScale: 2, xOffset: 3, yScale: 4, yOffset: -1 });
  const second = createChartViewTransform({ xScale: 0.5, xOffset: 7, yScale: 2, yOffset: 5 });
  const point = { x: 9, y: -2 };
  const composed = composeChartViewTransforms(first, second);
  const projected = transformChartCoordinate(point, composed);
  assert.deepEqual(projected, transformChartCoordinate(transformChartCoordinate(point, first), second));
  assert.deepEqual(invertChartCoordinate(projected, composed), point);
});
