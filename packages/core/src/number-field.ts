import type { Result } from './shared.js';
import {
  addDecimal,
  compareDecimal,
  decimalToString,
  divideDecimal,
  multiplyDecimal,
  negateDecimal,
  parseDecimal,
  subtractDecimal,
  type DecimalRounding,
  type ExactDecimal,
} from './internal/kernel/decimal.js';
import { fail, ok, validateSafeCeiling } from './internal/kernel/foundation.js';
import { createMachineUpdate } from './internal/kernel/machine.js';
import {
  applyTextEvent,
  createTextEditingState,
  normalizeTextEditingState,
  type TextEditingState,
  type TextEvent,
} from './text.js';

export interface NumericExpressionResult {
  readonly expression: string;
  readonly value: string;
}

export interface NumericExpressionEvaluator {
  evaluate(expression: string): Result<NumericExpressionResult>;
}

export interface CalculatorExpressionOptions {
  readonly precision?: number;
  readonly rounding?: DecimalRounding;
  readonly maxCodeUnits?: number;
  readonly maxTokens?: number;
  readonly maxDepth?: number;
  readonly maxOperations?: number;
  readonly maxExponent?: number;
}

export interface NumberFieldState {
  readonly value: string | null;
  readonly inputState: TextEditingState;
}

export type NumberFieldEvent =
  | { readonly type: 'text'; readonly event: TextEvent }
  | 'commit'
  | 'cancel';

export type NumberFieldCommand =
  | { readonly type: 'input-state-changed'; readonly value: TextEditingState }
  | { readonly type: 'value-committed'; readonly value: string | null; readonly expression: string };

export interface NumberFieldPolicies {
  readonly evaluator?: NumericExpressionEvaluator;
  readonly min?: string;
  readonly max?: string;
  readonly required?: boolean;
}

export interface NumberFieldUpdate {
  readonly state: NumberFieldState;
  readonly commands: readonly NumberFieldCommand[];
}

interface CalculatorLimits {
  readonly precision: number;
  readonly rounding: DecimalRounding;
  readonly maxCodeUnits: number;
  readonly maxTokens: number;
  readonly maxDepth: number;
  readonly maxOperations: number;
  readonly maxExponent: number;
}

type Operator = '+' | '-' | '*' | '/' | '^';
type Token =
  | { readonly type: 'number'; readonly text: string; readonly offset: number }
  | { readonly type: 'operator'; readonly operator: Operator; readonly offset: number }
  | { readonly type: 'percent' | 'left' | 'right'; readonly offset: number }
  | { readonly type: 'end'; readonly offset: number };

type ExpressionNode =
  | { readonly type: 'number'; readonly value: ExactDecimal }
  | { readonly type: 'unary'; readonly operator: '+' | '-'; readonly operand: ExpressionNode }
  | { readonly type: 'percent'; readonly operand: ExpressionNode }
  | { readonly type: 'binary'; readonly operator: Operator; readonly left: ExpressionNode; readonly right: ExpressionNode };

export function createCalculatorExpression(
  options: CalculatorExpressionOptions = {},
): Result<NumericExpressionEvaluator> {
  const limits = normalizeCalculatorLimits(options);
  if (!limits.ok) return limits;
  return ok(Object.freeze({
    evaluate(expression: string): Result<NumericExpressionResult> {
      return evaluateCalculator(expression, limits.value);
    },
  }));
}

export function createNumberFieldState(
  value: string | null = null,
  inputState?: TextEditingState,
): Result<NumberFieldState> {
  if (value !== null && typeof value !== 'string') {
    return fail('construction', 'invalid-number-field-value', 'Number field value must be decimal text or null.');
  }
  const parsed = value === null ? null : parseDecimal(value);
  if (value !== null && parsed === null) {
    return fail('construction', 'invalid-number-field-value', 'Number field value must be finite decimal text.', { value });
  }
  const canonicalValue = parsed === null ? null : decimalToString(parsed);
  const input = inputState === undefined
    ? createCommittedInput(canonicalValue)
    : normalizeTextEditingState(inputState);
  if (!input.ok) return input;
  return ok(Object.freeze({
    value: canonicalValue,
    inputState: input.value,
  }));
}

