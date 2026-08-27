// @ts-expect-error Core component runtime is subpath-only.
import { createProgressState } from '@sectile/core';
// @ts-expect-error Component subpaths have no default export.
import progressDefault from '@sectile/core/progress';
// @ts-expect-error DOM does not re-export Core state types.
import type { ProgressState } from '@sectile/dom/progress';
// @ts-expect-error Terminal does not re-export Core factories.
import { tryCreateProgressState } from '@sectile/terminal/progress';
// @ts-expect-error Vue does not re-export DOM connections.
import type { ProgressConnection } from '@sectile/vue/progress';
import type { ProgressRootProps } from '@sectile/vue/progress';

const unsupported: ProgressRootProps = {
  value: '25',
  // @ts-expect-error Progress has no model ownership prop.
  modelValue: '30',
};

void [createProgressState, progressDefault, tryCreateProgressState, unsupported];
type _Leaks = [ProgressState, ProgressConnection];
