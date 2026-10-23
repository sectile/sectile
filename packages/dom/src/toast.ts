import type { CoreErrorCode, Result, StableID } from '@sectile/core';
import { applyToastEvent, areToastInputsEqual, getToastInputs, reconcileToastProposal, reconcileToastState, tryCreateToastState, type ToastCommand, type ToastEvent, type ToastInput, type ToastItem, type ToastPolicies, type ToastState } from '@sectile/core/toast';
import type { RevisionSnapshot } from '@sectile/core/revision';
import { failResult, unwrap } from '@sectile/core/result';
import { createFacadeConnection, type FacadeConnection } from '@sectile/core/adapter-runtime';
import { createSemanticController, type SemanticController } from '@sectile/core/adapter-runtime';
import { createHiddenBinding, type HiddenBinding } from './interaction/visibility.js';
import { createIntervalClock, isNativeIntervalDelay, type NativeIntervalClock } from './interaction/clock.js';
import { eventOrigin, protectsNativeInteraction } from './interaction/gesture.js';
export type { ToastInput, ToastItem, ToastKind } from '@sectile/core/toast';
export { createToastState } from '@sectile/core/toast';
export type ToastErrorCode = CoreErrorCode | 'dom.toast-interval-invalid';
const swipeProperties = ['--sectile-toast-swipe-move-x', '--sectile-toast-swipe-move-y', '--sectile-toast-swipe-end-x', '--sectile-toast-swipe-end-y'] as const;
type SwipeProperty = typeof swipeProperties[number];
interface SwipePaint { readonly previous: string | null; applied: string; readonly properties: Map<SwipeProperty, { readonly previous: string; readonly priority: string; applied: string }> }
interface Swipe<ID> { readonly id: ID; readonly pointerId: number; readonly startX: number; readonly startY: number; readonly element: HTMLElement }
interface ToastRegistration<ID extends StableID> { readonly element: HTMLElement; item: ToastItem<ID> | undefined; projectedOpen: boolean | undefined }
interface ToastPolicySource { value: ToastPolicies }

export interface ToastOptions<ID extends StableID = StableID> extends ToastPolicies {
  readonly root: HTMLElement;
  readonly items?: readonly ToastInput<ID>[];
  readonly initialToasts?: readonly ToastInput<ID>[];
  readonly label?: string;
  readonly closeLabel?: string;
  readonly autoDismiss?: boolean;
  readonly tickIntervalMs?: number;
  readonly hotkey?: readonly string[] | false;
  readonly pauseOnWindowBlur?: boolean;
  readonly dismissOnEscape?: boolean;
  readonly swipeDirection?: 'up' | 'right' | 'down' | 'left';
  readonly swipeThreshold?: number;
  readonly manageVisibility?: boolean;
  readonly onItemsChange?: (items: readonly ToastItem<ID>[]) => void;
  readonly onAnnounce?: (item: ToastItem<ID>) => void;
  readonly onDismiss?: (id: ID, reason: 'manual' | 'timeout' | 'overflow') => void;
  readonly onUpdate?: () => void;
}
/** A notification queue can exist before a native viewport is attached. */
export interface ToastQueueOptions<ID extends StableID = StableID> extends Omit<ToastOptions<ID>, 'root'> { readonly root?: undefined }
export type ToastConfiguration = Pick<ToastOptions, 'label' | 'closeLabel' | 'autoDismiss' | 'hotkey' | 'pauseOnWindowBlur' | 'dismissOnEscape' | 'swipeDirection' | 'swipeThreshold' | 'defaultDurationMs' | 'maxVisible'>;
const configurationKeys = ['label', 'closeLabel', 'autoDismiss', 'hotkey', 'pauseOnWindowBlur', 'dismissOnEscape', 'swipeDirection', 'swipeThreshold', 'defaultDurationMs', 'maxVisible'] as const satisfies readonly (keyof ToastConfiguration)[];

