import type { Result } from '@sectile/primitives'; import type { InteractionStateInput } from '@sectile/primitives/interaction'; import type { MachineUpdate, RevisionSnapshot } from '@sectile/primitives/revision'; import type { TerminalKeyboardInput } from '../keyboard.js';
import { createSemanticController, type SemanticController } from './semantic-controller.js';
export interface TerminalCheckedControl<State, Event, Value> { getSnapshot(): RevisionSnapshot<State>; syncControlledValue(value: Value): Result<RevisionSnapshot<State>>; handleEvent(event: Event): boolean; handleKeyboardInput(input: TerminalKeyboardInput): boolean }
export interface Options<State, Event, Command, Value> { readonly controlled: boolean; readonly initial: Result<State>; readonly toggleEvent: Event; readonly reducer: (state: State, event: Event) => Result<MachineUpdate<State, Command>>; readonly create: (value: Value) => Result<State>; readonly read: (state: State) => Value; readonly onChange: ((value: Value) => void) | undefined; readonly onUpdate: (() => void) | undefined; readonly interaction?: InteractionStateInput }
export function createTerminalCheckedControl<State, Event, Command, Value>(options: Options<State, Event, Command, Value>): Result<TerminalCheckedControl<State, Event, Value>> {
  const runtime = createSemanticController<State, Event, Command, Command>({ initial: options.initial, reducer: options.reducer, reconcile: (previous, proposed) => options.controlled ? options.create(options.read(previous)) : options.create(options.read(proposed)), notify: (previous, proposed) => { if (options.read(previous) !== options.read(proposed)) options.onChange?.(options.read(proposed)); }, toEffect: (command) => command, interaction: options.interaction });
  if (!runtime.ok) return runtime; return { ok: true, value: new Impl(options, runtime.value) };
}
class Impl<State, Event, Command, Value> implements TerminalCheckedControl<State, Event, Value> {
  readonly #options: Options<State, Event, Command, Value>; readonly #runtime: SemanticController<State, Event, Command>;
  public constructor(options: Options<State, Event, Command, Value>, runtime: SemanticController<State, Event, Command>) { this.#options = options; this.#runtime = runtime; }
  public getSnapshot(): RevisionSnapshot<State> { return this.#runtime.getSnapshot(); }
  public syncControlledValue(value: Value): Result<RevisionSnapshot<State>> { if (!this.#options.controlled) return { ok: false, error: { class: 'construction', code: 'uncontrolled-controller-sync', message: 'An uncontrolled checked control cannot be synchronized externally.' } }; const result = this.#runtime.replace(this.#options.create(value)); if (result.ok) this.#options.onUpdate?.(); return result; }
  public handleEvent(event: Event): boolean { const result = this.#runtime.handle(event); if (result.ok) this.#options.onUpdate?.(); return result.ok; }
  public handleKeyboardInput(input: TerminalKeyboardInput): boolean { if (input.key !== 'enter' && input.key !== 'space') return false; return this.handleEvent(this.#options.toggleEvent); }
}
