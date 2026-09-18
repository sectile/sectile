import type { Result, StableID } from '@sectile/core';
import type { RevisionSnapshot } from '@sectile/core/revision';
import type { Tree, TreeNodeInput } from '@sectile/core/tree';
import { applyMenuEvent, tryCreateMenuModel, tryCreateMenuState, type MenuCommand, type MenuEvent, type MenuPolicies, type MenuState } from '@sectile/core/menu';
import {
  createControlledComponentController,
  tryCreateDisabledIdentitySet,
  type ControlledComponentController,
} from '@sectile/core/adapter-runtime';
import { setInteractionAttributes } from '../../internal/interaction.js';
import { horizontalArrow, type ReadingDirection } from '../../internal/direction.js';
import { createDOMLayerBinding, type DOMLayerBinding } from '../layer/binding.js';
import type { PositionOptions } from '../../position.js';
import { createPosition, manualPositionConnection, type PositionConnection } from '../position/connection.js';
import { createHiddenBinding, type HiddenBinding } from '../../internal/hidden-binding.js';
import { DOMCompositeFocusEntry } from '../../composite/focus-entry.js';

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
  let pendingOpenState: MenuState<ID> | undefined;
  const runtime = createControlledComponentController<MenuState<ID>, MenuEvent<ID>, MenuCommand<ID>, boolean>({
    controlled: openControlled,
    initial: tryCreateMenuState(model.value.tree, initialOpen, initialOpen ? options.defaultHighlightedValue ?? null : null, []),
    reducer: (state, event) => applyMenuEvent(model.value.tree, state, event, policies),
    create: (requestedOpen, proposed) => {
      const open = options.kind === 'menu-button' ? requestedOpen : true;
      const reference = open && !proposed.open ? pendingOpenState ?? proposed : proposed;
      const result = tryCreateMenuState(model.value.tree, open, open ? reference.cursor.current : null, open ? reference.openPath : []);
      // Keep the canonical opening proposal until the owner accepts or rejects it.
      if (result.ok) pendingOpenState = !open && proposed.open ? proposed : undefined;
      return result;
    },
    read: (state) => state.open,
    onChange: (open) => options.onOpenChange?.(open),
    interaction: options,
  });
  return runtime.ok ? { ok: true, value: new DOMMenuControl(options as ResolvedMenuControlOptions<ID>, model.value.tree, runtime.value, policies) } : runtime;
}

