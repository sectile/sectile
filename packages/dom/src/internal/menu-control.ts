import type { Result, StableID } from '@sectile/core';
import type { RevisionSnapshot } from '@sectile/core/revision';
import type { Tree, TreeNodeInput } from '@sectile/core/tree';
import { applyMenuEvent, tryCreateMenuModel, tryCreateMenuState, type MenuCommand, type MenuEvent, type MenuPolicies, type MenuState } from '@sectile/core/menu';
import { createSemanticController, type SemanticController } from './semantic-controller.js';
import { setInteractionAttributes } from './interaction.js';

export type MenuKind = 'menu' | 'menubar' | 'navigation-menu' | 'menu-button';
export interface MenuTypeaheadOptions<ID extends StableID> { readonly textValue: (id: ID) => string; readonly timeout?: number; readonly now?: () => number; readonly normalize?: (text: string) => string }
export interface MenuControlOptions<ID extends StableID> {
  readonly root: HTMLElement;
  readonly disabled?: boolean;
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
  setSubmenuAttributes(element: HTMLElement, parentID: ID): void;
  handleEvent(event: MenuEvent<ID>): boolean;
  disconnect(): void;
}

export function createMenuControl<ID extends StableID>(options: MenuControlOptions<ID>): Result<MenuControl<ID>> {
  const model = tryCreateMenuModel(options.items); if (!model.ok) return model;
  const disabled = new Set(options.disabledItems ?? []);
  for (const id of disabled) if (!model.value.tree.has(id)) return { ok: false, error: { class: 'construction', code: 'disabled-item-outside-domain', message: 'Every disabled menu item must exist in the menu tree.', details: { id } } };
  const suppliedDisabled = options.policies?.disabled;
  const policies: MenuPolicies<ID> = { ...options.policies, disabled: (id) => disabled.has(id) || (suppliedDisabled?.(id) ?? false) };
  const openControlled = options.kind === 'menu-button' && options.open !== undefined;
  const initialOpen = options.kind === 'menu-button' ? options.open ?? options.defaultOpen ?? false : true;
  const runtime = createSemanticController<MenuState<ID>, MenuEvent<ID>, MenuCommand<ID>, MenuCommand<ID>>({
    interaction: options,
    initial: tryCreateMenuState(model.value.tree, initialOpen, initialOpen ? options.defaultHighlightedValue ?? null : null, []),
    reducer: (state, event) => applyMenuEvent(model.value.tree, state, event, policies),
    reconcile: (previous, proposed) => {
      const open = options.kind === 'menu-button' ? openControlled ? previous.open : proposed.open : true;
      return tryCreateMenuState(model.value.tree, open, open ? proposed.cursor.current : null, open ? proposed.openPath : []);
    },
    notify: (previous, proposed) => { if (previous.open !== proposed.open) options.onOpenChange?.(proposed.open); },
    toEffect: (command) => command,
  });
  return runtime.ok ? { ok: true, value: new DOMMenuControl(options, model.value.tree, runtime.value, policies, openControlled) } : runtime;
}

