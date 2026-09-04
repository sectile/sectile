import type { Result, StableID } from '@sectile/core';
import type { RevisionSnapshot } from '@sectile/core/revision';
import type { Tree, TreeNodeInput } from '@sectile/core/tree';
import { applyMenuEvent, tryCreateMenuModel, tryCreateMenuState, type MenuCommand, type MenuEvent, type MenuPolicies, type MenuState } from '@sectile/core/menu';
import {
  createControlledComponentController,
  tryCreateDisabledIdentitySet,
  type ControlledComponentController,
} from '@sectile/core/adapter-runtime';
import { setInteractionAttributes } from './interaction.js';
import { horizontalArrow, type ReadingDirection } from './direction.js';
import { createDOMLayerBinding, type DOMLayerBinding } from './layer-binding.js';
import type { PositionOptions } from '../position.js';
import { createPosition, manualPositionConnection, type PositionConnection } from './position-connection.js';
import { createHiddenBinding, type HiddenBinding } from './hidden-binding.js';

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
type MenuControlPositionOptions = PositionOptions & { readonly position?: boolean };
type ResolvedMenuControlOptions<ID extends StableID> = MenuControlOptions<ID> & MenuControlPositionOptions & {
  readonly manageVisibility?: boolean;
};
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
  const disabledResult = tryCreateDisabledIdentitySet(
    { contains: (id: ID) => model.value.tree.has(id) },
    options.disabledItems,
  );
  if (!disabledResult.ok) return disabledResult;
  const disabled = disabledResult.value;
  const suppliedDisabled = options.policies?.disabled;
  const policies: MenuPolicies<ID> = { ...options.policies, disabled: (id) => disabled.has(id) || (suppliedDisabled?.(id) ?? false) };
  const openControlled = options.kind === 'menu-button' && options.open !== undefined;
  const initialOpen = options.kind === 'menu-button' ? options.open ?? options.defaultOpen ?? false : true;
  const runtime = createControlledComponentController<MenuState<ID>, MenuEvent<ID>, MenuCommand<ID>, boolean>({
    controlled: openControlled,
    initial: tryCreateMenuState(model.value.tree, initialOpen, initialOpen ? options.defaultHighlightedValue ?? null : null, []),
    reducer: (state, event) => applyMenuEvent(model.value.tree, state, event, policies),
    create: (requestedOpen, proposed) => {
      const open = options.kind === 'menu-button' ? requestedOpen : true;
      return tryCreateMenuState(model.value.tree, open, open ? proposed.cursor.current : null, open ? proposed.openPath : []);
    },
    read: (state) => state.open,
    onChange: (open) => options.onOpenChange?.(open),
    interaction: options,
  });
  return runtime.ok ? { ok: true, value: new DOMMenuControl(options as ResolvedMenuControlOptions<ID>, model.value.tree, runtime.value, policies) } : runtime;
}

