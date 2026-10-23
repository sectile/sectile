import { createFacadeConnection, type FacadeConnection } from '@sectile/core/adapter-runtime';
import { unwrap } from '@sectile/core/result';
import type { MenuConstructionErrorCode } from './overlay/menu/control.js';
export type { MenuConstructionErrorCode } from './overlay/menu/control.js';
import type { Result, StableID } from '@sectile/core'; import { createMenuControl, type MenuControl, type MenuHostOptions } from './overlay/menu/control.js'; export type MenubarOptions<ID extends StableID = StableID> = MenuHostOptions<ID>; export type MenubarConnection<ID extends StableID = StableID> = MenuControl<ID>; export function createMenubar<ID extends StableID>(options: MenubarOptions<ID>): FacadeConnection<MenubarConnection<ID>> {
  return unwrap(tryCreateMenubar(options));
}

export function tryCreateMenubar<ID extends StableID>(options: MenubarOptions<ID>): Result<FacadeConnection<MenubarConnection<ID>>, MenuConstructionErrorCode> {
  return createFacadeConnection(options, tryCreateMenubarConnection);
}

function tryCreateMenubarConnection<ID extends StableID>(options: MenubarOptions<ID>): Result<MenubarConnection<ID>, MenuConstructionErrorCode> { return createMenuControl({ ...options, kind: 'menubar' }); }
