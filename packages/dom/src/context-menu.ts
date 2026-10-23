import { createFacadeConnection, type FacadeConnection } from '@sectile/core/adapter-runtime';
import { failResult, unwrap } from '@sectile/core/result';
import type { Result, StableID } from '@sectile/core';
import type { PositionOptions, PositionRect } from './position.js';
import { snapshotPositionRect } from './overlay/position/connection.js';
import { createMenuControl, type ContextMenuControl, type MenuHostOptions, type MenuConstructionErrorCode } from './overlay/menu/control.js';
export type { MenuConstructionErrorCode } from './overlay/menu/control.js';

/** A context-triggered Menu; the trigger owns keyboard access and focus return. */
export type ContextMenuOptions<ID extends StableID = StableID> = MenuHostOptions<ID> & PositionOptions & {
  readonly trigger: HTMLElement;
  readonly position?: boolean;
  /** Initial viewport snapshot, also usable when restoring a native connection. */
  readonly anchorRect?: PositionRect;
};
export type ContextMenuConnection<ID extends StableID = StableID> = ContextMenuControl<ID>;
export type ContextMenuConstructionErrorCode = MenuConstructionErrorCode | 'dom.context-menu-trigger';

export function createContextMenu<ID extends StableID>(options: ContextMenuOptions<ID>): FacadeConnection<ContextMenuConnection<ID>> {
  return unwrap(tryCreateContextMenu(options));
}

export function tryCreateContextMenu<ID extends StableID>(options: ContextMenuOptions<ID>): Result<FacadeConnection<ContextMenuConnection<ID>>, ContextMenuConstructionErrorCode> {
  return createFacadeConnection(options, tryCreateContextMenuConnection);
}

function tryCreateContextMenuConnection<ID extends StableID>(options: ContextMenuOptions<ID>): Result<ContextMenuConnection<ID>, ContextMenuConstructionErrorCode> {
  if (options.root === options.trigger) return failResult('construction', 'dom.context-menu-trigger', 'ContextMenu root and trigger must be distinct elements.');
  return createMenuControl({ strategy: 'fixed', side: 'bottom', align: options.direction === 'rtl' ? 'end' : 'start',
    sideOffset: 0, ...options, anchorRect: snapshotPositionRect(options.anchorRect), kind: 'menu-button', triggerMode: 'context-menu' });
}
