import { unwrap } from './result.js';
import type { Result } from './shared.js';
import { compareDecimal, parseDecimal, type DecimalRounding } from './internal/kernel/decimal.js';
import { fail, ok } from './internal/kernel/foundation.js';
import { createMachineUpdate } from './internal/kernel/machine.js';
import {
  applyNumberFieldEvent,
  createNumberFieldState,
  type NumberFieldEvent,
  type NumericExpressionEvaluator,
  tryCreateNumberFieldState,
} from './number-field.js';
import { type TextEditingState, tryCreateTextEditingState } from './text.js';
import type { UnitExpression, UnitID, UnitRegistry, UnitSystemProfile } from './units.js';

export interface QuantityValue {
  readonly value: string;
  readonly unit: UnitID;
}

export interface QuantityFieldState {
  readonly quantity: QuantityValue | null;
  readonly displayUnit: UnitID;
  readonly inputState: TextEditingState;
}

export type QuantityFieldEvent =
  | NumberFieldEvent
  | { readonly type: 'set-display-unit'; readonly unit: UnitID };

export type QuantityFieldCommand =
  | { readonly type: 'input-state-changed'; readonly value: TextEditingState }
  | { readonly type: 'display-unit-changed'; readonly unit: UnitID }
  | {
      readonly type: 'quantity-committed';
      readonly value: QuantityValue | null;
      readonly expression: string;
      readonly displayUnit: UnitID;
    };

export interface QuantityFieldPolicies {
  readonly registry: UnitRegistry;
  readonly canonicalUnit: UnitID;
  readonly unitSystem?: UnitSystemProfile;
  readonly evaluator?: NumericExpressionEvaluator;
  readonly precision?: number;
  readonly rounding?: DecimalRounding;
  readonly min?: string;
  readonly max?: string;
  readonly required?: boolean;
}

export interface QuantityInputParserOptions {
  readonly registry: UnitRegistry;
  readonly evaluator?: NumericExpressionEvaluator;
}

export interface ParsedQuantityInput {
  readonly value: string | null;
  readonly expression: string;
  readonly unitExpression: UnitExpression | null;
}

export interface QuantityFieldUpdate {
  readonly state: QuantityFieldState;
  readonly commands: readonly QuantityFieldCommand[];
}

export function createQuantityFieldState(
  policies: QuantityFieldPolicies,
  quantity: QuantityValue | null = null,
  displayUnit?: UnitID,
  inputState?: TextEditingState,
): QuantityFieldState {
  return unwrap(tryCreateQuantityFieldState(policies, quantity, displayUnit, inputState));
}

export function tryCreateQuantityFieldState(
  policies: QuantityFieldPolicies,
  quantity: QuantityValue | null = null,
  displayUnit?: UnitID,
  inputState?: TextEditingState,
): Result<QuantityFieldState> {
  const validPolicies = validatePolicies(policies);
  if (!validPolicies.ok) return validPolicies;
  const resolvedDisplayUnit = displayUnit
    ?? policies.unitSystem?.getDefaultUnit(policies.canonicalUnit)
    ?? policies.canonicalUnit;
  const display = policies.registry.get(resolvedDisplayUnit);
  if (display === null) return fail('construction', 'unknown-display-unit', 'Quantity field display unit must be registered.', { displayUnit: resolvedDisplayUnit });
  if (!policies.registry.compatible(policies.canonicalUnit, resolvedDisplayUnit)) {
    return fail('construction', 'incompatible-display-unit', 'Quantity field display unit must match the canonical dimension.', { displayUnit: resolvedDisplayUnit, canonicalUnit: policies.canonicalUnit });
  }
  let normalizedQuantity: QuantityValue | null = null;
  if (quantity !== null) {
    if (typeof quantity !== 'object' || typeof quantity.value !== 'string' || typeof quantity.unit !== 'string') {
      return fail('construction', 'invalid-quantity-value', 'Quantity must contain decimal value text and a unit ID.');
    }
    const converted = policies.registry.convert(quantity.value, quantity.unit, policies.canonicalUnit, conversionOptions(policies));
    if (!converted.ok) return asConstruction(converted);
    normalizedQuantity = Object.freeze({ value: converted.value.value, unit: policies.canonicalUnit });
  }
  let input = inputState;
  if (input === undefined) {
    const displayed = displayValue(normalizedQuantity, resolvedDisplayUnit, policies);
    if (!displayed.ok) return displayed;
    const text = displayed.value ?? '';
    const created = tryCreateTextEditingState(text, {
      anchorCodeUnitOffset: text.length,
      focusCodeUnitOffset: text.length,
    });
    if (!created.ok) return created;
    input = created.value;
  }
  const number = tryCreateNumberFieldState(null, input);
  if (!number.ok) return number;
  return ok(Object.freeze({
    quantity: normalizedQuantity,
    displayUnit: resolvedDisplayUnit,
    inputState: number.value.inputState,
  }));
}

