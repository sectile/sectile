import assert from 'node:assert/strict';
import test from 'node:test';
import {
  applyNumberFieldEvent,
  createCalculatorExpression,
  createNumberFieldState,
} from '../../.verification-dist/number-field.js';
import { unwrap } from '../../.verification-dist/result.js';
import { createTextEditingState } from '../../.verification-dist/text.js';

test('calculator expression evaluates precedence, calculator percentages, and integer powers', () => {
  const evaluator = createCalculatorExpression();
  assert.equal(unwrap(evaluator.evaluate('2 + 3 * 4')).value, '14');
  assert.equal(unwrap(evaluator.evaluate('50-20%')).value, '40');
  assert.equal(unwrap(evaluator.evaluate('50+20%')).value, '60');
  assert.equal(unwrap(evaluator.evaluate('50*20%')).value, '10');
  assert.equal(unwrap(evaluator.evaluate('50/20%')).value, '250');
  assert.equal(unwrap(evaluator.evaluate('2^3^2')).value, '512');
  assert.equal(unwrap(evaluator.evaluate('10^-2')).value, '0.01');
});

test('calculator expression rounds division and rejects unsafe or undefined operations', () => {
  const evaluator = createCalculatorExpression({ precision: 4, rounding: 'half-even', maxExponent: 8 });
  assert.equal(unwrap(evaluator.evaluate('1/3')).value, '0.3333');
  assert.equal(evaluator.evaluate('1/0').ok, false);
  assert.equal(evaluator.evaluate('9^0.5').ok, false);
  assert.equal(evaluator.evaluate('2^9').ok, false);
  assert.equal(evaluator.evaluate('((1+2)').ok, false);
});

test('number field composes text editing, commits expressions, and cancels atomically', () => {
  const evaluator = createCalculatorExpression();
  let state = createNumberFieldState('50');
  state = edit(state, '50-20%', { evaluator });
  const committed = unwrap(applyNumberFieldEvent(state, 'commit', { evaluator }));
  assert.equal(committed.state.value, '40');
  assert.equal(committed.state.inputState.snapshot.text, '40');
  assert.equal(committed.state.inputState.snapshot.selection.focusCodeUnitOffset, 2);
  assert.deepEqual(committed.commands.at(-1), { type: 'value-committed', value: '40', expression: '50-20%' });
  const edited = edit(committed.state, 'bad', { evaluator });
  assert.equal(applyNumberFieldEvent(edited, 'commit', { evaluator }).ok, false);
  assert.deepEqual(unwrap(applyNumberFieldEvent(edited, 'cancel', { evaluator })).state, committed.state);
});

test('number field enforces optional bounds and required values', () => {
  const below = createNumberFieldState('5', editing('-1'));
  assert.equal(applyNumberFieldEvent(below, 'commit', { min: '0' }).ok, false);
  const empty = createNumberFieldState('5', editing(''));
  const cleared = unwrap(applyNumberFieldEvent(empty, 'commit')).state;
  assert.equal(cleared.value, null);
  assert.equal(cleared.inputState.snapshot.text, '');
  assert.equal(applyNumberFieldEvent(empty, 'commit', { required: true }).ok, false);
});

test('number field preserves exact decimals without binary floating-point coercion', () => {
  const evaluator = createCalculatorExpression();
  let state = createNumberFieldState('0');
  state = edit(state, '0.1+0.2', { evaluator });
  state = unwrap(applyNumberFieldEvent(state, 'commit', { evaluator })).state;
  assert.equal(state.value, '0.3');
  state = edit(state, '1.2300');
  state = unwrap(applyNumberFieldEvent(state, 'commit')).state;
  assert.equal(state.value, '1.23');
  assert.equal(state.inputState.snapshot.text, '1.23');
});

test('number field rejects commit during active text composition', () => {
  let state = createNumberFieldState('1');
  state = unwrap(applyNumberFieldEvent(state, {
    type: 'text',
    event: {
      type: 'composition-start',
      startCodeUnitOffset: 1,
      endCodeUnitOffset: 1,
      text: '2',
      selection: { anchorCodeUnitOffset: 2, focusCodeUnitOffset: 2 },
    },
  })).state;
  assert.equal(applyNumberFieldEvent(state, 'commit').ok, false);
});

function editing(text) {
  return createTextEditingState(text, {
    anchorCodeUnitOffset: text.length,
    focusCodeUnitOffset: text.length,
  });
}

function edit(state, text, policies = {}) {
  return unwrap(applyNumberFieldEvent(state, {
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
