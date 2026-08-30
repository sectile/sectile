import type { CoreErrorCode, Result, SectileError } from '@sectile/core';

export type ChartOwnErrorCode =
  | 'chart-accessor-invalid'
  | 'chart-aggregate-invalid'
  | 'chart-axis-ceiling-exceeded'
  | 'chart-axis-duplicate'
  | 'chart-axis-invalid'
  | 'chart-axis-missing'
  | 'chart-controller-disposed'
  | 'chart-controller-invalid'
  | 'chart-datum-ceiling-exceeded'
  | 'chart-datum-duplicate'
  | 'chart-datum-invalid'
  | 'chart-datum-missing'
  | 'chart-domain-invalid'
  | 'chart-generation-exhausted'
  | 'chart-interaction-invalid'
  | 'chart-identity-missing'
  | 'chart-layer-ceiling-exceeded'
  | 'chart-layer-duplicate'
  | 'chart-layer-missing'
  | 'chart-model-invalid'
  | 'chart-patch-ceiling-exceeded'
  | 'chart-patch-invalid'
  | 'chart-profile-invalid'
  | 'chart-coordinate-invalid'
  | 'chart-coordinate-mismatch'
  | 'chart-projection-ceiling-exceeded'
  | 'chart-projection-invalid'
  | 'chart-query-invalid'
  | 'chart-scale-invalid'
  | 'chart-stale-generation'
  | 'chart-temporal-invalid'
  | 'chart-tick-ceiling-exceeded'
  | 'chart-view-invalid'
  | 'chart-view-transform-invalid';

export type ChartErrorCode = CoreErrorCode | ChartOwnErrorCode;
export type ChartError<Code extends ChartErrorCode = ChartErrorCode> = SectileError<Code>;
export type ChartResult<T, Code extends ChartErrorCode = ChartErrorCode> = Result<T, Code>;
