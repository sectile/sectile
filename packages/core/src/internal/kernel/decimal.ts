export interface ExactDecimal {
  readonly coefficient: bigint;
  readonly scale: number;
}

export type DecimalRounding = 'half-even' | 'half-up' | 'toward-zero';

const DECIMAL = /^([+-]?)(?:(\d+)(?:\.(\d*))?|\.(\d+))$/u;

export function parseDecimal(value: string): ExactDecimal | null {
  const match = DECIMAL.exec(value);
  if (match === null) return null;
  const sign = match[1] === '-' ? -1n : 1n;
  const integer = match[2] ?? '0';
  const fraction = match[3] ?? match[4] ?? '';
  let coefficient = sign * BigInt(`${integer}${fraction}`);
  let scale = fraction.length;
  if (coefficient === 0n) return { coefficient: 0n, scale: 0 };
  while (scale > 0 && coefficient % 10n === 0n) {
    coefficient /= 10n;
    scale -= 1;
  }
  return { coefficient, scale };
}

export function decimalToString(value: ExactDecimal): string {
  const normalized = normalizeDecimal(value);
  const negative = normalized.coefficient < 0n;
  const digits = (negative ? -normalized.coefficient : normalized.coefficient).toString();
  if (normalized.scale === 0) return `${negative ? '-' : ''}${digits}`;
  const padded = digits.padStart(normalized.scale + 1, '0');
  const split = padded.length - normalized.scale;
  return `${negative ? '-' : ''}${padded.slice(0, split)}.${padded.slice(split)}`;
}

export function normalizeDecimal(value: ExactDecimal): ExactDecimal {
  let { coefficient, scale } = value;
  if (coefficient === 0n) return { coefficient: 0n, scale: 0 };
  while (scale > 0 && coefficient % 10n === 0n) {
    coefficient /= 10n;
    scale -= 1;
  }
  return { coefficient, scale };
}

export function alignDecimals(
  left: ExactDecimal,
  right: ExactDecimal,
): readonly [bigint, bigint, number] {
  const scale = Math.max(left.scale, right.scale);
  return [
    left.coefficient * pow10(scale - left.scale),
    right.coefficient * pow10(scale - right.scale),
    scale,
  ];
}

export function compareDecimal(left: ExactDecimal, right: ExactDecimal): -1 | 0 | 1 {
  const [a, b] = alignDecimals(left, right);
  return a === b ? 0 : a < b ? -1 : 1;
}

export function addDecimal(left: ExactDecimal, right: ExactDecimal): ExactDecimal {
  const [a, b, scale] = alignDecimals(left, right);
  return normalizeDecimal({ coefficient: a + b, scale });
}

export function subtractDecimal(left: ExactDecimal, right: ExactDecimal): ExactDecimal {
  const [a, b, scale] = alignDecimals(left, right);
  return normalizeDecimal({ coefficient: a - b, scale });
}

export function negateDecimal(value: ExactDecimal): ExactDecimal {
  return Object.freeze({ coefficient: -value.coefficient, scale: value.scale });
}

export function multiplyDecimal(left: ExactDecimal, right: ExactDecimal): ExactDecimal {
  return normalizeDecimal({
    coefficient: left.coefficient * right.coefficient,
    scale: left.scale + right.scale,
  });
}

export function multiplyDecimalByInteger(value: ExactDecimal, factor: bigint): ExactDecimal {
  return normalizeDecimal({ coefficient: value.coefficient * factor, scale: value.scale });
}

export function decimalQuotient(
  numerator: ExactDecimal,
  denominator: ExactDecimal,
): readonly [bigint, bigint] {
  const numeratorInteger = numerator.coefficient * pow10(denominator.scale);
  const denominatorInteger = denominator.coefficient * pow10(numerator.scale);
  if (denominatorInteger === 0n) throw new RangeError('division by zero');
  return denominatorInteger < 0n
    ? [-numeratorInteger, -denominatorInteger]
    : [numeratorInteger, denominatorInteger];
}

export function divideDecimal(
  numerator: ExactDecimal,
  denominator: ExactDecimal,
  scale: number,
  rounding: DecimalRounding,
): ExactDecimal | null {
  if (!Number.isSafeInteger(scale) || scale < 0) {
    throw new RangeError('division scale must be a non-negative safe integer');
  }
  if (!isDecimalRounding(rounding)) {
    throw new RangeError('unsupported decimal rounding policy');
  }
  if (denominator.coefficient === 0n) return null;
  const [rawNumerator, rawDenominator] = decimalQuotient(numerator, denominator);
  const negative = rawNumerator < 0n;
  const absoluteNumerator = negative ? -rawNumerator : rawNumerator;
  const scaled = absoluteNumerator * pow10(scale);
  let coefficient = scaled / rawDenominator;
  const remainder = scaled % rawDenominator;
  if (rounding !== 'toward-zero' && remainder !== 0n) {
    const comparison = remainder * 2n - rawDenominator;
    if (
      comparison > 0n
      || (comparison === 0n && rounding === 'half-up')
      || (comparison === 0n && rounding === 'half-even' && coefficient % 2n !== 0n)
    ) {
      coefficient += 1n;
    }
  }
  return normalizeDecimal({ coefficient: negative ? -coefficient : coefficient, scale });
}

export function greatestCommonDivisor(left: bigint, right: bigint): bigint {
  let a = left < 0n ? -left : left;
  let b = right < 0n ? -right : right;
  while (b !== 0n) [a, b] = [b, a % b];
  return a;
}

export function reduceFraction(numerator: bigint, denominator: bigint): readonly [bigint, bigint] {
  if (denominator === 0n) throw new RangeError('denominator must not be zero');
  const sign = denominator < 0n ? -1n : 1n;
  const gcd = greatestCommonDivisor(numerator, denominator);
  if (gcd === 0n) return [0n, 1n];
  return [(numerator / gcd) * sign, (denominator / gcd) * sign];
}

export function floorFraction(numerator: bigint, denominator: bigint): bigint {
  if (denominator <= 0n) throw new RangeError('positive denominator required');
  if (numerator >= 0n) return numerator / denominator;
  return -((-numerator + denominator - 1n) / denominator);
}

export function pow10(exponent: number): bigint {
  if (!Number.isSafeInteger(exponent) || exponent < 0) {
    throw new RangeError('decimal scale must be a non-negative safe integer');
  }
  return 10n ** BigInt(exponent);
}

function isDecimalRounding(value: string): value is DecimalRounding {
  return value === 'half-even' || value === 'half-up' || value === 'toward-zero';
}
