import type { LayerHostConnection, LayerHostTransferErrorCode, LayerReservation } from './layer-host.js';
import type { PopupDismissalOptions } from './overlay/popup/connection.js';
export type { PopupDismissalOptions } from './overlay/popup/connection.js';
export type { PopupBehaviorOptions, PopupBehaviorErrorCode } from './overlay/popup/connection.js';
import type { Result } from '@sectile/core';
import { rectContainsPoint } from '@sectile/core/geometry';
import {
  applyDrawerEvent,
  tryCreateDrawerState,
  type DrawerCommand,
  type DrawerEvent,
  type DrawerSide,
  type DrawerState,
} from '@sectile/core/drawer';
import { failResult, okResult, unwrap } from '@sectile/core/result';
import { createFacadeConnection, type FacadeConnection } from '@sectile/core/adapter-runtime';
import { assertPopupWritable, createDOMPopup, type DOMPopupConnection, type DOMLayerReparentErrorCode, type DOMLayerPresentationListener, type DOMLayerPresentationSubscription } from './overlay/popup/connection.js';
import { isEventInside, type InteractOutsideHandler } from './interact-outside.js';
import { eventOrigin, gestureParent, protectsNativeInteraction } from './interaction/gesture.js';
import type { PopupInputMethod, PopupCloseReason, PopupOpenChangeHandler } from './overlay/popup/connection.js';
export type { PopupInputMethod, PopupCloseReason, PopupOpenChangeHandler } from './overlay/popup/connection.js';

export type { DrawerSide } from '@sectile/core/drawer';
export type { InteractOutsideEvent, InteractOutsideHandler } from './interact-outside.js';

export interface DrawerOptions {
  readonly root: HTMLElement;
  readonly trigger?: HTMLElement;
  readonly overlay?: HTMLElement;
  readonly handle?: HTMLElement;
  readonly open?: boolean;
  readonly defaultOpen?: boolean;
  readonly side?: DrawerSide;
  readonly disabled?: boolean;
  readonly modal?: boolean;
  readonly label?: string;
  readonly labelledBy?: string;
  readonly describedBy?: string;
  readonly initialFocus?: HTMLElement;
  readonly autoFocus?: boolean;
  readonly restoreFocus?: boolean;
  readonly restoreFocusTarget?: HTMLElement;
  readonly trapFocus?: boolean;
  readonly closeOnEscape?: boolean;
  readonly closeOnInteractOutside?: boolean;
  readonly interactOutsideExclusions?: readonly HTMLElement[];
  readonly onInteractOutside?: InteractOutsideHandler;
  readonly swipeToDismiss?: boolean;
  readonly swipeThreshold?: number;
  readonly swipeVelocityThreshold?: number;
  readonly onOpenChange?: PopupOpenChangeHandler;
  readonly onInitialFocus?: () => void;
  readonly onFocusRestore?: () => void;
  readonly onUpdate?: () => void;
  readonly manageVisibility?: boolean;
  readonly retainExit?: boolean;
  readonly layerHost?: LayerHostConnection;
  readonly reservation?: LayerReservation;
}

export type DrawerOpenChangeHandler = NonNullable<DrawerOptions['onOpenChange']>;
export type DrawerInitialFocusHandler = NonNullable<DrawerOptions['onInitialFocus']>;
export type DrawerFocusRestoreHandler = NonNullable<DrawerOptions['onFocusRestore']>;
export type DrawerInteractOutsideHandler = NonNullable<DrawerOptions['onInteractOutside']>;
export type DrawerUpdateHandler = NonNullable<DrawerOptions['onUpdate']>;
export interface DrawerGestureOptions {
  readonly side: DrawerSide;
  readonly swipeToDismiss: boolean;
  readonly swipeThreshold?: number;
  readonly swipeVelocityThreshold?: number;
}
export type DrawerGestureErrorCode = import('@sectile/core').CoreErrorCode | 'dom.drawer-options-invalid';
export interface DrawerConnection extends DOMPopupConnection<DrawerState, DrawerEvent> {
  /** Replace direction and swipe settings, cancelling any obsolete gesture. */
  syncGesture(options: DrawerGestureOptions): Result<void, DrawerGestureErrorCode>;
}

export function createDrawer(options: DrawerOptions): FacadeConnection<DrawerConnection> {
  return unwrap(tryCreateDrawer(options));
}

