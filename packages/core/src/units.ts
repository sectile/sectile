import { unwrap } from './result.js';
import type { Result } from './shared.js';
import {
  decimalToString,
  divideDecimal,
  parseDecimal,
  pow10,
  reduceFraction,
  type DecimalRounding,
  type ExactDecimal,
} from './internal/kernel/decimal.js';
import { fail, ok, validateSafeCeiling } from './internal/kernel/foundation.js';

export type UnitID = string;
export type Dimension = Readonly<Record<string, number>>;

export interface UnitRatio {
  readonly numerator: string;
  readonly denominator: string;
}

export type UnitScalar = string | UnitRatio;

export interface UnitDefinition {
  readonly id: UnitID;
  readonly symbol: string;
  readonly aliases?: readonly string[];
  readonly dimension: Dimension;
  readonly scale: UnitScalar;
  readonly offset?: UnitScalar;
}

export interface UnitExpressionFactor {
  readonly unit: UnitID;
  readonly exponent: number;
}

export interface UnitExpression {
  readonly source: string;
  readonly dimension: Dimension;
  readonly scale: UnitScalar;
  readonly offset?: UnitScalar;
  readonly resolvedUnit: UnitID | null;
  readonly factors: readonly UnitExpressionFactor[];
}

export interface UnitConversionOptions {
  readonly precision?: number;
  readonly rounding?: DecimalRounding;
}

export interface UnitConversion {
  readonly value: string;
  readonly from: UnitID;
  readonly to: UnitID;
}

export interface UnitExpressionConversion {
  readonly value: string;
  readonly from: UnitExpression;
  readonly to: UnitID;
}

export interface UnitRegistry {
  readonly units: readonly UnitDefinition[];
  get(id: UnitID): UnitDefinition | null;
  compatible(left: UnitID, right: UnitID): boolean;
  parse(expression: string): Result<UnitExpression>;
  convert(value: string, from: UnitID, to: UnitID, options?: UnitConversionOptions): Result<UnitConversion>;
  convertExpression(
    value: string,
    from: string | UnitExpression,
    to: UnitID,
    options?: UnitConversionOptions,
  ): Result<UnitExpressionConversion>;
}

export interface UnitSystemPreferenceDefinition {
  readonly referenceUnit: UnitID;
  readonly defaultUnit: UnitID;
  readonly units: readonly UnitID[];
}

export interface UnitSystemDefinition {
  readonly id: string;
  readonly preferences: readonly UnitSystemPreferenceDefinition[];
}

export interface UnitSystemProfile {
  readonly id: string;
  getDefaultUnit(canonicalUnit: UnitID): UnitID | null;
  getUnits(canonicalUnit: UnitID): readonly UnitID[];
}

interface NormalizedUnit {
  readonly definition: UnitDefinition;
  readonly dimensionKey: string;
  readonly scale: Fraction;
  readonly offset: Fraction;
}

interface Fraction { readonly numerator: bigint; readonly denominator: bigint }

export function createUnitRegistry(definitions: readonly UnitDefinition[]): UnitRegistry {
  return unwrap(tryCreateUnitRegistry(definitions));
}