export type ToastItemsChangeHandler<ID extends StableID = StableID> = NonNullable<ToastOptions<ID>['onItemsChange']>;
export type ToastAnnounceHandler<ID extends StableID = StableID> = NonNullable<ToastOptions<ID>['onAnnounce']>;
export type ToastDismissHandler<ID extends StableID = StableID> = NonNullable<ToastOptions<ID>['onDismiss']>;
export type ToastUpdateHandler<ID extends StableID = StableID> = NonNullable<ToastOptions<ID>['onUpdate']>;
export interface ToastConnection<ID extends StableID = StableID> {
  getSnapshot(): RevisionSnapshot<ToastState<ID>>;
  handleEvent(event: ToastEvent<ID>): boolean;
  push(toast: ToastInput<ID>): boolean;
  updateToast(id: ID, toast: Partial<Omit<ToastInput<ID>, 'id'>>): boolean;
  dismiss(id: ID): boolean;
  dismissAll(): boolean;
  syncItems(items: readonly ToastInput<ID>[]): Result<RevisionSnapshot<ToastState<ID>>>;
  setViewport(element: HTMLElement | undefined, label?: string): void;
  syncConfiguration(configuration: ToastConfiguration): Result<RevisionSnapshot<ToastState<ID>>>;
  getToastElement(id: ID): HTMLElement | undefined;
  setToastAttributes(element: HTMLElement | undefined, id: ID): void;
  setCloseButtonAttributes(element: HTMLButtonElement | undefined, id: ID): void;
  disconnect(): void;
}
export function createToast<ID extends StableID>(options: ToastOptions<ID> | ToastQueueOptions<ID>): FacadeConnection<ToastConnection<ID>> { return unwrap(tryCreateToast(options)); }
export function tryCreateToast<ID extends StableID>(options: ToastOptions<ID> | ToastQueueOptions<ID>): Result<FacadeConnection<ToastConnection<ID>>, ToastErrorCode> { return createFacadeConnection(options, tryCreateToastConnection); }

function tryCreateToastConnection<ID extends StableID>(options: ToastOptions<ID> | ToastQueueOptions<ID>): Result<ToastConnection<ID>, ToastErrorCode> {
  const intervalMs = options.tickIntervalMs ?? 100;
  if (!isNativeIntervalDelay(intervalMs)) return failResult('construction', 'dom.toast-interval-invalid', 'Toast tick interval must be finite and between 1 and 2147483647 milliseconds.');
  let connection: DOMToast<ID> | undefined;
  const controlled = options.items !== undefined;
  const policies: ToastPolicySource = { value: { ...(options.defaultDurationMs === undefined ? {} : { defaultDurationMs: options.defaultDurationMs }), ...(options.maxVisible === undefined ? {} : { maxVisible: options.maxVisible }) } };
  let ticking = false;
  const runtime = createSemanticController<ToastState<ID>, ToastEvent<ID>, ToastCommand<ID>, ToastCommand<ID>>({
    initial: tryCreateToastState(options.items ?? options.initialToasts ?? [], false, options),
    reducer: (state, event) => { ticking = typeof event === 'object' && event.type === 'tick'; return applyToastEvent(state, event, policies.value); },
    ...(controlled ? { reconcile: (previous: ToastState<ID>, proposed: ToastState<ID>) => reconcileToastProposal(previous, proposed, ticking ? 'clock' : 'input', policies.value) } : {}),
    notify: (previous, proposed) => { connection?.publishItemsChange(previous, proposed, controlled); },
    toEffect: (command) => command,
  });
  if (!runtime.ok) return runtime;
  connection = new DOMToast(options, policies, intervalMs, runtime.value);
  return { ok: true, value: connection };
}

