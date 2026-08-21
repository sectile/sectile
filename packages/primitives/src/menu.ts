import type { Result, StableID } from './shared.js';
import { createTree, type Tree, type TreeNodeInput, type TreeOptions } from './structures/tree.js';
export interface MenuModel<ID extends StableID = StableID> { readonly tree: Tree<ID> }
export function createMenuModel<ID extends StableID>(items: readonly TreeNodeInput<ID>[], options: TreeOptions = {}): Result<MenuModel<ID>> { const tree = createTree(items, options); return tree.ok ? { ok: true, value: Object.freeze({ tree: tree.value }) } : tree; }
export { applyMenuEvent, createMenuState, type MenuCommand, type MenuEvent, type MenuPolicies, type MenuState, type MenuUpdate } from './internal/composites/menu.js';
