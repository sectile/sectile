import type { Result, StableID } from '@sectile/primitives';
import type { RevisionSnapshot } from '@sectile/primitives/revision';
import type { Tree, TreeNodeInput } from '@sectile/primitives/tree';
import { applyMenuEvent, createMenuModel, createMenuState, type MenuCommand, type MenuEvent, type MenuPolicies, type MenuState } from '@sectile/primitives/menu';
import { createSemanticController, type SemanticController } from './semantic-controller.js';

export type MenuKind = 'menu' | 'menubar' | 'menu-button';
export interface MenuTypeaheadOptions<ID extends StableID> { readonly textValue: (id: ID) => string; readonly timeout?: number; readonly now?: () => number; readonly normalize?: (text: string) => string }
export interface MenuControlOptions<ID extends StableID> {
  readonly root: HTMLElement;
  readonly trigger?: HTMLElement;
  readonly items: readonly TreeNodeInput<ID>[];
  readonly kind: MenuKind;
  readonly policies?: MenuPolicies<ID>;
  readonly disabledItems?: readonly ID[];
  readonly open?: boolean;
  readonly defaultOpen?: boolean;
  readonly defaultHighlightedValue?: ID | null;
  readonly typeahead?: MenuTypeaheadOptions<ID>;
  readonly label?: string;
  readonly onOpenChange?: (open: boolean) => void;
  readonly onInvoke?: (id: ID) => void;
  readonly onUpdate?: () => void;
}
export interface MenuControl<ID extends StableID> {
  getSnapshot(): RevisionSnapshot<MenuState<ID>>;
  syncControlledValue(open: boolean): Result<RevisionSnapshot<MenuState<ID>>>;
  setItemAttributes(element: HTMLElement, id: ID): void;
  handleEvent(event: MenuEvent<ID>): boolean;
  disconnect(): void;
}

export function createMenuControl<ID extends StableID>(options: MenuControlOptions<ID>): Result<MenuControl<ID>> {
  const model = createMenuModel(options.items); if (!model.ok) return model;
  const disabled = new Set(options.disabledItems ?? []);
  for (const id of disabled) if (!model.value.tree.has(id)) return { ok: false, error: { class: 'construction', code: 'disabled-item-outside-domain', message: 'Every disabled menu item must exist in the menu tree.', details: { id } } };
  const suppliedDisabled = options.policies?.disabled;
  const policies: MenuPolicies<ID> = { ...options.policies, disabled: (id) => disabled.has(id) || (suppliedDisabled?.(id) ?? false) };
  const openControlled = options.kind === 'menu-button' && options.open !== undefined;
  const initialOpen = options.kind === 'menu-button' ? options.open ?? options.defaultOpen ?? false : true;
  const runtime = createSemanticController<MenuState<ID>, MenuEvent<ID>, MenuCommand<ID>, MenuCommand<ID>>({
    initial: createMenuState(model.value.tree, initialOpen, initialOpen ? options.defaultHighlightedValue ?? null : null, []),
    reducer: (state, event) => applyMenuEvent(model.value.tree, state, event, policies),
    reconcile: (previous, proposed) => {
      const open = options.kind === 'menu-button' ? openControlled ? previous.open : proposed.open : true;
      return createMenuState(model.value.tree, open, open ? proposed.cursor.current : null, open ? proposed.openPath : []);
    },
    notify: (previous, proposed) => { if (previous.open !== proposed.open) options.onOpenChange?.(proposed.open); },
    toEffect: (command) => command,
  });
  return runtime.ok ? { ok: true, value: new DOMMenuControl(options, model.value.tree, runtime.value, policies, openControlled) } : runtime;
}

