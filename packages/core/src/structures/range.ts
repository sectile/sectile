import { unwrap } from '../result.js';
import { type Result, type TiePolicy } from '../shared.js';
import type { ExactRatio } from '../internal/kernel/exact-ratio.js';
import {
  addDecimal,
  compareDecimal,
  decimalQuotient,
  decimalToString,
  floorFraction,
  multiplyDecimalByInteger,
  parseDecimal,
  subtractDecimal,
  type ExactDecimal,
} from '../internal/kernel/decimal.js';
import { fail, ok, validateSafeCeiling } from '../internal/kernel/foundation.js';

export interface RangeOptions {
  readonly maxCount?: number;
  readonly maxDecimalCodeUnits?: number;
  readonly maxScale?: number;
}

export interface RangeInput extends RangeOptions {
  readonly origin: string;
  readonly step: string;
  /** Highest tick. Cardinality is count + 1. */
  readonly count: number;
}

export interface BoundedRangeInput extends RangeOptions {
  readonly min: string;
  readonly max: string;
  readonly step: string;
}

export type { ExactRatio } from '../internal/kernel/exact-ratio.js';

export interface ExactRatioOptions {
  /** Maximum absolute numerator width accepted and retained. */
  readonly maxNumeratorBits?: number;
  /** Maximum denominator width accepted and retained. */
  readonly maxDenominatorBits?: number;
}

export const DEFAULT_MAX_RATIO_NUMERATOR_BITS = 4_096;
export const DEFAULT_MAX_RATIO_DENOMINATOR_BITS = 4_096;

interface RatioLimits {
  readonly maxNumeratorBits: number;
  readonly maxDenominatorBits: number;
}

export function createExactRatio(
  numerator: bigint,
  denominator: bigint,
  options: ExactRatioOptions = {},
): ExactRatio {
  return unwrap(tryCreateExactRatio(numerator, denominator, options));
}

export function tryCreateExactRatio(
  numerator: bigint,
  denominator: bigint,
  options: ExactRatioOptions = {},
): Result<ExactRatio> {
  const limits = tryRatioLimits(options);
  if (!limits.ok) return limits;
  return canonicalRatio(numerator, denominator, limits.value);
}

export function compareExactRatios(
  left: ExactRatio,
  right: ExactRatio,
  options: ExactRatioOptions = {},
): -1 | 0 | 1 {
  const [a, b] = checkedRatioPair(left, right, options);
  const leftProduct = a.numerator * b.denominator;
  const rightProduct = b.numerator * a.denominator;
  return leftProduct < rightProduct ? -1 : leftProduct > rightProduct ? 1 : 0;
}

export function clampExactRatio(
  value: ExactRatio,
  minimum: ExactRatio,
  maximum: ExactRatio,
  options: ExactRatioOptions = {},
): ExactRatio {
  const limits = unwrap(tryRatioLimits(options));
  const canonicalValue = unwrap(canonicalRatio(value.numerator, value.denominator, limits));
  const canonicalMinimum = unwrap(canonicalRatio(minimum.numerator, minimum.denominator, limits));
  const canonicalMaximum = unwrap(canonicalRatio(maximum.numerator, maximum.denominator, limits));
  if (compareCanonicalRatios(canonicalMinimum, canonicalMaximum) > 0) {
    return unwrap(fail('construction', 'inverted-bounds', 'minimum must not exceed maximum.'));
  }
  if (compareCanonicalRatios(canonicalValue, canonicalMinimum) < 0) return canonicalMinimum;
  if (compareCanonicalRatios(canonicalValue, canonicalMaximum) > 0) return canonicalMaximum;
  return canonicalValue;
}

export function addExactRatios(
  left: ExactRatio,
  right: ExactRatio,
  options: ExactRatioOptions = {},
): ExactRatio {
  const limits = unwrap(tryRatioLimits(options));
  const a = unwrap(canonicalRatio(left.numerator, left.denominator, limits));
  const b = unwrap(canonicalRatio(right.numerator, right.denominator, limits));
  const divisor = gcd(a.denominator, b.denominator);
  const leftScale = b.denominator / divisor;
  const rightScale = a.denominator / divisor;
  return unwrap(canonicalRatio(
    a.numerator * leftScale + b.numerator * rightScale,
    a.denominator * leftScale,
    limits,
  ));
}

