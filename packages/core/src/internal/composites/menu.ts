import { unwrap } from '../../result.js';
import type { Result, StableID } from '../../shared.js';
import type { Tree } from '../../structures/tree.js';
import { bindCanonicalState, fail, hasCanonicalState, memoizeWeakPair, ok } from '../kernel/foundation.js';
import { createMachineUpdate } from '../kernel/machine.js';
import { createCursorState, type CursorState } from '../state/cursor.js';

const menuVisibleViews = new WeakMap<object, WeakMap<object, ReturnType<Tree<StableID>['visible']>>>();

export interface MenuState<ID extends StableID = StableID> { readonly open: boolean; readonly cursor: CursorState<ID>; readonly openPath: readonly ID[] }
export type MenuEvent<ID extends StableID = StableID> = 'open-popup' | 'close-popup' | 'next' | 'previous' | 'first' | 'last' | 'open-submenu' | 'close-submenu' | 'invoke' | 'escape' | { readonly type: 'focus'; readonly id: ID };
export type MenuCommand<ID extends StableID = StableID> = { readonly type: 'focus' | 'invoke'; readonly id: ID } | { readonly type: 'restore-focus' };
export interface MenuUpdate<ID extends StableID = StableID> { readonly state: MenuState<ID>; readonly commands: readonly MenuCommand<ID>[] }
export interface MenuPolicies<ID extends StableID = StableID> { readonly disabled?: (id: ID) => boolean }

export function createMenuState<ID extends StableID>(tree: Tree<ID>, open = false, current: ID | null = null, openPath: readonly ID[] = []): MenuState<ID> {
  return unwrap(tryCreateMenuState(tree, open, current, openPath));
}

export function tryCreateMenuState<ID extends StableID>(tree: Tree<ID>, open = false, current: ID | null = null, openPath: readonly ID[] = []): Result<MenuState<ID>> {
  const normalized = tree.normalizeExpansion(openPath).ids;
  if (normalized.length !== openPath.length || normalized.some((id, index) => id !== openPath[index])) return fail('construction', 'invalid-menu-open-path', 'Menu open path must contain ordered branch identities.');
  for (let index = 1; index < openPath.length; index += 1) if (tree.parentOf(openPath[index] as ID) !== openPath[index - 1]) return fail('construction', 'disconnected-menu-open-path', 'Menu open path must be one ancestor chain.');
  if (!open && (current !== null || openPath.length > 0)) return fail('construction', 'closed-menu-has-active-state', 'Closed menu cannot own a cursor or submenu path.');
  const state = menuState(tree, open, current, openPath);
  if (open && current !== null && !menuVisible(tree, state.openPath).contains(current)) return fail('construction', 'menu-cursor-hidden', 'Menu cursor must be visible.');
  return ok(state);
}

export function applyMenuEvent<ID extends StableID>(tree: Tree<ID>, state: MenuState<ID>, event: MenuEvent<ID>, policies: MenuPolicies<ID> = {}): Result<MenuUpdate<ID>> {
  if (!hasCanonicalState(tree, state)) { const validation = tryCreateMenuState(tree, state.open, state.cursor.current, state.openPath); if (!validation.ok) return { ok: false, error: { ...validation.error, class: 'transition-rejection' } }; }
  if (event === 'open-popup') { if (state.open) return createMachineUpdate(state); const id = tree.roots.at(0); return createMachineUpdate(menuState(tree, true, id, []), id === null ? [] : [{ type: 'focus', id }]); }
  if (event === 'close-popup') return createMachineUpdate(menuState(tree, false, null, []), state.open ? [{ type: 'restore-focus' }] : []);
  if (!state.open) return fail('transition-rejection', 'menu-closed', 'Menu events require an open menu.');
  if (typeof event === 'object') { if (!menuVisible(tree, state.openPath).contains(event.id)) return fail('transition-rejection', 'menu-target-hidden', 'Direct menu focus requires a visible item.'); return createMachineUpdate(menuState(tree, true, event.id, pathFor(tree, event.id, state.openPath)), [{ type: 'focus', id: event.id }]); }
  const current = state.cursor.current;
  if (event === 'escape') return closeLevel(tree, state);
  if (current === null) { const id = tree.roots.at(event === 'last' ? tree.roots.size - 1 : 0); return createMachineUpdate(menuState(tree, true, id, []), id === null ? [] : [{ type: 'focus', id }]); }
  if (event === 'next' || event === 'previous' || event === 'first' || event === 'last') { const siblings = tree.parentOf(current) === null ? tree.roots : tree.childrenOf(tree.parentOf(current) as ID); if (siblings === null || siblings.size === 0) return createMachineUpdate(state); const index = siblings.indexOf(current) ?? 0; const target = event === 'first' ? 0 : event === 'last' ? siblings.size - 1 : (index + (event === 'next' ? 1 : -1) + siblings.size) % siblings.size; const id = siblings.at(target); return id === null ? createMachineUpdate(state) : createMachineUpdate(menuState(tree, true, id, state.openPath), [{ type: 'focus', id }]); }
  if (event === 'open-submenu') { if (policies.disabled?.(current) === true) return createMachineUpdate(state); const child = tree.childrenOf(current)?.at(0) ?? null; if (child === null) return createMachineUpdate(state); const path = [...(tree.ancestorsOf(current) ?? [])].reverse().filter((id) => tree.isLeaf(id) === false); path.push(current); return createMachineUpdate(menuState(tree, true, child, path), [{ type: 'focus', id: child }]); }
  if (event === 'close-submenu') return closeLevel(tree, state);
  if (tree.isLeaf(current) !== true || policies.disabled?.(current) === true) return createMachineUpdate(state);
  return createMachineUpdate(menuState(tree, false, null, []), [{ type: 'invoke', id: current }, { type: 'restore-focus' }]);
}

function closeLevel<ID extends StableID>(tree: Tree<ID>, state: MenuState<ID>): Result<MenuUpdate<ID>> { const current = state.cursor.current; const parent = current === null ? null : tree.parentOf(current); if (parent === null) return createMachineUpdate(menuState(tree, false, null, []), [{ type: 'restore-focus' }]); const path = state.openPath.filter((id) => id !== parent && !(tree.ancestorsOf(id) ?? []).includes(parent)); return createMachineUpdate(menuState(tree, true, parent, path), [{ type: 'focus', id: parent }]); }
function pathFor<ID extends StableID>(tree: Tree<ID>, id: ID, currentPath: readonly ID[]): readonly ID[] { const ancestors = new Set(tree.ancestorsOf(id) ?? []); return currentPath.filter((branch) => ancestors.has(branch)); }
function menuState<ID extends StableID>(tree: Tree<ID>, open: boolean, current: ID | null, openPath: readonly ID[]): MenuState<ID> { return bindCanonicalState(tree, Object.freeze({ open, cursor: createCursorState(current), openPath: Object.freeze([...openPath]) })); }
function menuVisible<ID extends StableID>(tree: Tree<ID>, openPath: readonly ID[]): ReturnType<Tree<ID>['visible']> { return memoizeWeakPair(menuVisibleViews, tree, openPath, createMenuVisible) as ReturnType<Tree<ID>['visible']>; }
function createMenuVisible(owner: object, openPath: object): ReturnType<Tree<StableID>['visible']> { return (owner as Tree<StableID>).visible(openPath as readonly StableID[]); }
