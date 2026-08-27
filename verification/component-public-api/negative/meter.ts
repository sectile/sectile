// @ts-expect-error Core component runtime is subpath-only.
import { createMeterState } from '@sectile/core';
// @ts-expect-error Component subpaths have no default export.
import meterDefault from '@sectile/core/meter';
// @ts-expect-error DOM does not re-export Core state types.
import type { MeterState } from '@sectile/dom/meter';
// @ts-expect-error Terminal does not re-export Core factories.
import { tryCreateMeterState } from '@sectile/terminal/meter';
// @ts-expect-error Vue does not re-export DOM connections.
import type { MeterConnection } from '@sectile/vue/meter';
import type { MeterRootProps } from '@sectile/vue/meter';

const unsupported: MeterRootProps = {
  value: '25',
  // @ts-expect-error Meter has no model ownership prop.
  modelValue: '30',
};

void [createMeterState, meterDefault, tryCreateMeterState, unsupported];
type _Leaks = [MeterState, MeterConnection];