export function subtractExactRatios(
  left: ExactRatio,
  right: ExactRatio,
  options: ExactRatioOptions = {},
): ExactRatio {
  return addExactRatios(left, { numerator: -right.numerator, denominator: right.denominator }, options);
}

export function multiplyExactRatios(
  left: ExactRatio,
  right: ExactRatio,
  options: ExactRatioOptions = {},
): ExactRatio {
  const limits = unwrap(tryRatioLimits(options));
  const a = unwrap(canonicalRatio(left.numerator, left.denominator, limits));
  const b = unwrap(canonicalRatio(right.numerator, right.denominator, limits));
  const crossA = gcd(abs(a.numerator), b.denominator);
  const crossB = gcd(abs(b.numerator), a.denominator);
  return unwrap(canonicalRatio(
    (a.numerator / crossA) * (b.numerator / crossB),
    (a.denominator / crossB) * (b.denominator / crossA),
    limits,
  ));
}

export function divideExactRatios(
  dividend: ExactRatio,
  divisor: ExactRatio,
  options: ExactRatioOptions = {},
): ExactRatio {
  if (divisor.numerator === 0n) {
    return unwrap(fail('construction', 'invalid-boundary', 'divisor must not be zero.'));
  }
  return multiplyExactRatios(
    dividend,
    { numerator: divisor.denominator, denominator: divisor.numerator },
    options,
  );
}

export function invertExactRatio(
  ratio: ExactRatio,
  options: ExactRatioOptions = {},
): ExactRatio {
  if (ratio.numerator === 0n) {
    return unwrap(fail('construction', 'invalid-boundary', 'zero has no multiplicative inverse.'));
  }
  return createExactRatio(ratio.denominator, ratio.numerator, options);
}

export function interpolateExactRatios(
  start: ExactRatio,
  end: ExactRatio,
  position: ExactRatio,
  options: ExactRatioOptions = {},
): ExactRatio {
  return addExactRatios(
    start,
    multiplyExactRatios(subtractExactRatios(end, start, options), position, options),
    options,
  );
}

export function mapExactRatio(
  value: ExactRatio,
  sourceStart: ExactRatio,
  sourceEnd: ExactRatio,
  targetStart: ExactRatio,
  targetEnd: ExactRatio,
  options: ExactRatioOptions = {},
): ExactRatio {
  const sourceSpan = subtractExactRatios(sourceEnd, sourceStart, options);
  if (sourceSpan.numerator === 0n) {
    return unwrap(fail('construction', 'invalid-boundary', 'source range must have non-zero width.'));
  }
  const position = divideExactRatios(subtractExactRatios(value, sourceStart, options), sourceSpan, options);
  return interpolateExactRatios(targetStart, targetEnd, position, options);
}

function checkedRatioPair(
  left: ExactRatio,
  right: ExactRatio,
  options: ExactRatioOptions,
): readonly [ExactRatio, ExactRatio] {
  const limits = unwrap(tryRatioLimits(options));
  return [
    unwrap(canonicalRatio(left.numerator, left.denominator, limits)),
    unwrap(canonicalRatio(right.numerator, right.denominator, limits)),
  ];
}

function compareCanonicalRatios(left: ExactRatio, right: ExactRatio): -1 | 0 | 1 {
  const a = left.numerator * right.denominator;
  const b = right.numerator * left.denominator;
  return a < b ? -1 : a > b ? 1 : 0;
}

function tryRatioLimits(options: ExactRatioOptions): Result<RatioLimits> {
  const maxNumeratorBits = options.maxNumeratorBits ?? DEFAULT_MAX_RATIO_NUMERATOR_BITS;
  const maxDenominatorBits = options.maxDenominatorBits ?? DEFAULT_MAX_RATIO_DENOMINATOR_BITS;
  if (!Number.isSafeInteger(maxNumeratorBits) || maxNumeratorBits < 1) {
    return fail('construction', 'invalid-max-count', 'maxNumeratorBits must be a positive safe integer.', { maxNumeratorBits });
  }
  if (!Number.isSafeInteger(maxDenominatorBits) || maxDenominatorBits < 1) {
    return fail('construction', 'invalid-max-count', 'maxDenominatorBits must be a positive safe integer.', { maxDenominatorBits });
  }
  return ok(Object.freeze({ maxNumeratorBits, maxDenominatorBits }));
}