class DOMMenuControl<ID extends StableID> implements MenuControl<ID> {
  readonly #options: ResolvedMenuControlOptions<ID>; readonly #tree: Tree<ID>; readonly #runtime: ControlledComponentController<MenuState<ID>, MenuEvent<ID>, MenuCommand<ID>, boolean>; readonly #policies: MenuPolicies<ID>; readonly #elements = new Map<ID, HTMLElement>(); readonly #submenus = new Map<ID, HTMLElement>();
  readonly #rootVisibility: HiddenBinding | undefined; readonly #submenuVisibility = new Map<ID, HiddenBinding>(); readonly #submenuIDs = new Map<ID, { readonly element: HTMLElement; readonly previous: string | null; readonly applied: string }>(); readonly #submenuControlIDs = new Map<ID, string>();
  #nextSubmenuID = 0;
  #pendingFocus: ID | undefined;
  readonly #keydown: (event: KeyboardEvent) => void; readonly #click: (event: MouseEvent) => void; readonly #triggerClick: () => void; readonly #instanceID: string; readonly #layer: DOMLayerBinding | undefined; readonly #popupPosition: PositionConnection | undefined; readonly #submenuPositions = new Map<ID, PositionConnection>();
  #typeaheadBuffer = ''; #lastTypeaheadAt = Number.NEGATIVE_INFINITY;
  public constructor(options: ResolvedMenuControlOptions<ID>, tree: Tree<ID>, runtime: ControlledComponentController<MenuState<ID>, MenuEvent<ID>, MenuCommand<ID>, boolean>, policies: MenuPolicies<ID>) {
    this.#options = options; this.#tree = tree; this.#runtime = runtime; this.#policies = policies;
    this.#rootVisibility = options.manageVisibility === false || options.kind !== 'menu-button' ? undefined : createHiddenBinding(options.root);
    setInteractionAttributes(options.root, options); if (options.trigger !== undefined) setInteractionAttributes(options.trigger, options, { native: true });
    this.#instanceID = options.baseID ?? String(nextMenuControlID += 1);
    this.#layer = options.kind === 'menu-button' && options.trigger !== undefined ? createDOMLayerBinding({ surface: options.root, owner: options.trigger, dismissOnInteractOutside: true, readOpen: () => this.getSnapshot().state.open, close: () => { this.handleEvent('close-popup'); } }) : undefined;
    this.#popupPosition = options.kind === 'menu-button' && options.trigger !== undefined
      ? options.position === false
        ? manualPositionConnection
        : createPosition({
          root: options.root,
          reference: options.trigger,
          ...(options.side === undefined ? {} : { side: options.side }),
          ...(options.align === undefined ? {} : { align: options.align }),
          ...(options.sideOffset === undefined ? {} : { sideOffset: options.sideOffset }),
          ...(options.collisionPadding === undefined ? {} : { collisionPadding: options.collisionPadding }),
          ...(options.collisionBoundary === undefined ? {} : { collisionBoundary: options.collisionBoundary }),
          ...(options.avoidCollisions === undefined ? {} : { avoidCollisions: options.avoidCollisions }),
          ...(options.hideWhenDetached === undefined ? {} : { hideWhenDetached: options.hideWhenDetached }),
          ...(options.strategy === undefined ? {} : { strategy: options.strategy }),
          ...(options.tracking === undefined ? {} : { tracking: options.tracking }),
        })
      : undefined;
    this.#keydown = (event) => { if (this.#handleTypeahead(event)) { event.preventDefault(); return; } const semantic = toMenuEvent(event, options.kind, options.direction); if (semantic !== null && this.handleEvent(semantic)) event.preventDefault(); };
    this.#click = (event) => { for (const [id, element] of this.#elements) if (event.target === element || (typeof Node !== 'undefined' && event.target instanceof Node && element.contains(event.target))) { const wasOpen = this.getSnapshot().state.openPath.includes(id); this.handleEvent({ type: 'focus', id }); if (this.#policies.disabled?.(id) !== true && (this.#tree.isLeaf(id) || !wasOpen)) this.handleEvent(this.#tree.isLeaf(id) ? 'invoke' : 'open-submenu'); return; } };
    this.#triggerClick = () => { this.handleEvent(this.getSnapshot().state.open ? 'close-popup' : 'open-popup'); };
    options.root.addEventListener('keydown', this.#keydown); options.root.addEventListener('click', this.#click); options.trigger?.addEventListener('click', this.#triggerClick); this.#refresh();
  }
  public getSnapshot(): RevisionSnapshot<MenuState<ID>> { return this.#runtime.getSnapshot(); }
  public syncControlledValue(open: boolean): Result<RevisionSnapshot<MenuState<ID>>> {
    const result = this.#runtime.syncControlledValue(open);
    if (result.ok) { this.#refresh(); this.#options.onUpdate?.(); }
    return result;
  }
  public setItemAttributes(element: HTMLElement | undefined, id: ID): void {
    if (!this.#tree.has(id)) return;
    const current = this.#elements.get(id);
    if (current === element) return;
    if (current !== undefined) {
      this.#clearSubmenuControl(id, current);
      this.#elements.delete(id);
      this.#disconnectSubmenuPosition(id);
    }
    if (element !== undefined) {
      for (const [candidate, registered] of this.#elements) {
        if (candidate === id || registered !== element) continue;
        this.#clearSubmenuControl(candidate, registered);
        this.#elements.delete(candidate);
        this.#disconnectSubmenuPosition(candidate);
      }
      this.#elements.set(id, element);
      this.#connectSubmenuPosition(id);
    }
    this.#refresh();
  }
  public setSubmenuAttributes(element: HTMLElement | undefined, parentID: ID): void {
    if (!this.#tree.has(parentID) || this.#tree.isLeaf(parentID)) return;
    const current = this.#submenus.get(parentID);
    if (current === element) return;
    if (current !== undefined) this.#releaseSubmenu(parentID, current);
    if (element !== undefined) {
      for (const [candidate, registered] of this.#submenus) {
        if (candidate === parentID || registered !== element) continue;
        this.#releaseSubmenu(candidate, registered);
      }
      this.#submenus.set(parentID, element);
      if (this.#options.manageVisibility !== false) this.#submenuVisibility.set(parentID, createHiddenBinding(element));
      if (element.id.length === 0) {
        const previous = element.getAttribute('id');
        const applied = `sectile-menu-${this.#instanceID}-submenu-${this.#nextSubmenuID += 1}`;
        element.id = applied;
        element.setAttribute('id', applied);
        this.#submenuIDs.set(parentID, { element, previous, applied });
      }
      this.#connectSubmenuPosition(parentID);
    }
    this.#refresh();
  }
  public handleEvent(event: MenuEvent<ID>): boolean { const result = this.#runtime.handle(event); if (result.ok) { this.#refresh(); for (const effect of result.commands) { if (effect.type === 'invoke') this.#options.onInvoke?.(effect.id); if (effect.type === 'focus') { this.#pendingFocus = effect.id; this.#focusPending(); } if (effect.type === 'restore-focus') { this.#pendingFocus = undefined; this.#options.trigger?.focus(); } } this.#options.onUpdate?.(); } return result.ok; }
  public refresh(): void { this.#refresh(); }
  public disconnect(): void {
    this.#layer?.disconnect();
    this.#popupPosition?.disconnect();
    this.#rootVisibility?.disconnect();
    for (const [parentID, submenu] of [...this.#submenus]) this.#releaseSubmenu(parentID, submenu);
    for (const position of this.#submenuPositions.values()) position.disconnect();
    this.#submenuPositions.clear();
    this.#options.root.removeEventListener('keydown', this.#keydown);
    this.#options.root.removeEventListener('click', this.#click);
    this.#options.trigger?.removeEventListener('click', this.#triggerClick);
    this.#pendingFocus = undefined;
    this.#elements.clear();
    this.#submenuControlIDs.clear();
  }
  #refresh(): void {
    const state = this.getSnapshot().state;
    if (this.#pendingFocus !== undefined && state.cursor.current !== this.#pendingFocus) this.#pendingFocus = undefined;
    this.#options.root.setAttribute('role', this.#options.kind === 'navigation-menu' ? 'navigation' : this.#options.kind === 'menubar' ? 'menubar' : 'menu');
    this.#options.root.setAttribute('dir', this.#options.direction ?? 'ltr');
    if (this.#options.label !== undefined) this.#options.root.setAttribute('aria-label', this.#options.label);
    this.#rootVisibility?.setHidden(!state.open);
    this.#options.trigger?.setAttribute('aria-haspopup', 'menu'); this.#options.trigger?.setAttribute('aria-expanded', String(state.open));
    for (const [id, element] of this.#elements) {
      element.dataset['level'] = String(this.#tree.depthOf(id) ?? 0);
      if (this.#options.kind === 'navigation-menu') element.removeAttribute('role'); else element.setAttribute('role', 'menuitem');
      if (this.#policies.disabled?.(id) === true) element.setAttribute('aria-disabled', 'true'); else element.removeAttribute('aria-disabled');
      if (this.#tree.isLeaf(id) === false) {
        element.setAttribute('aria-haspopup', 'menu'); element.setAttribute('aria-expanded', String(state.openPath.includes(id)));
        const submenu = this.#submenus.get(id);
        if (submenu !== undefined) {
          element.setAttribute('aria-controls', submenu.id);
          this.#submenuControlIDs.set(id, submenu.id);
        }
      }
      element.tabIndex = state.cursor.current === id ? 0 : -1;
    }
    for (const [parentID, submenu] of this.#submenus) {
      const open = state.open && state.openPath.includes(parentID);
      submenu.dataset['level'] = String((this.#tree.depthOf(parentID) ?? 0) + 1);
      if (this.#options.kind === 'navigation-menu') submenu.removeAttribute('role'); else submenu.setAttribute('role', 'menu');
      this.#submenuVisibility.get(parentID)?.setHidden(!open);
    }
    this.#layer?.sync();
    this.#popupPosition?.update();
    for (const position of this.#submenuPositions.values()) position.update();
    this.#focusPending();
  }
  #focusPending(): void {
    const id = this.#pendingFocus;
    if (id === undefined) return;
    const element = this.#elements.get(id);
    if (element === undefined) return;
    const parentID = this.#tree.parentOf(id);
    const surface = parentID === null ? this.#options.root : this.#submenus.get(parentID);
    if (surface === undefined || surface.hidden || surface.inert) return;
    this.#pendingFocus = undefined;
    element.focus();
  }
  #clearSubmenuControl(parentID: ID, element: HTMLElement): void {
    const applied = this.#submenuControlIDs.get(parentID);
    if (applied !== undefined && element.getAttribute('aria-controls') === applied) element.removeAttribute('aria-controls');
    this.#submenuControlIDs.delete(parentID);
  }
  #disconnectSubmenuPosition(parentID: ID): void {
    this.#submenuPositions.get(parentID)?.disconnect();
    this.#submenuPositions.delete(parentID);
  }
  #releaseSubmenu(parentID: ID, element: HTMLElement): void {
    const anchor = this.#elements.get(parentID);
    if (anchor !== undefined) this.#clearSubmenuControl(parentID, anchor);
    else this.#submenuControlIDs.delete(parentID);
    this.#disconnectSubmenuPosition(parentID);
    this.#submenuVisibility.get(parentID)?.disconnect();
    this.#submenuVisibility.delete(parentID);
    const ownedID = this.#submenuIDs.get(parentID);
    if (ownedID !== undefined && ownedID.element === element && element.id === ownedID.applied) {
      if (ownedID.previous === null) {
        element.id = '';
        element.removeAttribute('id');
      } else {
        element.id = ownedID.previous;
        element.setAttribute('id', ownedID.previous);
      }
    }
    this.#submenuIDs.delete(parentID);
    if (this.#submenus.get(parentID) === element) this.#submenus.delete(parentID);
  }
  #connectSubmenuPosition(parentID: ID): void {
    const anchor = this.#elements.get(parentID); const submenu = this.#submenus.get(parentID);
    if (anchor === undefined || submenu === undefined) return;
    this.#submenuPositions.get(parentID)?.disconnect();
    const opensFromMenubar = (this.#options.kind === 'menubar' || this.#options.kind === 'navigation-menu') && this.#tree.parentOf(parentID) === null;
    const position = createPosition({
      root: submenu,
      reference: anchor,
      side: opensFromMenubar ? 'bottom' : this.#options.direction === 'rtl' ? 'left' : 'right',
      align: opensFromMenubar && this.#options.direction === 'rtl' ? 'end' : 'start',
      sideOffset: 8,
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
