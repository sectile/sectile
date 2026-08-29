import { formatExactRatioPercentage, type ExactRatio } from '@sectile/core/range';

export function formatExactPercentage(ratio: ExactRatio): string {
  return formatExactRatioPercentage(ratio);
}