export function tryCreateDrawer(options: DrawerOptions): Result<FacadeConnection<DrawerConnection>> {
  return createFacadeConnection(options, tryCreateDrawerConnection);
}

function tryCreateDrawerConnection(options: DrawerOptions): Result<DrawerConnection> {
  const side = options.side ?? 'bottom';
  const modal = options.modal ?? true;
  const initial = tryCreateDrawerState(options.open ?? options.defaultOpen ?? false, side);
  if (!initial.ok) return initial;
  const thresholds = validateSwipeThresholds(options);
  if (!thresholds.ok) return thresholds;
  let connection: ManagedDrawer | undefined;
  const popup = createDOMPopup<DrawerState, DrawerEvent, DrawerCommand>({
    root: options.root,
    ...(options.trigger === undefined ? {} : { trigger: options.trigger }),
    role: 'dialog',
    modal,
    ...(options.label === undefined ? {} : { label: options.label }),
    ...(options.labelledBy === undefined ? {} : { labelledBy: options.labelledBy }),
    ...(options.describedBy === undefined ? {} : { describedBy: options.describedBy }),
    controlled: options.open !== undefined,
    initial,
    open: 'open',
    toggle: 'toggle',
    close: 'close',
    reducer: applyDrawerEvent,
    create: (open, state) => tryCreateDrawerState(open, state.side),
    read: (state) => state.open,
    interaction: options,
    interactionIntent: event => typeof event === 'object' && event.type === 'set-side' ? 'configure' : 'mutate',
    ...(options.initialFocus === undefined ? {} : { initialFocus: options.initialFocus }),
    autoFocus: options.autoFocus ?? true,
    restoreFocus: options.restoreFocus ?? true,
    ...(options.restoreFocusTarget === undefined ? {} : { restoreFocusTarget: options.restoreFocusTarget }),
    trapFocus: options.trapFocus ?? modal,
    closeOnEscape: options.closeOnEscape ?? true,
    closeOnInteractOutside: options.closeOnInteractOutside ?? true,
    ...(options.interactOutsideExclusions === undefined ? {} : { interactOutsideExclusions: options.interactOutsideExclusions }),
    ...(options.overlay === undefined ? {} : { modalBranches: [options.overlay] }),
    ...(options.onInteractOutside === undefined ? {} : { onInteractOutside: options.onInteractOutside }),
    ...(options.manageVisibility === undefined ? {} : { manageVisibility: options.manageVisibility }),
    retainExit: options.retainExit, layerHost: options.layerHost, reservation: options.reservation,
    onOpenChange: options.onOpenChange,
    onPresentationSuspend: () => { connection?.suspendResources(); },
    onPresentationResume: () => { connection?.resumeResources(); },
    command: (command) => command.type === 'request-initial-focus' ? options.onInitialFocus?.() : options.onFocusRestore?.(),
    onUpdate: () => { connection?.syncProjection(); options.onUpdate?.(); },
  });
  if (!popup.ok) return popup;
  connection = new ManagedDrawer(popup.value, options, thresholds.value);
  if (!popup.value.getActive()) connection.suspendResources();
  return { ok: true, value: connection };
}

class ManagedDrawer implements DrawerConnection {
  readonly #popup: DOMPopupConnection<DrawerState, DrawerEvent>;
  readonly #options: DrawerOptions;
  readonly #gestureTarget: HTMLElement;
  readonly #eventTarget: HTMLElement;
  #swipeThreshold: number;
  #velocityThreshold: number;
  #swipeEnabled = false;
  #swipeRequested = true;
  #suspended = false;
  #disabled: boolean;
  #projectedSide: DrawerSide | undefined;
  #connected = true;
  #configuring = false;
  readonly #pointerDown: (event: PointerEvent) => void;
  readonly #pointerMove: (event: PointerEvent) => void;
  readonly #pointerEnd: (event: PointerEvent) => void;
  readonly #pointerCancel: (event: PointerEvent) => void;
  #pointerID: number | undefined;
  #contentOrigin: Element | undefined;
  #startMain = 0;
  #startCross = 0;
  #startTime = 0;
  #movement = 0;
  #active = false;
  #wasOpen = false;

