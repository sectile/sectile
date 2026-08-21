import type { StableID } from '../../../shared.js'; import type { Tree } from '../../../structures/tree.js'; import type { MenuCommand, MenuEvent, MenuState, MenuUpdate } from '../../composites/menu.js';
export type ReferenceMenuResult<ID extends StableID> = { readonly ok: true; readonly value: MenuUpdate<ID> } | { readonly ok: false; readonly errorClass: string; readonly errorCode: string };
export function createReferenceMenuState<ID extends StableID>(open = false, current: ID | null = null, openPath: readonly ID[] = []): MenuState<ID> { return Object.freeze({ open, cursor: Object.freeze({ current }), openPath: Object.freeze([...openPath]) }); }
export function applyReferenceMenuEvent<ID extends StableID>(tree: Tree<ID>, state: MenuState<ID>, event: MenuEvent<ID>): ReferenceMenuResult<ID> {
  if (event === 'open-popup') { if (state.open) return accepted(state); const id = tree.roots.at(0); return accepted(stateOf(true, id, []), id === null ? [] : [{ type: 'focus', id }]); }
  if (event === 'close-popup') return accepted(stateOf(false, null, []), state.open ? [{ type: 'restore-focus' }] : []);
  if (!state.open) return rejected('menu-closed');
  const visible = tree.visible(state.openPath).ids;
  if (typeof event === 'object') { if (!visible.includes(event.id)) return rejected('menu-target-hidden'); const ancestors = new Set(tree.ancestorsOf(event.id) ?? []); return accepted(stateOf(true, event.id, state.openPath.filter((id) => ancestors.has(id))), [{ type: 'focus', id: event.id }]); }
  const current = state.cursor.current;
  if (event === 'escape' || event === 'close-submenu') return close(tree, state);
  if (current === null) { const id = tree.roots.at(0); return accepted(stateOf(true, id, []), id === null ? [] : [{ type: 'focus', id }]); }
  if (event === 'next' || event === 'previous') { const parent = tree.parentOf(current); const ids = parent === null ? tree.roots.ids : tree.childrenOf(parent)?.ids ?? []; if (ids.length === 0) return accepted(state); const index = ids.indexOf(current); const delta = event === 'next' ? 1 : -1; const id = ids[(index + delta + ids.length) % ids.length] as ID; return accepted(stateOf(true, id, state.openPath), [{ type: 'focus', id }]); }
  if (event === 'open-submenu') { const child = tree.childrenOf(current)?.at(0) ?? null; if (child === null) return accepted(state); const path = [...(tree.ancestorsOf(current) ?? [])].reverse().filter((id) => tree.isLeaf(id) === false); path.push(current); return accepted(stateOf(true, child, path), [{ type: 'focus', id: child }]); }
  if (tree.isLeaf(current) !== true) return accepted(state);
  return accepted(stateOf(false, null, []), [{ type: 'invoke', id: current }, { type: 'restore-focus' }]);
}
function close<ID extends StableID>(tree: Tree<ID>, state: MenuState<ID>): ReferenceMenuResult<ID> { const current = state.cursor.current; const parent = current === null ? null : tree.parentOf(current); if (parent === null) return accepted(stateOf(false, null, []), [{ type: 'restore-focus' }]); const path = state.openPath.filter((id) => id !== parent && !(tree.ancestorsOf(id) ?? []).includes(parent)); return accepted(stateOf(true, parent, path), [{ type: 'focus', id: parent }]); }
function stateOf<ID extends StableID>(open: boolean, current: ID | null, openPath: readonly ID[]): MenuState<ID> { return createReferenceMenuState(open, current, openPath); }
function accepted<ID extends StableID>(state: MenuState<ID>, commands: readonly MenuCommand<ID>[] = []): ReferenceMenuResult<ID> { return { ok: true, value: { state, commands } }; }
function rejected<ID extends StableID>(errorCode: string): ReferenceMenuResult<ID> { return { ok: false, errorClass: 'transition-rejection', errorCode }; }