export function applyNumberFieldEvent(
  state: NumberFieldState,
  event: NumberFieldEvent,
  policies: NumberFieldPolicies = {},
): Result<NumberFieldUpdate> {
  const valid = createNumberFieldState(state.value, state.inputState);
  if (!valid.ok) return { ok: false, error: { ...valid.error, class: 'transition-rejection' } };
  const bounds = normalizeBounds(policies);
  if (!bounds.ok) return bounds;
  if (typeof event === 'object') {
    if (event.type !== 'text' || typeof event.event !== 'object' || event.event === null) {
      return fail('transition-rejection', 'invalid-number-field-text-event', 'Number field input must be a semantic text event.');
    }
    const edited = applyTextEvent(valid.value.inputState, event.event);
    if (!edited.ok) return edited;
    return createMachineUpdate(
      Object.freeze({ value: valid.value.value, inputState: edited.value.state }),
      [{ type: 'input-state-changed', value: edited.value.state }],
    );
  }
  if (event === 'cancel') {
    const restored = createCommittedInput(valid.value.value);
    if (!restored.ok) return restored;
    if (sameTextState(restored.value, valid.value.inputState)) return createMachineUpdate(valid.value);
    return createMachineUpdate(
      Object.freeze({ value: valid.value.value, inputState: restored.value }),
      [{ type: 'input-state-changed', value: restored.value }],
    );
  }
  if (event !== 'commit') {
    return fail('transition-rejection', 'unsupported-number-field-event', 'Number field event is unsupported.');
  }
  if (valid.value.inputState.composition !== null) {
    return fail('transition-rejection', 'number-field-composition-active', 'Number field cannot commit while text composition is active.');
  }
  const expression = valid.value.inputState.snapshot.text.trim();
  if (expression.length === 0) {
    if (policies.required === true) {
      return fail('transition-rejection', 'number-field-value-required', 'Number field requires a value.');
    }
    const input = createCommittedInput(null);
    if (!input.ok) return input;
    return createMachineUpdate(
      Object.freeze({ value: null, inputState: input.value }),
      [
        { type: 'input-state-changed', value: input.value },
        { type: 'value-committed', value: null, expression },
      ],
    );
  }
  const evaluated = safelyEvaluate(policies.evaluator ?? literalEvaluator, expression);
  if (!evaluated.ok) return evaluated;
  const parsed = parseDecimal(evaluated.value.value);
  if (parsed === null) {
    return fail('transition-rejection', 'invalid-number-field-evaluation', 'Number evaluator must return finite decimal text.');
  }
  if (bounds.value.min !== null && compareDecimal(parsed, bounds.value.min) < 0) {
    return fail('transition-rejection', 'number-field-value-below-minimum', 'Number field value is below its minimum.', { value: evaluated.value.value, min: policies.min });
  }
  if (bounds.value.max !== null && compareDecimal(parsed, bounds.value.max) > 0) {
    return fail('transition-rejection', 'number-field-value-above-maximum', 'Number field value is above its maximum.', { value: evaluated.value.value, max: policies.max });
  }
  const value = decimalToString(parsed);
  const input = createCommittedInput(value);
  if (!input.ok) return input;
  return createMachineUpdate(
    Object.freeze({ value, inputState: input.value }),
    [
      { type: 'input-state-changed', value: input.value },
      { type: 'value-committed', value, expression: evaluated.value.expression },
    ],
  );
}

function createCommittedInput(value: string | null): Result<TextEditingState> {
  const text = value ?? '';
  return createTextEditingState(text, {
    anchorCodeUnitOffset: text.length,
    focusCodeUnitOffset: text.length,
  });
}