export function applyQuantityFieldEvent(
  state: QuantityFieldState,
  event: QuantityFieldEvent,
  policies: QuantityFieldPolicies,
): Result<QuantityFieldUpdate> {
  const valid = tryCreateQuantityFieldState(policies, state.quantity, state.displayUnit, state.inputState);
  if (!valid.ok) return { ok: false, error: { ...valid.error, class: 'transition-rejection' } };
  const bounds = normalizeBounds(policies);
  if (!bounds.ok) return bounds;
  if (typeof event === 'object' && event.type === 'set-display-unit') {
    return changeDisplayUnit(valid.value, event.unit, policies);
  }
  if (event === 'commit') return commitQuantityField(valid.value, policies, bounds.value);
  const displayed = displayValue(valid.value.quantity, valid.value.displayUnit, policies);
  if (!displayed.ok) return displayed;
  const numberState = tryCreateNumberFieldState(displayed.value, valid.value.inputState);
  if (!numberState.ok) return numberState;
  const reduced = applyNumberFieldEvent(numberState.value, event, {
    ...(policies.evaluator === undefined ? {} : { evaluator: policies.evaluator }),
    ...(policies.required === undefined ? {} : { required: policies.required }),
  });
  if (!reduced.ok) return reduced;
  const next = Object.freeze({ ...valid.value, inputState: reduced.value.state.inputState });
  const commands: QuantityFieldCommand[] = reduced.value.commands
    .filter((command) => command.type === 'input-state-changed')
    .map((command) => ({ type: 'input-state-changed', value: command.value }));
  return createMachineUpdate(next, commands);
}

export function parseQuantityInput(
  input: string,
  options: QuantityInputParserOptions,
): Result<ParsedQuantityInput> {
  if (typeof input !== 'string') return fail('transition-rejection', 'invalid-quantity-input', 'Quantity input must be text.');
  const expression = input.trim();
  if (expression.length === 0) return ok(Object.freeze({ value: null, expression: input, unitExpression: null }));
  const direct = evaluateQuantityExpression(expression, options.evaluator);
  if (direct.ok) return ok(Object.freeze({ value: direct.value, expression: input, unitExpression: null }));
  for (let position = expression.length - 1; position > 0; position -= 1) {
    const numeric = expression.slice(0, position).trimEnd();
    const unitSource = expression.slice(position).trimStart();
    if (numeric.length === 0 || unitSource.length === 0) continue;
    const unitExpression = options.registry.parse(unitSource);
    if (!unitExpression.ok) continue;
    const value = evaluateQuantityExpression(numeric, options.evaluator);
    if (!value.ok) continue;
    return ok(Object.freeze({ value: value.value, expression: input, unitExpression: unitExpression.value }));
  }
  return fail('transition-rejection', 'invalid-quantity-input', 'Quantity input must contain a valid number or expression followed by an optional unit expression.', { input });
}

