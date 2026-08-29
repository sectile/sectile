/** Canonical reduced rational value. Denominator is always positive. */
export interface ExactRatio {
  readonly numerator: bigint;
  readonly denominator: bigint;
}