function sameTextState(left: TextEditingState, right: TextEditingState): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

const literalEvaluator: NumericExpressionEvaluator = Object.freeze({
  evaluate(expression: string): Result<NumericExpressionResult> {
    const value = parseDecimal(expression);
    return value === null
      ? fail('transition-rejection', 'invalid-number-literal', 'Number field draft must be a finite decimal literal.', { expression })
      : ok(Object.freeze({ expression, value: decimalToString(value) }));
  },
});

function safelyEvaluate(
  evaluator: NumericExpressionEvaluator,
  expression: string,
): Result<NumericExpressionResult> {
  if (typeof evaluator !== 'object' || evaluator === null || typeof evaluator.evaluate !== 'function') {
    return fail('construction', 'invalid-number-evaluator', 'Number field evaluator must expose evaluate(expression).');
  }
  try {
    return evaluator.evaluate(expression);
  } catch (error) {
    return fail('transition-rejection', 'number-evaluator-threw', 'Number field evaluator threw while evaluating its draft.', { cause: error instanceof Error ? error.message : String(error) });
  }
}

function normalizeBounds(policies: NumberFieldPolicies): Result<{
  readonly min: ExactDecimal | null;
  readonly max: ExactDecimal | null;
}> {
  const min = policies.min === undefined ? null : parseDecimal(policies.min);
  const max = policies.max === undefined ? null : parseDecimal(policies.max);
  if (policies.min !== undefined && min === null) return fail('construction', 'invalid-number-field-minimum', 'Number field minimum must be finite decimal text.');
  if (policies.max !== undefined && max === null) return fail('construction', 'invalid-number-field-maximum', 'Number field maximum must be finite decimal text.');
  if (min !== null && max !== null && compareDecimal(min, max) > 0) return fail('construction', 'inverted-number-field-bounds', 'Number field minimum must not exceed its maximum.');
  return ok(Object.freeze({ min, max }));
}

function normalizeCalculatorLimits(options: CalculatorExpressionOptions): Result<CalculatorLimits> {
  const values = {
    precision: options.precision ?? 12,
    maxCodeUnits: options.maxCodeUnits ?? 1_024,
    maxTokens: options.maxTokens ?? 256,
    maxDepth: options.maxDepth ?? 32,
    maxOperations: options.maxOperations ?? 256,
    maxExponent: options.maxExponent ?? 1_000,
  };
  for (const [name, value, minimum] of [
    ['precision', values.precision, 0],
    ['maxCodeUnits', values.maxCodeUnits, 1],
    ['maxTokens', values.maxTokens, 1],
    ['maxDepth', values.maxDepth, 1],
    ['maxOperations', values.maxOperations, 1],
    ['maxExponent', values.maxExponent, 0],
  ] as const) {
    const error = validateSafeCeiling(value, name, minimum);
    if (error !== null) return { ok: false, error };
  }
  const rounding = options.rounding ?? 'half-even';
  if (rounding !== 'half-even' && rounding !== 'half-up' && rounding !== 'toward-zero') {
    return fail('construction', 'invalid-decimal-rounding', 'Calculator rounding must be half-even, half-up, or toward-zero.');
  }
  return ok(Object.freeze({ ...values, rounding }));
}

