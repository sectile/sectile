import { createFacadeConnection, type FacadeConnection } from '@sectile/core/adapter-runtime';
import { unwrap } from '@sectile/core/result';
import type { Result, StableID } from '@sectile/core';
import type { PositionOptions } from './position.js';
import type { MenuConstructionErrorCode } from './overlay/menu/control.js';
export type { MenuConstructionErrorCode } from './overlay/menu/control.js';
import { createMenuControl, type MenuControl, type MenuHostOptions } from './overlay/menu/control.js';

export type MenuButtonOptions<ID extends StableID = StableID> = MenuHostOptions<ID> & PositionOptions & { readonly trigger: HTMLElement; readonly position?: boolean };
export type MenuButtonConnection<ID extends StableID = StableID> = MenuControl<ID>;

export function createMenuButton<ID extends StableID>(options: MenuButtonOptions<ID>): FacadeConnection<MenuButtonConnection<ID>> {
  return unwrap(tryCreateMenuButton(options));
}

export function tryCreateMenuButton<ID extends StableID>(options: MenuButtonOptions<ID>): Result<FacadeConnection<MenuButtonConnection<ID>>, MenuConstructionErrorCode> {
  return createFacadeConnection(options, tryCreateMenuButtonConnection);
}

function tryCreateMenuButtonConnection<ID extends StableID>(options: MenuButtonOptions<ID>): Result<MenuButtonConnection<ID>, MenuConstructionErrorCode> { return createMenuControl({ ...options, kind: 'menu-button' }); }