export function tryCreateUnitRegistry(definitions: readonly UnitDefinition[]): Result<UnitRegistry> {
  if (!Array.isArray(definitions) || definitions.length === 0) {
    return fail('construction', 'empty-unit-registry', 'Unit registry requires at least one definition.');
  }
  const units = new Map<UnitID, NormalizedUnit>();
  for (const definition of definitions) {
    const normalized = normalizeUnitDefinition(definition);
    if (!normalized.ok) return normalized;
    if (units.has(normalized.value.definition.id)) {
      return fail('construction', 'duplicate-unit-id', 'Unit IDs must be unique.', { id: normalized.value.definition.id });
    }
    units.set(normalized.value.definition.id, normalized.value);
  }
  const publicUnits = Object.freeze([...units.values()].map(({ definition }) => definition));
  const tokens = createUnitTokens(units);
  if (!tokens.ok) return tokens;
  const registry: UnitRegistry = Object.freeze({
    units: publicUnits,
    get(id: UnitID): UnitDefinition | null {
      return units.get(id)?.definition ?? null;
    },
    compatible(left: UnitID, right: UnitID): boolean {
      const a = units.get(left);
      const b = units.get(right);
      return a !== undefined && b !== undefined && a.dimensionKey === b.dimensionKey;
    },
    parse(expression: string): Result<UnitExpression> {
      return parseUnitExpression(units, tokens.value, expression);
    },
    convert(value: string, from: UnitID, to: UnitID, options: UnitConversionOptions = {}): Result<UnitConversion> {
      return convertUnitValue(units, value, from, to, options);
    },
    convertExpression(
      value: string,
      from: string | UnitExpression,
      to: UnitID,
      options: UnitConversionOptions = {},
    ): Result<UnitExpressionConversion> {
      const expression = typeof from === 'string' ? parseUnitExpression(units, tokens.value, from) : normalizeUnitExpression(units, from);
      if (!expression.ok) return expression;
      return convertExpressionValue(units, value, expression.value, to, options);
    },
  });
  return ok(registry);
}

export function createUnitSystemProfile(
  registry: UnitRegistry,
  definition: UnitSystemDefinition,
): UnitSystemProfile {
  return unwrap(tryCreateUnitSystemProfile(registry, definition));
}

export function tryCreateUnitSystemProfile(
  registry: UnitRegistry,
  definition: UnitSystemDefinition,
): Result<UnitSystemProfile> {
  if (typeof registry !== 'object' || registry === null || typeof registry.compatible !== 'function') {
    return fail('construction', 'invalid-unit-registry', 'Unit system profile requires a unit registry.');
  }
  if (typeof definition !== 'object' || definition === null || typeof definition.id !== 'string' || definition.id.length === 0
    || !Array.isArray(definition.preferences)) {
    return fail('construction', 'invalid-unit-system', 'Unit system definition requires an ID and preferences.');
  }
  const preferences = new Map<UnitID, { readonly defaultUnit: UnitID; readonly units: readonly UnitID[] }>();
  for (const preference of definition.preferences) {
    if (registry.get(preference.referenceUnit) === null || registry.get(preference.defaultUnit) === null
      || !Array.isArray(preference.units) || preference.units.length === 0) {
      return fail('construction', 'invalid-unit-system-preference', 'Unit system preference requires registered reference, default, and display units.');
    }
    const displayUnits: readonly UnitID[] = Object.freeze([...new Set<UnitID>(preference.units)]);
    if (!displayUnits.includes(preference.defaultUnit)
      || displayUnits.some((unit) => registry.get(unit) === null || !registry.compatible(preference.referenceUnit, unit))) {
      return fail('construction', 'incompatible-unit-system-preference', 'Unit system preference units must share one dimension and include the default unit.', { referenceUnit: preference.referenceUnit });
    }
    for (const unit of registry.units) {
      if (!registry.compatible(preference.referenceUnit, unit.id)) continue;
      if (preferences.has(unit.id)) {
        return fail('construction', 'duplicate-unit-system-dimension', 'Unit system may declare each dimension only once.', { referenceUnit: preference.referenceUnit });
      }
      preferences.set(unit.id, Object.freeze({ defaultUnit: preference.defaultUnit, units: displayUnits }));
    }
  }
  return ok(Object.freeze({
    id: definition.id,
    getDefaultUnit(canonicalUnit: UnitID): UnitID | null {
      return preferences.get(canonicalUnit)?.defaultUnit ?? null;
    },
    getUnits(canonicalUnit: UnitID): readonly UnitID[] {
      return preferences.get(canonicalUnit)?.units ?? Object.freeze([]);
    },
  }));
}

interface UnitToken { readonly text: string; readonly unit: UnitID }