class DOMMenuControl<ID extends StableID> implements MenuControl<ID> {
  readonly #options: MenuControlOptions<ID>; readonly #tree: Tree<ID>; readonly #runtime: SemanticController<MenuState<ID>, MenuEvent<ID>, MenuCommand<ID>>; readonly #policies: MenuPolicies<ID>; readonly #openControlled: boolean; readonly #elements = new Map<ID, HTMLElement>();
  readonly #keydown: (event: KeyboardEvent) => void; readonly #click: (event: MouseEvent) => void; readonly #triggerClick: () => void;
  #typeaheadBuffer = ''; #lastTypeaheadAt = Number.NEGATIVE_INFINITY;
  public constructor(options: MenuControlOptions<ID>, tree: Tree<ID>, runtime: SemanticController<MenuState<ID>, MenuEvent<ID>, MenuCommand<ID>>, policies: MenuPolicies<ID>, openControlled: boolean) {
    this.#options = options; this.#tree = tree; this.#runtime = runtime; this.#policies = policies; this.#openControlled = openControlled;
    this.#keydown = (event) => { if (this.#handleTypeahead(event)) { event.preventDefault(); return; } const semantic = toMenuEvent(event, options.kind); if (semantic !== null && this.handleEvent(semantic)) event.preventDefault(); };
    this.#click = (event) => { for (const [id, element] of this.#elements) if (event.target === element || (typeof Node !== 'undefined' && event.target instanceof Node && element.contains(event.target))) { this.handleEvent({ type: 'focus', id }); if (this.#policies.disabled?.(id) !== true) this.handleEvent(this.#tree.isLeaf(id) ? 'invoke' : 'open-submenu'); return; } };
    this.#triggerClick = () => { this.handleEvent(this.getSnapshot().state.open ? 'close-popup' : 'open-popup'); };
    options.root.addEventListener('keydown', this.#keydown); options.root.addEventListener('click', this.#click); options.trigger?.addEventListener('click', this.#triggerClick); this.#refresh();
  }
  public getSnapshot(): RevisionSnapshot<MenuState<ID>> { return this.#runtime.getSnapshot(); }
  public syncControlledValue(open: boolean): Result<RevisionSnapshot<MenuState<ID>>> {
    if (!this.#openControlled) return { ok: false, error: { class: 'construction', code: 'uncontrolled-controller-sync', message: 'Only a controlled menu button can synchronize open state.' } };
    const state = this.getSnapshot().state;
    const result = this.#runtime.replace(createMenuState(this.#tree, open, open ? state.cursor.current : null, open ? state.openPath : []));
    if (result.ok) { this.#refresh(); this.#options.onUpdate?.(); }
    return result;
  }
  public setItemAttributes(element: HTMLElement, id: ID): void { if (this.#tree.has(id)) { this.#elements.set(id, element); this.#refresh(); } }
  public handleEvent(event: MenuEvent<ID>): boolean { const result = this.#runtime.handle(event); if (result.ok) { for (const effect of result.commands) { if (effect.type === 'invoke') this.#options.onInvoke?.(effect.id); if (effect.type === 'focus') this.#elements.get(effect.id)?.focus(); if (effect.type === 'restore-focus') this.#options.trigger?.focus(); } this.#refresh(); } this.#options.onUpdate?.(); return true; }
  public disconnect(): void { this.#options.root.removeEventListener('keydown', this.#keydown); this.#options.root.removeEventListener('click', this.#click); this.#options.trigger?.removeEventListener('click', this.#triggerClick); this.#elements.clear(); }
  #refresh(): void { const state = this.getSnapshot().state; this.#options.root.setAttribute('role', this.#options.kind === 'menubar' ? 'menubar' : 'menu'); if (this.#options.label !== undefined) this.#options.root.setAttribute('aria-label', this.#options.label); this.#options.root.hidden = !state.open; this.#options.trigger?.setAttribute('aria-haspopup', 'menu'); this.#options.trigger?.setAttribute('aria-expanded', String(state.open)); for (const [id, element] of this.#elements) { element.setAttribute('role', 'menuitem'); if (this.#policies.disabled?.(id) === true) element.setAttribute('aria-disabled', 'true'); else element.removeAttribute('aria-disabled'); if (this.#tree.isLeaf(id) === false) { element.setAttribute('aria-haspopup', 'menu'); element.setAttribute('aria-expanded', String(state.openPath.includes(id))); } element.tabIndex = state.cursor.current === id ? 0 : -1; } }
  #handleTypeahead(event: KeyboardEvent): boolean {
    const config = this.#options.typeahead;
    if (config === undefined || event.altKey || event.ctrlKey || event.metaKey || event.key.length !== 1) return false;
    const now = config.now?.() ?? Date.now(); const timeout = config.timeout ?? 500;
    this.#typeaheadBuffer = now - this.#lastTypeaheadAt > timeout ? event.key : `${this.#typeaheadBuffer}${event.key}`; this.#lastTypeaheadAt = now;
    const normalize = config.normalize ?? ((text: string) => text.normalize('NFKC').toLocaleLowerCase());
    const current = this.getSnapshot().state.cursor.current;
    const siblings = current === null || this.#tree.parentOf(current) === null ? this.#tree.roots.ids : this.#tree.childrenOf(this.#tree.parentOf(current) as ID)?.ids ?? [];
    if (siblings.length === 0) return true;
    const start = current === null ? 0 : ((siblings.indexOf(current) + 1) % siblings.length);
    const query = normalize(this.#typeaheadBuffer);
    for (let offset = 0; offset < siblings.length; offset += 1) { const id = siblings[(start + offset) % siblings.length] as ID; if (normalize(config.textValue(id)).startsWith(query)) { this.handleEvent({ type: 'focus', id }); break; } }
    return true;
  }
}

function toMenuEvent(event: KeyboardEvent, kind: MenuKind): Extract<MenuEvent, string> | null { if (event.altKey || event.ctrlKey || event.metaKey) return null; if (event.key === 'Escape') return 'escape'; if (event.key === 'Home') return 'first'; if (event.key === 'End') return 'last'; if (event.key === 'Enter' || event.key === ' ') return 'invoke'; if (event.key === 'ArrowDown') return kind === 'menubar' ? 'open-submenu' : 'next'; if (event.key === 'ArrowUp') return 'previous'; if (event.key === 'ArrowRight') return kind === 'menubar' ? 'next' : 'open-submenu'; if (event.key === 'ArrowLeft') return kind === 'menubar' ? 'previous' : 'close-submenu'; return null; }
