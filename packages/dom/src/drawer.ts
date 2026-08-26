import type { Result } from '@sectile/core';
import {
  applyDrawerEvent,
  tryCreateDrawerState,
  type DrawerCommand,
  type DrawerEvent,
  type DrawerSide,
  type DrawerState,
} from '@sectile/core/drawer';
import { unwrap } from '@sectile/core/result';
import { createFacadeConnection, type FacadeConnection } from '@sectile/core/adapter-runtime';
import { createDOMPopup, type DOMPopupConnection } from './internal/popup-control.js';
import type { InteractOutsideHandler } from './interact-outside.js';

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
  readonly trapFocus?: boolean;
  readonly closeOnInteractOutside?: boolean;
  readonly interactOutsideExclusions?: readonly HTMLElement[];
  readonly onInteractOutside?: InteractOutsideHandler;
  readonly swipeToDismiss?: boolean;
  readonly swipeThreshold?: number;
  readonly swipeVelocityThreshold?: number;
  readonly onOpenChange?: (open: boolean) => void;
  readonly onInitialFocus?: () => void;
  readonly onFocusRestore?: () => void;
  readonly onUpdate?: () => void;
  readonly manageVisibility?: boolean;
}

export type DrawerOpenChangeHandler = NonNullable<DrawerOptions['onOpenChange']>;
export type DrawerInitialFocusHandler = NonNullable<DrawerOptions['onInitialFocus']>;
export type DrawerFocusRestoreHandler = NonNullable<DrawerOptions['onFocusRestore']>;
export type DrawerInteractOutsideHandler = NonNullable<DrawerOptions['onInteractOutside']>;
export type DrawerUpdateHandler = NonNullable<DrawerOptions['onUpdate']>;
export type DrawerConnection = DOMPopupConnection<DrawerState, DrawerEvent>;

export function createDrawer(options: DrawerOptions): FacadeConnection<DrawerConnection> {
  return unwrap(tryCreateDrawer(options));
}

export function tryCreateDrawer(options: DrawerOptions): Result<FacadeConnection<DrawerConnection>> {
  return createFacadeConnection(options, (normalized) => tryCreateDrawerConnection(normalized));
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
    ...(options.initialFocus === undefined ? {} : { initialFocus: options.initialFocus }),
    autoFocus: options.autoFocus ?? true,
    restoreFocus: options.restoreFocus ?? true,
    trapFocus: options.trapFocus ?? modal,
    closeOnInteractOutside: options.closeOnInteractOutside ?? true,
    ...(options.interactOutsideExclusions === undefined ? {} : { interactOutsideExclusions: options.interactOutsideExclusions }),
    ...(options.overlay === undefined ? {} : { modalBranches: [options.overlay] }),
    ...(options.onInteractOutside === undefined ? {} : { onInteractOutside: options.onInteractOutside }),
    ...(options.manageVisibility === undefined ? {} : { manageVisibility: options.manageVisibility }),
    onOpenChange: options.onOpenChange,
    command: (command) => command.type === 'request-initial-focus' ? options.onInitialFocus?.() : options.onFocusRestore?.(),
    onUpdate: () => { connection?.syncProjection(); options.onUpdate?.(); },
  });
  if (!popup.ok) return popup;
  connection = new ManagedDrawer(popup.value, options, thresholds.value);
  return { ok: true, value: connection };
}

class ManagedDrawer implements DrawerConnection {
  readonly #popup: DOMPopupConnection<DrawerState, DrawerEvent>;
  readonly #options: DrawerOptions;
  readonly #gestureTarget: HTMLElement;
  readonly #swipeThreshold: number;
  readonly #velocityThreshold: number;
  readonly #pointerDown: (event: PointerEvent) => void;
  readonly #pointerMove: (event: PointerEvent) => void;
  readonly #pointerEnd: (event: PointerEvent) => void;
  readonly #pointerCancel: (event: PointerEvent) => void;
  #pointerID: number | undefined;
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
    this.#swipeThreshold = thresholds.distance;
    this.#velocityThreshold = thresholds.velocity;
    this.#pointerDown = (event) => { this.#beginSwipe(event); };
    this.#pointerMove = (event) => { this.#moveSwipe(event); };
    this.#pointerEnd = (event) => { this.#finishSwipe(event); };
    this.#pointerCancel = (event) => { if (event.pointerId === this.#pointerID) this.#cancelSwipe(); };
    if (options.swipeToDismiss !== false) {
      this.#gestureTarget.addEventListener('pointerdown', this.#pointerDown);
      this.#gestureTarget.addEventListener('pointermove', this.#pointerMove);
      this.#gestureTarget.addEventListener('pointerup', this.#pointerEnd);
      this.#gestureTarget.addEventListener('pointercancel', this.#pointerCancel);
    }
    this.syncProjection();
  }

  public getSnapshot() { return this.#popup.getSnapshot(); }
  public syncControlledValue(open: boolean) {
    const result = this.#popup.syncControlledValue(open);
    this.syncProjection();
    return result;
  }
  public handleEvent(event: DrawerEvent): boolean {
    const handled = this.#popup.handleEvent(event);
    this.syncProjection();
    return handled;
  }
  public refresh(): void { this.#popup.refresh(); this.syncProjection(); }
  public disconnect(): void {
    this.#gestureTarget.removeEventListener('pointerdown', this.#pointerDown);
    this.#gestureTarget.removeEventListener('pointermove', this.#pointerMove);
    this.#gestureTarget.removeEventListener('pointerup', this.#pointerEnd);
    this.#gestureTarget.removeEventListener('pointercancel', this.#pointerCancel);
    this.#resetSwipe();
    this.#popup.disconnect();
  }
  public syncProjection(): void {
    const snapshot = this.#popup.getSnapshot().state;
    if (snapshot.open && !this.#wasOpen) this.#resetMotionProjection();
    this.#wasOpen = snapshot.open;
    const side = snapshot.side;
    const direction = swipeDirection(side);
    for (const element of this.#projectedElements()) {
      element.setAttribute('data-side', side);
      element.setAttribute('data-swipe-direction', direction);
    }
  }

  #beginSwipe(event: PointerEvent): void {
    if (!this.#popup.getSnapshot().state.open || event.button !== 0 || isSwipeIgnored(event.target)) return;
    if (this.#options.handle === undefined) return;
    const vertical = isVertical(this.#popup.getSnapshot().state.side);
    this.#pointerID = event.pointerId;
    this.#startMain = vertical ? event.clientY : event.clientX;
    this.#startCross = vertical ? event.clientX : event.clientY;
    this.#startTime = event.timeStamp;
    this.#movement = 0;
    this.#active = false;
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
      if (Math.max(movement, crossMovement) < 6) return;
      if (movement <= 0 || crossMovement > movement) { this.#cancelSwipe(); return; }
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
      this.handleEvent('close');
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
}

function validateSwipeThresholds(options: DrawerOptions): Result<{ readonly distance: number; readonly velocity: number }> {
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
