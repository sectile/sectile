import { createFacadeConnection, type FacadeConnection } from '@sectile/core/adapter-runtime';
import { unwrap } from '@sectile/core/result';
import type { Result, StableID } from '@sectile/core';
import type { MenuConstructionErrorCode } from './overlay/menu/control.js';
export type { MenuConstructionErrorCode } from './overlay/menu/control.js';
import { createMenuControl, type MenuControl, type MenuHostOptions } from './overlay/menu/control.js';

export type NavigationMenuOptions<ID extends StableID = StableID> = MenuHostOptions<ID, 'kind' | 'trigger' | 'open' | 'defaultOpen'>;
export type NavigationMenuConnection<ID extends StableID = StableID> = MenuControl<ID>;

export function createNavigationMenu<ID extends StableID>(options: NavigationMenuOptions<ID>): FacadeConnection<NavigationMenuConnection<ID>> {
  return unwrap(tryCreateNavigationMenu(options));
}

export function tryCreateNavigationMenu<ID extends StableID>(options: NavigationMenuOptions<ID>): Result<FacadeConnection<NavigationMenuConnection<ID>>, MenuConstructionErrorCode> {
  return createFacadeConnection(options, (resolved) => createMenuControl({ ...resolved, kind: 'navigation-menu' }));
}
