export interface MultiThumbSliderExampleState {
  readonly thumbs: readonly string[];
  readonly values: readonly number[];
  readonly policies?: Readonly<{ readonly minGap?: number; readonly allowCross?: boolean }>;
}

export function multiThumbSliderExampleState(scenario: string): MultiThumbSliderExampleState {
  if (scenario === 'three-thumb-thresholds') {
    return Object.freeze({
      thumbs: Object.freeze(['minimum', 'middle', 'maximum']),
      values: Object.freeze([20, 50, 80]),
    });
  }
  if (scenario === 'crossing-thumbs') {
    return Object.freeze({
      thumbs: Object.freeze(['minimum', 'maximum']),
      values: Object.freeze([30, 70]),
      policies: Object.freeze({ minGap: 5 }),
    });
  }
  return Object.freeze({
    thumbs: Object.freeze(['minimum', 'maximum']),
    values: Object.freeze([25, 75]),
  });
}