class DOMMenuControl<ID extends StableID> implements MenuControl<ID> {
  readonly #options: MenuControlOptions<ID>; readonly #tree: Tree<ID>; readonly #runtime: SemanticController<MenuState<ID>, MenuEvent<ID>, MenuCommand<ID>>; readonly #policies: MenuPolicies<ID>; readonly #openControlled: boolean; readonly #elements = new Map<ID, HTMLElement>(); readonly #submenus = new Map<ID, HTMLElement>();
  readonly #keydown: (event: KeyboardEvent) => void; readonly #click: (event: MouseEvent) => void; readonly #triggerClick: () => void; readonly #reposition: () => void; readonly #view: Window | null; readonly #instanceID: number;
  #typeaheadBuffer = ''; #lastTypeaheadAt = Number.NEGATIVE_INFINITY;
  public constructor(options: MenuControlOptions<ID>, tree: Tree<ID>, runtime: SemanticController<MenuState<ID>, MenuEvent<ID>, MenuCommand<ID>>, policies: MenuPolicies<ID>, openControlled: boolean) {
    this.#options = options; this.#tree = tree; this.#runtime = runtime; this.#policies = policies; this.#openControlled = openControlled;
    setInteractionAttributes(options.root, options); if (options.trigger !== undefined) setInteractionAttributes(options.trigger, options, { native: true });
    this.#view = options.root.ownerDocument?.defaultView ?? null; this.#instanceID = nextMenuControlID += 1;
    this.#keydown = (event) => { if (this.#handleTypeahead(event)) { event.preventDefault(); return; } const semantic = toMenuEvent(event, options.kind); if (semantic !== null && this.handleEvent(semantic)) event.preventDefault(); };
    this.#click = (event) => { for (const [id, element] of this.#elements) if (event.target === element || (typeof Node !== 'undefined' && event.target instanceof Node && element.contains(event.target))) { const wasOpen = this.getSnapshot().state.openPath.includes(id); this.handleEvent({ type: 'focus', id }); if (this.#policies.disabled?.(id) !== true && (this.#tree.isLeaf(id) || !wasOpen)) this.handleEvent(this.#tree.isLeaf(id) ? 'invoke' : 'open-submenu'); return; } };
    this.#triggerClick = () => { this.handleEvent(this.getSnapshot().state.open ? 'close-popup' : 'open-popup'); };
    this.#reposition = () => { this.#positionPopup(); this.#positionSubmenus(); };
    options.root.addEventListener('keydown', this.#keydown); options.root.addEventListener('click', this.#click); options.trigger?.addEventListener('click', this.#triggerClick); this.#view?.addEventListener('resize', this.#reposition); this.#view?.addEventListener('scroll', this.#reposition, true); this.#refresh();
  }
  public getSnapshot(): RevisionSnapshot<MenuState<ID>> { return this.#runtime.getSnapshot(); }
  public syncControlledValue(open: boolean): Result<RevisionSnapshot<MenuState<ID>>> {
    if (!this.#openControlled) return { ok: false, error: { class: 'construction', code: 'uncontrolled-controller-sync', message: 'Only a controlled menu button can synchronize open state.' } };
    const state = this.getSnapshot().state;
    const result = this.#runtime.replace(tryCreateMenuState(this.#tree, open, open ? state.cursor.current : null, open ? state.openPath : []));
    if (result.ok) { this.#refresh(); this.#options.onUpdate?.(); }
    return result;
  }
  public setItemAttributes(element: HTMLElement, id: ID): void { if (this.#tree.has(id)) { this.#elements.set(id, element); this.#refresh(); } }
  public setSubmenuAttributes(element: HTMLElement, parentID: ID): void {
    if (!this.#tree.has(parentID) || this.#tree.isLeaf(parentID)) return;
    this.#submenus.set(parentID, element);
    if (element.id.length === 0) element.id = `sectile-menu-${this.#instanceID}-submenu-${this.#submenus.size}`;
    this.#refresh();
  }
  public handleEvent(event: MenuEvent<ID>): boolean { const result = this.#runtime.handle(event); if (result.ok) { this.#refresh(); for (const effect of result.commands) { if (effect.type === 'invoke') this.#options.onInvoke?.(effect.id); if (effect.type === 'focus') this.#elements.get(effect.id)?.focus(); if (effect.type === 'restore-focus') this.#options.trigger?.focus(); } this.#options.onUpdate?.(); } return result.ok; }
  public disconnect(): void { this.#options.root.removeEventListener('keydown', this.#keydown); this.#options.root.removeEventListener('click', this.#click); this.#options.trigger?.removeEventListener('click', this.#triggerClick); this.#view?.removeEventListener('resize', this.#reposition); this.#view?.removeEventListener('scroll', this.#reposition, true); this.#elements.clear(); this.#submenus.clear(); }
  #refresh(): void {
    const state = this.getSnapshot().state;
    this.#options.root.setAttribute('role', this.#options.kind === 'navigation-menu' ? 'navigation' : this.#options.kind === 'menubar' ? 'menubar' : 'menu');
    if (this.#options.label !== undefined) this.#options.root.setAttribute('aria-label', this.#options.label);
    this.#options.root.hidden = !state.open;
    this.#options.trigger?.setAttribute('aria-haspopup', 'menu'); this.#options.trigger?.setAttribute('aria-expanded', String(state.open));
    for (const [id, element] of this.#elements) {
      element.dataset['level'] = String(this.#tree.depthOf(id) ?? 0);
      if (this.#options.kind === 'navigation-menu') element.removeAttribute('role'); else element.setAttribute('role', 'menuitem');
      if (this.#policies.disabled?.(id) === true) element.setAttribute('aria-disabled', 'true'); else element.removeAttribute('aria-disabled');
      if (this.#tree.isLeaf(id) === false) {
        element.setAttribute('aria-haspopup', 'menu'); element.setAttribute('aria-expanded', String(state.openPath.includes(id)));
        const submenu = this.#submenus.get(id); if (submenu !== undefined) element.setAttribute('aria-controls', submenu.id);
      }
      element.tabIndex = state.cursor.current === id ? 0 : -1;
    }
    for (const [parentID, submenu] of this.#submenus) {
      const open = state.open && state.openPath.includes(parentID);
      submenu.dataset['level'] = String((this.#tree.depthOf(parentID) ?? 0) + 1);
      if (this.#options.kind === 'navigation-menu') submenu.removeAttribute('role'); else submenu.setAttribute('role', 'menu'); submenu.hidden = !open;
      if (!open) { submenu.removeAttribute('data-placement'); this.#elements.get(parentID)?.removeAttribute('data-submenu-placement'); }
    }
    if (!state.open) this.#options.root.removeAttribute('data-placement');
    this.#reposition();
  }
  #positionPopup(): void {
    const viewport = this.#view; const trigger = this.#options.trigger;
    if (this.#options.kind !== 'menu-button' || this.#options.root.hidden || viewport === null || trigger === undefined) return;
    const gutter = 8; const gap = 4;
    const anchorRect = trigger.getBoundingClientRect(); const popupRect = this.#options.root.getBoundingClientRect();
    const spaceBelow = viewport.innerHeight - anchorRect.bottom - gutter; const spaceAbove = anchorRect.top - gutter;
    const placeAbove = popupRect.height > spaceBelow && spaceAbove > spaceBelow;
    const rawLeft = anchorRect.left + ((anchorRect.width - popupRect.width) / 2);
    const rawTop = placeAbove ? anchorRect.top - popupRect.height - gap : anchorRect.bottom + gap;
    const left = Math.max(gutter, Math.min(rawLeft, viewport.innerWidth - popupRect.width - gutter));
    const top = Math.max(gutter, Math.min(rawTop, viewport.innerHeight - popupRect.height - gutter));
    this.#options.root.style.position = 'fixed'; this.#options.root.style.left = `${left}px`; this.#options.root.style.top = `${top}px`;
    this.#options.root.dataset['placement'] = placeAbove ? 'top-center' : 'bottom-center';
  }
  #positionSubmenus(): void {
    const viewport = this.#view;
    if (viewport === null) return;
    const gutter = 8; const gap = 4;
    for (const [parentID, submenu] of this.#submenus) {
      if (submenu.hidden) continue;
      const anchor = this.#elements.get(parentID); if (anchor === undefined) continue;
      const anchorRect = anchor.getBoundingClientRect(); const submenuRect = submenu.getBoundingClientRect();
      const opensFromMenubar = (this.#options.kind === 'menubar' || this.#options.kind === 'navigation-menu') && this.#tree.parentOf(parentID) === null;
      let rawLeft: number; let rawTop: number; let placement: 'bottom-start' | 'top-start' | 'left-start' | 'right-start';
      if (opensFromMenubar) {
        const spaceBelow = viewport.innerHeight - anchorRect.bottom - gutter; const spaceAbove = anchorRect.top - gutter;
        const placeAbove = submenuRect.height > spaceBelow && spaceAbove > spaceBelow;
        rawLeft = anchorRect.left; rawTop = placeAbove ? anchorRect.top - submenuRect.height - gap : anchorRect.bottom + gap;
        placement = placeAbove ? 'top-start' : 'bottom-start';
      } else {
        const spaceRight = viewport.innerWidth - anchorRect.right - gutter; const spaceLeft = anchorRect.left - gutter;
        const placeLeft = submenuRect.width > spaceRight && spaceLeft > spaceRight;
        rawLeft = placeLeft ? anchorRect.left - submenuRect.width - gap : anchorRect.right + gap; rawTop = anchorRect.top;
        placement = placeLeft ? 'left-start' : 'right-start';
      }
      const left = Math.max(gutter, Math.min(rawLeft, viewport.innerWidth - submenuRect.width - gutter));
      const top = Math.max(gutter, Math.min(rawTop, viewport.innerHeight - submenuRect.height - gutter));
      submenu.style.position = 'fixed'; submenu.style.left = `${left}px`; submenu.style.top = `${top}px`; submenu.dataset['placement'] = placement;
      anchor.dataset['submenuPlacement'] = placement;
    }
  }
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

let nextMenuControlID = 0;

function toMenuEvent(event: KeyboardEvent, kind: MenuKind): Extract<MenuEvent, string> | null { if (event.altKey || event.ctrlKey || event.metaKey) return null; if (event.key === 'Escape') return 'escape'; if (event.key === 'Home') return 'first'; if (event.key === 'End') return 'last'; if (event.key === 'Enter' || event.key === ' ') return 'invoke'; if (event.key === 'ArrowDown') return kind === 'menubar' || kind === 'navigation-menu' ? 'open-submenu' : 'next'; if (event.key === 'ArrowUp') return 'previous'; if (event.key === 'ArrowRight') return kind === 'menubar' || kind === 'navigation-menu' ? 'next' : 'open-submenu'; if (event.key === 'ArrowLeft') return kind === 'menubar' || kind === 'navigation-menu' ? 'previous' : 'close-submenu'; return null; }