function createUnitTokens(units: ReadonlyMap<UnitID, NormalizedUnit>): Result<readonly UnitToken[]> {
  const tokens = new Map<string, UnitID>();
  for (const { definition } of units.values()) {
    const candidates = [definition.id, definition.symbol, ...(definition.aliases ?? [])];
    for (const token of candidates) {
      if (containsUnitGrammar(token)) continue;
      const previous = tokens.get(token);
      if (previous !== undefined && previous !== definition.id) {
        return fail('construction', 'ambiguous-unit-token', 'Unit symbols and aliases must resolve to one unit.', { token, units: [previous, definition.id] });
      }
      tokens.set(token, definition.id);
    }
  }
  return ok(Object.freeze([...tokens].map(([text, unit]) => Object.freeze({ text, unit }))
    .sort((left, right) => right.text.length - left.text.length || left.text.localeCompare(right.text))));
}

function containsUnitGrammar(token: string): boolean {
  return /[*/·^⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻]/u.test(token);
}

function parseUnitExpression(
  units: ReadonlyMap<UnitID, NormalizedUnit>,
  tokens: readonly UnitToken[],
  source: string,
): Result<UnitExpression> {
  if (typeof source !== 'string' || source.trim().length === 0) {
    return fail('transition-rejection', 'empty-unit-expression', 'Unit expression must not be empty.');
  }
  const input = source.trim();
  const factors: UnitExpressionFactor[] = [];
  let position = 0;
  let sign: 1 | -1 = 1;
  while (position < input.length) {
    position = skipSpaces(input, position);
    const token = tokens.find((candidate) => input.startsWith(candidate.text, position)
      && isUnitBoundary(input[position + candidate.text.length]));
    if (token === undefined) {
      return fail('transition-rejection', 'unknown-unit-token', 'Unit expression contains an unknown or ambiguous token.', { expression: source, position });
    }
    position += token.text.length;
    const exponent = parseUnitExponent(input, position);
    if (!exponent.ok) return exponent;
    position = exponent.value.position;
    const signedExponent = exponent.value.value * sign;
    if (signedExponent === 0 || Math.abs(signedExponent) > 16) {
      return fail('transition-rejection', 'unit-exponent-out-of-range', 'Unit exponents must be non-zero integers from -16 through 16.', { exponent: signedExponent });
    }
    factors.push(Object.freeze({ unit: token.unit, exponent: signedExponent }));
    const beforeSpace = position;
    position = skipSpaces(input, position);
    if (position >= input.length) break;
    const separator = input[position];
    if (separator === '/' || separator === '*' || separator === '·') {
      sign = separator === '/' ? -1 : 1;
      position += 1;
    } else if (position > beforeSpace) {
      sign = 1;
    } else {
      return fail('transition-rejection', 'invalid-unit-expression', 'Unit factors require whitespace, multiplication, or division separators.', { expression: source, position });
    }
  }
  if (factors.length === 0) return fail('transition-rejection', 'empty-unit-expression', 'Unit expression must contain at least one factor.');
  return buildUnitExpression(units, input, factors);
}

function buildUnitExpression(
  units: ReadonlyMap<UnitID, NormalizedUnit>,
  source: string,
  factors: readonly UnitExpressionFactor[],
): Result<UnitExpression> {
  const dimensions = new Map<string, number>();
  let scale = normalizeFraction(1n, 1n);
  let offset = normalizeFraction(0n, 1n);
  for (const factor of factors) {
    const unit = units.get(factor.unit);
    if (unit === undefined) return fail('transition-rejection', 'unknown-unit', 'Unit expression references an unregistered unit.', { unit: factor.unit });
    if (unit.offset.numerator !== 0n) {
      if (factors.length !== 1 || factor.exponent !== 1) {
        return fail('transition-rejection', 'affine-unit-in-compound-expression', 'Offset units may only appear as a single unit with exponent one.', { unit: factor.unit });
      }
      offset = unit.offset;
    }
    for (const [name, exponent] of Object.entries(unit.definition.dimension)) {
      dimensions.set(name, (dimensions.get(name) ?? 0) + exponent * factor.exponent);
    }
    scale = multiplyFractions(scale, powerFraction(unit.scale, factor.exponent));
  }
  const dimension = normalizeDimension(Object.fromEntries(dimensions));
  if (!dimension.ok) return dimension;
  const resolved = [...units.values()].find((unit) => unit.dimensionKey === dimension.value.key
    && sameFraction(unit.scale, scale) && sameFraction(unit.offset, offset));
  return ok(Object.freeze({
    source,
    dimension: dimension.value.dimension,
    scale: scalarFromFraction(scale),
    ...(offset.numerator === 0n ? {} : { offset: scalarFromFraction(offset) }),
    resolvedUnit: resolved?.definition.id ?? null,
    factors: Object.freeze([...factors]),
  }));
}