function commitQuantityField(
  state: QuantityFieldState,
  policies: QuantityFieldPolicies,
  bounds: {
    readonly min: ReturnType<typeof parseDecimal>;
    readonly max: ReturnType<typeof parseDecimal>;
  },
): Result<QuantityFieldUpdate> {
  if (state.inputState.composition !== null) {
    return fail('transition-rejection', 'quantity-commit-during-composition', 'Quantity field cannot commit during active composition.');
  }
  const parsedInput = parseQuantityInput(state.inputState.snapshot.text, {
    registry: policies.registry,
    ...(policies.evaluator === undefined ? {} : { evaluator: policies.evaluator }),
  });
  if (!parsedInput.ok) return parsedInput;
  if (parsedInput.value.value === null) {
    if (policies.required === true) return fail('transition-rejection', 'required-quantity', 'Quantity field requires a value.');
    const input = tryCreateTextEditingState('', { anchorCodeUnitOffset: 0, focusCodeUnitOffset: 0 });
    if (!input.ok) return input;
    return createMachineUpdate(
      Object.freeze({ ...state, quantity: null, inputState: input.value }),
      [
        { type: 'input-state-changed', value: input.value },
        { type: 'quantity-committed', value: null, expression: parsedInput.value.expression, displayUnit: state.displayUnit },
      ],
    );
  }
  const canonical = parsedInput.value.unitExpression === null
    ? policies.registry.convert(
      parsedInput.value.value,
      state.displayUnit,
      policies.canonicalUnit,
      conversionOptions(policies),
    )
    : policies.registry.convertExpression(
      parsedInput.value.value,
      parsedInput.value.unitExpression,
      policies.canonicalUnit,
      conversionOptions(policies),
    );
  if (!canonical.ok) return canonical;
  const canonicalValue = canonical.value.value;
  const parsedCanonical = parseDecimal(canonicalValue);
  if (parsedCanonical === null) return fail('internal-invariant', 'invalid-canonical-quantity', 'Unit registry returned invalid canonical decimal text.');
  if (bounds.min !== null && compareDecimal(parsedCanonical, bounds.min) < 0) {
    return fail('transition-rejection', 'quantity-below-minimum', 'Quantity is below its canonical minimum.', { value: canonicalValue, min: policies.min });
  }
  if (bounds.max !== null && compareDecimal(parsedCanonical, bounds.max) > 0) {
    return fail('transition-rejection', 'quantity-above-maximum', 'Quantity is above its canonical maximum.', { value: canonicalValue, max: policies.max });
  }
  const requestedUnit = parsedInput.value.unitExpression?.resolvedUnit;
  const displayUnit = requestedUnit !== null && requestedUnit !== undefined
    && policies.registry.compatible(policies.canonicalUnit, requestedUnit)
    ? requestedUnit
    : state.displayUnit;
  const display = policies.registry.convert(canonicalValue, policies.canonicalUnit, displayUnit, conversionOptions(policies));
  if (!display.ok) return display;
  const input = tryCreateTextEditingState(display.value.value, {
    anchorCodeUnitOffset: display.value.value.length,
    focusCodeUnitOffset: display.value.value.length,
  });
  if (!input.ok) return input;
  const quantity = Object.freeze({ value: canonicalValue, unit: policies.canonicalUnit });
  return createMachineUpdate(
    Object.freeze({ quantity, displayUnit, inputState: input.value }),
    [
      { type: 'input-state-changed', value: input.value },
      ...(displayUnit === state.displayUnit ? [] : [{ type: 'display-unit-changed' as const, unit: displayUnit }]),
      { type: 'quantity-committed', value: quantity, expression: parsedInput.value.expression, displayUnit },
    ],
  );
}

function evaluateQuantityExpression(
  expression: string,
  evaluator: NumericExpressionEvaluator | undefined,
): Result<string | null> {
  const input = tryCreateTextEditingState(expression, {
    anchorCodeUnitOffset: expression.length,
    focusCodeUnitOffset: expression.length,
  });
  if (!input.ok) return input;
  const state = tryCreateNumberFieldState(null, input.value);
  if (!state.ok) return state;
  const committed = applyNumberFieldEvent(state.value, 'commit', {
    ...(evaluator === undefined ? {} : { evaluator }),
  });
  if (!committed.ok) return committed;
  const command = committed.value.commands.find((candidate) => candidate.type === 'value-committed');
  return command === undefined
    ? fail('internal-invariant', 'missing-quantity-expression-result', 'Number field commit must produce a value command.')
    : ok(command.value);
}

