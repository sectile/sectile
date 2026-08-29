import type { Result } from '@sectile/core';
import type { InteractionStateInput } from '@sectile/core/interaction';
import type { MachineUpdate, RevisionSnapshot } from '@sectile/core/revision';
import type { TerminalKeyboardInput } from '../keyboard.js';
import { createControlledComponentController, type ControlledComponentController } from '@sectile/core/adapter-runtime';

export interface TerminalPopupConnection<State, Event> { getSnapshot(): RevisionSnapshot<State>; syncControlledValue(open: boolean): Result<RevisionSnapshot<State>>; handleEvent(event: Event): boolean; handleKeyboardInput(input: TerminalKeyboardInput): boolean }
export interface Options<State, Event, Command extends object> { readonly controlled: boolean; readonly initial: Result<State>; readonly reducer: (state: State, event: Event) => Result<MachineUpdate<State, Command>>; readonly create: (open: boolean, state: State) => Result<State>; readonly read: (state: State) => boolean; readonly close: Event; readonly onOpenChange?: ((open: boolean) => void) | undefined; readonly command?: ((command: Command) => void) | undefined; readonly onUpdate?: (() => void) | undefined; readonly interaction?: InteractionStateInput }
export function createTerminalPopup<State, Event, Command extends object>(options: Options<State, Event, Command>): Result<TerminalPopupConnection<State, Event>> {
  const runtime = createControlledComponentController<State, Event, Command, boolean>({ controlled: options.controlled, initial: options.initial, reducer: options.reducer, create: options.create, read: options.read, onChange: (open) => options.onOpenChange?.(open), ...(options.interaction === undefined ? {} : { interaction: options.interaction }) });
  if (!runtime.ok) return runtime;
  return { ok: true, value: new TerminalPopup(options, runtime.value) };
}
class TerminalPopup<State, Event, Command extends object> implements TerminalPopupConnection<State, Event> {
  readonly #options: Options<State, Event, Command>; readonly #runtime: ControlledComponentController<State, Event, Command, boolean>;
  public constructor(options: Options<State, Event, Command>, runtime: ControlledComponentController<State, Event, Command, boolean>) { this.#options = options; this.#runtime = runtime; }
  public getSnapshot(): RevisionSnapshot<State> { return this.#runtime.getSnapshot(); }
  public syncControlledValue(open: boolean): Result<RevisionSnapshot<State>> { const result = this.#runtime.syncControlledValue(open); if (result.ok) this.#options.onUpdate?.(); return result; }
  public handleEvent(event: Event): boolean { const result = this.#runtime.handle(event); if (result.ok) for (const command of result.commands) this.#options.command?.(command); if (result.ok) this.#options.onUpdate?.(); return result.ok; }
  public handleKeyboardInput(input: TerminalKeyboardInput): boolean { return input.key === 'escape' ? this.handleEvent(this.#options.close) : false; }
}