function normalizeUnitExpression(
  units: ReadonlyMap<UnitID, NormalizedUnit>,
  expression: UnitExpression,
): Result<UnitExpression> {
  if (typeof expression !== 'object' || expression === null || typeof expression.source !== 'string'
    || !Array.isArray(expression.factors)) {
    return fail('transition-rejection', 'invalid-unit-expression', 'Parsed unit expression must contain source text and factors.');
  }
  for (const factor of expression.factors) {
    if (typeof factor !== 'object' || factor === null || typeof factor.unit !== 'string'
      || !Number.isSafeInteger(factor.exponent) || factor.exponent === 0 || Math.abs(factor.exponent) > 16) {
      return fail('transition-rejection', 'invalid-unit-expression-factor', 'Unit expression factors require a registered unit and a bounded non-zero exponent.');
    }
  }
  return buildUnitExpression(units, expression.source, expression.factors);
}

function convertExpressionValue(
  units: ReadonlyMap<UnitID, NormalizedUnit>,
  value: string,
  expression: UnitExpression,
  to: UnitID,
  options: UnitConversionOptions,
): Result<UnitExpressionConversion> {
  const target = units.get(to);
  const parsed = parseDecimal(value);
  if (target === undefined) return fail('transition-rejection', 'unknown-unit', 'Unit conversion requires a registered target unit.', { to });
  if (parsed === null) return fail('transition-rejection', 'invalid-unit-value', 'Unit conversion value must be finite decimal text.', { value });
  const dimension = normalizeDimension(expression.dimension);
  const scale = parseScalar(expression.scale, 'scale', expression.resolvedUnit ?? 'expression');
  const offset = parseScalar(expression.offset ?? '0', 'offset', expression.resolvedUnit ?? 'expression');
  if (!dimension.ok) return dimension;
  if (!scale.ok) return scale;
  if (!offset.ok) return offset;
  if (dimension.value.key !== target.dimensionKey) {
    return fail('transition-rejection', 'incompatible-unit-dimensions', 'Unit conversion requires matching dimensions.', { expression: expression.source, to });
  }
  const normalizedOptions = normalizeConversionOptions(options);
  if (!normalizedOptions.ok) return normalizedOptions;
  const canonical = addFractions(multiplyFractions(decimalFraction(parsed), scale.value), offset.value);
  const targetValue = divideFractions(subtractFractions(canonical, target.offset), target.scale);
  const converted = divideDecimal(
    { coefficient: targetValue.numerator, scale: 0 },
    { coefficient: targetValue.denominator, scale: 0 },
    normalizedOptions.value.precision,
    normalizedOptions.value.rounding,
  );
  if (converted === null) return fail('internal-invariant', 'unit-conversion-zero-scale', 'Normalized unit scale must not be zero.');
  return ok(Object.freeze({ value: decimalToString(converted), from: expression, to }));
}

function parseUnitExponent(input: string, position: number): Result<{ readonly value: number; readonly position: number }> {
  if (input[position] === '^') {
    const match = /^[+-]?\d+/.exec(input.slice(position + 1));
    if (match === null) return fail('transition-rejection', 'invalid-unit-exponent', 'Caret unit exponent requires a signed integer.', { position });
    return ok(Object.freeze({ value: Number(match[0]), position: position + 1 + match[0].length }));
  }
  const match = /^[⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻]+/u.exec(input.slice(position));
  if (match === null) return ok(Object.freeze({ value: 1, position }));
  const normal = [...match[0]].map((part) => SUPERSCRIPT_DIGITS[part] ?? '').join('');
  if (!/^[+-]?\d+$/.test(normal)) return fail('transition-rejection', 'invalid-unit-exponent', 'Superscript unit exponent requires a signed integer.', { position });
  return ok(Object.freeze({ value: Number(normal), position: position + match[0].length }));
}

