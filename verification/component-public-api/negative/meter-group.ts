// @ts-expect-error Core component runtime is subpath-only.
import { createMeterGroupState } from '@sectile/core';
// @ts-expect-error Component subpaths have no default export.
import meterGroupDefault from '@sectile/core/meter-group';
// @ts-expect-error DOM does not re-export Core state types.
import type { MeterGroupState } from '@sectile/dom/meter-group';
// @ts-expect-error Terminal does not re-export Core factories.
import { tryCreateMeterGroupState } from '@sectile/terminal/meter-group';
// @ts-expect-error Vue does not re-export DOM connections.
import type { MeterGroupConnection } from '@sectile/vue/meter-group';
import type { MeterGroupRootProps } from '@sectile/vue/meter-group';

const unsupported: MeterGroupRootProps = {
  items: [],
  // @ts-expect-error MeterGroup has no model ownership prop.
  modelValue: [],
};
const unsupportedPresentation: MeterGroupRootProps = {
  items: [],
  // @ts-expect-error Colors remain consumer-owned.
  colors: ['red'],
};

void [createMeterGroupState, meterGroupDefault, tryCreateMeterGroupState, unsupported, unsupportedPresentation];
type _Leaks = [MeterGroupState, MeterGroupConnection];
