import type { ChartResult } from '../../result.js';
import { chartFail, chartOK } from '../result.js';
import type { ChartLimits } from './contracts.js';

const normalizedLimits = new WeakSet<object>();

export function tryNormalizeChartLimits(
  input: ChartLimits,
  defaults: Readonly<Required<ChartLimits>>,
): ChartResult<Readonly<Required<ChartLimits>>> {
  if (input === null || typeof input !== 'object') {
    return chartFail('construction', 'chart-model-invalid', 'Chart limits must be an object.');
  }
  if (normalizedLimits.has(input)) return chartOK(input as Readonly<Required<ChartLimits>>);
  const value = {
    maxAxes: input.maxAxes ?? defaults.maxAxes,
    maxLayers: input.maxLayers ?? defaults.maxLayers,
    maxDatums: input.maxDatums ?? defaults.maxDatums,
    maxPatchOperations: input.maxPatchOperations ?? defaults.maxPatchOperations,
    maxIDCodeUnits: input.maxIDCodeUnits ?? defaults.maxIDCodeUnits,
  };
  for (const [name, limit] of Object.entries(value)) {
    if (!Number.isSafeInteger(limit) || limit < (name === 'maxIDCodeUnits' ? 1 : 0)) {
      return chartFail('construction', 'chart-model-invalid', 'Chart limits must be non-negative safe integers.', {
        name,
        value: limit,
      });
    }
  }
  const result = Object.freeze(value);
  normalizedLimits.add(result);
  return chartOK(result);
}

export const DEFAULT_CHART_LIMITS: Readonly<Required<ChartLimits>> = Object.freeze({
  maxAxes: 16,
  maxLayers: 64,
  maxDatums: 1_000_000,
  maxPatchOperations: 100_000,
  maxIDCodeUnits: 1_024,
});
