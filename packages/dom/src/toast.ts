import type { Result, StableID } from '@sectile/core';
import { applyToastEvent, tryCreateToastState, type ToastCommand, type ToastEvent, type ToastInput, type ToastItem, type ToastPolicies, type ToastState } from '@sectile/core/toast';
import type { RevisionSnapshot } from '@sectile/core/revision';
import { unwrap } from '@sectile/core/result';
import { createFacadeConnection, type FacadeConnection } from '@sectile/core/adapter-runtime';
import { createSemanticController, type SemanticController } from '@sectile/core/adapter-runtime';
export type { ToastInput, ToastItem, ToastKind } from '@sectile/core/toast';
export { createToastState } from '@sectile/core/toast';

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
  setToastAttributes(element: HTMLElement, id: ID): void;
  setCloseButtonAttributes(element: HTMLButtonElement, id: ID): void;
  disconnect(): void;
}
export function createToast<ID extends StableID>(options: ToastOptions<ID>): FacadeConnection<ToastConnection<ID>> { return unwrap(tryCreateToast(options)); }
export function tryCreateToast<ID extends StableID>(options: ToastOptions<ID>): Result<FacadeConnection<ToastConnection<ID>>> { return createFacadeConnection(options, (normalized) => tryCreateToastConnection(normalized)); }

function tryCreateToastConnection<ID extends StableID>(options: ToastOptions<ID>): Result<ToastConnection<ID>> {
  let connection: DOMToast<ID> | undefined;
  const controlled = options.items !== undefined;
  let currentEvent: ToastEvent<ID> | undefined;
  const runtime = createSemanticController<ToastState<ID>, ToastEvent<ID>, ToastCommand<ID>, ToastCommand<ID>>({
    initial: tryCreateToastState(options.items ?? options.initialToasts ?? [], false, options),
    reducer: (state, event) => { currentEvent = event; return applyToastEvent(state, event, options); },
    ...(controlled ? { reconcile: (previous: ToastState<ID>, proposed: ToastState<ID>) => reconcileControlledToastState(previous, proposed, currentEvent) } : {}),
    notify: (previous, proposed) => { if (!controlled || !sameToastInputs(previous.items, proposed.items)) options.onItemsChange?.(proposed.items); },
    toEffect: (command) => command,
  });
  if (!runtime.ok) return runtime;
  connection = new DOMToast(options, runtime.value);
  return { ok: true, value: connection };
}

