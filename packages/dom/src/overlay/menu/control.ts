import type { Result, StableID, CoreErrorCode } from '@sectile/core';
import { failResult, okResult } from '@sectile/core/result';
import type { RevisionSnapshot } from '@sectile/core/revision';
import type { Tree, TreeNodeInput } from '@sectile/core/tree';
import { applyMenuEvent, tryCreateMenuModel, tryCreateMenuState, type MenuCommand, type MenuEvent, type MenuPolicies, type MenuState, type MenuModel } from '@sectile/core/menu';
import {
  createControlledComponentController,
  tryCreateDisabledIdentitySet,
  type ControlledComponentController,
} from '@sectile/core/adapter-runtime';
import { setInteractionAttributes } from '../../interaction/attributes.js';
import { horizontalArrow, type ReadingDirection } from '../../interaction/keyboard.js';
import { createDOMLayerBinding, type DOMLayerBinding, type DOMLayerBindingOptions, type DOMLayerReparentErrorCode, type DOMLayerPresentationListener, type DOMLayerPresentationSubscription } from '../layer/binding.js';
import type { PositionOptions, PositionRect } from '../../position.js';
import { createPosition, manualPositionConnection, snapshotPositionRect, type PositionConnection } from '../position/connection.js';
import { createHiddenBinding, type HiddenBinding } from '../../interaction/visibility.js';
import { DOMCompositeFocusEntry } from '../../composite/focus-entry.js';
import { captureSurfaceMoveFocus, restoreSurfaceMoveFocus, type SurfaceMoveFocus } from '../surface-move.js';

export type MenuKind = 'menu' | 'menubar' | 'navigation-menu' | 'menu-button';
export interface MenuTypeaheadOptions<ID extends StableID> { readonly textValue: (id: ID) => string; readonly timeout?: number; readonly now?: () => number; readonly normalize?: (text: string) => string }
interface MenuControlBaseOptions<ID extends StableID> {
  readonly root: HTMLElement;
  readonly layerHost?: DOMLayerBindingOptions['layerHost'];
  readonly disabled?: boolean;
  readonly trigger?: HTMLElement;
  readonly kind: MenuKind;
  readonly direction?: ReadingDirection;
  readonly baseID?: string;
  readonly policies?: MenuPolicies<ID>;
  readonly disabledItems?: readonly ID[];
  readonly open?: boolean;
  readonly defaultOpen?: boolean;
  readonly defaultHighlightedValue?: ID | null;
  /** Initial submenu branch chain, validated by Core/menu. */
  readonly defaultOpenPath?: readonly ID[];
  readonly typeahead?: MenuTypeaheadOptions<ID>;
  readonly label?: string;
  readonly onOpenChange?: (open: boolean) => void;
  readonly onInvoke?: (id: ID) => void;
  readonly onUpdate?: () => void;
}
type MenuDefinition<ID extends StableID> =
  | { readonly items: readonly TreeNodeInput<ID>[]; readonly model?: never }
  | { readonly model: MenuModel<ID>; readonly items?: never };
export type MenuConstructionErrorCode = CoreErrorCode | 'dom.menu-definition-ambiguous';
export type MenuControlOptions<ID extends StableID> = MenuControlBaseOptions<ID> & MenuDefinition<ID>;
export type MenuHostOptions<ID extends StableID, Omitted extends keyof MenuControlBaseOptions<ID> = 'kind'> = Omit<MenuControlBaseOptions<ID>, Omitted> & MenuDefinition<ID>;
type MenuControlPositionOptions = PositionOptions & { readonly position?: boolean; readonly triggerMode?: 'context-menu'; readonly anchorRect?: PositionRect | undefined };
type ResolvedMenuControlOptions<ID extends StableID> = MenuControlOptions<ID> & MenuControlPositionOptions & {
  readonly manageVisibility?: boolean;
};
export interface MenuControl<ID extends StableID> {
  getActive(): boolean;
  getLayerOrder(): number | null;
  subscribeLayerPresentation(listener: DOMLayerPresentationListener): DOMLayerPresentationSubscription;
  syncLayerParent(parent: HTMLElement | null): Result<void, DOMLayerReparentErrorCode>;
  suspend(): void;
  resume(): void;
  getSnapshot(): RevisionSnapshot<MenuState<ID>>;
  syncControlledValue(open: boolean): Result<RevisionSnapshot<MenuState<ID>>>;
  setItemAttributes(element: HTMLElement | undefined, id: ID): void;
  setSubmenuAttributes(element: HTMLElement | undefined, parentID: ID): void;
  /** ID of the currently registered submenu surface, if any. */
  getSubmenuID(parentID: ID): string | undefined;
  handleEvent(event: MenuEvent<ID>): boolean;
  refresh(parentID?: ID | null): void;
  /** Capture existing focus before moving the same retained surface. */
  prepareMove(): void;
  /** Refresh native geometry and restore only the captured focus. False cancels. */
  completeMove(restoreFocus?: boolean): void;
  disconnect(): void;
}

