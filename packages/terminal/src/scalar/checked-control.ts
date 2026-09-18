import type { Result } from '@sectile/core'; import type { InteractionStateInput } from '@sectile/core/interaction'; import type { MachineUpdate, RevisionSnapshot } from '@sectile/core/revision'; import type { TerminalKeyboardInput } from '../keyboard.js';
import { createControlledComponentController, type ControlledComponentController } from '@sectile/core/adapter-runtime';
export interface TerminalCheckedControl<State, Event, Value> { getSnapshot(): RevisionSnapshot<State>; syncControlledValue(value: Value): Result<RevisionSnapshot<State>>; handleEvent(event: Event): boolean; handleKeyboardInput(input: TerminalKeyboardInput): boolean }
export interface Options<State, Event, Command extends object, Value> { readonly controlled: boolean; readonly initial: Result<State>; readonly toggleEvent: Event; readonly reducer: (state: State, event: Event) => Result<MachineUpdate<State, Command>>; readonly create: (value: Value) => Result<State>; readonly read: (state: State) => Value; readonly onChange: ((value: Value) => void) | undefined; readonly onUpdate: (() => void) | undefined; readonly interaction?: InteractionStateInput }
export function createTerminalCheckedControl<State, Event, Command extends object, Value>(options: Options<State, Event, Command, Value>): Result<TerminalCheckedControl<State, Event, Value>> {
  const runtime = createControlledComponentController<State, Event, Command, Value>({ controlled: options.controlled, initial: options.initial, reducer: options.reducer, create: (value) => options.create(value), read: options.read, onChange: (value) => options.onChange?.(value), ...(options.interaction === undefined ? {} : { interaction: options.interaction }) });
  if (!runtime.ok) return runtime; return { ok: true, value: new Impl(options, runtime.value) };
}
class Impl<State, Event, Command extends object, Value> implements TerminalCheckedControl<State, Event, Value> {
  readonly #options: Options<State, Event, Command, Value>; readonly #runtime: ControlledComponentController<State, Event, Command, Value>;
  #publishedRevision: number;
  public constructor(options: Options<State, Event, Command, Value>, runtime: ControlledComponentController<State, Event, Command, Value>) {
    this.#options = options; this.#runtime = runtime;
    this.#publishedRevision = runtime.getSnapshot().revision;
  }
  public getSnapshot(): RevisionSnapshot<State> { return this.#runtime.getSnapshot(); }
  public syncControlledValue(value: Value): Result<RevisionSnapshot<State>> {
    const result = this.#runtime.syncControlledValue(value);
    if (result.ok) this.#publishUpdate();
    return result;
  }
  public handleEvent(event: Event): boolean {
    const previousRevision = this.#runtime.getSnapshot().revision;
    let accepted: boolean;
    try {
      accepted = this.#runtime.handle(event).ok;
    } catch (error) {
      if (this.#runtime.getSnapshot().revision !== previousRevision) {
        try { this.#publishUpdate(); }
        catch { /* Preserve the first callback error after completing publication. */ }
      }
      throw error;
    }
    if (accepted) this.#publishUpdate();
    return accepted;
  }
  public handleKeyboardInput(input: TerminalKeyboardInput): boolean { if (input.key !== 'enter' && input.key !== 'space') return false; return this.handleEvent(this.#options.toggleEvent); }
  #publishUpdate(): void {
    const revision = this.#runtime.getSnapshot().revision;
    // Nested dispatch or controlled synchronization may already have published it.
    if (revision === this.#publishedRevision) return;
    this.#publishedRevision = revision;
    this.#options.onUpdate?.();
  }
}
