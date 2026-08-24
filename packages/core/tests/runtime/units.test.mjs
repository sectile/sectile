import assert from 'node:assert/strict';
import test from 'node:test';
import { unwrap } from '../../.verification-dist/result.js';
import {
  createImperialUnitSystem,
  createMetricUnitSystem,
  createStandardUnitRegistry,
  createUnitRegistry, tryCreateUnitRegistry
} from '../../.verification-dist/units.js';

const length = { length: 1 };
const temperature = { temperature: 1 };

test('unit registry converts exact linear units without floating-point coercion', () => {
  const registry = createUnitRegistry([
    { id: 'meter', symbol: 'm', dimension: length, scale: '1' },
    { id: 'centimeter', symbol: 'cm', dimension: length, scale: '0.01' },
    { id: 'inch', symbol: 'in', dimension: length, scale: '0.0254' },
  ]);
  assert.deepEqual(unwrap(registry.convert('10', 'centimeter', 'meter')), {
    value: '0.1', from: 'centimeter', to: 'meter',
  });
  assert.equal(unwrap(registry.convert('1', 'inch', 'centimeter')).value, '2.54');
  assert.equal(registry.compatible('meter', 'inch'), true);
});

test('unit registry supports affine temperature conversions', () => {
  const registry = createUnitRegistry([
    { id: 'kelvin', symbol: 'K', dimension: temperature, scale: '1' },
    { id: 'celsius', symbol: '°C', dimension: temperature, scale: '1', offset: '273.15' },
    { id: 'fahrenheit', symbol: '°F', dimension: temperature, scale: { numerator: '5', denominator: '9' }, offset: { numerator: '45967', denominator: '180' } },
  ]);
  assert.equal(unwrap(registry.convert('0', 'celsius', 'kelvin')).value, '273.15');
  assert.equal(unwrap(registry.convert('32', 'fahrenheit', 'celsius', { precision: 9 })).value, '0');
  assert.equal(unwrap(registry.convert('100', 'celsius', 'fahrenheit', { precision: 9 })).value, '212');
});

test('unit registry rejects malformed definitions and incompatible conversions', () => {
  assert.equal(tryCreateUnitRegistry([{ id: 'bad', symbol: 'x', dimension: length, scale: '0' }]).ok, false);
  assert.equal(tryCreateUnitRegistry([
    { id: 'meter', symbol: 'm', dimension: length, scale: '1' },
    { id: 'meter', symbol: 'm', dimension: length, scale: '1' },
  ]).ok, false);
  const registry = createUnitRegistry([
    { id: 'meter', symbol: 'm', dimension: length, scale: '1' },
    { id: 'second', symbol: 's', dimension: { time: 1 }, scale: '1' },
  ]);
  assert.equal(registry.convert('1', 'meter', 'second').ok, false);
  assert.equal(registry.convert('bad', 'meter', 'meter').ok, false);
});

test('unit expressions compose dimensions, exact scales, and superscript exponents', () => {
  const registry = createStandardUnitRegistry();
  const acceleration = unwrap(registry.parse('m/s²'));
  assert.deepEqual(acceleration.dimension, { length: 1, time: -2 });
  assert.equal(acceleration.resolvedUnit, 'metre-per-second-squared');
  assert.equal(unwrap(registry.convertExpression('9.8', acceleration, 'foot-per-second-squared')).value, '32.152230971129');

  const torqueShape = unwrap(registry.parse('kg·m²/s^2'));
  assert.deepEqual(torqueShape.dimension, { length: 2, mass: 1, time: -2 });
  assert.equal(torqueShape.resolvedUnit, null);
  assert.deepEqual(torqueShape.factors, [
    { unit: 'kilogram', exponent: 1 },
    { unit: 'metre', exponent: 2 },
    { unit: 'second', exponent: -2 },
  ]);
  assert.equal(unwrap(registry.parse('fl oz')).resolvedUnit, 'fluid-ounce');
  assert.equal(unwrap(registry.parse('m s')).resolvedUnit, null);
});

test('unit expressions reject affine compounds, ambiguity, and incompatible targets', () => {
  const registry = createStandardUnitRegistry();
  assert.equal(registry.parse('°C/m').ok, false);
  assert.equal(registry.parse('unknown').ok, false);
  assert.equal(registry.convertExpression('1', 'm/s', 'metre').ok, false);
  assert.equal(tryCreateUnitRegistry([
    { id: 'one', symbol: 'x', dimension: {}, scale: '1' },
    { id: 'two', symbol: 'x', dimension: {}, scale: '2' },
  ]).ok, false);
});

test('standard unit systems select compatible metric and imperial display units', () => {
  const registry = createStandardUnitRegistry();
  const metric = createMetricUnitSystem(registry);
  const imperial = createImperialUnitSystem(registry);
  assert.equal(metric.getDefaultUnit('metre'), 'metre');
  assert.deepEqual(metric.getUnits('metre'), ['millimetre', 'centimetre', 'metre', 'kilometre']);
  assert.equal(imperial.getDefaultUnit('metre'), 'foot');
  assert.deepEqual(imperial.getUnits('metre'), ['inch', 'foot', 'yard', 'mile']);
  assert.equal(metric.getDefaultUnit('kelvin'), 'celsius');
  assert.equal(imperial.getDefaultUnit('kelvin'), 'fahrenheit');
});