export interface ContextMenuControl<ID extends StableID> extends MenuControl<ID> {
  /** Borrowed immutable viewport snapshot; undefined means live element geometry. */
  getAnchorRect(): PositionRect | undefined;
}

export function createMenuControl<ID extends StableID>(options: MenuControlOptions<ID> & MenuControlPositionOptions & { readonly triggerMode: 'context-menu' }): Result<ContextMenuControl<ID>, MenuConstructionErrorCode>;
export function createMenuControl<ID extends StableID>(options: MenuControlOptions<ID> & MenuControlPositionOptions): Result<MenuControl<ID>, MenuConstructionErrorCode>;
export function createMenuControl<ID extends StableID>(options: MenuControlOptions<ID> & MenuControlPositionOptions): Result<MenuControl<ID>, MenuConstructionErrorCode> {
  if (options.model !== undefined && options.items !== undefined) return failResult('construction', 'dom.menu-definition-ambiguous', 'Specify menu items or a Core menu model, not both.');
  const model = options.model === undefined ? tryCreateMenuModel(options.items!) : okResult(options.model); if (!model.ok) return model;
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
    initial: tryCreateMenuState(model.value.tree, initialOpen, initialOpen ? options.defaultHighlightedValue ?? null : null, initialOpen ? options.defaultOpenPath ?? [] : []),
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
  readonly #rootVisibility: HiddenBinding | undefined; readonly #submenuVisibility = new Map<ID, HiddenBinding>(); readonly #submenuIDs = new Map<ID, { readonly element: HTMLElement; readonly previous: string | null; readonly applied: string }>(); readonly #submenuControlIDs = new Map<ID, { readonly previous: string | null; applied: string }>();
  readonly #focusEntry: DOMCompositeFocusEntry<ID>;
  #nextSubmenuID = 0;
  #pendingFocus: ID | undefined;
  #moveFocus: SurfaceMoveFocus | undefined;
  #restoreTriggerRequested = false;
  #allowTriggerRestore = true;
  #projectedState: MenuState<ID> | undefined;
  readonly #keydown: (event: KeyboardEvent) => void; readonly #click: (event: MouseEvent) => void; readonly #triggerClick: () => void; readonly #instanceID: string; readonly #layer: DOMLayerBinding | undefined; readonly #popupPosition: PositionConnection | undefined; readonly #submenuPositions = new Map<ID, PositionConnection>();
  readonly #triggerKeydown: (event: KeyboardEvent) => void;
  readonly #triggerContextMenu: ((event: MouseEvent) => void) | undefined;
  #contextRect: PositionRect | undefined;
  #typeaheadBuffer = ''; #lastTypeaheadAt = Number.NEGATIVE_INFINITY;
  #active = true;
  #disconnected = false;
  #pausedRootVisibility: HiddenBinding | undefined;
  public constructor(options: ResolvedMenuControlOptions<ID>, tree: Tree<ID>, runtime: ControlledComponentController<MenuState<ID>, MenuEvent<ID>, MenuCommand<ID>, boolean>, policies: MenuPolicies<ID>) {
    this.#options = options; this.#tree = tree; this.#runtime = runtime; this.#policies = policies;
    this.#contextRect = options.anchorRect;
    const order = tree.preorder();
    this.#focusEntry = new DOMCompositeFocusEntry({
      mode: 'item', root: options.root, current: runtime.getSnapshot().state.cursor.current,
      rank: (id) => order.indexOf(id),
    });
    this.#rootVisibility = options.manageVisibility === false || options.kind !== 'menu-button' ? undefined : createHiddenBinding(options.root);
    setInteractionAttributes(options.root, options); if (options.trigger !== undefined && options.triggerMode !== 'context-menu') setInteractionAttributes(options.trigger, options, true);
    this.#instanceID = options.baseID ?? String(nextMenuControlID += 1);
    this.#layer = options.kind === 'menu-button' && options.trigger !== undefined ? createDOMLayerBinding({ surface: options.root, owner: options.trigger, dismissOnInteractOutside: true, readOpen: () => this.getSnapshot().state.open, close: (reason) => {
      const event = reason === 'escape' && options.triggerMode === 'context-menu' ? 'escape' : 'close-popup';
      if (reason === 'escape') this.handleEvent(event); else this.#withoutTriggerRestore(event);
    },
      ...(options.layerHost === undefined ? {} : { layerHost: options.layerHost }),
      presentation: { suspend: () => this.#suspendResources(), resume: () => this.#resumeResources() },
    }) : undefined;
    this.#popupPosition = options.kind === 'menu-button' && options.trigger !== undefined
      ? options.position === false
        ? manualPositionConnection
        : createPosition({
          root: options.root,
          reference: options.trigger,
          anchorRect: this.#contextRect,
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
    this.#keydown = (event) => {
      if (!this.getActive() || event.defaultPrevented) return;
      let kind = options.kind;
      // Browser focus is input; Core remains the owner of the accepted cursor.
      const target = this.#findItemTarget(event), before = this.getSnapshot().state.cursor.current;
      if (target !== undefined && target !== before && !this.handleEvent({ type: 'focus', id: target })) return;
      if (!this.getActive()) return;
      if (kind === 'menubar' || kind === 'navigation-menu') {
        const current = this.getSnapshot().state.cursor.current;
        if (current !== null && this.#tree.parentOf(current) !== null) kind = 'menu';
      }
      if (event.key === 'Tab' && !event.altKey && !event.ctrlKey && !event.metaKey) {
        this.#withoutTriggerRestore('close-popup');
        return;
      }
      if (options.kind === 'navigation-menu' && (event.key === 'Enter' || event.key === ' ')) {
        const current = this.getSnapshot().state.cursor.current;
        if (current !== null && this.#tree.isLeaf(current) && this.#elements.get(current)?.localName === 'a') {
          if (options.disabled === true || this.#policies.disabled?.(current) === true) event.preventDefault();
          return;
        }
      }
      if (this.#handleTypeahead(event)) { event.preventDefault(); return; }
      let semantic = toMenuEvent(event, kind, options.direction);
      const current = this.getSnapshot().state.cursor.current;
      if (semantic === 'invoke' && current !== null && this.#tree.isLeaf(current) === false) semantic = 'open-submenu';
      if (options.kind === 'menubar' && current !== null && !event.altKey && !event.ctrlKey && !event.metaKey) {
        const horizontal = horizontalArrow(event.key, options.direction);
        const parent = this.#tree.parentOf(current);
        if (horizontal !== null && (parent === null || (horizontal === 'next' ? this.#tree.isLeaf(current) : this.#tree.parentOf(parent) === null))) {
          semantic = horizontal === 'next' ? 'next-root' : 'previous-root';
        }
      } else if (options.kind === 'navigation-menu' && kind === 'navigation-menu' && (semantic === 'next' || semantic === 'previous')) {
        semantic = semantic === 'next' ? 'next-root' : 'previous-root';
      }
      if (semantic !== null && this.handleEvent(semantic)) event.preventDefault();
    };
    this.#click = (event) => {
      if (!this.getActive()) return;
      const id = this.#findItemTarget(event);
      if (id === undefined) return;
      if (options.kind === 'navigation-menu' && this.#elements.get(id)?.localName === 'a'
        && (options.disabled === true || this.#policies.disabled?.(id) === true)) { event.preventDefault(); return; }
      const wasOpen = this.getSnapshot().state.openPath.includes(id);
      this.handleEvent({ type: 'focus', id });
      if (this.#policies.disabled?.(id) !== true && (this.#tree.isLeaf(id) || !wasOpen)) {
        this.handleEvent(this.#tree.isLeaf(id) ? 'invoke' : 'open-submenu');
      }
    };
    this.#triggerClick = () => { if (this.getActive()) this.handleEvent(this.getSnapshot().state.open ? 'close-popup' : 'open-popup'); };
    this.#triggerContextMenu = options.triggerMode === 'context-menu' ? (event) => {
      if (!this.getActive() || options.disabled === true || event.defaultPrevented) return;
      event.preventDefault();
      // Keyboard-generated contextmenu events have no pointer coordinates.
      const rect = event.button === 0 && event.clientX === 0 && event.clientY === 0
        ? undefined : { x: event.clientX, y: event.clientY, width: 0, height: 0 };
      this.#openContext(rect);
    } : undefined;
    this.#triggerKeydown = (event) => {
      if (!this.getActive() || options.disabled === true || event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
      if (options.triggerMode === 'context-menu') {
        if (event.key !== 'ContextMenu' && !(event.shiftKey && event.key === 'F10')) return;
        event.preventDefault();
        if (!event.repeat) this.#openContext(undefined);
        return;
      }
      if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
      event.preventDefault();
      this.handleEvent('open-popup');
      // A controlled owner may refuse opening. Do not move its closed cursor.
      if (this.getSnapshot().state.open) this.handleEvent(event.key === 'ArrowUp' ? 'last' : 'first');
    };
    this.#bindNative(); this.#refresh();
  }
  public getActive(): boolean { return this.#active && !this.#disconnected && (this.#layer?.getActive() ?? true); }
  public getLayerOrder(): number | null { return this.#layer?.getLayerOrder() ?? null; }
  public subscribeLayerPresentation(listener: DOMLayerPresentationListener): DOMLayerPresentationSubscription {
    return this.#layer?.subscribeLayerPresentation(listener) ?? failResult('transition-rejection', 'dom.layer-inactive', 'Inline menu has no popup presentation.');
  }
  public syncLayerParent(parent: HTMLElement | null): Result<void, DOMLayerReparentErrorCode> {
    return this.#layer?.syncLayerParent(parent) ?? failResult('transition-rejection', 'dom.layer-parent-inactive', 'Inline menu has no popup presentation.');
  }
  public suspend(): void {
    if (!this.getActive()) return;
    if (this.#layer !== undefined) this.#layer.suspend(); else this.#suspendResources();
  }
  public resume(): void {
    if (this.#disconnected || this.getActive()) return;
    if (this.#layer !== undefined) this.#layer.resume();
    else {
      try { this.#resumeResources(); }
      catch (error) { try { this.#suspendResources(); } catch { /* Preserve the initiating resumption failure. */ } throw error; }
    }
  }
  public getSnapshot(): RevisionSnapshot<MenuState<ID>> { return this.#runtime.getSnapshot(); }
  public getAnchorRect(): PositionRect | undefined { return this.#contextRect; }
  public syncControlledValue(open: boolean): Result<RevisionSnapshot<MenuState<ID>>> {
    if (open) this.#restoreTriggerRequested = false;
    const result = this.#runtime.syncControlledValue(open);
    if (result.ok) {
      if (!open) this.#pendingFocus = undefined;
      this.#projectTransition(); this.#options.onUpdate?.();
    }
    return result;
  }
  public setItemAttributes(element: HTMLElement | undefined, id: ID): void {
    if (this.#disconnected) return;
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
      if (this.getActive()) this.#submenuPositions.get(id)?.update();
    }
    this.#focusPending();
  }
  public setSubmenuAttributes(element: HTMLElement | undefined, parentID: ID): void {
    if (this.#disconnected) return;
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
      if (this.getActive()) this.#submenuPositions.get(parentID)?.update();
    }
    this.#focusPending();
  }
  public getSubmenuID(parentID: ID): string | undefined { return this.#submenus.get(parentID)?.id; }
  public prepareMove(): void {
    this.#moveFocus = this.getActive() && this.getSnapshot().state.open
      ? captureSurfaceMoveFocus(this.#options.root, this.getSnapshot().revision) : undefined;
  }
  public completeMove(restoreFocus = true): void {
    const held = this.#moveFocus; this.#moveFocus = undefined;
    if (!restoreFocus || !this.getActive() || !this.getSnapshot().state.open) return;
    if (held && held.scope !== this.#options.root.getRootNode()) return;
    this.#updatePositions();
    if (this.getActive() && this.getSnapshot().state.open) restoreSurfaceMoveFocus(this.#options.root, held, this.getSnapshot().revision);
  }
  public handleEvent(event: MenuEvent<ID>): boolean {
    this.#restoreTriggerRequested = false;
    const before = this.getSnapshot().state, result = this.#runtime.handle(event);
    if (!result.ok) return false;
    this.#projectTransition();
    for (const effect of result.commands) {
      if (!this.getActive()) continue;
      if (effect.type === 'invoke') this.#options.onInvoke?.(effect.id);
      if (effect.type === 'focus') { this.#pendingFocus = effect.id; this.#focusPending(); }
      if (effect.type === 'restore-focus') {
        this.#pendingFocus = undefined;
        if (this.#options.kind === 'menu-button') {
          this.#restoreTriggerRequested = this.#allowTriggerRestore;
          this.#restoreTrigger();
          continue;
        }
        if (this.#options.kind === 'menubar' || this.#options.kind === 'navigation-menu' || this.#options.trigger === undefined) {
          const target = before.openPath[0] ?? before.cursor.current;
          // Resolve the visual return owner from Core's existing path, then ask
          // Core to admit that focus rather than writing a second cursor state.
          if (target !== null && this.#elements.has(target)) this.handleEvent({ type: 'focus', id: target });
        } else this.#options.trigger?.focus();
      }
    }
    this.#options.onUpdate?.();
    return true;
  }
  public refresh(parentID?: ID | null): void {
    if (this.#disconnected) return;
    if (parentID === undefined) { this.#refresh(); return; }
    if (!this.getActive()) return;
    // Renderer presence changes only this surface's geometry and focus readiness.
    if (parentID === null) this.#popupPosition?.update();
    else this.#submenuPositions.get(parentID)?.update();
    this.#focusPending();
  }
  public disconnect(): void {
    if (this.#disconnected) return;
    this.#disconnected = true;
    let failed = false, failure: unknown;
    const drain = (operation: () => void): void => { try { operation(); } catch (error) { if (!failed) { failed = true; failure = error; } } };
    drain(() => { if (this.#layer !== undefined) this.#layer.disconnect(); else this.#suspendResources(); });
    drain(() => this.#rootVisibility?.disconnect());
    drain(() => this.#pausedRootVisibility?.disconnect()); this.#pausedRootVisibility = undefined;
    for (const [parentID, submenu] of [...this.#submenus]) drain(() => this.#releaseSubmenu(parentID, submenu));
    for (const position of this.#submenuPositions.values()) drain(() => position.disconnect());
    this.#submenuPositions.clear();
    this.#unbindNative();
    this.#pendingFocus = undefined;
    this.#restoreTriggerRequested = false;
    this.#moveFocus = undefined;
    this.#projectedState = undefined;
    this.#focusEntry.disconnect();
    this.#elements.clear();
    this.#submenuControlIDs.clear();
    if (failed) throw failure;
  }
  #bindNative(): void {
    this.#options.root.addEventListener('keydown', this.#keydown);
    this.#options.root.addEventListener('click', this.#click);
    if (this.#triggerContextMenu === undefined) this.#options.trigger?.addEventListener('click', this.#triggerClick);
    else this.#options.trigger?.addEventListener('contextmenu', this.#triggerContextMenu);
    this.#options.trigger?.addEventListener('keydown', this.#triggerKeydown);
  }
  #unbindNative(): void {
    this.#options.root.removeEventListener('keydown', this.#keydown);
    this.#options.root.removeEventListener('click', this.#click);
    this.#options.trigger?.removeEventListener('click', this.#triggerClick);
    if (this.#triggerContextMenu !== undefined) this.#options.trigger?.removeEventListener('contextmenu', this.#triggerContextMenu);
    this.#options.trigger?.removeEventListener('keydown', this.#triggerKeydown);
  }
  #openContext(rect: PositionRect | undefined): void {
    const wasOpen = this.getSnapshot().state.open;
    this.#contextRect = snapshotPositionRect(rect);
    this.#popupPosition?.syncAnchorRect(this.#contextRect);
    this.handleEvent('open-popup');
    if (wasOpen && this.getActive()) {
      const current = this.getSnapshot().state;
      // Reinvocation requests focus, not a different cursor or submenu path.
      if (current.open) { this.#pendingFocus = current.cursor.current ?? undefined; this.#focusPending(); }
    }
  }
  #suspendResources(): void {
    this.#active = false; this.#pendingFocus = undefined; this.#restoreTriggerRequested = false; this.#moveFocus = undefined;
    this.#typeaheadBuffer = ''; this.#lastTypeaheadAt = Number.NEGATIVE_INFINITY;
    this.#unbindNative();
    let failed = false, failure: unknown;
    const drain = (operation: () => void): void => { try { operation(); } catch (error) { if (!failed) { failed = true; failure = error; } } };
    drain(() => this.#popupPosition?.disconnect());
    for (const position of this.#submenuPositions.values()) drain(() => position.disconnect());
    if (!this.#disconnected) {
      drain(() => this.#rootVisibility?.setHidden(true));
      if (this.#rootVisibility === undefined && this.#options.manageVisibility !== false) {
        this.#pausedRootVisibility ??= createHiddenBinding(this.#options.root);
        drain(() => this.#pausedRootVisibility?.setHidden(true));
      }
      for (const visibility of this.#submenuVisibility.values()) drain(() => visibility.setHidden(true));
    }
    drain(() => this.#options.onUpdate?.());
    if (failed) throw failure;
  }
  #resumeResources(): void {
    this.#active = true;
    this.#pausedRootVisibility?.disconnect(); this.#pausedRootVisibility = undefined;
    this.#bindNative(); this.#refresh(); this.#options.onUpdate?.();
  }
  #findItemTarget(event: Event): ID | undefined {
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
    if (this.#options.kind === 'navigation-menu') {
      // Navigation does not replace the native control owner's role, e.g. a
      // disabled Anchor without href. Remove only this menu owner's role.
      if (element.getAttribute('role') === 'menuitem') element.removeAttribute('role');
    } else element.setAttribute('role', 'menuitem');
    if (this.#policies.disabled?.(id) === true) element.setAttribute('aria-disabled', 'true'); else element.removeAttribute('aria-disabled');
    if (this.#tree.isLeaf(id) === false) {
      if (this.#options.kind === 'navigation-menu') element.removeAttribute('aria-haspopup'); else element.setAttribute('aria-haspopup', 'menu');
      element.setAttribute('aria-expanded', String(state.openPath[depth] === id));
      const submenu = this.#submenus.get(id);
      if (submenu !== undefined) {
        const current = element.getAttribute('aria-controls'), owned = this.#submenuControlIDs.get(id);
        if (owned === undefined || current !== owned.applied) this.#submenuControlIDs.set(id, { previous: current, applied: submenu.id });
        else owned.applied = submenu.id;
        if (current !== submenu.id) element.setAttribute('aria-controls', submenu.id);
      }
    }
  }
  #projectTransition(): void {
    if (this.#disconnected) return;
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
      if (!state.open) this.#moveFocus = undefined;
      this.#rootVisibility?.setHidden(!this.getActive() || !state.open);
      if (this.#options.triggerMode !== 'context-menu') this.#options.trigger?.setAttribute('aria-expanded', String(state.open));
      this.#restoreTrigger();
      this.#layer?.sync();
      if (this.getActive()) this.#popupPosition?.update();
    }
    // Finish attribute publication before positioning can synchronously deliver focus.
    if (this.getActive()) {
      for (let index = shared; index < before.length; index += 1) this.#submenuPositions.get(before[index] as ID)?.update();
      for (let index = shared; index < after.length; index += 1) this.#submenuPositions.get(after[index] as ID)?.update();
    }
    this.#focusPending();
  }
  #projectBranch(id: ID, open: boolean): void {
    this.#elements.get(id)?.setAttribute('aria-expanded', String(open));
    this.#submenuVisibility.get(id)?.setHidden(!this.getActive() || !open);
  }
  #withoutTriggerRestore(event: MenuEvent<ID>): boolean {
    const previous = this.#allowTriggerRestore;
    this.#allowTriggerRestore = false;
    try { return this.handleEvent(event); }
    finally { this.#allowTriggerRestore = previous; }
  }
  #restoreTrigger(): void {
    if (!this.#restoreTriggerRequested || !this.getActive() || this.getSnapshot().state.open) return;
    this.#restoreTriggerRequested = false;
    const trigger = this.#options.trigger, document = this.#options.root.ownerDocument;
    const active = document?.activeElement;
    if (active && active !== document.body && active !== trigger && !this.#options.root.contains(active)) return;
    trigger?.focus();
  }
  #refresh(): void {
    if (this.#disconnected) return;
    const state = this.getSnapshot().state;
    this.#projectedState = state;
    if (state.open && this.#pendingFocus !== undefined && state.cursor.current !== this.#pendingFocus) this.#pendingFocus = undefined;
    this.#options.root.setAttribute('role', this.#options.kind === 'navigation-menu' ? 'navigation' : this.#options.kind === 'menubar' ? 'menubar' : 'menu');
    this.#options.root.setAttribute('dir', this.#options.direction ?? 'ltr');
    if (this.#options.label !== undefined) this.#options.root.setAttribute('aria-label', this.#options.label);
    this.#rootVisibility?.setHidden(!this.getActive() || !state.open);
    if (this.#options.triggerMode !== 'context-menu') {
      this.#options.trigger?.setAttribute('aria-haspopup', 'menu'); this.#options.trigger?.setAttribute('aria-expanded', String(state.open));
    }
    for (const [id, element] of this.#elements) this.#projectItem(id, element, state);
    for (const [parentID, submenu] of this.#submenus) this.#projectSubmenu(parentID, submenu, state);
    this.#layer?.sync();
    this.#updatePositions();
    this.#focusPending();
  }
  #updatePositions(): void {
    if (!this.getActive()) return;
    this.#popupPosition?.update();
    for (const position of this.#submenuPositions.values()) position.update();
  }
  #projectSubmenu(parentID: ID, submenu: HTMLElement, state: MenuState<ID>): void {
    const depth = this.#tree.depthOf(parentID) ?? 0;
    // Core's open path contains one branch at each depth from the root.
    const open = state.open && state.openPath[depth] === parentID;
    submenu.dataset['level'] = String(depth + 1);
    if (this.#options.kind === 'navigation-menu') submenu.removeAttribute('role'); else submenu.setAttribute('role', 'menu');
    this.#submenuVisibility.get(parentID)?.setHidden(!this.getActive() || !open);
  }
  #focusPending(): void {
    const id = this.#pendingFocus;
    if (!this.getActive() || id === undefined || !this.getSnapshot().state.open) return;
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
    const owned = this.#submenuControlIDs.get(parentID);
    if (owned !== undefined && element.getAttribute('aria-controls') === owned.applied && owned.previous !== owned.applied) {
      if (owned.previous === null) element.removeAttribute('aria-controls');
      else element.setAttribute('aria-controls', owned.previous);
    }
    this.#submenuControlIDs.delete(parentID);
  }
  #disconnectSubmenuPosition(parentID: ID): void {
    try { this.#submenuPositions.get(parentID)?.disconnect(); }
    finally { this.#submenuPositions.delete(parentID); }
  }
  #releaseSubmenu(parentID: ID, element: HTMLElement): void {
    const anchor = this.#elements.get(parentID);
    if (anchor !== undefined) this.#clearSubmenuControl(parentID, anchor);
    else this.#submenuControlIDs.delete(parentID);
    let failed = false, failure: unknown;
    try { this.#disconnectSubmenuPosition(parentID); } catch (error) { failed = true; failure = error; }
    try { this.#submenuVisibility.get(parentID)?.disconnect(); } catch (error) { if (!failed) { failed = true; failure = error; } }
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
    if (failed) throw failure;
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
