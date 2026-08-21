import type { Result, StableID } from '@sectile/primitives';
import type { RevisionSnapshot } from '@sectile/primitives/revision';
import type { Tree, TreeNodeInput } from '@sectile/primitives/tree';
import { applyMenuEvent, createMenuModel, createMenuState, type MenuCommand, type MenuEvent, type MenuState } from '@sectile/primitives/menu';
import { createSemanticController, type SemanticController } from './semantic-controller.js';

export type MenuKind = 'menu' | 'menubar' | 'menu-button';
export interface MenuControlOptions<ID extends StableID> { readonly root: HTMLElement; readonly trigger?: HTMLElement; readonly items: readonly TreeNodeInput<ID>[]; readonly kind: MenuKind; readonly defaultOpen?: boolean; readonly defaultHighlightedValue?: ID | null; readonly onInvoke?: (id: ID) => void; readonly onUpdate?: () => void }
export interface MenuControl<ID extends StableID> { getSnapshot(): RevisionSnapshot<MenuState<ID>>; setItemAttributes(element: HTMLElement, id: ID): void; handleEvent(event: MenuEvent<ID>): boolean; disconnect(): void }

export function createMenuControl<ID extends StableID>(options: MenuControlOptions<ID>): Result<MenuControl<ID>> {
  const model = createMenuModel(options.items); if (!model.ok) return model;
  const runtime = createSemanticController<MenuState<ID>, MenuEvent<ID>, MenuCommand<ID>, MenuCommand<ID>>({
    initial: createMenuState(model.value.tree, options.defaultOpen ?? options.kind !== 'menu-button', options.defaultHighlightedValue ?? null, []),
    reducer: (state, event) => applyMenuEvent(model.value.tree, state, event),
    toEffect: (command) => command,
  });
  return runtime.ok ? { ok: true, value: new DOMMenuControl(options, model.value.tree, runtime.value) } : runtime;
}

class DOMMenuControl<ID extends StableID> implements MenuControl<ID> {
  readonly #options: MenuControlOptions<ID>; readonly #tree: Tree<ID>; readonly #runtime: SemanticController<MenuState<ID>, MenuEvent<ID>, MenuCommand<ID>>; readonly #elements = new Map<ID, HTMLElement>();
  readonly #keydown: (event: KeyboardEvent) => void; readonly #click: (event: MouseEvent) => void; readonly #triggerClick: () => void;
  public constructor(options: MenuControlOptions<ID>, tree: Tree<ID>, runtime: SemanticController<MenuState<ID>, MenuEvent<ID>, MenuCommand<ID>>) {
    this.#options = options; this.#tree = tree; this.#runtime = runtime;
    this.#keydown = (event) => { const semantic = toMenuEvent(event, options.kind); if (semantic !== null && this.handleEvent(semantic)) event.preventDefault(); };
    this.#click = (event) => { for (const [id, element] of this.#elements) if (event.target === element || (event.target instanceof Node && element.contains(event.target))) { this.handleEvent({ type: 'focus', id }); this.handleEvent(this.#tree.isLeaf(id) ? 'invoke' : 'open-submenu'); return; } };
    this.#triggerClick = () => { this.handleEvent(this.getSnapshot().state.open ? 'close-popup' : 'open-popup'); };
    options.root.addEventListener('keydown', this.#keydown); options.root.addEventListener('click', this.#click); options.trigger?.addEventListener('click', this.#triggerClick); this.#refresh();
  }
  public getSnapshot(): RevisionSnapshot<MenuState<ID>> { return this.#runtime.getSnapshot(); }
  public setItemAttributes(element: HTMLElement, id: ID): void { if (this.#tree.has(id)) { this.#elements.set(id, element); this.#refresh(); } }
  public handleEvent(event: MenuEvent<ID>): boolean { const result = this.#runtime.handle(event); if (result.ok) { for (const effect of result.commands) { if (effect.type === 'invoke') this.#options.onInvoke?.(effect.id); if (effect.type === 'focus') this.#elements.get(effect.id)?.focus(); if (effect.type === 'restore-focus') this.#options.trigger?.focus(); } this.#refresh(); } this.#options.onUpdate?.(); return true; }
  public disconnect(): void { this.#options.root.removeEventListener('keydown', this.#keydown); this.#options.root.removeEventListener('click', this.#click); this.#options.trigger?.removeEventListener('click', this.#triggerClick); this.#elements.clear(); }
  #refresh(): void { const state = this.getSnapshot().state; this.#options.root.setAttribute('role', this.#options.kind === 'menubar' ? 'menubar' : 'menu'); this.#options.root.hidden = !state.open; this.#options.trigger?.setAttribute('aria-haspopup', 'menu'); this.#options.trigger?.setAttribute('aria-expanded', String(state.open)); for (const [id, element] of this.#elements) { element.setAttribute('role', 'menuitem'); if (this.#tree.isLeaf(id) === false) { element.setAttribute('aria-haspopup', 'menu'); element.setAttribute('aria-expanded', String(state.openPath.includes(id))); } element.tabIndex = state.cursor.current === id ? 0 : -1; } }
}

function toMenuEvent(event: KeyboardEvent, kind: MenuKind): Extract<MenuEvent, string> | null { if (event.altKey || event.ctrlKey || event.metaKey) return null; if (event.key === 'Escape') return 'escape'; if (event.key === 'Enter' || event.key === ' ') return 'invoke'; if (event.key === 'ArrowDown') return kind === 'menubar' ? 'open-submenu' : 'next'; if (event.key === 'ArrowUp') return 'previous'; if (event.key === 'ArrowRight') return kind === 'menubar' ? 'next' : 'open-submenu'; if (event.key === 'ArrowLeft') return kind === 'menubar' ? 'previous' : 'close-submenu'; return null; }
