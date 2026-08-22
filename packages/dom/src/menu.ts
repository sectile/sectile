import { createFacadeConnection, type FacadeConnection } from './internal/facade.js';
import { unwrap } from '@sectile/core/result';
import type { Result, StableID } from '@sectile/core'; import { createMenuControl, type MenuControl, type MenuControlOptions } from './internal/menu-control.js'; export type MenuOptions<ID extends StableID = StableID> = Omit<MenuControlOptions<ID>, 'kind'>; export type MenuConnection<ID extends StableID = StableID> = MenuControl<ID>; export function createMenu<ID extends StableID>(options: MenuOptions<ID>): FacadeConnection<MenuConnection<ID>> {
  return unwrap(tryCreateMenu(options));
}
export type { MenuPolicies } from '@sectile/core/menu';
export type { TreeNodeInput as MenuItemDefinition } from '@sectile/core/tree';

export function tryCreateMenu<ID extends StableID>(options: MenuOptions<ID>): Result<FacadeConnection<MenuConnection<ID>>> {
  return createFacadeConnection(options, (options) => tryCreateMenuConnection(options));
}

function tryCreateMenuConnection<ID extends StableID>(options: MenuOptions<ID>): Result<MenuConnection<ID>> { return createMenuControl({ ...options, kind: 'menu' }); }
