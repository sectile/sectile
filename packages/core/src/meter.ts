import { unwrap } from './result.js';
import type { ExactRatio } from './structures/range.js';
import type { Result } from './shared.js';
import {
  boundedRatio,
  compareDecimal,
  decimalInClosedRange,
  decimalToString,
  DEFAULT_SCALAR_MAX,
  DEFAULT_SCALAR_MIN,
  midpointDecimal,
  tryParseBoundedScalar,
  type ExactDecimal,
} from './internal/kernel/bounded-scalar.js';
import { fail, ok } from './internal/kernel/foundation.js';

export type MeterZone = 'optimum' | 'suboptimal' | 'even-less-good';

export interface MeterInput {
  readonly min?: string;
  readonly max?: string;
  readonly value: string;
  readonly low?: string;
  readonly high?: string;
  readonly optimum?: string;
  readonly maxDecimalCodeUnits?: number;
  readonly maxScale?: number;
}

export interface MeterState {
  readonly min: string;
  readonly max: string;
  readonly value: string;
  readonly low: string;
  readonly high: string;
  readonly optimum: string;
  readonly ratio: ExactRatio;
  readonly zone: MeterZone;
}

export function createMeterState(input: MeterInput): MeterState {
  return unwrap(tryCreateMeterState(input));
}

export function tryCreateMeterState(input: MeterInput): Result<MeterState> {
  const minInput = input.min ?? DEFAULT_SCALAR_MIN;
  const maxInput = input.max ?? DEFAULT_SCALAR_MAX;
  const ceilings = {
    ...(input.maxDecimalCodeUnits === undefined ? {} : { maxDecimalCodeUnits: input.maxDecimalCodeUnits }),
    ...(input.maxScale === undefined ? {} : { maxScale: input.maxScale }),
  };
  const base = tryParseBoundedScalar({ min: minInput, max: maxInput, value: input.value }, ceilings);
  if (!base.ok) return base;
  if (!decimalInClosedRange(base.value.value, base.value.min, base.value.max)) {
    return fail('construction', 'meter-value-outside-range', 'Meter value must be within min and max.', {
      min: base.value.canonicalMin,
      max: base.value.canonicalMax,
      value: base.value.canonicalValue,
    });
  }

  const low = input.low === undefined
    ? base.value.min
    : parseThreshold('low', input.low, minInput, maxInput, ceilings);
  if ('ok' in low && !low.ok) return low;
  const high = input.high === undefined
    ? base.value.max
    : parseThreshold('high', input.high, minInput, maxInput, ceilings);
  if ('ok' in high && !high.ok) return high;
  const optimum = input.optimum === undefined
    ? midpointDecimal(base.value.min, base.value.max)
    : parseThreshold('optimum', input.optimum, minInput, maxInput, ceilings);
  if ('ok' in optimum && !optimum.ok) return optimum;

  const lowDecimal = decimalValue(low);
  const highDecimal = decimalValue(high);
  const optimumDecimal = decimalValue(optimum);
  if (compareDecimal(lowDecimal, highDecimal) > 0) {
    return fail('construction', 'meter-threshold-order-invalid', 'Meter low must be less than or equal to high.');
  }
  const ratio = boundedRatio(base.value.value, base.value.min, base.value.max);
  return ok(Object.freeze({
    min: base.value.canonicalMin,
    max: base.value.canonicalMax,
    value: base.value.canonicalValue,
    low: decimalToString(lowDecimal),
    high: decimalToString(highDecimal),
    optimum: decimalToString(optimumDecimal),
    ratio: Object.freeze({ numerator: ratio.numerator, denominator: ratio.denominator }),
    zone: classifyMeterZone(base.value.value, lowDecimal, highDecimal, optimumDecimal),
  }));
}

function parseThreshold(
  name: 'low' | 'high' | 'optimum',
  value: string,
  min: string,
  max: string,
  ceilings: { readonly maxDecimalCodeUnits?: number; readonly maxScale?: number },
): ExactDecimal | Result<never> {
  const parsed = tryParseBoundedScalar({ min, max, value }, ceilings);
  if (!parsed.ok) return parsed;
  if (!decimalInClosedRange(parsed.value.value, parsed.value.min, parsed.value.max)) {
    return fail('construction', 'meter-threshold-outside-range', `Meter ${name} must be within min and max.`, {
      name,
      value: parsed.value.canonicalValue,
      min: parsed.value.canonicalMin,
      max: parsed.value.canonicalMax,
    });
  }
  return parsed.value.value;
}

function decimalValue(value: ExactDecimal | Result<never>): ExactDecimal {
  return value as ExactDecimal;
}

function classifyMeterZone(
  value: ExactDecimal,
  low: ExactDecimal,
  high: ExactDecimal,
  optimum: ExactDecimal,
): MeterZone {
  if (compareDecimal(optimum, low) < 0) {
    if (compareDecimal(value, low) <= 0) return 'optimum';
    return compareDecimal(value, high) <= 0 ? 'suboptimal' : 'even-less-good';
  }
  if (compareDecimal(optimum, high) > 0) {
    if (compareDecimal(value, high) >= 0) return 'optimum';
    return compareDecimal(value, low) >= 0 ? 'suboptimal' : 'even-less-good';
  }
  return compareDecimal(value, low) >= 0 && compareDecimal(value, high) <= 0
    ? 'optimum'
    : 'suboptimal';
}
