import type { Result } from '../../shared.js';
import type { ExactRatio } from './exact-ratio.js';
import {
  addDecimal,
  compareDecimal,
  decimalQuotient,
  decimalToString,
  divideDecimal,
  parseDecimal,
  reduceFraction,
  subtractDecimal,
  type ExactDecimal,
} from './decimal.js';
import { fail, ok, validateSafeCeiling } from './foundation.js';

export const DEFAULT_SCALAR_MIN = '0';
export const DEFAULT_SCALAR_MAX = '100';
export const DEFAULT_MAX_DECIMAL_CODE_UNITS = 1_024;
export const DEFAULT_MAX_DECIMAL_SCALE = 100;
export const DEFAULT_PERCENTAGE_SCALE = 12;

export interface BoundedScalarCeilings {
  readonly maxDecimalCodeUnits?: number;
  readonly maxScale?: number;
}

export interface ParsedBoundedScalar {
  readonly min: ExactDecimal;
  readonly max: ExactDecimal;
  readonly value: ExactDecimal;
  readonly canonicalMin: string;
  readonly canonicalMax: string;
  readonly canonicalValue: string;
}

export function tryParseBoundedScalar(
  values: { readonly min: string; readonly max: string; readonly value: string },
  ceilings: BoundedScalarCeilings = {},
): Result<ParsedBoundedScalar> {
  const maxDecimalCodeUnits = ceilings.maxDecimalCodeUnits ?? DEFAULT_MAX_DECIMAL_CODE_UNITS;
  const maxScale = ceilings.maxScale ?? DEFAULT_MAX_DECIMAL_SCALE;
  const codeUnitError = validateSafeCeiling(maxDecimalCodeUnits, 'maxDecimalCodeUnits', 1);
  if (codeUnitError !== null) return { ok: false, error: codeUnitError };
  const scaleError = validateSafeCeiling(maxScale, 'maxScale');
  if (scaleError !== null) return { ok: false, error: scaleError };

  for (const [name, value] of Object.entries(values)) {
    if (typeof value !== 'string') {
      return fail('construction', 'invalid-decimal', `${name} must be a decimal string.`, {
        name,
        receivedType: typeof value,
      });
    }
    if (value.length > maxDecimalCodeUnits) {
      return fail(
        'resource-rejection',
        'decimal-code-unit-ceiling-exceeded',
        `${name} exceeds maxDecimalCodeUnits.`,
        { name, codeUnits: value.length, maxDecimalCodeUnits },
      );
    }
  }

  const min = parseDecimal(values.min);
  const max = parseDecimal(values.max);
  const value = parseDecimal(values.value);
  if (min === null || max === null || value === null) {
    return fail('construction', 'invalid-decimal', 'min, max, and value must be finite decimal spellings.');
  }
  if (min.scale > maxScale || max.scale > maxScale || value.scale > maxScale) {
    return fail(
      'resource-rejection',
      'decimal-scale-ceiling-exceeded',
      'Decimal scale exceeds maxScale.',
      { maxScale },
    );
  }
  if (compareDecimal(max, min) < 0) {
    return fail('construction', 'inverted-bounds', 'max must be greater than or equal to min.');
  }
  return ok(Object.freeze({
    min,
    max,
    value,
    canonicalMin: decimalToString(min),
    canonicalMax: decimalToString(max),
    canonicalValue: decimalToString(value),
  }));
}

export function boundedRatio(
  value: ExactDecimal,
  min: ExactDecimal,
  max: ExactDecimal,
): ExactRatio {
  if (compareDecimal(min, max) === 0) return Object.freeze({ numerator: 0n, denominator: 1n });
  const [numerator, denominator] = decimalQuotient(
    subtractDecimal(value, min),
    subtractDecimal(max, min),
  );
  const [reducedNumerator, reducedDenominator] = reduceFraction(numerator, denominator);
  return Object.freeze({ numerator: reducedNumerator, denominator: reducedDenominator });
}

export function midpointDecimal(min: ExactDecimal, max: ExactDecimal): ExactDecimal {
  const sum = addDecimal(min, max);
  const midpoint = divideDecimal(sum, { coefficient: 2n, scale: 0 }, Math.max(min.scale, max.scale) + 1, 'toward-zero');
  if (midpoint === null) throw new Error('Internal invariant breach: midpoint division by two failed.');
  return midpoint;
}

export function formatRatioPercentage(
  ratio: ExactRatio,
  scale: number = DEFAULT_PERCENTAGE_SCALE,
): string {
  if (ratio.denominator <= 0n) throw new RangeError('ratio denominator must be positive');
  const scaleError = validateSafeCeiling(scale, 'precision');
  if (scaleError !== null) throw new RangeError(scaleError.message);
  const percentage = divideDecimal(
    { coefficient: ratio.numerator * 100n, scale: 0 },
    { coefficient: ratio.denominator, scale: 0 },
    scale,
    'half-even',
  );
  if (percentage === null) throw new Error('Internal invariant breach: ratio percentage division failed.');
  return decimalToString(percentage);
}

export function decimalInClosedRange(value: ExactDecimal, min: ExactDecimal, max: ExactDecimal): boolean {
  return compareDecimal(value, min) >= 0 && compareDecimal(value, max) <= 0;
}

export { addDecimal, compareDecimal, decimalToString, parseDecimal, subtractDecimal };
export type { ExactDecimal };
