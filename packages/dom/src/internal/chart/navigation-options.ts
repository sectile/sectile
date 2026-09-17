import type { Result, StableID } from '@sectile/core';
import { tryNormalizeStableIDs } from '@sectile/core/identity';
import { unwrap } from '@sectile/core/result';
import type { DOMChartNavigation, NormalizedDOMChartNavigation } from './contracts.js';
import { invalidRenderer } from './result.js';

export function normalizeDOMChartNavigation<ID extends StableID>(
  navigation: DOMChartNavigation<ID> = {},
): NormalizedDOMChartNavigation<ID> {
  return unwrap(tryNormalizeDOMChartNavigation(navigation));
}

export function tryNormalizeDOMChartNavigation<ID extends StableID>(
  navigation: DOMChartNavigation<ID> = {},
): Result<NormalizedDOMChartNavigation<ID>> {
  if (navigation === null || typeof navigation !== 'object') return invalidRenderer('DOM Chart navigation must be an object.');
  const drag = navigation.drag ?? 'none';
  const wheel = navigation.wheel ?? 'native';
  const wheelModifier = navigation.wheelModifier ?? 'none';
  if (!['none', 'pan', 'zoom-region', 'select'].includes(drag)
    || !['native', 'pan', 'zoom'].includes(wheel)
    || !['none', 'control', 'meta', 'alt', 'shift'].includes(wheelModifier)
    || (navigation.pinch !== undefined && typeof navigation.pinch !== 'boolean')
    || (navigation.keyboard !== undefined && typeof navigation.keyboard !== 'boolean')
    || (navigation.controlAlternative !== undefined
      && navigation.controlAlternative !== 'built-in' && navigation.controlAlternative !== 'external')) {
    return invalidRenderer('DOM Chart navigation binding is invalid.');
  }
  const axes = navigation.axes === undefined ? undefined : tryNormalizeStableIDs(navigation.axes);
  if (axes !== undefined && !axes.ok) return axes;
  const pinch = navigation.pinch ?? false;
  if ((drag !== 'none' || pinch) && navigation.controlAlternative === undefined) {
    return invalidRenderer('Direct Chart gestures require a built-in or external single-pointer control alternative.');
  }
  return { ok: true, value: Object.freeze({
    axes: axes?.value,
    drag,
    wheel,
    wheelModifier,
    pinch,
    keyboard: navigation.keyboard ?? false,
    controlAlternative: navigation.controlAlternative,
  }) };
}
