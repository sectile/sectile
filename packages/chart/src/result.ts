import type { CoreErrorCode, Result, SectileError } from '@sectile/core';

export type ChartOwnErrorCode =
  | 'chart-datum-ceiling-exceeded'
  | 'chart-datum-duplicate'
  | 'chart-datum-invalid'
  | 'chart-datum-missing'
  | 'chart-generation-exhausted'
  | 'chart-interaction-invalid'
  | 'chart-layer-ceiling-exceeded'
  | 'chart-layer-duplicate'
  | 'chart-layer-missing'
  | 'chart-model-invalid'
  | 'chart-patch-ceiling-exceeded'
  | 'chart-patch-invalid'
  | 'chart-profile-invalid'
  | 'chart-projection-ceiling-exceeded'
  | 'chart-projection-invalid'
  | 'chart-scale-invalid'
  | 'chart-tick-ceiling-exceeded'
  | 'chart-view-transform-invalid'
  | 'chart-stale-generation';

export type ChartErrorCode = CoreErrorCode | ChartOwnErrorCode;
export type ChartError<Code extends ChartErrorCode = ChartErrorCode> = SectileError<Code>;
export type ChartResult<T, Code extends ChartErrorCode = ChartErrorCode> = Result<T, Code>;