class DOMToast<ID extends StableID> implements ToastConnection<ID> {
  readonly #options: ToastOptions<ID>;
  readonly #runtime: SemanticController<ToastState<ID>, ToastEvent<ID>, ToastCommand<ID>>;
  readonly #toasts = new Map<ID, HTMLElement>();
  readonly #closes = new Map<ID, { readonly element: HTMLButtonElement; readonly click: () => void }>();
  readonly #touchActions = new Map<HTMLElement, string>();
  readonly #mouseenter: () => void;
  readonly #mouseleave: () => void;
  readonly #focusin: () => void;
  readonly #focusout: (event: FocusEvent) => void;
  readonly #timer: ReturnType<typeof setInterval> | null;
  readonly #keydown: (event: KeyboardEvent) => void;
  readonly #pointerdown: (event: PointerEvent) => void;
  readonly #pointermove: (event: PointerEvent) => void;
  readonly #pointerup: (event: PointerEvent) => void;
  readonly #pointercancel: (event: PointerEvent) => void;
  readonly #windowBlur: () => void;
  readonly #windowFocus: () => void;
  #swipe: { readonly id: ID; readonly pointerId: number; readonly startX: number; readonly startY: number; readonly element: HTMLElement } | undefined;
  #hovered = false;
  #focused = false;
  #windowBlurred = false;
  #lastTick = Date.now();
  public constructor(options: ToastOptions<ID>, runtime: SemanticController<ToastState<ID>, ToastEvent<ID>, ToastCommand<ID>>) {
    this.#options = options; this.#runtime = runtime;
    options.root.setAttribute('role', 'region');
    options.root.setAttribute('aria-label', options.label ?? 'Notifications');
    options.root.setAttribute('aria-live', 'polite');
    options.root.tabIndex = -1;
    this.#mouseenter = (): void => { this.#hovered = true; this.#syncPause(); };
    this.#mouseleave = (): void => { this.#hovered = false; this.#syncPause(); };
    this.#focusin = (): void => { this.#focused = true; this.#syncPause(); };
    this.#focusout = (event): void => { if (contains(options.root, event.relatedTarget)) return; this.#focused = false; this.#syncPause(); };
    options.root.addEventListener('mouseenter', this.#mouseenter);
    options.root.addEventListener('mouseleave', this.#mouseleave);
    options.root.addEventListener('focusin', this.#focusin);
    options.root.addEventListener('focusout', this.#focusout);
    this.#keydown = (event): void => {
      if (!event.defaultPrevented && matchesHotkey(event, options.hotkey ?? ['F8'])) {
        event.preventDefault(); options.root.focus(); return;
      }
      if (event.key !== 'Escape' || options.dismissOnEscape === false) return;
      const toast = this.#toastAt(event.target);
      const id = toast?.id ?? (event.target === options.root ? this.getSnapshot().state.items.at(-1)?.id : undefined);
      if (id === undefined) return;
      event.preventDefault(); this.dismiss(id);
    };
    this.#pointerdown = (event): void => {
      const toast = this.#toastAt(event.target); if (toast === null) return;
      this.#swipe = { id: toast.id, pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, element: toast.element };
      toast.element.dataset['swipe'] = 'start'; toast.element.setPointerCapture?.(event.pointerId);
    };
    this.#pointermove = (event): void => {
      if (this.#swipe === undefined || this.#swipe.pointerId !== event.pointerId) return;
      const delta = swipeDelta(options.swipeDirection ?? 'right', event.clientX - this.#swipe.startX, event.clientY - this.#swipe.startY);
      this.#swipe.element.dataset['swipe'] = 'move';
      this.#swipe.element.style.setProperty('--sectile-toast-swipe-move-x', `${delta.x}px`);
      this.#swipe.element.style.setProperty('--sectile-toast-swipe-move-y', `${delta.y}px`);
    };
    this.#pointerup = (event): void => {
      const swipe = this.#swipe; if (swipe === undefined || swipe.pointerId !== event.pointerId) return;
      this.#swipe = undefined; const delta = swipeDelta(options.swipeDirection ?? 'right', event.clientX - swipe.startX, event.clientY - swipe.startY);
      const distance = options.swipeDirection === 'up' || options.swipeDirection === 'down' ? Math.abs(delta.y) : Math.abs(delta.x);
      if (distance >= (options.swipeThreshold ?? 50)) {
        swipe.element.dataset['swipe'] = 'end'; swipe.element.style.setProperty('--sectile-toast-swipe-end-x', `${delta.x}px`); swipe.element.style.setProperty('--sectile-toast-swipe-end-y', `${delta.y}px`); this.dismiss(swipe.id);
      } else {
        swipe.element.dataset['swipe'] = 'cancel'; swipe.element.style.removeProperty('--sectile-toast-swipe-move-x'); swipe.element.style.removeProperty('--sectile-toast-swipe-move-y');
      }
    };
    this.#pointercancel = (event): void => {
      const swipe = this.#swipe; if (swipe === undefined || swipe.pointerId !== event.pointerId) return;
      this.#swipe = undefined; swipe.element.dataset['swipe'] = 'cancel'; swipe.element.style.removeProperty('--sectile-toast-swipe-move-x'); swipe.element.style.removeProperty('--sectile-toast-swipe-move-y');
    };
    this.#windowBlur = (): void => { if (options.pauseOnWindowBlur !== false) { this.#windowBlurred = true; this.#syncPause(); } };
    this.#windowFocus = (): void => { if (options.pauseOnWindowBlur !== false) { this.#windowBlurred = false; this.#syncPause(); } };
    options.root.ownerDocument?.addEventListener?.('keydown', this.#keydown, true);
    options.root.addEventListener('pointerdown', this.#pointerdown);
    options.root.addEventListener('pointermove', this.#pointermove);
    options.root.addEventListener('pointerup', this.#pointerup);
    options.root.addEventListener('pointercancel', this.#pointercancel);
    options.root.ownerDocument?.defaultView?.addEventListener?.('blur', this.#windowBlur);
    options.root.ownerDocument?.defaultView?.addEventListener?.('focus', this.#windowFocus);
    const interval = options.tickIntervalMs ?? 100;
    this.#timer = options.autoDismiss === false ? null : setInterval(() => {
      if (this.getSnapshot().state.paused) return;
      const now = Date.now(); const elapsedMs = now - this.#lastTick; this.#lastTick = now;
      if (this.getSnapshot().state.items.some((item) => item.remainingMs !== null && item.remainingMs > 0)) this.handleEvent({ type: 'tick', elapsedMs });
    }, interval);
    this.#refresh();
  }
  public getSnapshot(): RevisionSnapshot<ToastState<ID>> { return this.#runtime.getSnapshot(); }
  public handleEvent(event: ToastEvent<ID>): boolean {
    const result = this.#runtime.handle(event);
    if (!result.ok) return false;
    for (const command of result.commands) {
      if (command.type === 'announce-toast') { const item = result.snapshot.state.items.find((candidate) => candidate.id === command.id); if (item !== undefined) this.#options.onAnnounce?.(item); }
      else this.#options.onDismiss?.(command.id, command.reason);
    }
    this.#refresh(); this.#options.onUpdate?.(); return true;
  }
  public push(toast: ToastInput<ID>): boolean { return this.handleEvent({ type: 'push', toast }); }
  public updateToast(id: ID, toast: Partial<Omit<ToastInput<ID>, 'id'>>): boolean { return this.handleEvent({ type: 'update', id, toast }); }
  public dismiss(id: ID): boolean { return this.handleEvent({ type: 'dismiss', id }); }
  public dismissAll(): boolean { return this.handleEvent('dismiss-all'); }
  public syncItems(items: readonly ToastInput<ID>[]): Result<RevisionSnapshot<ToastState<ID>>> { const result = this.#runtime.replace(trySynchronizeToastState(this.getSnapshot().state, items, this.#options)); if (result.ok) { this.#refresh(); this.#options.onUpdate?.(); } return result; }
  public setToastAttributes(element: HTMLElement, id: ID): void { for (const [candidate, registered] of this.#toasts) if (candidate !== id && registered === element) this.#toasts.delete(candidate); this.#toasts.set(id, element); const style = element.style as CSSStyleDeclaration | undefined; if (style !== undefined && !this.#touchActions.has(element)) { this.#touchActions.set(element, style.touchAction); if (style.touchAction === '') style.touchAction = optionsTouchAction(this.#options.swipeDirection ?? 'right'); } this.#refresh(); }
  public setCloseButtonAttributes(element: HTMLButtonElement, id: ID): void {
    for (const [candidate, registered] of this.#closes) if (candidate !== id && registered.element === element) { registered.element.removeEventListener('click', registered.click); this.#closes.delete(candidate); }
    const previous = this.#closes.get(id); if (previous !== undefined) previous.element.removeEventListener('click', previous.click);
    const click = (): void => { this.dismiss(id); }; element.addEventListener('click', click); this.#closes.set(id, { element, click }); this.#refresh();
  }
  public disconnect(): void {
    if (this.#timer !== null) clearInterval(this.#timer);
    this.#options.root.removeEventListener('mouseenter', this.#mouseenter); this.#options.root.removeEventListener('mouseleave', this.#mouseleave); this.#options.root.removeEventListener('focusin', this.#focusin); this.#options.root.removeEventListener('focusout', this.#focusout);
    this.#options.root.ownerDocument?.removeEventListener?.('keydown', this.#keydown, true); this.#options.root.removeEventListener('pointerdown', this.#pointerdown); this.#options.root.removeEventListener('pointermove', this.#pointermove); this.#options.root.removeEventListener('pointerup', this.#pointerup); this.#options.root.removeEventListener('pointercancel', this.#pointercancel); this.#options.root.ownerDocument?.defaultView?.removeEventListener?.('blur', this.#windowBlur); this.#options.root.ownerDocument?.defaultView?.removeEventListener?.('focus', this.#windowFocus);
    for (const registration of this.#closes.values()) registration.element.removeEventListener('click', registration.click);
    for (const [element, touchAction] of this.#touchActions) element.style.touchAction = touchAction;
    this.#closes.clear(); this.#toasts.clear(); this.#touchActions.clear();
  }
  #refresh(): void {
    const state = this.getSnapshot().state;
    this.#options.root.dataset['paused'] = String(state.paused);
    for (const [id, element] of this.#toasts) {
      const item = state.items.find((candidate) => candidate.id === id);
      if (this.#options.manageVisibility !== false) element.hidden = item === undefined;
      element.dataset['state'] = item === undefined ? 'closed' : 'open';
      if (item === undefined) continue;
      element.setAttribute('role', item.kind === 'error' ? 'alert' : 'status'); element.dataset['kind'] = item.kind;
    }
    for (const [id, { element }] of this.#closes) { element.type = 'button'; element.setAttribute('aria-label', this.#options.closeLabel ?? 'Dismiss notification'); element.disabled = !state.items.some((item) => item.id === id); }
  }
  #toastAt(target: EventTarget | null): { readonly id: ID; readonly element: HTMLElement } | null { for (const [id, element] of this.#toasts) { try { if (element === target || (target !== null && element.contains(target as Node))) return { id, element }; } catch { continue; } } return null; }
  #syncPause(): void { const paused = this.#hovered || this.#focused || this.#windowBlurred; if (this.getSnapshot().state.paused === paused) return; if (!paused) this.#lastTick = Date.now(); this.handleEvent(paused ? 'pause' : 'resume'); }
}

function reconcileControlledToastState<ID extends StableID>(previous: ToastState<ID>, proposed: ToastState<ID>, event: ToastEvent<ID> | undefined): Result<ToastState<ID>> {
  if (typeof event !== 'object' || event.type !== 'tick') return { ok: true, value: Object.freeze({ items: previous.items, paused: proposed.paused }) };
  const proposedByID = new Map(proposed.items.map((item) => [item.id, item] as const));
  const items = previous.items.map((item) => proposedByID.get(item.id) ?? Object.freeze({ ...item, remainingMs: 0 }));
  return { ok: true, value: Object.freeze({ items: Object.freeze(items), paused: proposed.paused }) };
}

function trySynchronizeToastState<ID extends StableID>(previous: ToastState<ID>, inputs: readonly ToastInput<ID>[], policies: ToastPolicies): Result<ToastState<ID>> {
  const normalized = tryCreateToastState(inputs, previous.paused, policies);
  if (!normalized.ok) return normalized;
  const previousByID = new Map(previous.items.map((item) => [item.id, item] as const));
  const items = normalized.value.items.map((item) => {
    const current = previousByID.get(item.id);
    return current === undefined || current.durationMs !== item.durationMs ? item : Object.freeze({ ...item, remainingMs: current.remainingMs });
  });
  return { ok: true, value: Object.freeze({ items: Object.freeze(items), paused: normalized.value.paused }) };
}

function sameToastInputs<ID extends StableID>(previous: readonly ToastItem<ID>[], proposed: readonly ToastItem<ID>[]): boolean {
  return previous.length === proposed.length && previous.every((item, index) => {
    const candidate = proposed[index];
    return candidate !== undefined && item.id === candidate.id && item.title === candidate.title && item.description === candidate.description && item.kind === candidate.kind && item.durationMs === candidate.durationMs;
  });
}

function matchesHotkey(event: KeyboardEvent, hotkey: readonly string[] | false): boolean { if (hotkey === false || hotkey.length === 0) return false; const modifiers = new Set(hotkey.map((key) => key.toLowerCase())); const key = hotkey.find((candidate) => !['alt', 'control', 'ctrl', 'meta', 'shift'].includes(candidate.toLowerCase())); if (key === undefined || event.key.toLowerCase() !== key.toLowerCase()) return false; return event.altKey === modifiers.has('alt') && event.ctrlKey === (modifiers.has('control') || modifiers.has('ctrl')) && event.metaKey === modifiers.has('meta') && event.shiftKey === modifiers.has('shift'); }
function swipeDelta(direction: 'up' | 'right' | 'down' | 'left', x: number, y: number): { readonly x: number; readonly y: number } { if (direction === 'right') return { x: Math.max(0, x), y: 0 }; if (direction === 'left') return { x: Math.min(0, x), y: 0 }; if (direction === 'down') return { x: 0, y: Math.max(0, y) }; return { x: 0, y: Math.min(0, y) }; }
function optionsTouchAction(direction: 'up' | 'right' | 'down' | 'left'): string { return direction === 'left' || direction === 'right' ? 'pan-y' : 'pan-x'; }
function contains(root: HTMLElement, target: EventTarget | null): boolean { if (target === null) return false; try { return root === target || root.contains(target as Node); } catch { return false; } }
