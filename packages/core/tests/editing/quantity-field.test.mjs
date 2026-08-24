import assert from 'node:assert/strict';
import test from 'node:test';
import { createCalculatorExpression } from '../../.verification-dist/number-field.js';
import {
  applyQuantityFieldEvent,
  createQuantityFieldState,
  parseQuantityInput,
} from '../../.verification-dist/quantity-field.js';
import { unwrap } from '../../.verification-dist/result.js';
import {
  createImperialUnitSystem,
  createStandardUnitRegistry,
  createUnitRegistry,
} from '../../.verification-dist/units.js';

const registry = createUnitRegistry([
  { id: 'meter', symbol: 'm', dimension: { length: 1 }, scale: '1' },
  { id: 'centimeter', symbol: 'cm', dimension: { length: 1 }, scale: '0.01' },
  { id: 'inch', symbol: 'in', dimension: { length: 1 }, scale: '0.0254' },
  { id: 'second', symbol: 's', dimension: { time: 1 }, scale: '1' },
]);

test('quantity field normalizes storage and changes display units without changing quantity', () => {
  const policies = { registry, canonicalUnit: 'meter' };
  let state = createQuantityFieldState(
    policies,
    { value: '100', unit: 'centimeter' },
    'centimeter',
  );
  assert.deepEqual(state.quantity, { value: '1', unit: 'meter' });
  assert.equal(state.inputState.snapshot.text, '100');
  state = unwrap(applyQuantityFieldEvent(state, { type: 'set-display-unit', unit: 'meter' }, policies)).state;
  assert.deepEqual(state.quantity, { value: '1', unit: 'meter' });
  assert.equal(state.inputState.snapshot.text, '1');
});

test('quantity field composes NumberField expressions and commits canonical values', () => {
  const policies = {
    registry,
    canonicalUnit: 'meter',
    evaluator: createCalculatorExpression(),
  };
  let state = createQuantityFieldState(policies, { value: '0.5', unit: 'meter' }, 'centimeter');
  state = edit(state, '50+20%', policies);
  const committed = unwrap(applyQuantityFieldEvent(state, 'commit', policies));
  assert.deepEqual(committed.state.quantity, { value: '0.6', unit: 'meter' });
  assert.equal(committed.state.inputState.snapshot.text, '60');
  assert.deepEqual(committed.commands.at(-1), {
    type: 'quantity-committed',
    value: { value: '0.6', unit: 'meter' },
    expression: '50+20%',
    displayUnit: 'centimeter',
  });
});

test('quantity field preserves canonical bounds and rejects incompatible display units', () => {
  const policies = { registry, canonicalUnit: 'meter', min: '0', max: '2' };
  let state = createQuantityFieldState(policies, { value: '1', unit: 'meter' }, 'centimeter');
  state = edit(state, '250', policies);
  assert.equal(applyQuantityFieldEvent(state, 'commit', policies).ok, false);
  assert.equal(applyQuantityFieldEvent(state, { type: 'set-display-unit', unit: 'second' }, policies).ok, false);
  const cancelled = unwrap(applyQuantityFieldEvent(state, 'cancel', policies)).state;
  assert.equal(cancelled.inputState.snapshot.text, '100');
  assert.deepEqual(cancelled.quantity, { value: '1', unit: 'meter' });
});

test('quantity input parses compact, calculator, and compound unit suffixes', () => {
  const standard = createStandardUnitRegistry();
  const evaluator = createCalculatorExpression();
  assert.deepEqual(unwrap(parseQuantityInput('150cm', { registry: standard })), {
    value: '150',
    expression: '150cm',
    unitExpression: unwrap(standard.parse('cm')),
  });
  assert.equal(unwrap(parseQuantityInput('100-20% cm', { registry: standard, evaluator })).value, '80');
  const acceleration = unwrap(parseQuantityInput('9.8 m/s²', { registry: standard }));
  assert.equal(acceleration.value, '9.8');
  assert.equal(acceleration.unitExpression.resolvedUnit, 'metre-per-second-squared');
});

test('quantity field commits inline units and adopts a resolved display unit', () => {
  const standard = createStandardUnitRegistry();
  const policies = {
    registry: standard,
    canonicalUnit: 'metre',
    evaluator: createCalculatorExpression(),
  };
  let state = createQuantityFieldState(policies, { value: '1', unit: 'metre' }, 'metre');
  state = edit(state, '100-20% cm', policies);
  const committed = unwrap(applyQuantityFieldEvent(state, 'commit', policies));
  assert.deepEqual(committed.state.quantity, { value: '0.8', unit: 'metre' });
  assert.equal(committed.state.displayUnit, 'centimetre');
  assert.equal(committed.state.inputState.snapshot.text, '80');
});

test('quantity field uses unit-system defaults while preserving explicit display units', () => {
  const standard = createStandardUnitRegistry();
  const imperial = createImperialUnitSystem(standard);
  const policies = { registry: standard, canonicalUnit: 'metre', unitSystem: imperial };
  const inferred = createQuantityFieldState(policies, { value: '1', unit: 'metre' });
  assert.equal(inferred.displayUnit, 'foot');
  assert.equal(inferred.inputState.snapshot.text, '3.280839895013');
  const explicit = createQuantityFieldState(policies, { value: '1', unit: 'metre' }, 'inch');
  assert.equal(explicit.displayUnit, 'inch');
});

function edit(state, text, policies) {
  return unwrap(applyQuantityFieldEvent(state, {
    type: 'text',
    event: {
      type: 'replace',
      startCodeUnitOffset: 0,
      endCodeUnitOffset: state.inputState.snapshot.text.length,
      text,
      selection: { anchorCodeUnitOffset: text.length, focusCodeUnitOffset: text.length },
    },
  }, policies)).state;
}