const SUPERSCRIPT_DIGITS: Readonly<Record<string, string>> = Object.freeze({
  '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4', '⁵': '5',
  '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9', '⁺': '+', '⁻': '-',
});

function isUnitBoundary(value: string | undefined): boolean {
  return value === undefined || /[\s*/·^⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻]/u.test(value);
}

function skipSpaces(value: string, position: number): number {
  while (position < value.length && /\s/u.test(value[position] ?? '')) position += 1;
  return position;
}

function powerFraction(value: Fraction, exponent: number): Fraction {
  let result = normalizeFraction(1n, 1n);
  const factor = exponent < 0 ? normalizeFraction(value.denominator, value.numerator) : value;
  for (let index = 0; index < Math.abs(exponent); index += 1) result = multiplyFractions(result, factor);
  return result;
}

function sameFraction(left: Fraction, right: Fraction): boolean {
  return left.numerator === right.numerator && left.denominator === right.denominator;
}

function convertUnitValue(
  units: ReadonlyMap<UnitID, NormalizedUnit>,
  value: string,
  from: UnitID,
  to: UnitID,
  options: UnitConversionOptions,
): Result<UnitConversion> {
  const source = units.get(from);
  const target = units.get(to);
  if (source === undefined || target === undefined) {
    return fail('transition-rejection', 'unknown-unit', 'Unit conversion requires registered source and target units.', { from, to });
  }
  if (source.dimensionKey !== target.dimensionKey) {
    return fail('transition-rejection', 'incompatible-unit-dimensions', 'Unit conversion requires matching dimensions.', { from, to });
  }
  const parsed = parseDecimal(value);
  if (parsed === null) {
    return fail('transition-rejection', 'invalid-unit-value', 'Unit conversion value must be finite decimal text.', { value });
  }
  const normalizedOptions = normalizeConversionOptions(options);
  if (!normalizedOptions.ok) return normalizedOptions;
  if (from === to) return ok(Object.freeze({ value: decimalToString(parsed), from, to }));
  const canonical = addFractions(multiplyFractions(decimalFraction(parsed), source.scale), source.offset);
  const targetValue = divideFractions(subtractFractions(canonical, target.offset), target.scale);
  const converted = divideDecimal(
    { coefficient: targetValue.numerator, scale: 0 },
    { coefficient: targetValue.denominator, scale: 0 },
    normalizedOptions.value.precision,
    normalizedOptions.value.rounding,
  );
  if (converted === null) return fail('internal-invariant', 'unit-conversion-zero-scale', 'Normalized unit scale must not be zero.');
  return ok(Object.freeze({ value: decimalToString(converted), from, to }));
}

function normalizeUnitDefinition(definition: UnitDefinition): Result<NormalizedUnit> {
  if (typeof definition !== 'object' || definition === null) {
    return fail('construction', 'invalid-unit-definition', 'Unit definition must be an object.');
  }
  if (typeof definition.id !== 'string' || definition.id.length === 0) {
    return fail('construction', 'invalid-unit-id', 'Unit ID must be non-empty text.');
  }
  if (typeof definition.symbol !== 'string' || definition.symbol.length === 0) {
    return fail('construction', 'invalid-unit-symbol', 'Unit symbol must be non-empty text.', { id: definition.id });
  }
  if (definition.aliases !== undefined && (!Array.isArray(definition.aliases)
    || definition.aliases.some((alias) => typeof alias !== 'string' || alias.length === 0))) {
    return fail('construction', 'invalid-unit-aliases', 'Unit aliases must be non-empty text.', { id: definition.id });
  }
  const aliases = Object.freeze([...new Set(definition.aliases ?? [])]);
  const dimension = normalizeDimension(definition.dimension);
  if (!dimension.ok) return dimension;
  const scale = parseScalar(definition.scale, 'scale', definition.id);
  if (!scale.ok) return scale;
  if (scale.value.numerator <= 0n) {
    return fail('construction', 'invalid-unit-scale', 'Unit scale must be a positive finite decimal.', { id: definition.id, scale: definition.scale });
  }
  const offset = parseScalar(definition.offset ?? '0', 'offset', definition.id);
  if (!offset.ok) return offset;
  const normalizedDefinition: UnitDefinition = Object.freeze({
    id: definition.id,
    symbol: definition.symbol,
    ...(aliases.length === 0 ? {} : { aliases }),
    dimension: dimension.value.dimension,
    scale: scalarFromFraction(scale.value),
    ...(offset.value.numerator === 0n ? {} : { offset: scalarFromFraction(offset.value) }),
  });
  return ok(Object.freeze({
    definition: normalizedDefinition,
    dimensionKey: dimension.value.key,
    scale: scale.value,
    offset: offset.value,
  }));
}