function evaluateCalculator(
  expression: string,
  limits: CalculatorLimits,
): Result<NumericExpressionResult> {
  if (typeof expression !== 'string') {
    return fail('transition-rejection', 'invalid-calculator-expression', 'Calculator expression must be text.');
  }
  if (expression.length === 0) {
    return fail('transition-rejection', 'empty-calculator-expression', 'Calculator expression must not be empty.');
  }
  if (expression.length > limits.maxCodeUnits) {
    return fail('resource-rejection', 'calculator-code-unit-ceiling-exceeded', 'Calculator expression exceeds maxCodeUnits.', { codeUnits: expression.length, maxCodeUnits: limits.maxCodeUnits });
  }
  const tokens = tokenize(expression, limits.maxTokens);
  if (!tokens.ok) return tokens;
  const parser = new ExpressionParser(tokens.value, limits);
  const parsed = parser.parse();
  if (!parsed.ok) return parsed;
  const evaluated = evaluateNode(parsed.value, limits, { operations: 0 });
  if (!evaluated.ok) return evaluated;
  const value = decimalToString(evaluated.value);
  if (value.length > limits.maxCodeUnits) {
    return fail('resource-rejection', 'calculator-result-ceiling-exceeded', 'Calculator result exceeds maxCodeUnits.', { codeUnits: value.length, maxCodeUnits: limits.maxCodeUnits });
  }
  return ok(Object.freeze({ expression, value }));
}

function tokenize(expression: string, maxTokens: number): Result<readonly Token[]> {
  const tokens: Token[] = [];
  let offset = 0;
  while (offset < expression.length) {
    const character = expression[offset] ?? '';
    if (/\s/u.test(character)) { offset += 1; continue; }
    if (/\d|\./u.test(character)) {
      const start = offset;
      let dots = 0;
      while (offset < expression.length && /\d|\./u.test(expression[offset] ?? '')) {
        if (expression[offset] === '.') dots += 1;
        offset += 1;
      }
      const text = expression.slice(start, offset);
      if (dots > 1 || parseDecimal(text) === null) {
        return fail('transition-rejection', 'invalid-calculator-number', 'Calculator expression contains an invalid number.', { text, offset: start });
      }
      tokens.push(Object.freeze({ type: 'number', text, offset: start }));
    } else if ('+-*/^'.includes(character) || character === '×' || character === '÷' || character === '−') {
      const operator = character === '×' ? '*' : character === '÷' ? '/' : character === '−' ? '-' : character as Operator;
      tokens.push(Object.freeze({ type: 'operator', operator, offset }));
      offset += 1;
    } else if (character === '%') { tokens.push(Object.freeze({ type: 'percent', offset })); offset += 1; }
    else if (character === '(') { tokens.push(Object.freeze({ type: 'left', offset })); offset += 1; }
    else if (character === ')') { tokens.push(Object.freeze({ type: 'right', offset })); offset += 1; }
    else return fail('transition-rejection', 'unsupported-calculator-token', 'Calculator expression contains an unsupported token.', { character, offset });
    if (tokens.length > maxTokens) return fail('resource-rejection', 'calculator-token-ceiling-exceeded', 'Calculator expression exceeds maxTokens.', { maxTokens });
  }
  tokens.push(Object.freeze({ type: 'end', offset }));
  return ok(Object.freeze(tokens));
}

class ExpressionParser {
  readonly #tokens: readonly Token[];
  readonly #limits: CalculatorLimits;
  #index = 0;
  #depth = 0;
  #operations = 0;

  public constructor(tokens: readonly Token[], limits: CalculatorLimits) {
    this.#tokens = tokens;
    this.#limits = limits;
  }

  public parse(): Result<ExpressionNode> {
    const expression = this.#parseAdditive();
    if (!expression.ok) return expression;
    const token = this.#current();
    return token.type === 'end'
      ? expression
      : fail('transition-rejection', 'unexpected-calculator-token', 'Calculator expression has an unexpected trailing token.', { offset: token.offset });
  }

  #parseAdditive(): Result<ExpressionNode> {
    let left = this.#parseMultiplicative();
    if (!left.ok) return left;
    while (this.#operator('+') || this.#operator('-')) {
      const operator = (this.#take() as Extract<Token, { type: 'operator' }>).operator;
      const right = this.#parseMultiplicative();
      if (!right.ok) return right;
      const combined = this.#binary(operator, left.value, right.value);
      if (!combined.ok) return combined;
      left = combined;
    }
    return left;
  }

