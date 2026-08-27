import type { ExactRatio } from '@sectile/core/range';

const PERCENTAGE_SCALE = 12;

export function formatExactPercentage(ratio: ExactRatio): string {
  if (ratio.denominator <= 0n) throw new Error('Internal invariant breach: non-positive ratio denominator.');
  const factor = 10n ** BigInt(PERCENTAGE_SCALE);
  const scaledNumerator = ratio.numerator * 100n * factor;
  let quotient = scaledNumerator / ratio.denominator;
  const remainder = scaledNumerator % ratio.denominator;
  const comparison = remainder * 2n - ratio.denominator;
  if (comparison > 0n || (comparison === 0n && quotient % 2n !== 0n)) quotient += 1n;
  const whole = quotient / factor;
  const fraction = (quotient % factor).toString().padStart(PERCENTAGE_SCALE, '0').replace(/0+$/u, '');
  return fraction.length === 0 ? whole.toString() : `${whole}.${fraction}`;
}
