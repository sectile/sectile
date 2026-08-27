import type { Result, StableID } from '@sectile/core';
import type { RevisionSnapshot } from '@sectile/core/revision';
import type { Tree, TreeNodeInput } from '@sectile/core/tree';
import { applyMenuEvent, tryCreateMenuModel, tryCreateMenuState, type MenuCommand, type MenuEvent, type MenuPolicies, type MenuState } from '@sectile/core/menu';
import { createSemanticController, type SemanticController } from '@sectile/core/adapter-runtime';
import { setInteractionAttributes } from './interaction.js';
import { horizontalArrow, type ReadingDirection } from './direction.js';
import { createDOMLayerBinding, type DOMLayerBinding } from './layer-binding.js';
import { createFloatingPosition, type FloatingPositionConnection } from './floating-position.js';

export type MenuKind = 'menu' | 'menubar' | 'navigation-menu' | 'menu-button';
export interface MenuTypeaheadOptions<ID extends StableID> { readonly textValue: (id: ID) => string; readonly timeout?: number; readonly now?: () => number; readonly normalize?: (text: string) => string }
export interface MenuControlOptions<ID extends StableID> {
  readonly root: HTMLElement;
  readonly disabled?: boolean;
  readonly trigger?: HTMLElement;
  readonly items: readonly TreeNodeInput<ID>[];
  readonly kind: MenuKind;
  readonly direction?: ReadingDirection;
  readonly baseID?: string;
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
  readonly #keydown: (event: KeyboardEvent) => void; readonly #click: (event: MouseEvent) => void; readonly #triggerClick: () => void; readonly #instanceID: string; readonly #layer: DOMLayerBinding | undefined; readonly #popupPosition: FloatingPositionConnection | undefined; readonly #submenuPositions = new Map<ID, FloatingPositionConnection>();
  #typeaheadBuffer = ''; #lastTypeaheadAt = Number.NEGATIVE_INFINITY;
  public constructor(options: MenuControlOptions<ID>, tree: Tree<ID>, runtime: SemanticController<MenuState<ID>, MenuEvent<ID>, MenuCommand<ID>>, policies: MenuPolicies<ID>, openControlled: boolean) {
    this.#options = options; this.#tree = tree; this.#runtime = runtime; this.#policies = policies; this.#openControlled = openControlled;
    setInteractionAttributes(options.root, options); if (options.trigger !== undefined) setInteractionAttributes(options.trigger, options, { native: true });
    this.#instanceID = options.baseID ?? String(nextMenuControlID += 1);
    this.#layer = options.kind === 'menu-button' && options.trigger !== undefined ? createDOMLayerBinding({ surface: options.root, owner: options.trigger, dismissOnInteractOutside: true, readOpen: () => this.getSnapshot().state.open, close: () => { this.handleEvent('close-popup'); } }) : undefined;
    this.#popupPosition = options.kind === 'menu-button' && options.trigger !== undefined
      ? createFloatingPosition({
        root: options.root,
        reference: options.trigger,
        side: 'bottom',
        align: 'center',
        sideOffset: 4,
        onPositionChange: (position) => {
          const side = position.placement.split('-')[0];
          options.root.dataset['placement'] = `${side}-center`;
        },
      })
      : undefined;
    this.#keydown = (event) => { if (this.#handleTypeahead(event)) { event.preventDefault(); return; } const semantic = toMenuEvent(event, options.kind, options.direction); if (semantic !== null && this.handleEvent(semantic)) event.preventDefault(); };
    this.#click = (event) => { for (const [id, element] of this.#elements) if (event.target === element || (typeof Node !== 'undefined' && event.target instanceof Node && element.contains(event.target))) { const wasOpen = this.getSnapshot().state.openPath.includes(id); this.handleEvent({ type: 'focus', id }); if (this.#policies.disabled?.(id) !== true && (this.#tree.isLeaf(id) || !wasOpen)) this.handleEvent(this.#tree.isLeaf(id) ? 'invoke' : 'open-submenu'); return; } };
    this.#triggerClick = () => { this.handleEvent(this.getSnapshot().state.open ? 'close-popup' : 'open-popup'); };
    options.root.addEventListener('keydown', this.#keydown); options.root.addEventListener('click', this.#click); options.trigger?.addEventListener('click', this.#triggerClick); this.#refresh();
  }
  public getSnapshot(): RevisionSnapshot<MenuState<ID>> { return this.#runtime.getSnapshot(); }
  public syncControlledValue(open: boolean): Result<RevisionSnapshot<MenuState<ID>>> {
    if (!this.#openControlled) return { ok: false, error: { class: 'construction', code: 'uncontrolled-controller-sync', message: 'Only a controlled menu button can synchronize open state.' } };
    const state = this.getSnapshot().state;
    const result = this.#runtime.replace(tryCreateMenuState(this.#tree, open, open ? state.cursor.current : null, open ? state.openPath : []));
    if (result.ok) { this.#refresh(); this.#options.onUpdate?.(); }
    return result;
  }
  public setItemAttributes(element: HTMLElement, id: ID): void { if (this.#tree.has(id)) { this.#elements.set(id, element); this.#connectSubmenuPosition(id); this.#refresh(); } }
  public setSubmenuAttributes(element: HTMLElement, parentID: ID): void {
    if (!this.#tree.has(parentID) || this.#tree.isLeaf(parentID)) return;
    this.#submenus.set(parentID, element);
    if (element.id.length === 0) element.id = `sectile-menu-${this.#instanceID}-submenu-${this.#submenus.size}`;
    this.#connectSubmenuPosition(parentID);
    this.#refresh();
  }
  public handleEvent(event: MenuEvent<ID>): boolean { const result = this.#runtime.handle(event); if (result.ok) { this.#refresh(); for (const effect of result.commands) { if (effect.type === 'invoke') this.#options.onInvoke?.(effect.id); if (effect.type === 'focus') this.#elements.get(effect.id)?.focus(); if (effect.type === 'restore-focus') this.#options.trigger?.focus(); } this.#options.onUpdate?.(); } return result.ok; }
  public disconnect(): void { this.#layer?.disconnect(); this.#popupPosition?.disconnect(); for (const position of this.#submenuPositions.values()) position.disconnect(); this.#submenuPositions.clear(); this.#options.root.removeEventListener('keydown', this.#keydown); this.#options.root.removeEventListener('click', this.#click); this.#options.trigger?.removeEventListener('click', this.#triggerClick); this.#elements.clear(); this.#submenus.clear(); }
  #refresh(): void {
    const state = this.getSnapshot().state;
    this.#options.root.setAttribute('role', this.#options.kind === 'navigation-menu' ? 'navigation' : this.#options.kind === 'menubar' ? 'menubar' : 'menu');
    this.#options.root.setAttribute('dir', this.#options.direction ?? 'ltr');
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
    this.#layer?.sync();
    this.#popupPosition?.update();
    for (const position of this.#submenuPositions.values()) position.update();
  }
  #connectSubmenuPosition(parentID: ID): void {
    const anchor = this.#elements.get(parentID); const submenu = this.#submenus.get(parentID);
    if (anchor === undefined || submenu === undefined) return;
    this.#submenuPositions.get(parentID)?.disconnect();
    const opensFromMenubar = (this.#options.kind === 'menubar' || this.#options.kind === 'navigation-menu') && this.#tree.parentOf(parentID) === null;
    const position = createFloatingPosition({
      root: submenu,
      reference: anchor,
      side: opensFromMenubar ? 'bottom' : this.#options.direction === 'rtl' ? 'left' : 'right',
      align: 'start',
      sideOffset: 4,
      onPositionChange: (next) => {
        submenu.dataset['placement'] = next.placement;
        anchor.dataset['submenuPlacement'] = next.placement;
      },
    });
    this.#submenuPositions.set(parentID, position);
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

function toMenuEvent(event: KeyboardEvent, kind: MenuKind, direction: ReadingDirection = 'ltr'): Extract<MenuEvent, string> | null {
  if (event.altKey || event.ctrlKey || event.metaKey) return null;
  if (event.key === 'Escape') return 'escape';
  if (event.key === 'Home') return 'first';
  if (event.key === 'End') return 'last';
  if (event.key === 'Enter' || event.key === ' ') return 'invoke';
  if (event.key === 'ArrowDown') return kind === 'menubar' || kind === 'navigation-menu' ? 'open-submenu' : 'next';
  if (event.key === 'ArrowUp') return 'previous';
  const horizontal = horizontalArrow(event.key, direction);
  if (horizontal === null) return null;
  if (kind === 'menubar' || kind === 'navigation-menu') return horizontal;
  return horizontal === 'next' ? 'open-submenu' : 'close-submenu';
}
