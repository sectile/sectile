import type { Result, StableID } from '@sectile/core';
import { applyToastEvent, createToastState, type ToastCommand, type ToastEvent, type ToastInput, type ToastItem, type ToastPolicies, type ToastState } from '@sectile/core/toast';
import type { RevisionSnapshot } from '@sectile/core/revision';
import { unwrap } from '@sectile/core/result';
import { createFacadeConnection, type FacadeConnection } from './internal/facade.js';
import { createSemanticController, type SemanticController } from './internal/semantic-controller.js';
import type { TerminalKeyboardInput } from './keyboard.js';

export interface ToastOptions<ID extends StableID = StableID> extends ToastPolicies { readonly initialToasts?: readonly ToastInput<ID>[]; readonly onItemsChange?: (items: readonly ToastItem<ID>[]) => void; readonly onAnnounce?: (item: ToastItem<ID>) => void; readonly onDismiss?: (id: ID, reason: 'manual' | 'timeout' | 'overflow') => void; readonly onUpdate?: () => void }
export interface ToastConnection<ID extends StableID = StableID> { getSnapshot(): RevisionSnapshot<ToastState<ID>>; handleEvent(event: ToastEvent<ID>): boolean; handleKeyboardInput(input: TerminalKeyboardInput): boolean; push(toast: ToastInput<ID>): boolean; updateToast(id: ID, toast: Partial<Omit<ToastInput<ID>, 'id'>>): boolean; dismiss(id: ID): boolean; dismissAll(): boolean; tick(elapsedMs: number): boolean }
export function createToast<ID extends StableID>(options: ToastOptions<ID> = {}): FacadeConnection<ToastConnection<ID>> { return unwrap(tryCreateToast(options)); }
export function tryCreateToast<ID extends StableID>(options: ToastOptions<ID> = {}): Result<FacadeConnection<ToastConnection<ID>>> { return createFacadeConnection(options, (normalized) => tryCreateToastConnection(normalized)); }
function tryCreateToastConnection<ID extends StableID>(options: ToastOptions<ID>): Result<ToastConnection<ID>> {
  const runtime = createSemanticController<ToastState<ID>, ToastEvent<ID>, ToastCommand<ID>, ToastCommand<ID>>({ initial: createToastState(options.initialToasts ?? [], false, options), reducer: (state, event) => applyToastEvent(state, event, options), notify: (_previous, proposed) => options.onItemsChange?.(proposed.items), toEffect: (command) => command });
  return runtime.ok ? { ok: true, value: new TerminalToast(options, runtime.value) } : runtime;
}
class TerminalToast<ID extends StableID> implements ToastConnection<ID> {
  readonly #options: ToastOptions<ID>; readonly #runtime: SemanticController<ToastState<ID>, ToastEvent<ID>, ToastCommand<ID>>;
  public constructor(options: ToastOptions<ID>, runtime: SemanticController<ToastState<ID>, ToastEvent<ID>, ToastCommand<ID>>) { this.#options = options; this.#runtime = runtime; }
  public getSnapshot(): RevisionSnapshot<ToastState<ID>> { return this.#runtime.getSnapshot(); }
  public handleEvent(event: ToastEvent<ID>): boolean { const result = this.#runtime.handle(event); if (!result.ok) return false; for (const command of result.commands) { if (command.type === 'announce-toast') { const item = result.snapshot.state.items.find((candidate) => candidate.id === command.id); if (item !== undefined) this.#options.onAnnounce?.(item); } else this.#options.onDismiss?.(command.id, command.reason); } this.#options.onUpdate?.(); return true; }
  public handleKeyboardInput(input: TerminalKeyboardInput): boolean { if (input.key === 'escape') { const latest = this.getSnapshot().state.items.at(-1); return latest === undefined ? false : this.dismiss(latest.id); } if (input.key === 'pause') return this.handleEvent('pause'); if (input.key === 'resume') return this.handleEvent('resume'); return false; }
  public push(toast: ToastInput<ID>): boolean { return this.handleEvent({ type: 'push', toast }); }
  public updateToast(id: ID, toast: Partial<Omit<ToastInput<ID>, 'id'>>): boolean { return this.handleEvent({ type: 'update', id, toast }); }
  public dismiss(id: ID): boolean { return this.handleEvent({ type: 'dismiss', id }); }
  public dismissAll(): boolean { return this.handleEvent('dismiss-all'); }
  public tick(elapsedMs: number): boolean { return this.handleEvent({ type: 'tick', elapsedMs }); }
}
