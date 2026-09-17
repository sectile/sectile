import type { StableID } from '@sectile/core';
import type { VirtualLayoutPlan, VirtualPlacement } from '@sectile/virtual/layout';
import type { VirtualItemStyleOptions } from './contracts.js';

export function virtualSurfaceStyle<ID extends StableID>(
  plan: VirtualLayoutPlan<ID>,
): Readonly<Record<string, string>> {
  return Object.freeze({
    position: 'relative',
    width: `${plan.contentSize.width}px`,
    height: `${plan.contentSize.height}px`,
  });
}

export function virtualItemStyle<ID extends StableID>(
  placement: VirtualPlacement<ID>,
  options: VirtualItemStyleOptions = {},
): Readonly<Record<string, string | number>> {
  const style: Record<string, string | number> = {
    position: 'absolute',
    top: '0',
    left: '0',
    transform: `translate3d(${placement.rect.x}px, ${placement.rect.y}px, 0)`,
  };
  if (options.width === true) style['width'] = `${placement.rect.width}px`;
  if (options.height === true) style['height'] = `${placement.rect.height}px`;
  if ('zIndex' in placement && typeof placement['zIndex'] === 'number') {
    style['zIndex'] = placement['zIndex'];
  }
  return Object.freeze(style);
}