  #parseMultiplicative(): Result<ExpressionNode> {
    let left = this.#parseUnary();
    if (!left.ok) return left;
    while (this.#operator('*') || this.#operator('/')) {
      const operator = (this.#take() as Extract<Token, { type: 'operator' }>).operator;
      const right = this.#parseUnary();
      if (!right.ok) return right;
      const combined = this.#binary(operator, left.value, right.value);
      if (!combined.ok) return combined;
      left = combined;
    }
    return left;
  }

  #parseUnary(): Result<ExpressionNode> {
    if (this.#operator('+') || this.#operator('-')) {
      const operator = (this.#take() as Extract<Token, { type: 'operator' }>).operator as '+' | '-';
      const operand = this.#parseUnary();
      if (!operand.ok) return operand;
      const operation = this.#countOperation();
      return operation.ok ? ok(Object.freeze({ type: 'unary', operator, operand: operand.value })) : operation;
    }
    return this.#parsePower();
  }

  #parsePower(): Result<ExpressionNode> {
    const left = this.#parsePostfix();
    if (!left.ok || !this.#operator('^')) return left;
    this.#take();
    const right = this.#parseUnary();
    if (!right.ok) return right;
    return this.#binary('^', left.value, right.value);
  }

  #parsePostfix(): Result<ExpressionNode> {
    const primary = this.#parsePrimary();
    if (!primary.ok) return primary;
    let operand = primary.value;
    while (this.#current().type === 'percent') {
      this.#take();
      const operation = this.#countOperation();
      if (!operation.ok) return operation;
      operand = Object.freeze({ type: 'percent', operand });
    }
    return ok(operand);
  }

  #parsePrimary(): Result<ExpressionNode> {
    const token = this.#current();
    if (token.type === 'number') {
      this.#take();
      return ok(Object.freeze({ type: 'number', value: parseDecimal(token.text) as ExactDecimal }));
    }
    if (token.type !== 'left') {
      return fail('transition-rejection', 'calculator-operand-expected', 'Calculator expression requires a number or parenthesized expression.', { offset: token.offset });
    }
    this.#take();
    this.#depth += 1;
    if (this.#depth > this.#limits.maxDepth) {
      return fail('resource-rejection', 'calculator-depth-ceiling-exceeded', 'Calculator expression exceeds maxDepth.', { maxDepth: this.#limits.maxDepth });
    }
    const expression = this.#parseAdditive();
    this.#depth -= 1;
    if (!expression.ok) return expression;
    const closing = this.#current();
    if (closing.type !== 'right') {
      return fail('transition-rejection', 'calculator-closing-parenthesis-expected', 'Calculator expression is missing a closing parenthesis.', { offset: closing.offset });
    }
    this.#take();
    return expression;
  }

  #binary(operator: Operator, left: ExpressionNode, right: ExpressionNode): Result<ExpressionNode> {
    const operation = this.#countOperation();
    return operation.ok ? ok(Object.freeze({ type: 'binary', operator, left, right })) : operation;
  }

  #countOperation(): Result<true> {
    this.#operations += 1;
    return this.#operations > this.#limits.maxOperations
      ? fail('resource-rejection', 'calculator-operation-ceiling-exceeded', 'Calculator expression exceeds maxOperations.', { maxOperations: this.#limits.maxOperations })
      : ok(true);
  }

  #operator(operator: Operator): boolean {
    const token = this.#current();
    return token.type === 'operator' && token.operator === operator;
  }

  #current(): Token { return this.#tokens[this.#index] as Token; }
  #take(): Token { const token = this.#current(); this.#index += 1; return token; }
}

