import { createFacadeConnection, type FacadeConnection } from '@sectile/core/adapter-runtime';
import { unwrap } from '@sectile/core/result';
import type { Result, StableID } from '@sectile/core';
import { createMenuControl, type MenuControl, type MenuControlOptions } from './internal/menu-control.js';

export type NavigationMenuOptions<ID extends StableID = StableID> = Omit<MenuControlOptions<ID>, 'kind' | 'open' | 'defaultOpen'>;
export type NavigationMenuConnection<ID extends StableID = StableID> = MenuControl<ID>;

export function createNavigationMenu<ID extends StableID>(options: NavigationMenuOptions<ID>): FacadeConnection<NavigationMenuConnection<ID>> {
  return unwrap(tryCreateNavigationMenu(options));
}

export function tryCreateNavigationMenu<ID extends StableID>(options: NavigationMenuOptions<ID>): Result<FacadeConnection<NavigationMenuConnection<ID>>> {
  return createFacadeConnection(options, (resolved) => createMenuControl({ ...resolved, kind: 'navigation-menu' }));
}
