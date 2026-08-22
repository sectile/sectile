import type { Result } from '@sectile/primitives';
import type { InteractionStateInput } from '@sectile/primitives/interaction';
import type { MachineUpdate, RevisionSnapshot } from '@sectile/primitives/revision';
import type { TerminalKeyboardInput } from '../keyboard.js';
import { createSemanticController, type SemanticController } from './semantic-controller.js';

export interface TerminalPopupConnection<State, Event> { getSnapshot(): RevisionSnapshot<State>; syncControlledValue(open: boolean): Result<RevisionSnapshot<State>>; handleEvent(event: Event): boolean; handleKeyboardInput(input: TerminalKeyboardInput): boolean }
export interface Options<State, Event, Command> { readonly controlled: boolean; readonly initial: Result<State>; readonly reducer: (state: State, event: Event) => Result<MachineUpdate<State, Command>>; readonly create: (open: boolean) => Result<State>; readonly read: (state: State) => boolean; readonly close: Event; readonly onOpenChange?: ((open: boolean) => void) | undefined; readonly command?: ((command: Command) => void) | undefined; readonly onUpdate?: (() => void) | undefined; readonly interaction?: InteractionStateInput }
export function createTerminalPopup<State, Event, Command>(options: Options<State, Event, Command>): Result<TerminalPopupConnection<State, Event>> {
  const runtime = createSemanticController<State, Event, Command, Command>({ initial: options.initial, reducer: options.reducer, reconcile: (previous, proposed) => options.create(options.controlled ? options.read(previous) : options.read(proposed)), notify: (previous, proposed) => { if (options.read(previous) !== options.read(proposed)) options.onOpenChange?.(options.read(proposed)); }, toEffect: (command) => command, interaction: options.interaction });
  if (!runtime.ok) return runtime;
  return { ok: true, value: new TerminalPopup(options, runtime.value) };
}
class TerminalPopup<State, Event, Command> implements TerminalPopupConnection<State, Event> {
  readonly #options: Options<State, Event, Command>; readonly #runtime: SemanticController<State, Event, Command>;
  public constructor(options: Options<State, Event, Command>, runtime: SemanticController<State, Event, Command>) { this.#options = options; this.#runtime = runtime; }
  public getSnapshot(): RevisionSnapshot<State> { return this.#runtime.getSnapshot(); }
  public syncControlledValue(open: boolean): Result<RevisionSnapshot<State>> { if (!this.#options.controlled) return { ok: false, error: { class: 'construction', code: 'uncontrolled-controller-sync', message: 'An uncontrolled popup cannot be synchronized externally.' } }; const result = this.#runtime.replace(this.#options.create(open)); if (result.ok) this.#options.onUpdate?.(); return result; }
  public handleEvent(event: Event): boolean { const result = this.#runtime.handle(event); if (result.ok) for (const command of result.commands) this.#options.command?.(command); if (result.ok) this.#options.onUpdate?.(); return result.ok; }
  public handleKeyboardInput(input: TerminalKeyboardInput): boolean { return input.key === 'escape' ? this.handleEvent(this.#options.close) : false; }
}