function evaluateNode(
  node: ExpressionNode,
  limits: CalculatorLimits,
  budget: { operations: number },
): Result<ExactDecimal> {
  if (node.type === 'number') return ok(node.value);
  budget.operations += 1;
  if (budget.operations > limits.maxOperations) {
    return fail('resource-rejection', 'calculator-operation-ceiling-exceeded', 'Calculator evaluation exceeds maxOperations.', { maxOperations: limits.maxOperations });
  }
  if (node.type === 'unary') {
    const operand = evaluateNode(node.operand, limits, budget);
    return operand.ok ? ok(node.operator === '-' ? negateDecimal(operand.value) : operand.value) : operand;
  }
  if (node.type === 'percent') {
    const operand = evaluateNode(node.operand, limits, budget);
    if (!operand.ok) return operand;
    return divide(operand.value, { coefficient: 100n, scale: 0 }, limits);
  }
  const left = evaluateNode(node.left, limits, budget);
  if (!left.ok) return left;
  if ((node.operator === '+' || node.operator === '-') && node.right.type === 'percent') {
    const percentage = evaluateNode(node.right.operand, limits, budget);
    if (!percentage.ok) return percentage;
    const ratio = divide(percentage.value, { coefficient: 100n, scale: 0 }, limits);
    if (!ratio.ok) return ratio;
    const delta = multiplyDecimal(left.value, ratio.value);
    return checkedDecimal(node.operator === '+' ? addDecimal(left.value, delta) : subtractDecimal(left.value, delta), limits);
  }
  const right = evaluateNode(node.right, limits, budget);
  if (!right.ok) return right;
  if (node.operator === '+') return checkedDecimal(addDecimal(left.value, right.value), limits);
  if (node.operator === '-') return checkedDecimal(subtractDecimal(left.value, right.value), limits);
  if (node.operator === '*') return checkedDecimal(multiplyDecimal(left.value, right.value), limits);
  if (node.operator === '/') return divide(left.value, right.value, limits);
  return power(left.value, right.value, limits);
}

function divide(
  numerator: ExactDecimal,
  denominator: ExactDecimal,
  limits: CalculatorLimits,
): Result<ExactDecimal> {
  const value = divideDecimal(numerator, denominator, limits.precision, limits.rounding);
  return value === null
    ? fail('transition-rejection', 'calculator-division-by-zero', 'Calculator expression cannot divide by zero.')
    : checkedDecimal(value, limits);
}

function power(
  base: ExactDecimal,
  exponent: ExactDecimal,
  limits: CalculatorLimits,
): Result<ExactDecimal> {
  if (exponent.scale !== 0) {
    return fail('transition-rejection', 'calculator-fractional-exponent', 'Calculator exponent must be an integer.', { exponent: decimalToString(exponent) });
  }
  const maximum = BigInt(limits.maxExponent);
  const absolute = exponent.coefficient < 0n ? -exponent.coefficient : exponent.coefficient;
  if (absolute > maximum) {
    return fail('resource-rejection', 'calculator-exponent-ceiling-exceeded', 'Calculator exponent exceeds maxExponent.', { exponent: exponent.coefficient.toString(), maxExponent: limits.maxExponent });
  }
  let result: ExactDecimal = { coefficient: 1n, scale: 0 };
  let factor = base;
  let remaining = absolute;
  while (remaining > 0n) {
    if (remaining % 2n === 1n) {
      result = multiplyDecimal(result, factor);
      const checked = checkedDecimal(result, limits);
      if (!checked.ok) return checked;
    }
    remaining /= 2n;
    if (remaining > 0n) {
      factor = multiplyDecimal(factor, factor);
      const checked = checkedDecimal(factor, limits);
      if (!checked.ok) return checked;
    }
  }
  return exponent.coefficient < 0n
    ? divide({ coefficient: 1n, scale: 0 }, result, limits)
    : checkedDecimal(result, limits);
}

function checkedDecimal(value: ExactDecimal, limits: CalculatorLimits): Result<ExactDecimal> {
  const text = decimalToString(value);
  return text.length > limits.maxCodeUnits
    ? fail('resource-rejection', 'calculator-result-ceiling-exceeded', 'Calculator intermediate result exceeds maxCodeUnits.', { codeUnits: text.length, maxCodeUnits: limits.maxCodeUnits })
    : ok(value);
}
