import { unwrap } from './result.js';
import type { ExactRatio } from './structures/range.js';
import type { Result } from './shared.js';
import {
  boundedRatio,
  compareDecimal,
  decimalInClosedRange,
  DEFAULT_SCALAR_MAX,
  parseDecimal,
  tryParseBoundedScalar,
} from './internal/kernel/bounded-scalar.js';
import { fail, ok } from './internal/kernel/foundation.js';

export type ProgressStatus = 'indeterminate' | 'progressing' | 'complete';

export interface ProgressInput {
  readonly max?: string;
  readonly value?: string | null;
  readonly maxDecimalCodeUnits?: number;
  readonly maxScale?: number;
}

export interface ProgressState {
  readonly max: string;
  readonly value: string | null;
  readonly ratio: ExactRatio | null;
  readonly status: ProgressStatus;
}

export function createProgressState(input: ProgressInput = {}): ProgressState {
  return unwrap(tryCreateProgressState(input));
}

export function tryCreateProgressState(input: ProgressInput = {}): Result<ProgressState> {
  const maxInput = input.max ?? DEFAULT_SCALAR_MAX;
  const ceilings = {
    ...(input.maxDecimalCodeUnits === undefined ? {} : { maxDecimalCodeUnits: input.maxDecimalCodeUnits }),
    ...(input.maxScale === undefined ? {} : { maxScale: input.maxScale }),
  };
  const maximum = tryParseBoundedScalar({ min: maxInput, max: maxInput, value: maxInput }, ceilings);
  if (!maximum.ok) return maximum;
  const zero = parseDecimal('0');
  if (zero === null) throw new Error('Internal invariant breach: zero decimal failed to parse.');
  if (compareDecimal(maximum.value.value, zero) <= 0) {
    return fail('construction', 'progress-maximum-not-positive', 'Progress max must be greater than zero.', {
      max: maximum.value.canonicalValue,
    });
  }

  if (input.value === undefined || input.value === null) {
    return ok(Object.freeze({
      max: maximum.value.canonicalValue,
      value: null,
      ratio: null,
      status: 'indeterminate' as const,
    }));
  }

  const parsed = tryParseBoundedScalar({ min: '0', max: maximum.value.canonicalValue, value: input.value }, ceilings);
  if (!parsed.ok) return parsed;
  if (!decimalInClosedRange(parsed.value.value, parsed.value.min, parsed.value.max)) {
    return fail('construction', 'progress-value-outside-range', 'Progress value must be within zero and max.', {
      max: parsed.value.canonicalMax,
      value: parsed.value.canonicalValue,
    });
  }
  const ratio = boundedRatio(parsed.value.value, parsed.value.min, parsed.value.max);
  return ok(Object.freeze({
    max: parsed.value.canonicalMax,
    value: parsed.value.canonicalValue,
    ratio: Object.freeze({ numerator: ratio.numerator, denominator: ratio.denominator }),
    status: compareDecimal(parsed.value.value, parsed.value.max) === 0 ? 'complete' as const : 'progressing' as const,
  }));
}