function canonicalRatio(
  numerator: bigint,
  denominator: bigint,
  limits: RatioLimits,
): Result<ExactRatio> {
  if (typeof numerator !== 'bigint' || typeof denominator !== 'bigint') {
    return fail('construction', 'invalid-boundary', 'numerator and denominator must be bigint values.');
  }
  if (denominator === 0n) {
    return fail('construction', 'invalid-boundary', 'denominator must not be zero.');
  }
  const numeratorBits = bitLength(numerator);
  const denominatorBits = bitLength(denominator);
  if (numeratorBits > limits.maxNumeratorBits) {
    return fail('resource-rejection', 'count-ceiling-exceeded', 'numerator exceeds maxNumeratorBits.', {
      numeratorBits,
      maxNumeratorBits: limits.maxNumeratorBits,
    });
  }
  if (denominatorBits > limits.maxDenominatorBits) {
    return fail('resource-rejection', 'count-ceiling-exceeded', 'denominator exceeds maxDenominatorBits.', {
      denominatorBits,
      maxDenominatorBits: limits.maxDenominatorBits,
    });
  }
  if (numerator === 0n) return ok(Object.freeze({ numerator: 0n, denominator: 1n }));
  const sign = denominator < 0n ? -1n : 1n;
  const divisor = gcd(abs(numerator), abs(denominator));
  return ok(Object.freeze({
    numerator: (numerator / divisor) * sign,
    denominator: abs(denominator) / divisor,
  }));
}

function bitLength(value: bigint): number {
  const magnitude = abs(value);
  return magnitude === 0n ? 0 : magnitude.toString(2).length;
}

function abs(value: bigint): bigint {
  return value < 0n ? -value : value;
}

function gcd(left: bigint, right: bigint): bigint {
  let a = abs(left);
  let b = abs(right);
  while (b !== 0n) {
    const remainder = a % b;
    a = b;
    b = remainder;
  }
  return a === 0n ? 1n : a;
}

export interface QuantizedRange {
  readonly origin: string;
  readonly step: string;
  readonly count: number;
  readonly cardinality: number;
  readonly lower: string;
  readonly upper: string;
  valueAt(tick: number): string | null;
  tickOf(value: string): number | null;
  clamp(value: string): string | null;
  snap(value: string, tie?: TiePolicy): string | null;
  ratioOfTick(tick: number): ExactRatio | null;
  tickFromRatio(ratio: ExactRatio, tie?: TiePolicy): number | null;
}

class ExactQuantizedRange implements QuantizedRange {
  public readonly origin: string;
  public readonly step: string;
  public readonly count: number;
  readonly #origin: ExactDecimal;
  readonly #step: ExactDecimal;

  public constructor(origin: ExactDecimal, step: ExactDecimal, count: number) {
    this.#origin = origin;
    this.#step = step;
    this.origin = decimalToString(origin);
    this.step = decimalToString(step);
    this.count = count;
    Object.freeze(this);
  }

  public get cardinality(): number {
    return this.count + 1;
  }

  public get lower(): string {
    return this.origin;
  }

  public get upper(): string {
    return decimalToString(this.valueDecimal(this.count));
  }

  public valueAt(tick: number): string | null {
    return validTick(tick, this.count) ? decimalToString(this.valueDecimal(tick)) : null;
  }

