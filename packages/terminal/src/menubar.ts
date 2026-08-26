import { createFacadeConnection, type FacadeConnection } from '@sectile/core/adapter-runtime';
import { unwrap } from '@sectile/core/result';
import type { Result, StableID } from '@sectile/core'; import { createMenuControl, type MenuControl, type MenuControlOptions } from './internal/menu-control.js'; export type MenubarOptions<ID extends StableID = StableID> = Omit<MenuControlOptions<ID>, 'kind'>; export type MenubarConnection<ID extends StableID = StableID> = MenuControl<ID>; export function createMenubar<ID extends StableID>(options: MenubarOptions<ID>): FacadeConnection<MenubarConnection<ID>> {
  return unwrap(tryCreateMenubar(options));
}

export function tryCreateMenubar<ID extends StableID>(options: MenubarOptions<ID>): Result<FacadeConnection<MenubarConnection<ID>>> {
  return createFacadeConnection(options, (options) => tryCreateMenubarConnection(options));
}

function tryCreateMenubarConnection<ID extends StableID>(options: MenubarOptions<ID>): Result<MenubarConnection<ID>> { return createMenuControl({ ...options, kind: 'menubar' }); }