function parseScalar(value: UnitScalar, name: 'scale' | 'offset', id: UnitID): Result<Fraction> {
  if (typeof value === 'string') {
    const parsed = parseDecimal(value);
    return parsed === null
      ? fail('construction', `invalid-unit-${name}`, `Unit ${name} must be finite decimal text or an exact ratio.`, { id, value })
      : ok(decimalFraction(parsed));
  }
  if (typeof value !== 'object' || value === null) {
    return fail('construction', `invalid-unit-${name}`, `Unit ${name} must be finite decimal text or an exact ratio.`, { id });
  }
  const numerator = parseDecimal(value.numerator);
  const denominator = parseDecimal(value.denominator);
  if (numerator === null || denominator === null || denominator.coefficient === 0n) {
    return fail('construction', `invalid-unit-${name}`, `Unit ${name} ratio requires finite decimal numerator and non-zero denominator.`, { id });
  }
  return ok(divideFractions(decimalFraction(numerator), decimalFraction(denominator)));
}

function decimalFraction(value: ExactDecimal): Fraction {
  return normalizeFraction(value.coefficient, pow10(value.scale));
}

function scalarFromFraction(value: Fraction): UnitScalar {
  return value.denominator === 1n
    ? value.numerator.toString()
    : Object.freeze({ numerator: value.numerator.toString(), denominator: value.denominator.toString() });
}

function addFractions(left: Fraction, right: Fraction): Fraction {
  return normalizeFraction(
    left.numerator * right.denominator + right.numerator * left.denominator,
    left.denominator * right.denominator,
  );
}

function subtractFractions(left: Fraction, right: Fraction): Fraction {
  return normalizeFraction(
    left.numerator * right.denominator - right.numerator * left.denominator,
    left.denominator * right.denominator,
  );
}

function multiplyFractions(left: Fraction, right: Fraction): Fraction {
  return normalizeFraction(left.numerator * right.numerator, left.denominator * right.denominator);
}

function divideFractions(left: Fraction, right: Fraction): Fraction {
  return normalizeFraction(left.numerator * right.denominator, left.denominator * right.numerator);
}

function normalizeFraction(numerator: bigint, denominator: bigint): Fraction {
  const [nextNumerator, nextDenominator] = reduceFraction(numerator, denominator);
  return Object.freeze({ numerator: nextNumerator, denominator: nextDenominator });
}

function normalizeDimension(dimension: Dimension): Result<{ readonly dimension: Dimension; readonly key: string }> {
  if (typeof dimension !== 'object' || dimension === null || Array.isArray(dimension)) {
    return fail('construction', 'invalid-unit-dimension', 'Unit dimension must be an exponent record.');
  }
  const entries: Array<readonly [string, number]> = [];
  for (const [name, exponent] of Object.entries(dimension)) {
    if (name.length === 0 || !Number.isSafeInteger(exponent)) {
      return fail('construction', 'invalid-dimension-exponent', 'Dimension names must be non-empty and exponents must be safe integers.', { name, exponent });
    }
    if (exponent !== 0) entries.push([name, exponent]);
  }
  entries.sort(([left], [right]) => left.localeCompare(right));
  const normalized = Object.freeze(Object.fromEntries(entries));
  return ok(Object.freeze({
    dimension: normalized,
    key: entries.map(([name, exponent]) => `${name}:${exponent}`).join('|'),
  }));
}

