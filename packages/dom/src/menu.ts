import { createFacadeConnection, type FacadeConnection } from '@sectile/core/adapter-runtime';
import { unwrap } from '@sectile/core/result';
import type { MenuConstructionErrorCode } from './overlay/menu/control.js';
export type { MenuConstructionErrorCode } from './overlay/menu/control.js';
import type { Result, StableID } from '@sectile/core'; import { createMenuControl, type MenuControl, type MenuHostOptions } from './overlay/menu/control.js'; export type MenuOptions<ID extends StableID = StableID> = MenuHostOptions<ID>; export type MenuConnection<ID extends StableID = StableID> = MenuControl<ID>; export function createMenu<ID extends StableID>(options: MenuOptions<ID>): FacadeConnection<MenuConnection<ID>> {
  return unwrap(tryCreateMenu(options));
}
export type { MenuPolicies } from '@sectile/core/menu';
export type { TreeNodeInput as MenuItemDefinition } from '@sectile/core/tree';

export function tryCreateMenu<ID extends StableID>(options: MenuOptions<ID>): Result<FacadeConnection<MenuConnection<ID>>, MenuConstructionErrorCode> {
  return createFacadeConnection(options, tryCreateMenuConnection);
}

function tryCreateMenuConnection<ID extends StableID>(options: MenuOptions<ID>): Result<MenuConnection<ID>, MenuConstructionErrorCode> { return createMenuControl({ ...options, kind: 'menu' }); }
