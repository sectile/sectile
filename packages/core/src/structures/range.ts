import { unwrap } from '../result.js';
import { type Result, type TiePolicy } from '../shared.js';
import {
  addDecimal,
  compareDecimal,
  decimalQuotient,
  decimalToString,
  floorFraction,
  multiplyDecimalByInteger,
  parseDecimal,
  reduceFraction,
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

export interface ExactRatio {
  readonly numerator: bigint;
  readonly denominator: bigint;
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
    if (this.count === 0) return Object.freeze({ numerator: 0n, denominator: 1n });
    const [numerator, denominator] = reduceFraction(BigInt(tick), BigInt(this.count));
    return Object.freeze({ numerator, denominator });
  }

  public tickFromRatio(ratio: ExactRatio, tie: TiePolicy = 'lower'): number | null {
    if (ratio.denominator === 0n || !isTiePolicy(tie)) return null;
    let numerator = ratio.numerator;
    let denominator = ratio.denominator;
    if (denominator < 0n) {
      numerator = -numerator;
      denominator = -denominator;
    }
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
