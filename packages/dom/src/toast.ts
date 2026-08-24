import type { Result, StableID } from '@sectile/core';
import { applyToastEvent, tryCreateToastState, type ToastCommand, type ToastEvent, type ToastInput, type ToastItem, type ToastPolicies, type ToastState } from '@sectile/core/toast';
import type { RevisionSnapshot } from '@sectile/core/revision';
import { unwrap } from '@sectile/core/result';
import { createFacadeConnection, type FacadeConnection } from './internal/facade.js';
import { createSemanticController, type SemanticController } from './internal/semantic-controller.js';
export type { ToastInput, ToastItem, ToastKind } from '@sectile/core/toast';

export interface ToastOptions<ID extends StableID = StableID> extends ToastPolicies {
  readonly root: HTMLElement;
  readonly initialToasts?: readonly ToastInput<ID>[];
  readonly label?: string;
  readonly autoDismiss?: boolean;
  readonly tickIntervalMs?: number;
  readonly onItemsChange?: (items: readonly ToastItem<ID>[]) => void;
  readonly onAnnounce?: (item: ToastItem<ID>) => void;
  readonly onDismiss?: (id: ID, reason: 'manual' | 'timeout' | 'overflow') => void;
  readonly onUpdate?: () => void;
}
export interface ToastConnection<ID extends StableID = StableID> {
  getSnapshot(): RevisionSnapshot<ToastState<ID>>;
  handleEvent(event: ToastEvent<ID>): boolean;
  push(toast: ToastInput<ID>): boolean;
  updateToast(id: ID, toast: Partial<Omit<ToastInput<ID>, 'id'>>): boolean;
  dismiss(id: ID): boolean;
  dismissAll(): boolean;
  setToastAttributes(element: HTMLElement, id: ID): void;
  setCloseButtonAttributes(element: HTMLButtonElement, id: ID): void;
  disconnect(): void;
}
export function createToast<ID extends StableID>(options: ToastOptions<ID>): FacadeConnection<ToastConnection<ID>> { return unwrap(tryCreateToast(options)); }
export function tryCreateToast<ID extends StableID>(options: ToastOptions<ID>): Result<FacadeConnection<ToastConnection<ID>>> { return createFacadeConnection(options, (normalized) => tryCreateToastConnection(normalized)); }

function tryCreateToastConnection<ID extends StableID>(options: ToastOptions<ID>): Result<ToastConnection<ID>> {
  let connection: DOMToast<ID> | undefined;
  const runtime = createSemanticController<ToastState<ID>, ToastEvent<ID>, ToastCommand<ID>, ToastCommand<ID>>({
    initial: tryCreateToastState(options.initialToasts ?? [], false, options),
    reducer: (state, event) => applyToastEvent(state, event, options),
    notify: (_previous, proposed) => options.onItemsChange?.(proposed.items),
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
  readonly #pause: () => void;
  readonly #resume: () => void;
  readonly #timer: ReturnType<typeof setInterval> | null;
  #lastTick = Date.now();
  public constructor(options: ToastOptions<ID>, runtime: SemanticController<ToastState<ID>, ToastEvent<ID>, ToastCommand<ID>>) {
    this.#options = options; this.#runtime = runtime;
    options.root.setAttribute('role', 'region');
    options.root.setAttribute('aria-label', options.label ?? 'Notifications');
    options.root.setAttribute('aria-live', 'polite');
    this.#pause = (): void => { this.handleEvent('pause'); };
    this.#resume = (): void => { this.#lastTick = Date.now(); this.handleEvent('resume'); };
    options.root.addEventListener('mouseenter', this.#pause);
    options.root.addEventListener('mouseleave', this.#resume);
    options.root.addEventListener('focusin', this.#pause);
    options.root.addEventListener('focusout', this.#resume);
    const interval = options.tickIntervalMs ?? 100;
    this.#timer = options.autoDismiss === false ? null : setInterval(() => {
      if (this.getSnapshot().state.paused) return;
      const now = Date.now(); const elapsedMs = now - this.#lastTick; this.#lastTick = now;
      if (this.getSnapshot().state.items.some((item) => item.remainingMs !== null)) this.handleEvent({ type: 'tick', elapsedMs });
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
  public setToastAttributes(element: HTMLElement, id: ID): void { this.#toasts.set(id, element); this.#refresh(); }
  public setCloseButtonAttributes(element: HTMLButtonElement, id: ID): void {
    const previous = this.#closes.get(id); if (previous !== undefined) previous.element.removeEventListener('click', previous.click);
    const click = (): void => { this.dismiss(id); }; element.addEventListener('click', click); this.#closes.set(id, { element, click }); this.#refresh();
  }
  public disconnect(): void {
    if (this.#timer !== null) clearInterval(this.#timer);
    this.#options.root.removeEventListener('mouseenter', this.#pause); this.#options.root.removeEventListener('mouseleave', this.#resume); this.#options.root.removeEventListener('focusin', this.#pause); this.#options.root.removeEventListener('focusout', this.#resume);
    for (const registration of this.#closes.values()) registration.element.removeEventListener('click', registration.click);
    this.#closes.clear(); this.#toasts.clear();
  }
  #refresh(): void {
    const state = this.getSnapshot().state;
    this.#options.root.dataset['paused'] = String(state.paused);
    for (const [id, element] of this.#toasts) {
      const item = state.items.find((candidate) => candidate.id === id);
      element.hidden = item === undefined;
      if (item === undefined) continue;
      element.setAttribute('role', item.kind === 'error' ? 'alert' : 'status'); element.dataset['state'] = 'open'; element.dataset['kind'] = item.kind;
    }
    for (const [id, { element }] of this.#closes) { element.type = 'button'; element.setAttribute('aria-label', 'Dismiss notification'); element.disabled = !state.items.some((item) => item.id === id); }
  }
}