const LENGTH = Object.freeze({ length: 1 });
const AREA = Object.freeze({ length: 2 });
const VOLUME = Object.freeze({ length: 3 });
const MASS = Object.freeze({ mass: 1 });
const TIME = Object.freeze({ time: 1 });
const TEMPERATURE = Object.freeze({ temperature: 1 });
const SPEED = Object.freeze({ length: 1, time: -1 });
const ACCELERATION = Object.freeze({ length: 1, time: -2 });
const INFORMATION = Object.freeze({ information: 1 });

export const standardUnitDefinitions: readonly UnitDefinition[] = Object.freeze([
  unit('millimetre', 'mm', LENGTH, '0.001', ['millimeter']),
  unit('centimetre', 'cm', LENGTH, '0.01', ['centimeter']),
  unit('metre', 'm', LENGTH, '1', ['meter']),
  unit('kilometre', 'km', LENGTH, '1000', ['kilometer']),
  unit('inch', 'in', LENGTH, '0.0254'),
  unit('foot', 'ft', LENGTH, '0.3048', ['feet']),
  unit('yard', 'yd', LENGTH, '0.9144'),
  unit('mile', 'mi', LENGTH, '1609.344'),

  unit('square-metre', 'm²', AREA, '1', ['square-meter']),
  unit('hectare', 'ha', AREA, '10000'),
  unit('square-foot', 'ft²', AREA, '0.09290304'),
  unit('acre', 'acre', AREA, '4046.8564224'),

  unit('millilitre', 'mL', VOLUME, '0.000001', ['milliliter']),
  unit('litre', 'L', VOLUME, '0.001', ['liter']),
  unit('cubic-metre', 'm³', VOLUME, '1', ['cubic-meter']),
  unit('fluid-ounce', 'fl oz', VOLUME, '0.0000295735295625', ['floz', 'fl-oz']),
  unit('cup', 'cup', VOLUME, '0.0002365882365'),
  unit('gallon', 'gal', VOLUME, '0.003785411784'),

  unit('milligram', 'mg', MASS, '0.000001'),
  unit('gram', 'g', MASS, '0.001'),
  unit('kilogram', 'kg', MASS, '1'),
  unit('ounce', 'oz', MASS, '0.028349523125'),
  unit('pound', 'lb', MASS, '0.45359237'),

  unit('millisecond', 'ms', TIME, '0.001'),
  unit('second', 's', TIME, '1', ['sec']),
  unit('minute', 'min', TIME, '60'),
  unit('hour', 'h', TIME, '3600', ['hr']),

  unit('kelvin', 'K', TEMPERATURE, '1'),
  affineUnit('celsius', '°C', TEMPERATURE, '1', '273.15', ['degC']),
  affineUnit('fahrenheit', '°F', TEMPERATURE, { numerator: '5', denominator: '9' }, { numerator: '45967', denominator: '180' }, ['degF']),

  unit('metre-per-second', 'm/s', SPEED, '1', ['meter-per-second']),
  unit('kilometre-per-hour', 'km/h', SPEED, { numerator: '5', denominator: '18' }, ['kph']),
  unit('foot-per-second', 'ft/s', SPEED, '0.3048', ['fps']),
  unit('mile-per-hour', 'mph', SPEED, '0.44704'),

  unit('metre-per-second-squared', 'm/s²', ACCELERATION, '1', ['meter-per-second-squared']),
  unit('foot-per-second-squared', 'ft/s²', ACCELERATION, '0.3048'),

  unit('bit', 'bit', INFORMATION, '0.125'),
  unit('byte', 'B', INFORMATION, '1'),
  unit('kilobyte', 'kB', INFORMATION, '1000'),
  unit('megabyte', 'MB', INFORMATION, '1000000'),
  unit('kibibyte', 'KiB', INFORMATION, '1024'),
  unit('mebibyte', 'MiB', INFORMATION, '1048576'),
]);

export function createStandardUnitRegistry(): UnitRegistry {
  return unwrap(tryCreateStandardUnitRegistry());
}

