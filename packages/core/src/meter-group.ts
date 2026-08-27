import { unwrap } from './result.js';
import type { ExactRatio } from './structures/range.js';
import {
  DEFAULT_MAX_ID_CODE_UNITS,
  type Result,
  type StableID,
} from './shared.js';
import { tryCreateMeterState, type MeterZone } from './meter.js';
import {
  addDecimal,
  boundedRatio,
  compareDecimal,
  decimalToString,
  DEFAULT_SCALAR_MAX,
  parseDecimal,
  subtractDecimal,
  tryParseBoundedScalar,
  type ExactDecimal,
} from './internal/kernel/bounded-scalar.js';
import {
  fail,
  freezeArray,
  ok,
  validateSafeCeiling,
  validateUniqueIDs,
} from './internal/kernel/foundation.js';

export interface MeterGroupItemInput<ID extends StableID = StableID> {
  readonly id: ID;
  readonly value: string;
}

export interface MeterGroupInput<ID extends StableID = StableID> {
  readonly max?: string;
  readonly items: readonly MeterGroupItemInput<ID>[];
  readonly low?: string;
  readonly high?: string;
  readonly optimum?: string;
  readonly maxDecimalCodeUnits?: number;
  readonly maxScale?: number;
  readonly maxItems?: number;
  readonly maxIDCodeUnits?: number;
}

export interface MeterGroupSegment<ID extends StableID = StableID> {
  readonly id: ID;
  readonly value: string;
  readonly start: string;
  readonly end: string;
  readonly valueRatio: ExactRatio;
  readonly startRatio: ExactRatio;
  readonly endRatio: ExactRatio;
}

export interface MeterGroupState<ID extends StableID = StableID> {
  readonly max: string;
  readonly items: readonly MeterGroupItemInput<ID>[];
  readonly segments: readonly MeterGroupSegment<ID>[];
  readonly total: string;
  readonly remaining: string;
  readonly ratio: ExactRatio;
  readonly zone: MeterZone;
}

export function createMeterGroupState<ID extends StableID>(input: MeterGroupInput<ID>): MeterGroupState<ID> {
  return unwrap(tryCreateMeterGroupState(input));
}

export function tryCreateMeterGroupState<ID extends StableID>(input: MeterGroupInput<ID>): Result<MeterGroupState<ID>> {
  const maxItems = input.maxItems ?? 100_000;
  const itemCeilingError = validateSafeCeiling(maxItems, 'maxItems');
  if (itemCeilingError !== null) return { ok: false, error: itemCeilingError };
  const maxIDCodeUnits = input.maxIDCodeUnits ?? DEFAULT_MAX_ID_CODE_UNITS;
  const idCeilingError = validateSafeCeiling(maxIDCodeUnits, 'maxIDCodeUnits', 1);
  if (idCeilingError !== null) return { ok: false, error: idCeilingError };
  if (input.items.length > maxItems) {
    return fail('resource-rejection', 'item-ceiling-exceeded', 'MeterGroup exceeds maxItems.', {
      size: input.items.length,
      maxItems,
    });
  }
  const ids = validateUniqueIDs(input.items.map((item) => item.id), maxIDCodeUnits);
  if (!ids.ok) return ids;

  const ceilings = {
    ...(input.maxDecimalCodeUnits === undefined ? {} : { maxDecimalCodeUnits: input.maxDecimalCodeUnits }),
    ...(input.maxScale === undefined ? {} : { maxScale: input.maxScale }),
  };
  const maxInput = input.max ?? DEFAULT_SCALAR_MAX;
  const maximum = tryParseBoundedScalar({ min: maxInput, max: maxInput, value: maxInput }, ceilings);
  if (!maximum.ok) return maximum;
  const zero = parseDecimal('0');
  if (zero === null) throw new Error('Internal invariant breach: zero decimal failed to parse.');
  if (compareDecimal(maximum.value.value, zero) <= 0) {
    return fail('construction', 'meter-group-maximum-not-positive', 'MeterGroup max must be greater than zero.', {
      max: maximum.value.canonicalValue,
    });
  }

  let total = zero;
  const canonicalItems: MeterGroupItemInput<ID>[] = [];
  const segments: MeterGroupSegment<ID>[] = [];
  for (const item of input.items) {
    const parsed = tryParseBoundedScalar({ min: item.value, max: item.value, value: item.value }, ceilings);
    if (!parsed.ok) return parsed;
    const value = parsed.value.value;
    if (compareDecimal(value, zero) < 0) {
      return fail('construction', 'meter-group-value-negative', 'MeterGroup item values must not be negative.', {
        id: item.id,
        value: parsed.value.canonicalValue,
      });
    }
    const start = total;
    total = addDecimal(total, value);
    if (compareDecimal(total, maximum.value.value) > 0) {
      return fail('construction', 'meter-group-total-exceeds-maximum', 'MeterGroup total must not exceed max.', {
        max: maximum.value.canonicalValue,
        total: decimalToString(total),
      });
    }
    const canonicalItem = Object.freeze({ id: item.id, value: parsed.value.canonicalValue });
    canonicalItems.push(canonicalItem);
    segments.push(Object.freeze({
      id: item.id,
      value: canonicalItem.value,
      start: decimalToString(start),
      end: decimalToString(total),
      valueRatio: exactRatio(value, zero, maximum.value.value),
      startRatio: exactRatio(start, zero, maximum.value.value),
      endRatio: exactRatio(total, zero, maximum.value.value),
    }));
  }

  const canonicalTotal = decimalToString(total);
  const aggregate = tryCreateMeterState({
    min: '0',
    max: maximum.value.canonicalValue,
    value: canonicalTotal,
    ...(input.low === undefined ? {} : { low: input.low }),
    ...(input.high === undefined ? {} : { high: input.high }),
    ...(input.optimum === undefined ? {} : { optimum: input.optimum }),
    ...ceilings,
  });
  if (!aggregate.ok) return aggregate;
  return ok(Object.freeze({
    max: maximum.value.canonicalValue,
    items: freezeArray(canonicalItems),
    segments: freezeArray(segments),
    total: canonicalTotal,
    remaining: decimalToString(subtractDecimal(maximum.value.value, total)),
    ratio: exactRatio(total, zero, maximum.value.value),
    zone: aggregate.value.zone,
  }));
}

function exactRatio(value: ExactDecimal, min: ExactDecimal, max: ExactDecimal): ExactRatio {
  const ratio = boundedRatio(value, min, max);
  return Object.freeze({ numerator: ratio.numerator, denominator: ratio.denominator });
}