  public constructor(
    popup: DOMPopupConnection<DrawerState, DrawerEvent>,
    options: DrawerOptions,
    thresholds: { readonly distance: number; readonly velocity: number },
  ) {
    this.#popup = popup;
    this.#options = options;
    this.#gestureTarget = options.handle ?? options.root;
    this.#eventTarget = options.root.contains(this.#gestureTarget) ? options.root : this.#gestureTarget;
    this.#swipeThreshold = thresholds.distance;
    this.#velocityThreshold = thresholds.velocity;
    this.#disabled = options.disabled === true;
    this.#suspended = !popup.getActive();
    this.#pointerDown = (event) => { this.#beginSwipe(event); };
    this.#pointerMove = (event) => { this.#moveSwipe(event); };
    this.#pointerEnd = (event) => { this.#finishSwipe(event); };
    this.#pointerCancel = (event) => { if (event.pointerId === this.#pointerID) this.#cancelSwipe(); };
    this.#swipeRequested = options.swipeToDismiss !== false;
    this.#syncSwipeEnabled(this.#swipeRequested && !this.#suspended);
    this.syncProjection();
  }

  public getSnapshot() { return this.#popup.getSnapshot(); }
  public getActive(): boolean { return this.#popup.getActive(); }
  public getLayerOrder(): number | null { return this.#popup.getLayerOrder(); }
  public subscribeLayerPresentation(listener: DOMLayerPresentationListener): DOMLayerPresentationSubscription { return this.#popup.subscribeLayerPresentation(listener); }
  public completeLayerExit(generation: number): Result<void> { return this.#popup.completeLayerExit(generation); }
  public syncLayerParent(parent: HTMLElement | null): Result<void, DOMLayerReparentErrorCode> { return this.#popup.syncLayerParent(parent); }
  public syncLayerHost(host: LayerHostConnection | undefined): Result<void, LayerHostTransferErrorCode> { return this.#popup.syncLayerHost(host); }
  public syncDismissal(options: PopupDismissalOptions): Result<void> { return this.#popup.syncDismissal(options); }
  public syncBehavior(options: import('./overlay/popup/connection.js').PopupBehaviorOptions): Result<void, import('./overlay/popup/connection.js').PopupBehaviorErrorCode> { return this.#popup.syncBehavior(options); }
  public syncDisabled(disabled: boolean): Result<void> {
    const result = this.#popup.syncDisabled(disabled);
    if (result.ok) {
      this.#disabled = disabled;
      if (disabled && this.#pointerID !== undefined) { this.#clearPointer(); this.#resetMotionProjection(); }
    }
    return result;
  }
  public syncGesture(options: DrawerGestureOptions): Result<void, DrawerGestureErrorCode> {
    assertPopupWritable(this.#options.root);
    if (this.#configuring) return failResult('resource-rejection', 'dom.drawer-options-invalid', 'Drawer gesture configuration is already in progress.');
    const side = options.side, enabled = options.swipeToDismiss;
    const state = tryCreateDrawerState(this.#popup.getSnapshot().state.open, side);
    if (!state.ok) return state;
    const thresholds = validateSwipeThresholds(options);
    if (!thresholds.ok) return thresholds;
    if (typeof enabled !== 'boolean') return failResult('construction', 'dom.drawer-options-invalid', 'Swipe enablement must be boolean.');
    const previousSide = this.#popup.getSnapshot().state.side;
    if (previousSide === side && enabled === this.#swipeRequested && thresholds.value.distance === this.#swipeThreshold && thresholds.value.velocity === this.#velocityThreshold) return okResult(undefined);
    let accepted = previousSide === side;
    let failed = false, firstError: unknown;
    this.#configuring = true;
    try {
      if (!accepted) accepted = this.#popup.handleEvent({ type: 'set-side', side });
    } catch (error) { failed = true; firstError = error; }
    try {
      // A callback can throw after Core has committed the direction.
      if (this.#connected && (accepted || (previousSide !== side && this.#popup.getSnapshot().state.side === side))) {
        this.#clearPointer(); this.#resetMotionProjection();
        this.#swipeThreshold = thresholds.value.distance; this.#velocityThreshold = thresholds.value.velocity;
        this.#swipeRequested = enabled;
        this.#syncSwipeEnabled(enabled && !this.#suspended); this.syncProjection();
      }
    } catch (error) { if (!failed) { failed = true; firstError = error; } }
    finally { this.#configuring = false; }
    if (failed) throw firstError;
    return accepted ? okResult(undefined) : failResult('resource-rejection', 'dom.drawer-options-invalid', 'Drawer direction could not be synchronized.');
  }
  public syncControlledValue(open: boolean) {
    const result = this.#popup.syncControlledValue(open);
    this.syncProjection();
    return result;
  }
  public handleEvent(event: DrawerEvent, inputMethod?: PopupInputMethod, reason?: PopupCloseReason): boolean {
    const handled = this.#popup.handleEvent(event, inputMethod, reason);
    this.syncProjection();
    return handled;
  }
  public refresh(): void { this.#popup.refresh(); this.syncProjection(); }
  public prepareMove(): void { this.#popup.prepareMove(); }
  public completeMove(restoreFocus = true): void { this.#popup.completeMove(restoreFocus); if (restoreFocus) this.syncProjection(); }
  public suspend(): void { this.#popup.suspend(); }
  public resume(): void { this.#popup.resume(); }
  public suspendResources(): void {
    this.#suspended = true;
    try { this.#syncSwipeEnabled(false); } finally { this.#resetSwipe(); }
  }
  public resumeResources(): void {
    if (!this.#connected) return;
    this.#suspended = false;
    this.#syncSwipeEnabled(this.#swipeRequested);
    this.syncProjection();
  }
  public disconnect(): void {
    assertPopupWritable(this.#options.root);
    this.#connected = false;
    this.#syncSwipeEnabled(false);
    this.#resetSwipe();
    this.#popup.disconnect();
  }
  public syncProjection(): void {
    if (!this.#connected || this.#suspended || !this.#popup.getActive()) return;
    const snapshot = this.#popup.getSnapshot().state;
    if ((snapshot.open !== this.#wasOpen && (snapshot.open || this.#pointerID !== undefined)) || snapshot.side !== this.#projectedSide) {
      this.#clearPointer(); this.#resetMotionProjection();
    }
    this.#wasOpen = snapshot.open;
    this.#projectedSide = snapshot.side;
    const side = snapshot.side;
    const direction = swipeDirection(side);
    for (const element of this.#projectedElements()) {
      element.setAttribute('data-side', side);
      element.setAttribute('data-swipe-direction', direction);
    }
  }

  #beginSwipe(event: PointerEvent): void {
    if (!this.#popup.getActive() || this.#pointerID !== undefined || event.defaultPrevented || !this.#swipeEnabled || this.#disabled || !this.#popup.getSnapshot().state.open || event.button !== 0 || isSwipeIgnored(event.target)) return;
    const content = this.#options.handle === undefined || !isEventInside(event, this.#options.handle);
    const origin = eventOrigin(event);
    if (content && (origin === undefined || protectsNativeInteraction(origin, this.#options.root, 'data-sectile-drawer-swipe-ignore')
      || this.#options.root.ownerDocument.getSelection()?.isCollapsed === false || protectsTextSelection(event, this.#options.root))) return;
    const vertical = isVertical(this.#popup.getSnapshot().state.side);
    this.#pointerID = event.pointerId;
    this.#startMain = vertical ? event.clientY : event.clientX;
    this.#startCross = vertical ? event.clientX : event.clientY;
    this.#startTime = event.timeStamp;
    this.#movement = 0;
    this.#active = false;
    this.#contentOrigin = content ? origin : undefined;
  }

  #moveSwipe(event: PointerEvent): void {
    if (event.pointerId !== this.#pointerID) return;
    const side = this.#popup.getSnapshot().state.side;
    const vertical = isVertical(side);
    const main = vertical ? event.clientY : event.clientX;
    const cross = vertical ? event.clientX : event.clientY;
    const movement = outwardMovement(side, this.#startMain, main);
    const crossMovement = Math.abs(cross - this.#startCross);
    if (!this.#active) {
      if (event.defaultPrevented || (this.#contentOrigin !== undefined && this.#options.root.ownerDocument.getSelection()?.isCollapsed === false)) { this.#cancelSwipe(); return; }
      if (Math.max(movement, crossMovement) < 6) return;
      if (movement <= 0 || crossMovement > movement) { this.#cancelSwipe(); return; }
      if (this.#contentOrigin !== undefined && canScrollInGesture(this.#contentOrigin, this.#options.root, vertical, main - this.#startMain)) {
        this.#cancelSwipe(); return;
      }
      this.#contentOrigin = undefined;
      this.#active = true;
      this.#gestureTarget.setPointerCapture?.(event.pointerId);
      for (const element of this.#projectedElements()) {
        element.setAttribute('data-swiping', '');
        element.setAttribute('data-swipe', 'move');
      }
    }
    this.#movement = Math.max(0, movement);
    this.#projectMovement(side, this.#movement);
    if (event.cancelable) event.preventDefault();
  }

  #finishSwipe(event: PointerEvent): void {
    if (event.pointerId !== this.#pointerID) return;
    if (this.#active) this.#moveSwipe(event);
    const elapsed = Math.max(1, event.timeStamp - this.#startTime);
    const velocity = this.#movement / elapsed;
    const dismiss = this.#active && (
      this.#movement >= this.#swipeThreshold
      || (this.#movement >= 16 && velocity >= this.#velocityThreshold)
    );
    if (dismiss) {
      for (const element of this.#projectedElements()) {
        element.removeAttribute('data-swiping');
        element.setAttribute('data-swipe', 'end');
      }
      this.#clearPointer();
      this.handleEvent('close', 'pointer', 'swipe');
      return;
    }
    this.#cancelSwipe();
  }

  #cancelSwipe(): void {
    const wasActive = this.#active;
    this.#clearPointer();
    for (const element of this.#projectedElements()) {
      element.removeAttribute('data-swiping');
      if (wasActive) element.setAttribute('data-swipe', 'cancel');
      element.style.setProperty('--sectile-drawer-swipe-movement-x', '0px');
      element.style.setProperty('--sectile-drawer-swipe-movement-y', '0px');
      element.style.setProperty('--sectile-drawer-swipe-progress', '0');
    }
  }

  #projectMovement(side: DrawerSide, movement: number): void {
    const signed = side === 'top' || side === 'left' ? -movement : movement;
    const vertical = isVertical(side);
    const size = vertical
      ? this.#options.root.getBoundingClientRect().height
      : this.#options.root.getBoundingClientRect().width;
    const progress = Math.min(1, movement / Math.max(1, size));
    for (const element of this.#projectedElements()) {
      element.style.setProperty('--sectile-drawer-swipe-movement-x', vertical ? '0px' : `${signed}px`);
      element.style.setProperty('--sectile-drawer-swipe-movement-y', vertical ? `${signed}px` : '0px');
      element.style.setProperty('--sectile-drawer-swipe-progress', String(progress));
    }
  }

  #clearPointer(): void {
    if (this.#pointerID !== undefined) this.#gestureTarget.releasePointerCapture?.(this.#pointerID);
    this.#pointerID = undefined;
    this.#contentOrigin = undefined;
    this.#movement = 0;
    this.#active = false;
  }

  #resetSwipe(): void {
    this.#clearPointer();
    this.#resetMotionProjection();
    for (const element of this.#projectedElements()) {
      element.removeAttribute('data-side');
      element.removeAttribute('data-swipe-direction');
    }
  }

  #resetMotionProjection(): void {
    for (const element of this.#projectedElements()) {
      element.removeAttribute('data-swiping');
      element.removeAttribute('data-swipe');
      element.style.removeProperty('--sectile-drawer-swipe-movement-x');
      element.style.removeProperty('--sectile-drawer-swipe-movement-y');
      element.style.removeProperty('--sectile-drawer-swipe-progress');
    }
  }

  #projectedElements(): readonly HTMLElement[] {
    return this.#options.overlay === undefined ? [this.#options.root] : [this.#options.root, this.#options.overlay];
  }
  #syncSwipeEnabled(enabled: boolean): void {
    if (enabled === this.#swipeEnabled) return;
    if (!enabled) this.#clearPointer();
    for (const [type, listener] of [['pointerdown', this.#pointerDown], ['pointermove', this.#pointerMove], ['pointerup', this.#pointerEnd], ['pointercancel', this.#pointerCancel]] as const) {
      if (enabled) this.#eventTarget.addEventListener(type, listener);
      else this.#eventTarget.removeEventListener(type, listener);
      if (this.#eventTarget !== this.#options.root) {
        if (enabled) this.#options.root.addEventListener(type, listener);
        else this.#options.root.removeEventListener(type, listener);
      }
    }
    this.#swipeEnabled = enabled;
  }
}

function validateSwipeThresholds(options: Pick<DrawerOptions, 'swipeThreshold' | 'swipeVelocityThreshold'>): Result<{ readonly distance: number; readonly velocity: number }> {
  const distance = options.swipeThreshold ?? 80;
  const velocity = options.swipeVelocityThreshold ?? 0.5;
  if (!Number.isFinite(distance) || distance < 0) return { ok: false, error: { class: 'construction', code: 'invalid-drawer-swipe-threshold', message: 'Drawer swipe threshold must be a finite non-negative number.' } };
  if (!Number.isFinite(velocity) || velocity < 0) return { ok: false, error: { class: 'construction', code: 'invalid-drawer-swipe-velocity-threshold', message: 'Drawer swipe velocity threshold must be a finite non-negative number.' } };
  return { ok: true, value: Object.freeze({ distance, velocity }) };
}

function isVertical(side: DrawerSide): boolean { return side === 'top' || side === 'bottom'; }
function swipeDirection(side: DrawerSide): 'up' | 'right' | 'down' | 'left' { return side === 'top' ? 'up' : side === 'bottom' ? 'down' : side; }
function outwardMovement(side: DrawerSide, start: number, current: number): number { return side === 'top' || side === 'left' ? start - current : current - start; }
function isSwipeIgnored(target: EventTarget | null): boolean {
  const closest = (target as Element | null)?.closest;
  return typeof closest === 'function' && closest.call(target, '[data-sectile-drawer-swipe-ignore]') !== null;
}

// Admission reads only the origin's ancestor chain, once before claiming a drag.
// Active motion retains no scroll-port collection and does not re-read this chain.
function canScrollInGesture(origin: Element, root: HTMLElement, vertical: boolean, delta: number): boolean {
  const view = root.ownerDocument.defaultView;
  if (view === null) return false;
  for (let element: Element | null = origin; element !== null; element = gestureParent(element)) {
    const style = view.getComputedStyle(element);
    const overflow = vertical ? style.overflowY : style.overflowX;
    if (overflow === 'auto' || overflow === 'scroll' || overflow === 'overlay') {
      const range = vertical ? element.scrollHeight - element.clientHeight : element.scrollWidth - element.clientWidth;
      if (range > 0) {
        const position = vertical ? element.scrollTop : element.scrollLeft;
        const minimum = !vertical && style.direction === 'rtl' ? -range : 0;
        const maximum = !vertical && style.direction === 'rtl' ? 0 : range;
        if (delta > 0 ? position > minimum : position < maximum) return true;
      }
    }
    if (element === root) break;
  }
  return false;
}
/** Yield actual text hits before a mouse/pen drag can suppress native selection. */
function protectsTextSelection(event: PointerEvent, root: HTMLElement): boolean {
  if (event.pointerType === 'touch') return false;
  const document = root.ownerDocument;
  let node: Node | undefined, offset = 0, range: Range | undefined;
  if (typeof document.caretPositionFromPoint === 'function') {
    let shadowRoots: ShadowRoot[] | undefined;
    for (const candidate of event.composedPath()) {
      if ((candidate as Node).nodeType === 11 && 'host' in candidate) (shadowRoots ??= []).push(candidate as ShadowRoot);
    }
    const caret = document.caretPositionFromPoint(event.clientX, event.clientY, shadowRoots === undefined ? undefined : { shadowRoots });
    node = caret?.offsetNode; offset = caret?.offset ?? 0;
  } else if (typeof document.caretRangeFromPoint === 'function') {
    range = document.caretRangeFromPoint(event.clientX, event.clientY) ?? undefined;
    node = range?.startContainer; offset = range?.startOffset ?? 0;
  }
  if (node?.nodeType !== 3) return false;
  const text = node as Text;
  let owned = false, selection: string | undefined;
  for (let element: Element | null = text.assignedSlot ?? text.parentElement; element !== null; element = gestureParent(element)) {
    if (selection === undefined) {
      const value = document.defaultView?.getComputedStyle(element).userSelect;
      if (value && value !== 'auto') selection = value;
    }
    if (element === root) { owned = true; break; }
  }
  if (!owned || selection === 'none') return false;
  range ??= document.createRange();
  const point = { x: event.clientX, y: event.clientY };
  for (let index = Math.max(0, offset - 1); index < Math.min(text.length, offset + 1); index++) {
    range.setStart(text, index); range.setEnd(text, index + 1);
    for (const rect of range.getClientRects()) {
      if (rect.width > 0 && rect.height > 0 && rectContainsPoint(rect, point)) return true;
    }
  }
  return false;
}

export type { DOMLayerReparentErrorCode, DOMLayerPresentationErrorCode, DOMLayerPresentationSnapshot, DOMLayerPresentationListener, DOMLayerPresentationSubscription } from './overlay/popup/connection.js';