export function tryCreateStandardUnitRegistry(): Result<UnitRegistry> {
  return tryCreateUnitRegistry(standardUnitDefinitions);
}

export function createMetricUnitSystem(registry: UnitRegistry): UnitSystemProfile {
  return unwrap(tryCreateMetricUnitSystem(registry));
}

export function tryCreateMetricUnitSystem(registry: UnitRegistry): Result<UnitSystemProfile> {
  return tryCreateUnitSystemProfile(registry, {
    id: 'metric',
    preferences: [
      preference('metre', 'metre', ['millimetre', 'centimetre', 'metre', 'kilometre']),
      preference('square-metre', 'square-metre', ['square-metre', 'hectare']),
      preference('cubic-metre', 'litre', ['millilitre', 'litre', 'cubic-metre']),
      preference('kilogram', 'kilogram', ['milligram', 'gram', 'kilogram']),
      preference('second', 'second', ['millisecond', 'second', 'minute', 'hour']),
      preference('kelvin', 'celsius', ['celsius', 'kelvin']),
      preference('metre-per-second', 'kilometre-per-hour', ['metre-per-second', 'kilometre-per-hour']),
      preference('metre-per-second-squared', 'metre-per-second-squared', ['metre-per-second-squared']),
      preference('byte', 'byte', ['bit', 'byte', 'kilobyte', 'megabyte', 'kibibyte', 'mebibyte']),
    ],
  });
}

export function createImperialUnitSystem(registry: UnitRegistry): UnitSystemProfile {
  return unwrap(tryCreateImperialUnitSystem(registry));
}

export function tryCreateImperialUnitSystem(registry: UnitRegistry): Result<UnitSystemProfile> {
  return tryCreateUnitSystemProfile(registry, {
    id: 'imperial',
    preferences: [
      preference('metre', 'foot', ['inch', 'foot', 'yard', 'mile']),
      preference('square-metre', 'square-foot', ['square-foot', 'acre']),
      preference('cubic-metre', 'gallon', ['fluid-ounce', 'cup', 'gallon']),
      preference('kilogram', 'pound', ['ounce', 'pound']),
      preference('second', 'second', ['millisecond', 'second', 'minute', 'hour']),
      preference('kelvin', 'fahrenheit', ['fahrenheit', 'kelvin']),
      preference('metre-per-second', 'mile-per-hour', ['foot-per-second', 'mile-per-hour']),
      preference('metre-per-second-squared', 'foot-per-second-squared', ['foot-per-second-squared']),
      preference('byte', 'byte', ['bit', 'byte', 'kilobyte', 'megabyte', 'kibibyte', 'mebibyte']),
    ],
  });
}

function unit(
  id: UnitID,
  symbol: string,
  dimension: Dimension,
  scale: UnitScalar,
  aliases: readonly string[] = [],
): UnitDefinition {
  return Object.freeze({ id, symbol, dimension, scale, ...(aliases.length === 0 ? {} : { aliases: Object.freeze([...aliases]) }) });
}

function affineUnit(
  id: UnitID,
  symbol: string,
  dimension: Dimension,
  scale: UnitScalar,
  offset: UnitScalar,
  aliases: readonly string[] = [],
): UnitDefinition {
  return Object.freeze({ ...unit(id, symbol, dimension, scale, aliases), offset });
}

function preference(
  referenceUnit: UnitID,
  defaultUnit: UnitID,
  units: readonly UnitID[],
): UnitSystemPreferenceDefinition {
  return Object.freeze({ referenceUnit, defaultUnit, units: Object.freeze([...units]) });
}

function normalizeConversionOptions(options: UnitConversionOptions): Result<Required<UnitConversionOptions>> {
  const precision = options.precision ?? 12;
  const error = validateSafeCeiling(precision, 'precision', 0);
  if (error !== null) return { ok: false, error };
  const rounding = options.rounding ?? 'half-even';
  if (rounding !== 'half-even' && rounding !== 'half-up' && rounding !== 'toward-zero') {
    return fail('construction', 'invalid-unit-rounding', 'Unit rounding must be half-even, half-up, or toward-zero.');
  }
  return ok(Object.freeze({ precision, rounding }));
}
