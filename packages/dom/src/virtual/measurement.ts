import type { StableID } from '@sectile/core';
import type { VirtualMeasurementResolver } from './contracts.js';
import type { ExtentUpdate } from '@sectile/virtual/extent-index';

export function createAxisMeasurementResolver<State, ID extends StableID>(
  axis: 'vertical' | 'horizontal',
): VirtualMeasurementResolver<State, ID, ExtentUpdate> {
  return ({ element, placement }): ExtentUpdate => {
    const bounds = element.getBoundingClientRect();
    return Object.freeze({
      index: placement.index,
      extent: Object.freeze({
        kind: 'exact',
        value: axis === 'vertical' ? bounds.height : bounds.width,
      }),
    });
  };
}