class DOMToast<ID extends StableID> implements ToastConnection<ID> {
  #options: Omit<ToastOptions<ID>, 'root' | 'items' | 'initialToasts'> | undefined;
  #root: HTMLElement | undefined;
  #viewportEpoch: object | undefined;
  readonly #policies: ToastPolicySource;
  readonly #runtime: SemanticController<ToastState<ID>, ToastEvent<ID>, ToastCommand<ID>>;
  readonly #toasts = new Map<ID, ToastRegistration<ID>>();
  readonly #closes = new Map<ID, { readonly element: HTMLButtonElement; readonly click: () => void; active: boolean }>();
  #projectionEpoch: object | undefined;
  readonly #touchActions = new Map<HTMLElement, { readonly previous: string; readonly applied: string }>();
  readonly #visibility = new Map<HTMLElement, HiddenBinding>();
  readonly #swipePaint = new Map<HTMLElement, SwipePaint>();
  readonly #mouseenter: (event: MouseEvent) => void;
  readonly #mouseleave: (event: MouseEvent) => void;
  readonly #focusin: (event: FocusEvent) => void;
  readonly #focusout: (event: FocusEvent) => void;
  readonly #clock: NativeIntervalClock;
  #scheduleItems: readonly ToastItem<ID>[] | undefined;
  #pendingTimed = false;
  readonly #keydown: (event: KeyboardEvent) => void;
  readonly #pointerdown: (event: PointerEvent) => void;
  readonly #pointermove: (event: PointerEvent) => void;
  readonly #pointerup: (event: PointerEvent) => void;
  readonly #pointercancel: (event: PointerEvent) => void;
  readonly #windowBlur: (event: Event) => void;
  readonly #windowFocus: (event: Event) => void;
  #swipe: Swipe<ID> | undefined;
  #hovered = false;
  #focused = false;
  #windowBlurred = false;
  public constructor(options: ToastOptions<ID> | ToastQueueOptions<ID>, policies: ToastPolicySource, intervalMs: number, runtime: SemanticController<ToastState<ID>, ToastEvent<ID>, ToastCommand<ID>>) {
    const { root, items: _items, initialToasts: _initial, ...liveOptions } = options;
    this.#options = liveOptions; this.#policies = policies; this.#runtime = runtime;
    this.#clock = createIntervalClock(intervalMs, elapsedMs => { this.handleEvent({ type: 'tick', elapsedMs }); });
    this.#mouseenter = (event): void => { if (!this.#acceptRootEvent(event)) return; this.#hovered = true; this.#syncPause(); };
    this.#mouseleave = (event): void => { if (!this.#acceptRootEvent(event)) return; this.#hovered = false; this.#syncPause(); };
    this.#focusin = (event): void => { if (!this.#acceptRootEvent(event)) return; this.#focused = true; this.#syncPause(); };
    this.#focusout = (event): void => { const root = this.#root; if (!this.#acceptRootEvent(event) || !root || contains(root, event.relatedTarget)) return; this.#focused = false; this.#syncPause(); };
    this.#keydown = (event): void => {
      const options = this.#options, root = this.#root; if (!options || !root || (event.currentTarget != null && event.currentTarget !== root.ownerDocument)) return;
      if (!event.defaultPrevented && matchesHotkey(event, options.hotkey ?? ['F8'])) {
        event.preventDefault(); root.focus(); return;
      }
      if (event.key !== 'Escape' || options.dismissOnEscape === false) return;
      const toast = this.#toastAt(event.target);
      const id = toast?.id ?? (event.target === root ? this.getSnapshot().state.items.at(-1)?.id : undefined);
      if (id === undefined) return;
      event.preventDefault(); this.dismiss(id);
    };
    this.#pointerdown = (event): void => {
      if (!this.#acceptRootEvent(event) || event.defaultPrevented || event.button !== 0 || !event.isPrimary) return;
      if (this.#swipe !== undefined) return;
      const toast = this.#toastAt(event.target); if (toast === null) return;
      const origin = eventOrigin(event);
      if (origin === undefined || protectsNativeInteraction(origin, toast.element)) return;
      this.#swipe = { id: toast.id, pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, element: toast.element };
      this.#setSwipeState(toast.element, 'start'); toast.element.setPointerCapture?.(event.pointerId);
    };
    this.#pointermove = (event): void => {
      const options = this.#options; if (!options || !this.#acceptRootEvent(event)) return;
      if (this.#swipe === undefined || this.#swipe.pointerId !== event.pointerId) return;
      const delta = swipeDelta(options.swipeDirection ?? 'right', event.clientX - this.#swipe.startX, event.clientY - this.#swipe.startY);
      this.#setSwipeState(this.#swipe.element, 'move');
      this.#writeSwipe(this.#swipe.element, '--sectile-toast-swipe-move-x', `${delta.x}px`);
      this.#writeSwipe(this.#swipe.element, '--sectile-toast-swipe-move-y', `${delta.y}px`);
    };
    this.#pointerup = (event): void => {
      const options = this.#options; if (!options || !this.#acceptRootEvent(event)) return;
      const swipe = this.#swipe; if (swipe === undefined || swipe.pointerId !== event.pointerId) return;
      this.#swipe = undefined; const delta = swipeDelta(options.swipeDirection ?? 'right', event.clientX - swipe.startX, event.clientY - swipe.startY);
      releasePointer(swipe);
      const distance = options.swipeDirection === 'up' || options.swipeDirection === 'down' ? Math.abs(delta.y) : Math.abs(delta.x);
      if (distance >= (options.swipeThreshold ?? 50)) {
        this.#setSwipeState(swipe.element, 'end'); this.#writeSwipe(swipe.element, '--sectile-toast-swipe-end-x', `${delta.x}px`); this.#writeSwipe(swipe.element, '--sectile-toast-swipe-end-y', `${delta.y}px`); this.dismiss(swipe.id);
      } else {
        this.#setSwipeState(swipe.element, 'cancel'); this.#writeSwipe(swipe.element, '--sectile-toast-swipe-move-x', undefined); this.#writeSwipe(swipe.element, '--sectile-toast-swipe-move-y', undefined);
      }
    };
    this.#pointercancel = (event): void => {
      if (!this.#acceptRootEvent(event)) return;
      const swipe = this.#swipe; if (swipe === undefined || swipe.pointerId !== event.pointerId) return;
      if (event.type === 'lostpointercapture' && swipe.element.hasPointerCapture?.(swipe.pointerId)) return;
      this.#cancelSwipe();
    };
    this.#windowBlur = (event): void => { if (this.#acceptWindowEvent(event) && this.#options?.pauseOnWindowBlur !== false) { this.#windowBlurred = true; this.#syncPause(); } };
    this.#windowFocus = (event): void => { if (this.#acceptWindowEvent(event) && this.#options?.pauseOnWindowBlur !== false) { this.#windowBlurred = false; this.#syncPause(); } };
    this.setViewport(root);
  }
  public getSnapshot(): RevisionSnapshot<ToastState<ID>> { return this.#runtime.getSnapshot(); }
  public getToastElement(id: ID): HTMLElement | undefined { return this.#toasts.get(id)?.element; }
  public setViewport(root: HTMLElement | undefined, label?: string): void {
    const options = this.#options; if (!options) return;
    if (label !== undefined) this.#options = { ...options, label };
    if (root === this.#root) { this.#refresh(); return; }
    const epoch = {}; this.#viewportEpoch = epoch;
    const retainPause = this.getSnapshot().state.paused && !(this.#hovered || this.#focused || this.#windowBlurred);
    const previousWindow = this.#root?.ownerDocument?.defaultView, blurred = this.#windowBlurred;
    this.#clearViewport();
    if (!this.#options || this.#viewportEpoch !== epoch) return;
    this.#root = root;
    try {
      if (root !== undefined) {
        root.setAttribute('role', 'region'); if (!this.#options || this.#viewportEpoch !== epoch) return;
        root.setAttribute('aria-live', 'polite'); if (!this.#options || this.#viewportEpoch !== epoch) return;
        root.tabIndex = -1;
        if (!this.#options || this.#viewportEpoch !== epoch) return;
        root.addEventListener('mouseenter', this.#mouseenter); root.addEventListener('mouseleave', this.#mouseleave);
        root.addEventListener('focusin', this.#focusin); root.addEventListener('focusout', this.#focusout);
        root.addEventListener('pointerdown', this.#pointerdown); root.addEventListener('pointermove', this.#pointermove);
        root.addEventListener('pointerup', this.#pointerup); root.addEventListener('pointercancel', this.#pointercancel);
        root.addEventListener('lostpointercapture', this.#pointercancel);
        root.ownerDocument?.addEventListener?.('keydown', this.#keydown, true);
        root.ownerDocument?.defaultView?.addEventListener?.('blur', this.#windowBlur);
        root.ownerDocument?.defaultView?.addEventListener?.('focus', this.#windowFocus);
        this.#windowBlurred = this.#options.pauseOnWindowBlur !== false && blurred && previousWindow === root.ownerDocument?.defaultView;
      }
      if (!retainPause) this.#syncPause();
      if (!this.#options || this.#viewportEpoch !== epoch) return;
      this.#syncSchedule(); this.#refresh();
    } catch (error) {
      if (this.#viewportEpoch === epoch) { try { this.#clearViewport(); } catch {} }
      throw error;
    }
  }
  public syncConfiguration(configuration: ToastConfiguration): Result<RevisionSnapshot<ToastState<ID>>> {
    const options = this.#options; if (!options) return { ok: true, value: this.getSnapshot() };
    const next = { ...options };
    for (const key of configurationKeys) { const value = configuration[key]; if (value !== undefined) Object.assign(next, { [key]: value }); }
    if (this.#options !== options) return { ok: true, value: this.getSnapshot() };
    const policyChanged = next.defaultDurationMs !== this.#policies.value.defaultDurationMs || next.maxVisible !== this.#policies.value.maxVisible;
    const nextPolicies: ToastPolicies = {
      ...(next.defaultDurationMs === undefined ? {} : { defaultDurationMs: next.defaultDurationMs }),
      ...(next.maxVisible === undefined ? {} : { maxVisible: next.maxVisible }) };
    if (policyChanged) {
      const result = this.#runtime.replace(reconcileToastState(this.getSnapshot().state, getToastInputs(this.getSnapshot().state.items), nextPolicies));
      if (!result.ok) return result;
      this.#policies.value = nextPolicies;
    }
    this.#options = next;
    if (options.swipeDirection !== next.swipeDirection) {
      this.#cancelSwipe();
      if (this.#options !== next) return { ok: true, value: this.getSnapshot() };
      for (const [element, binding] of this.#touchActions) {
        if (element.style.touchAction !== binding.applied) continue;
        element.style.touchAction = optionsTouchAction(next.swipeDirection ?? 'right');
        if (this.#options !== next || this.#touchActions.get(element) !== binding) return { ok: true, value: this.getSnapshot() };
        this.#touchActions.set(element, { previous: binding.previous, applied: element.style.touchAction });
      }
    }
    const nativePause = this.#hovered || this.#focused || this.#windowBlurred;
    if (next.pauseOnWindowBlur === false) this.#windowBlurred = false;
    if (nativePause) this.#syncPause();
    if (this.#options === next) { this.#syncSchedule(); this.#refresh(); if (this.#options === next) next.onUpdate?.(); }
    return { ok: true, value: this.getSnapshot() };
  }
  public publishItemsChange(previous: ToastState<ID>, proposed: ToastState<ID>, controlled: boolean): void {
    const options = this.#options; if (!options) return;
    // The controller has committed; resource state precedes application callbacks.
    this.#syncSchedule(); this.#refresh();
    if (this.#options !== options) return;
    if (!controlled || !areToastInputsEqual(previous.items, proposed.items)) options.onItemsChange?.(proposed.items);
  }
  public handleEvent(event: ToastEvent<ID>): boolean {
    const options = this.#options; if (!options) return false;
    const result = this.#runtime.handle(event);
    if (!result.ok) return false;
    if (this.#options !== options || this.getSnapshot().revision !== result.snapshot.revision) return true;
    for (const command of result.commands) {
      if (command.type === 'announce-toast') { const item = result.snapshot.state.items.find((candidate) => candidate.id === command.id); if (item !== undefined) options.onAnnounce?.(item); }
      else options.onDismiss?.(command.id, command.reason);
      if (this.#options !== options || this.getSnapshot().revision !== result.snapshot.revision) return true;
    }
    options.onUpdate?.(); return true;
  }
  public push(toast: ToastInput<ID>): boolean { return this.handleEvent({ type: 'push', toast }); }
  public updateToast(id: ID, toast: Partial<Omit<ToastInput<ID>, 'id'>>): boolean { return this.handleEvent({ type: 'update', id, toast }); }
  public dismiss(id: ID): boolean { return this.handleEvent({ type: 'dismiss', id }); }
  public dismissAll(): boolean { return this.handleEvent('dismiss-all'); }
  public syncItems(items: readonly ToastInput<ID>[]): Result<RevisionSnapshot<ToastState<ID>>> {
    const options = this.#options; if (!options) return { ok: true, value: this.getSnapshot() };
    const result = this.#runtime.replace(reconcileToastState(this.getSnapshot().state, items, this.#policies.value));
    if (result.ok) { this.#syncSchedule(); this.#refresh(); if (this.#options === options) options.onUpdate?.(); }
    return result;
  }
  public setToastAttributes(element: HTMLElement | undefined, id: ID): void {
    const options = this.#options; if (!options || !this.#root) return;
    const current = this.#toasts.get(id);
    if (current?.element === element) { this.#refresh(); return; }
    if (current !== undefined) this.#releaseToast(id, current.element);
    if (element === undefined) { this.#refresh(); return; }
    for (const [candidate, registered] of [...this.#toasts]) {
      if (candidate !== id && registered.element === element) this.#releaseToast(candidate, registered.element);
    }
    this.#toasts.set(id, { element, item: undefined, projectedOpen: undefined });
    if (options.manageVisibility !== false) this.#visibility.set(element, createHiddenBinding(element));
    if (element.style.touchAction === '') {
      const previous = element.style.touchAction;
      element.style.touchAction = optionsTouchAction(options.swipeDirection ?? 'right');
      this.#touchActions.set(element, { previous, applied: element.style.touchAction });
    }
    this.#refresh();
  }
  public setCloseButtonAttributes(element: HTMLButtonElement | undefined, id: ID): void {
    if (!this.#options || !this.#root) return;
    const current = this.#closes.get(id);
    if (current?.element === element) { this.#refresh(); return; }
    if (current !== undefined) this.#releaseClose(id, current.element);
    if (element === undefined) { this.#refresh(); return; }
    for (const [candidate, registered] of [...this.#closes]) {
      if (candidate !== id && registered.element === element) this.#releaseClose(candidate, registered.element);
    }
    const click = (): void => { if (this.#closes.get(id)?.click === click) this.dismiss(id); };
    element.addEventListener('click', click);
    this.#closes.set(id, { element, click, active: false });
    this.#refresh();
  }
  public disconnect(): void {
    if (!this.#options) return;
    this.#options = undefined; this.#viewportEpoch = undefined; this.#clock.disconnect();
    this.#clearViewport();
  }
  #clearViewport(): void {
    const root = this.#root; this.#root = undefined; this.#projectionEpoch = undefined;
    this.#clock.sync(false); this.#scheduleItems = undefined; this.#pendingTimed = false;
    this.#hovered = false; this.#focused = false; this.#windowBlurred = false;
    const swipe = this.#swipe; this.#swipe = undefined;
    const cleanup: (() => void)[] = root === undefined ? [] : [
      () => root.removeEventListener('mouseenter', this.#mouseenter), () => root.removeEventListener('mouseleave', this.#mouseleave),
      () => root.removeEventListener('focusin', this.#focusin), () => root.removeEventListener('focusout', this.#focusout),
      () => root.ownerDocument?.removeEventListener?.('keydown', this.#keydown, true),
      () => root.removeEventListener('pointerdown', this.#pointerdown), () => root.removeEventListener('pointermove', this.#pointermove),
      () => root.removeEventListener('pointerup', this.#pointerup), () => root.removeEventListener('pointercancel', this.#pointercancel),
      () => root.removeEventListener('lostpointercapture', this.#pointercancel),
      () => root.ownerDocument?.defaultView?.removeEventListener?.('blur', this.#windowBlur), () => root.ownerDocument?.defaultView?.removeEventListener?.('focus', this.#windowFocus),
    ];
    for (const [id, registration] of this.#closes) cleanup.push(() => this.#releaseClose(id, registration.element));
    for (const [id, registration] of this.#toasts) cleanup.push(() => this.#releaseToast(id, registration.element));
    cleanup.push(() => releasePointer(swipe));
    releaseResources(cleanup);
  }
  #releaseToast(id: ID, element: HTMLElement): void {
    if (this.#toasts.get(id)?.element !== element) return;
    this.#toasts.delete(id);
    const swipe = this.#swipe?.element === element ? this.#swipe : undefined; if (swipe) this.#swipe = undefined;
    const visibility = this.#visibility.get(element);
    this.#visibility.delete(element);
    const touchAction = this.#touchActions.get(element);
    this.#touchActions.delete(element);
    releaseResources([() => visibility?.disconnect(), () => this.#restoreSwipe(element),
      () => { if (touchAction !== undefined && element.style.touchAction === touchAction.applied) element.style.touchAction = touchAction.previous; },
      () => releasePointer(swipe)]);
  }
  #releaseClose(id: ID, element: HTMLButtonElement): void {
    const registration = this.#closes.get(id);
    if (registration === undefined || registration.element !== element) return;
    this.#closes.delete(id);
    registration.element.removeEventListener('click', registration.click);
  }
  #syncSchedule(): void {
    const options = this.#options;
    if (!options || !this.#root) { this.#clock.sync(false); this.#scheduleItems = undefined; this.#pendingTimed = false; return; }
    const state = this.getSnapshot().state;
    if (this.#scheduleItems !== state.items) {
      this.#scheduleItems = state.items;
      this.#pendingTimed = state.items.some(item => item.remainingMs !== null && item.remainingMs > 0);
    }
    this.#clock.sync(options.autoDismiss !== false && !state.paused && this.#pendingTimed);
  }
  #refresh(): void {
    const options = this.#options, root = this.#root; if (!options || !root) return;
    const epoch = {}; this.#projectionEpoch = epoch;
    const current = (): boolean => this.#projectionEpoch === epoch;
    const state = this.getSnapshot().state;
    root.setAttribute('aria-label', options.label ?? 'Notifications');
    if (!current()) return;
    root.dataset['paused'] = String(state.paused);
    if (!current()) return;
    for (const registration of this.#toasts.values()) registration.item = undefined;
    for (const registration of this.#closes.values()) registration.active = false;
    let unresolved = this.#toasts.size + this.#closes.size;
    if (unresolved > 0) for (const item of state.items) {
      const toast = this.#toasts.get(item.id), close = this.#closes.get(item.id);
      if (toast !== undefined) { toast.item = item; unresolved--; }
      if (close !== undefined) { close.active = true; unresolved--; }
      if (unresolved === 0) break;
    }
    for (const registration of this.#toasts.values()) {
      const { element, item } = registration;
      const open = item !== undefined;
      if (!open && registration.projectedOpen !== false) {
        const scope = element.getRootNode?.() as Document | ShadowRoot | undefined;
        const focused = scope?.activeElement ?? element.ownerDocument?.activeElement ?? null;
        if (contains(element, focused)) {
          root.focus({ preventScroll: true });
          if (!current()) return;
        }
      }
      registration.projectedOpen = open;
      this.#visibility.get(element)?.setHidden(item === undefined, current);
      if (!current()) return;
      element.dataset['state'] = item === undefined ? 'closed' : 'open';
      if (!current()) return;
      if (item === undefined) { if (this.#swipe?.element === element) this.#cancelSwipe(); if (!current()) return; continue; }
      element.setAttribute('role', item.kind === 'error' ? 'alert' : 'status');
      if (!current()) return;
      element.dataset['kind'] = item.kind;
      if (!current()) return;
    }
    for (const { element, active } of this.#closes.values()) {
      element.type = 'button'; if (!current()) return;
      element.setAttribute('aria-label', options.closeLabel ?? 'Dismiss notification'); if (!current()) return;
      element.disabled = !active; if (!current()) return;
    }
  }
  #setSwipeState(element: HTMLElement, value: string): void {
    let paint = this.#swipePaint.get(element);
    if (!paint) { paint = { previous: element.getAttribute('data-swipe'), applied: value, properties: new Map() }; this.#swipePaint.set(element, paint); }
    paint.applied = value; element.dataset['swipe'] = value;
  }
  #writeSwipe(element: HTMLElement, property: SwipeProperty, value: string | undefined): void {
    const paint = this.#swipePaint.get(element)!;
    let entry = paint.properties.get(property);
    if (value === undefined) {
      if (!entry) return;
      paint.properties.delete(property);
      if (element.style.getPropertyValue(property) === entry.applied && element.style.getPropertyPriority(property) === '') {
        if (entry.previous) element.style.setProperty(property, entry.previous, entry.priority); else element.style.removeProperty(property);
      }
      return;
    }
    if (!entry) { entry = { previous: element.style.getPropertyValue(property), priority: element.style.getPropertyPriority(property), applied: value }; paint.properties.set(property, entry); }
    entry.applied = value; element.style.setProperty(property, value);
  }
  #restoreSwipe(element: HTMLElement): void {
    const paint = this.#swipePaint.get(element); if (!paint) return;
    try { releaseResources(swipeProperties.map(property => () => this.#writeSwipe(element, property, undefined))); }
    finally {
      this.#swipePaint.delete(element);
      if (element.getAttribute('data-swipe') === paint.applied) {
        if (paint.previous === null) element.removeAttribute('data-swipe'); else element.setAttribute('data-swipe', paint.previous);
      }
    }
  }
  #cancelSwipe(): void {
    const swipe = this.#swipe; if (!swipe) return; this.#swipe = undefined;
    releaseResources([() => this.#setSwipeState(swipe.element, 'cancel'),
      () => this.#writeSwipe(swipe.element, '--sectile-toast-swipe-move-x', undefined),
      () => this.#writeSwipe(swipe.element, '--sectile-toast-swipe-move-y', undefined), () => releasePointer(swipe)]);
  }
  #toastAt(target: EventTarget | null): { readonly id: ID; readonly element: HTMLElement } | null { for (const [id, { element }] of this.#toasts) { try { if (element === target || (target !== null && element.contains(target as Node))) return { id, element }; } catch { continue; } } return null; }
  #acceptRootEvent(event: Event): boolean { return this.#options !== undefined && this.#root !== undefined && (event.currentTarget == null || event.currentTarget === this.#root); }
  #acceptWindowEvent(event: Event): boolean { return this.#options !== undefined && this.#root !== undefined && (event.currentTarget == null || event.currentTarget === this.#root.ownerDocument?.defaultView); }
  #syncPause(): void { if (!this.#options) return; const paused = this.#hovered || this.#focused || this.#windowBlurred; if (this.getSnapshot().state.paused === paused) return; this.handleEvent(paused ? 'pause' : 'resume'); }
}

function matchesHotkey(event: KeyboardEvent, hotkey: readonly string[] | false): boolean { if (hotkey === false || hotkey.length === 0) return false; const modifiers = new Set(hotkey.map((key) => key.toLowerCase())); const key = hotkey.find((candidate) => !['alt', 'control', 'ctrl', 'meta', 'shift'].includes(candidate.toLowerCase())); if (key === undefined || event.key.toLowerCase() !== key.toLowerCase()) return false; return event.altKey === modifiers.has('alt') && event.ctrlKey === (modifiers.has('control') || modifiers.has('ctrl')) && event.metaKey === modifiers.has('meta') && event.shiftKey === modifiers.has('shift'); }
function swipeDelta(direction: 'up' | 'right' | 'down' | 'left', x: number, y: number): { readonly x: number; readonly y: number } { if (direction === 'right') return { x: Math.max(0, x), y: 0 }; if (direction === 'left') return { x: Math.min(0, x), y: 0 }; if (direction === 'down') return { x: 0, y: Math.max(0, y) }; return { x: 0, y: Math.min(0, y) }; }
function optionsTouchAction(direction: 'up' | 'right' | 'down' | 'left'): string { return direction === 'left' || direction === 'right' ? 'pan-y' : 'pan-x'; }
function contains(root: HTMLElement, target: EventTarget | null): boolean { if (target === null) return false; try { return root === target || root.contains(target as Node); } catch { return false; } }
function releasePointer<ID>(swipe: Swipe<ID> | undefined): void { if (swipe && (swipe.element.hasPointerCapture?.(swipe.pointerId) ?? true)) swipe.element.releasePointerCapture?.(swipe.pointerId); }
function releaseResources(resources: readonly (() => void)[]): void {
  let failed = false, first: unknown;
  for (const release of resources) { try { release(); } catch (error) { if (!failed) first = error; failed = true; } }
  if (failed) throw first;
}