class DOMMenuControl<ID extends StableID> implements MenuControl<ID> {
  readonly #options: ResolvedMenuControlOptions<ID>; readonly #tree: Tree<ID>; readonly #runtime: ControlledComponentController<MenuState<ID>, MenuEvent<ID>, MenuCommand<ID>, boolean>; readonly #policies: MenuPolicies<ID>; readonly #elements = new Map<ID, HTMLElement>(); readonly #elementOwners = new WeakMap<HTMLElement, ID>(); readonly #submenus = new Map<ID, HTMLElement>(); readonly #submenuOwners = new WeakMap<HTMLElement, ID>();
  readonly #rootVisibility: HiddenBinding | undefined; readonly #submenuVisibility = new Map<ID, HiddenBinding>(); readonly #submenuIDs = new Map<ID, { readonly element: HTMLElement; readonly previous: string | null; readonly applied: string }>(); readonly #submenuControlIDs = new Map<ID, string>();
  readonly #focusEntry: DOMCompositeFocusEntry<ID>;
  #nextSubmenuID = 0;
  #pendingFocus: ID | undefined;
  #projectedState: MenuState<ID> | undefined;
  readonly #keydown: (event: KeyboardEvent) => void; readonly #click: (event: MouseEvent) => void; readonly #triggerClick: () => void; readonly #instanceID: string; readonly #layer: DOMLayerBinding | undefined; readonly #popupPosition: PositionConnection | undefined; readonly #submenuPositions = new Map<ID, PositionConnection>();
  #typeaheadBuffer = ''; #lastTypeaheadAt = Number.NEGATIVE_INFINITY;
  public constructor(options: ResolvedMenuControlOptions<ID>, tree: Tree<ID>, runtime: ControlledComponentController<MenuState<ID>, MenuEvent<ID>, MenuCommand<ID>, boolean>, policies: MenuPolicies<ID>) {
    this.#options = options; this.#tree = tree; this.#runtime = runtime; this.#policies = policies;
    const order = tree.preorder();
    this.#focusEntry = new DOMCompositeFocusEntry({
      mode: 'item', root: options.root, current: runtime.getSnapshot().state.cursor.current,
      rank: (id) => order.indexOf(id),
    });
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
          onPositioned: () => this.#focusPending(),
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
    this.#click = (event) => {
      const id = this.#findClickTarget(event);
      if (id === undefined) return;
      const wasOpen = this.getSnapshot().state.openPath.includes(id);
      this.handleEvent({ type: 'focus', id });
      if (this.#policies.disabled?.(id) !== true && (this.#tree.isLeaf(id) || !wasOpen)) {
        this.handleEvent(this.#tree.isLeaf(id) ? 'invoke' : 'open-submenu');
      }
    };
    this.#triggerClick = () => { this.handleEvent(this.getSnapshot().state.open ? 'close-popup' : 'open-popup'); };
    options.root.addEventListener('keydown', this.#keydown); options.root.addEventListener('click', this.#click); options.trigger?.addEventListener('click', this.#triggerClick); this.#refresh();
  }
  public getSnapshot(): RevisionSnapshot<MenuState<ID>> { return this.#runtime.getSnapshot(); }
  public syncControlledValue(open: boolean): Result<RevisionSnapshot<MenuState<ID>>> {
    const result = this.#runtime.syncControlledValue(open);
    if (result.ok) {
      if (!open) this.#pendingFocus = undefined;
      this.#projectTransition(); this.#options.onUpdate?.();
    }
    return result;
  }
  public setItemAttributes(element: HTMLElement | undefined, id: ID): void {
    if (!this.#tree.has(id)) return;
    const current = this.#elements.get(id);
    if (current === element) return;
    if (current !== undefined) {
      this.#focusEntry.release(id, current);
      this.#clearSubmenuControl(id, current);
      this.#elements.delete(id);
      if (this.#elementOwners.get(current) === id) this.#elementOwners.delete(current);
      this.#disconnectSubmenuPosition(id);
    }
    if (element !== undefined) {
      const candidate = this.#elementOwners.get(element);
      if (candidate !== undefined && candidate !== id && this.#elements.get(candidate) === element) {
        this.#focusEntry.release(candidate, element);
        this.#clearSubmenuControl(candidate, element);
        this.#elements.delete(candidate);
        this.#disconnectSubmenuPosition(candidate);
      }
      this.#elements.set(id, element);
      this.#elementOwners.set(element, id);
      this.#connectSubmenuPosition(id);
      this.#projectItem(id, element, this.getSnapshot().state);
      this.#focusEntry.bind(element, id, {
        available: this.#options.disabled !== true && this.#policies.disabled?.(id) !== true,
        fallbackEligible: this.#options.kind !== 'menu-button' && this.#tree.parentOf(id) === null,
      });
      this.#submenuPositions.get(id)?.update();
    }
    this.#focusPending();
  }
  public setSubmenuAttributes(element: HTMLElement | undefined, parentID: ID): void {
    if (!this.#tree.has(parentID) || this.#tree.isLeaf(parentID)) return;
    const current = this.#submenus.get(parentID);
    if (current === element) return;
    if (current !== undefined) this.#releaseSubmenu(parentID, current);
    if (element !== undefined) {
      const candidate = this.#submenuOwners.get(element);
      if (candidate !== undefined && candidate !== parentID && this.#submenus.get(candidate) === element) {
        this.#releaseSubmenu(candidate, element);
      }
      this.#submenus.set(parentID, element);
      this.#submenuOwners.set(element, parentID);
      if (this.#options.manageVisibility !== false) this.#submenuVisibility.set(parentID, createHiddenBinding(element));
      if (element.id.length === 0) {
        const previous = element.getAttribute('id');
        const applied = `sectile-menu-${this.#instanceID}-submenu-${this.#nextSubmenuID += 1}`;
        element.id = applied;
        element.setAttribute('id', applied);
        this.#submenuIDs.set(parentID, { element, previous, applied });
      }
      const state = this.getSnapshot().state;
      const anchor = this.#elements.get(parentID);
      if (anchor !== undefined) this.#projectItem(parentID, anchor, state);
      this.#projectSubmenu(parentID, element, state);
      this.#connectSubmenuPosition(parentID);
      this.#submenuPositions.get(parentID)?.update();
    }
    this.#focusPending();
  }
  public handleEvent(event: MenuEvent<ID>): boolean { const result = this.#runtime.handle(event); if (result.ok) { this.#projectTransition(); for (const effect of result.commands) { if (effect.type === 'invoke') this.#options.onInvoke?.(effect.id); if (effect.type === 'focus') { this.#pendingFocus = effect.id; this.#focusPending(); } if (effect.type === 'restore-focus') { this.#pendingFocus = undefined; this.#options.trigger?.focus(); } } this.#options.onUpdate?.(); } return result.ok; }
  public refresh(parentID?: ID | null): void {
    if (parentID === undefined) { this.#refresh(); return; }
    // Renderer presence changes only this surface's geometry and focus readiness.
    if (parentID === null) this.#popupPosition?.update();
    else this.#submenuPositions.get(parentID)?.update();
    this.#focusPending();
  }
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
    this.#projectedState = undefined;
    this.#focusEntry.disconnect();
    this.#elements.clear();
    this.#submenuControlIDs.clear();
  }
  #findClickTarget(event: MouseEvent): ID | undefined {
    const path = event.composedPath?.();
    if (path !== undefined && path.length > 0) {
      for (const target of path) {
        const id = this.#registeredItem(target);
        if (id !== undefined) return id;
        if (target === this.#options.root) break;
      }
      return undefined;
    }
    // Minimal event hosts may omit composedPath; parentNode also covers text targets.
    let target = event.target as Node | null;
    while (target != null) {
      const id = this.#registeredItem(target);
      if (id !== undefined) return id;
      if (target === this.#options.root) break;
      target = target.parentNode;
    }
    return undefined;
  }
  #registeredItem(target: EventTarget): ID | undefined {
    const element = target as HTMLElement;
    const id = this.#elementOwners.get(element);
    // The forward registry is authoritative after replacement or disconnect.
    return id !== undefined && this.#elements.get(id) === element ? id : undefined;
  }
  #projectItem(id: ID, element: HTMLElement, state: MenuState<ID>): void {
    const depth = this.#tree.depthOf(id) ?? 0;
    element.dataset['level'] = String(depth);
    if (this.#options.kind === 'navigation-menu') element.removeAttribute('role'); else element.setAttribute('role', 'menuitem');
    if (this.#policies.disabled?.(id) === true) element.setAttribute('aria-disabled', 'true'); else element.removeAttribute('aria-disabled');
    if (this.#tree.isLeaf(id) === false) {
      element.setAttribute('aria-haspopup', 'menu'); element.setAttribute('aria-expanded', String(state.openPath[depth] === id));
      const submenu = this.#submenus.get(id);
      if (submenu !== undefined) {
        element.setAttribute('aria-controls', submenu.id);
        this.#submenuControlIDs.set(id, submenu.id);
      }
    }
  }
  #projectTransition(): void {
    const state = this.getSnapshot().state;
    const previous = this.#projectedState;
    if (previous === undefined) { this.#refresh(); return; }
    // Compare with the last host publication, including reentrant controlled sync.
    this.#projectedState = state;
    if (state.open && this.#pendingFocus !== undefined && state.cursor.current !== this.#pendingFocus) this.#pendingFocus = undefined;
    if (previous.cursor.current !== state.cursor.current) this.#focusEntry.setCurrent(state.cursor.current);
    const before = previous.openPath;
    const after = state.openPath;
    let shared = 0;
    while (shared < before.length && shared < after.length && before[shared] === after[shared]) shared += 1;
    for (let index = shared; index < before.length; index += 1) this.#projectBranch(before[index] as ID, false);
    for (let index = shared; index < after.length; index += 1) this.#projectBranch(after[index] as ID, true);
    if (previous.open !== state.open) {
      this.#rootVisibility?.setHidden(!state.open);
      this.#options.trigger?.setAttribute('aria-expanded', String(state.open));
      this.#layer?.sync();
      this.#popupPosition?.update();
    }
    // Finish attribute publication before positioning can synchronously deliver focus.
    for (let index = shared; index < before.length; index += 1) this.#submenuPositions.get(before[index] as ID)?.update();
    for (let index = shared; index < after.length; index += 1) this.#submenuPositions.get(after[index] as ID)?.update();
    this.#focusPending();
  }
  #projectBranch(id: ID, open: boolean): void {
    this.#elements.get(id)?.setAttribute('aria-expanded', String(open));
    this.#submenuVisibility.get(id)?.setHidden(!open);
  }
  #refresh(): void {
    const state = this.getSnapshot().state;
    this.#projectedState = state;
    if (state.open && this.#pendingFocus !== undefined && state.cursor.current !== this.#pendingFocus) this.#pendingFocus = undefined;
    this.#options.root.setAttribute('role', this.#options.kind === 'navigation-menu' ? 'navigation' : this.#options.kind === 'menubar' ? 'menubar' : 'menu');
    this.#options.root.setAttribute('dir', this.#options.direction ?? 'ltr');
    if (this.#options.label !== undefined) this.#options.root.setAttribute('aria-label', this.#options.label);
    this.#rootVisibility?.setHidden(!state.open);
    this.#options.trigger?.setAttribute('aria-haspopup', 'menu'); this.#options.trigger?.setAttribute('aria-expanded', String(state.open));
    for (const [id, element] of this.#elements) this.#projectItem(id, element, state);
    for (const [parentID, submenu] of this.#submenus) this.#projectSubmenu(parentID, submenu, state);
    this.#layer?.sync();
    this.#popupPosition?.update();
    for (const position of this.#submenuPositions.values()) position.update();
    this.#focusPending();
  }
  #projectSubmenu(parentID: ID, submenu: HTMLElement, state: MenuState<ID>): void {
    const depth = this.#tree.depthOf(parentID) ?? 0;
    // Core's open path contains one branch at each depth from the root.
    const open = state.open && state.openPath[depth] === parentID;
    submenu.dataset['level'] = String(depth + 1);
    if (this.#options.kind === 'navigation-menu') submenu.removeAttribute('role'); else submenu.setAttribute('role', 'menu');
    this.#submenuVisibility.get(parentID)?.setHidden(!open);
  }
  #focusPending(): void {
    const id = this.#pendingFocus;
    if (id === undefined || !this.getSnapshot().state.open) return;
    const element = this.#elements.get(id);
    if (element === undefined) return;
    const parentID = this.#tree.parentOf(id);
    const surface = parentID === null ? this.#options.root : this.#submenus.get(parentID);
    const root = this.#options.root;
    if (surface === undefined || root.hidden || root.inert || root.style?.visibility === 'hidden'
      || surface.hidden || surface.inert || surface.style?.visibility === 'hidden') return;
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
    if (this.#submenuOwners.get(element) === parentID) this.#submenuOwners.delete(element);
  }
  #connectSubmenuPosition(parentID: ID): void {
    const anchor = this.#elements.get(parentID); const submenu = this.#submenus.get(parentID);
    if (anchor === undefined || submenu === undefined) return;
    this.#submenuPositions.get(parentID)?.disconnect();
    const opensFromMenubar = (this.#options.kind === 'menubar' || this.#options.kind === 'navigation-menu') && this.#tree.parentOf(parentID) === null;
    const position = createPosition({
      root: submenu,
      reference: anchor,
      onPositioned: () => this.#focusPending(),
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