  public tickOf(value: string): number | null {
    const parsed = parseDecimal(value);
    if (parsed === null) return null;
    const [numerator, denominator] = decimalQuotient(subtractDecimal(parsed, this.#origin), this.#step);
    if (denominator <= 0n || numerator % denominator !== 0n) return null;
    const tick = numerator / denominator;
    return tick >= 0n && tick <= BigInt(this.count) ? Number(tick) : null;
  }

  public clamp(value: string): string | null {
    const parsed = parseDecimal(value);
    if (parsed === null) return null;
    if (compareDecimal(parsed, this.#origin) < 0) return this.lower;
    const upper = this.valueDecimal(this.count);
    if (compareDecimal(parsed, upper) > 0) return this.upper;
    return decimalToString(parsed);
  }

  public snap(value: string, tie: TiePolicy = 'lower'): string | null {
    const parsed = parseDecimal(value);
    if (parsed === null || !isTiePolicy(tie)) return null;
    const clamped =
      compareDecimal(parsed, this.#origin) < 0
        ? this.#origin
        : compareDecimal(parsed, this.valueDecimal(this.count)) > 0
          ? this.valueDecimal(this.count)
          : parsed;
    const [numerator, denominator] = decimalQuotient(
      subtractDecimal(clamped, this.#origin),
      this.#step,
    );
    const floor = floorFraction(numerator, denominator);
    const ceil = numerator % denominator === 0n ? floor : floor + 1n;
    const boundedFloor = clampBigInt(floor, 0n, BigInt(this.count));
    const boundedCeil = clampBigInt(ceil, 0n, BigInt(this.count));
    const lowerDistance = numerator - boundedFloor * denominator;
    const upperDistance = boundedCeil * denominator - numerator;
    let tick: bigint;
    if (lowerDistance < upperDistance) tick = boundedFloor;
    else if (upperDistance < lowerDistance) tick = boundedCeil;
    else if (tie === 'lower') tick = boundedFloor;
    else if (tie === 'upper') tick = boundedCeil;
    else tick = boundedFloor % 2n === 0n ? boundedFloor : boundedCeil;
    return decimalToString(this.valueDecimal(Number(tick)));
  }

  public ratioOfTick(tick: number): ExactRatio | null {
    if (!validTick(tick, this.count)) return null;
    if (this.count === 0) return createExactRatio(0n, 1n);
    return createExactRatio(BigInt(tick), BigInt(this.count));
  }

  public tickFromRatio(ratio: ExactRatio, tie: TiePolicy = 'lower'): number | null {
    if (!isTiePolicy(tie)) return null;
    const canonical = tryCreateExactRatio(ratio.numerator, ratio.denominator);
    if (!canonical.ok) return null;
    let { numerator, denominator } = canonical.value;
    numerator = clampBigInt(numerator, 0n, denominator);
    if (this.count === 0) return 0;
    const scaled = numerator * BigInt(this.count);
    const floor = scaled / denominator;
    const ceil = scaled % denominator === 0n ? floor : floor + 1n;
    const lowerDistance = scaled - floor * denominator;
    const upperDistance = ceil * denominator - scaled;
    if (lowerDistance < upperDistance) return Number(floor);
    if (upperDistance < lowerDistance) return Number(ceil);
    if (tie === 'lower') return Number(floor);
    if (tie === 'upper') return Number(ceil);
    return Number(floor % 2n === 0n ? floor : ceil);
  }

  private valueDecimal(tick: number): ExactDecimal {
    return addDecimal(this.#origin, multiplyDecimalByInteger(this.#step, BigInt(tick)));
  }
}

export function createRange(input: RangeInput): QuantizedRange {
  return unwrap(tryCreateRange(input));
}

export function tryCreateRange(input: RangeInput): Result<QuantizedRange> {
  const maxCount = input.maxCount ?? 10_000_000;
  const maxDecimalCodeUnits = input.maxDecimalCodeUnits ?? 1_024;
  const maxScale = input.maxScale ?? 100;
  for (const [value, name, minimum] of [
    [maxCount, 'maxCount', 0],
    [maxDecimalCodeUnits, 'maxDecimalCodeUnits', 1],
    [maxScale, 'maxScale', 0],
  ] as const) {
    const error = validateSafeCeiling(value, name, minimum);
    if (error !== null) return { ok: false, error };
  }
  const countError = validateSafeCeiling(input.count, 'count');
  if (countError !== null) return { ok: false, error: countError };
  if (input.count >= Number.MAX_SAFE_INTEGER) {
    return fail(
      'resource-rejection',
      'cardinality-not-safe',
      'count + 1 must remain within the safe integer domain.',
      { count: input.count },
    );
  }
  if (input.count > maxCount) {
    return fail('resource-rejection', 'count-ceiling-exceeded', 'Range count exceeds maxCount.', {
      count: input.count,
      maxCount,
    });
  }
  for (const [value, name] of [
    [input.origin, 'origin'],
    [input.step, 'step'],
  ] as const) {
    if (value.length > maxDecimalCodeUnits) {
      return fail('resource-rejection', 'decimal-code-unit-ceiling-exceeded', `${name} exceeds maxDecimalCodeUnits.`, {
        name,
        codeUnits: value.length,
        maxDecimalCodeUnits,
      });
    }
  }
  const origin = parseDecimal(input.origin);
  const step = parseDecimal(input.step);
  if (origin === null || step === null) {
    return fail('construction', 'invalid-decimal', 'origin and step must be finite canonical decimal spellings.');
  }
  if (origin.scale > maxScale || step.scale > maxScale) {
    return fail('resource-rejection', 'decimal-scale-ceiling-exceeded', 'Decimal scale exceeds maxScale.', {
      maxScale,
    });
  }
  if (step.coefficient <= 0n) {
    return fail('construction', 'non-positive-step', 'step must be greater than zero.');
  }
  return ok(new ExactQuantizedRange(origin, step, input.count));
}

export function createBoundedRange(input: BoundedRangeInput): QuantizedRange {
  return unwrap(tryCreateBoundedRange(input));
}

export function tryCreateBoundedRange(input: BoundedRangeInput): Result<QuantizedRange> {
  const maxCount = input.maxCount ?? 10_000_000;
  const maxDecimalCodeUnits = input.maxDecimalCodeUnits ?? 1_024;
  const maxScale = input.maxScale ?? 100;
  for (const [value, name, minimum] of [
    [maxCount, 'maxCount', 0],
    [maxDecimalCodeUnits, 'maxDecimalCodeUnits', 1],
    [maxScale, 'maxScale', 0],
  ] as const) {
    const error = validateSafeCeiling(value, name, minimum);
    if (error !== null) return { ok: false, error };
  }
  for (const [value, name] of [
    [input.min, 'min'],
    [input.max, 'max'],
    [input.step, 'step'],
  ] as const) {
    if (value.length > maxDecimalCodeUnits) {
      return fail(
        'resource-rejection',
        'decimal-code-unit-ceiling-exceeded',
        `${name} exceeds maxDecimalCodeUnits.`,
        { name, codeUnits: value.length, maxDecimalCodeUnits },
      );
    }
  }

  const min = parseDecimal(input.min);
  const max = parseDecimal(input.max);
  const step = parseDecimal(input.step);
  if (min === null || max === null || step === null) {
    return fail('construction', 'invalid-decimal', 'min, max, and step must be finite decimal spellings.');
  }
  if (min.scale > maxScale || max.scale > maxScale || step.scale > maxScale) {
    return fail('resource-rejection', 'decimal-scale-ceiling-exceeded', 'Decimal scale exceeds maxScale.', {
      maxScale,
    });
  }
  if (compareDecimal(max, min) < 0) {
    return fail('construction', 'inverted-bounds', 'max must be greater than or equal to min.');
  }
  if (step.coefficient <= 0n) {
    return fail('construction', 'non-positive-step', 'step must be greater than zero.');
  }
  const [numerator, denominator] = decimalQuotient(subtractDecimal(max, min), step);
  if (numerator < 0n || numerator % denominator !== 0n) {
    return fail('construction', 'endpoint-off-lattice', 'The upper endpoint must be on the range lattice.');
  }
  const count = numerator / denominator;
  if (count >= BigInt(Number.MAX_SAFE_INTEGER)) {
    return fail('resource-rejection', 'count-not-safe', 'Derived count exceeds the safe integer domain.');
  }
  if (count > BigInt(maxCount)) {
    return fail('resource-rejection', 'count-ceiling-exceeded', 'Derived range count exceeds maxCount.', {
      count: count.toString(),
      maxCount,
    });
  }
  return tryCreateRange({
    origin: input.min,
    step: input.step,
    count: Number(count),
    maxCount,
    maxDecimalCodeUnits,
    maxScale,
  });
}

function validTick(tick: number, count: number): boolean {
  return Number.isSafeInteger(tick) && tick >= 0 && tick <= count;
}

function isTiePolicy(value: string): value is TiePolicy {
  return value === 'lower' || value === 'upper' || value === 'even-tick';
}

function clampBigInt(value: bigint, lower: bigint, upper: bigint): bigint {
  return value < lower ? lower : value > upper ? upper : value;
}

export type { Result, TiePolicy } from '../shared.js';