function changeDisplayUnit(
  state: QuantityFieldState,
  displayUnit: UnitID,
  policies: QuantityFieldPolicies,
): Result<QuantityFieldUpdate> {
  if (policies.registry.get(displayUnit) === null) {
    return fail('transition-rejection', 'unknown-display-unit', 'Quantity field display unit must be registered.', { displayUnit });
  }
  if (!policies.registry.compatible(policies.canonicalUnit, displayUnit)) {
    return fail('transition-rejection', 'incompatible-display-unit', 'Quantity field display unit must match the canonical dimension.', { displayUnit });
  }
  if (displayUnit === state.displayUnit) return createMachineUpdate(state);
  const displayed = displayValue(state.quantity, displayUnit, policies);
  if (!displayed.ok) return displayed;
  const text = displayed.value ?? '';
  const input = tryCreateTextEditingState(text, {
    anchorCodeUnitOffset: text.length,
    focusCodeUnitOffset: text.length,
  });
  if (!input.ok) return input;
  return createMachineUpdate(
    Object.freeze({ ...state, displayUnit, inputState: input.value }),
    [
      { type: 'input-state-changed', value: input.value },
      { type: 'display-unit-changed', unit: displayUnit },
    ],
  );
}

function displayValue(
  quantity: QuantityValue | null,
  displayUnit: UnitID,
  policies: QuantityFieldPolicies,
): Result<string | null> {
  if (quantity === null) return ok(null);
  const converted = policies.registry.convert(quantity.value, quantity.unit, displayUnit, conversionOptions(policies));
  return converted.ok ? ok(converted.value.value) : converted;
}

function validatePolicies(policies: QuantityFieldPolicies): Result<true> {
  if (typeof policies !== 'object' || policies === null
    || typeof policies.registry !== 'object' || policies.registry === null
    || typeof policies.registry.get !== 'function'
    || typeof policies.registry.compatible !== 'function'
    || typeof policies.registry.convert !== 'function') {
    return fail('construction', 'invalid-unit-registry', 'Quantity field requires a unit registry.');
  }
  if (typeof policies.canonicalUnit !== 'string' || policies.registry.get(policies.canonicalUnit) === null) {
    return fail('construction', 'unknown-canonical-unit', 'Quantity field canonical unit must be registered.', { canonicalUnit: policies.canonicalUnit });
  }
  if (policies.unitSystem !== undefined && (typeof policies.unitSystem !== 'object' || policies.unitSystem === null
    || typeof policies.unitSystem.getDefaultUnit !== 'function' || typeof policies.unitSystem.getUnits !== 'function')) {
    return fail('construction', 'invalid-unit-system', 'Quantity field unit system must provide default and compatible display units.');
  }
  return ok(true);
}

function normalizeBounds(policies: QuantityFieldPolicies): Result<{
  readonly min: ReturnType<typeof parseDecimal>;
  readonly max: ReturnType<typeof parseDecimal>;
}> {
  const min = policies.min === undefined ? null : parseDecimal(policies.min);
  const max = policies.max === undefined ? null : parseDecimal(policies.max);
  if (policies.min !== undefined && min === null) return fail('construction', 'invalid-quantity-minimum', 'Quantity minimum must be canonical decimal text.');
  if (policies.max !== undefined && max === null) return fail('construction', 'invalid-quantity-maximum', 'Quantity maximum must be canonical decimal text.');
  if (min !== null && max !== null && compareDecimal(min, max) > 0) return fail('construction', 'inverted-quantity-bounds', 'Quantity minimum must not exceed its maximum.');
  return ok(Object.freeze({ min, max }));
}

function conversionOptions(policies: QuantityFieldPolicies) {
  return Object.freeze({
    ...(policies.precision === undefined ? {} : { precision: policies.precision }),
    ...(policies.rounding === undefined ? {} : { rounding: policies.rounding }),
  });
}

function asConstruction<T>(result: Result<T>): Result<T> {
  return result.ok ? result : { ok: false, error: { ...result.error, class: 'construction' } };
}
