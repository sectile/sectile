import { createFacadeConnection, type FacadeConnection } from '@sectile/core/adapter-runtime';
import { unwrap } from '@sectile/core/result';
import type { Result, StableID } from '@sectile/core'; import { createMenuControl, type MenuControl, type MenuControlOptions } from './internal/menu-control.js'; export type MenuButtonOptions<ID extends StableID = StableID> = Omit<MenuControlOptions<ID>, 'kind'>; export type MenuButtonConnection<ID extends StableID = StableID> = MenuControl<ID>; export function createMenuButton<ID extends StableID>(options: MenuButtonOptions<ID>): FacadeConnection<MenuButtonConnection<ID>> {
  return unwrap(tryCreateMenuButton(options));
}

export function tryCreateMenuButton<ID extends StableID>(options: MenuButtonOptions<ID>): Result<FacadeConnection<MenuButtonConnection<ID>>> {
  return createFacadeConnection(options, (options) => tryCreateMenuButtonConnection(options));
}

function tryCreateMenuButtonConnection<ID extends StableID>(options: MenuButtonOptions<ID>): Result<MenuButtonConnection<ID>> { return createMenuControl({ ...options, kind: 'menu-button' }); }
