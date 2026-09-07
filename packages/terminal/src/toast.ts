import type { Result, StableID } from '@sectile/core';
import { applyToastEvent, tryCreateToastState, type ToastCommand, type ToastEvent, type ToastInput, type ToastItem, type ToastPolicies, type ToastState } from '@sectile/core/toast';
import type { RevisionSnapshot } from '@sectile/core/revision';
import { unwrap } from '@sectile/core/result';
import { createFacadeConnection, type FacadeConnection } from '@sectile/core/adapter-runtime';
import { createSemanticController, type SemanticController } from '@sectile/core/adapter-runtime';
import type { TerminalKeyboardInput } from './keyboard.js';

export interface ToastOptions<ID extends StableID = StableID> extends ToastPolicies { readonly initialToasts?: readonly ToastInput<ID>[]; readonly onItemsChange?: (items: readonly ToastItem<ID>[]) => void; readonly onAnnounce?: (item: ToastItem<ID>) => void; readonly onDismiss?: (id: ID, reason: 'manual' | 'timeout' | 'overflow') => void; readonly onUpdate?: () => void }

export type ToastItemsChangeHandler<ID extends StableID = StableID> = NonNullable<ToastOptions<ID>['onItemsChange']>;
export type ToastAnnounceHandler<ID extends StableID = StableID> = NonNullable<ToastOptions<ID>['onAnnounce']>;
export type ToastDismissHandler<ID extends StableID = StableID> = NonNullable<ToastOptions<ID>['onDismiss']>;
export type ToastUpdateHandler<ID extends StableID = StableID> = NonNullable<ToastOptions<ID>['onUpdate']>;
export interface ToastConnection<ID extends StableID = StableID> { getSnapshot(): RevisionSnapshot<ToastState<ID>>; handleEvent(event: ToastEvent<ID>): boolean; handleKeyboardInput(input: TerminalKeyboardInput): boolean; push(toast: ToastInput<ID>): boolean; updateToast(id: ID, toast: Partial<Omit<ToastInput<ID>, 'id'>>): boolean; dismiss(id: ID): boolean; dismissAll(): boolean; tick(elapsedMs: number): boolean }
export function createToast<ID extends StableID>(options: ToastOptions<ID> = {}): FacadeConnection<ToastConnection<ID>> { return unwrap(tryCreateToast(options)); }
export function tryCreateToast<ID extends StableID>(options: ToastOptions<ID> = {}): Result<FacadeConnection<ToastConnection<ID>>> { return createFacadeConnection(options, (normalized) => tryCreateToastConnection(normalized)); }
type TerminalToastEffect<ID extends StableID> =
  | { readonly type: 'announce-toast'; readonly item: ToastItem<ID> }
  | Extract<ToastCommand<ID>, { readonly type: 'toast-dismissed' }>;

function tryCreateToastConnection<ID extends StableID>(options: ToastOptions<ID>): Result<ToastConnection<ID>> {
  let runtime: SemanticController<ToastState<ID>, ToastEvent<ID>, TerminalToastEffect<ID>>;
  const created = createSemanticController<ToastState<ID>, ToastEvent<ID>, TerminalToastEffect<ID>, TerminalToastEffect<ID>>({
    initial: tryCreateToastState(options.initialToasts ?? [], false, options),
    reducer: (state, event) => {
      const result = applyToastEvent(state, event, options);
      if (!result.ok) return result;
      // Capture announcement data before an earlier callback can replace the same ID.
      const commands = result.value.commands.map((command): TerminalToastEffect<ID> => {
        if (command.type !== 'announce-toast') return command;
        const item = result.value.state.items.find((candidate) => candidate.id === command.id);
        if (item === undefined) throw new Error('An announced toast must exist in the proposed state.');
        return { type: 'announce-toast', item };
      });
      return { ok: true, value: { state: result.value.state, commands } };
    },
    publishEffect: (effect) => {
      if (effect.type === 'announce-toast') options.onAnnounce?.(effect.item);
      else options.onDismiss?.(effect.id, effect.reason);
    },
    notify: (_previous, proposed) => {
      // A nested transition already notified its newer items; do not replay stale state.
      if (runtime.getSnapshot().state === proposed) options.onItemsChange?.(proposed.items);
    },
    toEffect: (effect) => effect,
  });
  if (!created.ok) return created;
  runtime = created.value;
  return { ok: true, value: new TerminalToast(options, runtime) };
}
class TerminalToast<ID extends StableID> implements ToastConnection<ID> {
  readonly #options: ToastOptions<ID>;
  readonly #runtime: SemanticController<ToastState<ID>, ToastEvent<ID>, TerminalToastEffect<ID>>;
  #publishedRevision: number;
  public constructor(options: ToastOptions<ID>, runtime: SemanticController<ToastState<ID>, ToastEvent<ID>, TerminalToastEffect<ID>>) {
    this.#options = options; this.#runtime = runtime;
    this.#publishedRevision = runtime.getSnapshot().revision;
  }
  public getSnapshot(): RevisionSnapshot<ToastState<ID>> { return this.#runtime.getSnapshot(); }
  public handleEvent(event: ToastEvent<ID>): boolean {
    const previousRevision = this.#runtime.getSnapshot().revision;
    let accepted: boolean;
    try {
      accepted = this.#runtime.handle(event).ok;
    } catch (error) {
      if (this.#runtime.getSnapshot().revision !== previousRevision) {
        try { this.#publishUpdate(); }
        catch { /* Preserve the first callback error after publication completes. */ }
      }
      throw error;
    }
    if (accepted) this.#publishUpdate();
    return accepted;
  }
  #publishUpdate(): void {
    const revision = this.#runtime.getSnapshot().revision;
    if (revision === this.#publishedRevision) return;
    this.#publishedRevision = revision;
    this.#options.onUpdate?.();
  }
  public handleKeyboardInput(input: TerminalKeyboardInput): boolean { if (input.key === 'escape') { const latest = this.getSnapshot().state.items.at(-1); return latest === undefined ? false : this.dismiss(latest.id); } if (input.key === 'pause') return this.handleEvent('pause'); if (input.key === 'resume') return this.handleEvent('resume'); return false; }
  public push(toast: ToastInput<ID>): boolean { return this.handleEvent({ type: 'push', toast }); }
  public updateToast(id: ID, toast: Partial<Omit<ToastInput<ID>, 'id'>>): boolean { return this.handleEvent({ type: 'update', id, toast }); }
  public dismiss(id: ID): boolean { return this.handleEvent({ type: 'dismiss', id }); }
  public dismissAll(): boolean { return this.handleEvent('dismiss-all'); }
  public tick(elapsedMs: number): boolean { return this.handleEvent({ type: 'tick', elapsedMs }); }
}
