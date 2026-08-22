import type { Result } from '@sectile/core';
import type { InteractionStateInput } from '@sectile/core/interaction';
import type { MachineUpdate, RevisionSnapshot } from '@sectile/core/revision';
import { createSemanticController, type SemanticController } from './semantic-controller.js';
import { setInteractionAttributes } from './interaction.js';

export interface DOMCheckedControl<State, Event, Value> {
  getSnapshot(): RevisionSnapshot<State>;
  syncControlledValue(value: Value): Result<RevisionSnapshot<State>>;
  handleEvent(event: Event): boolean;
  updateAttributes(): void;
  disconnect(): void;
}
export interface DOMCheckedControlOptions<State, Event, Command, Value> {
  readonly element: HTMLElement; readonly role?: string; readonly attribute: 'aria-checked' | 'aria-pressed';
  readonly controlled: boolean; readonly initial: Result<State>; readonly toggleEvent: Event;
  readonly reducer: (state: State, event: Event) => Result<MachineUpdate<State, Command>>;
  readonly create: (value: Value) => Result<State>; readonly read: (state: State) => Value;
  readonly format: (value: Value) => string; readonly onChange: ((value: Value) => void) | undefined; readonly onUpdate: (() => void) | undefined;
  readonly interaction?: InteractionStateInput;
  readonly supportsReadOnly?: boolean;
}
export function createDOMCheckedControl<State, Event, Command, Value>(options: DOMCheckedControlOptions<State, Event, Command, Value>): Result<DOMCheckedControl<State, Event, Value>> {
  const runtime = createSemanticController<State, Event, Command, Command>({
    initial: options.initial, reducer: options.reducer,
    reconcile: (previous, proposed) => options.controlled ? options.create(options.read(previous)) : options.create(options.read(proposed)),
    notify: (previous, proposed) => { if (options.read(previous) !== options.read(proposed)) options.onChange?.(options.read(proposed)); },
    toEffect: (command) => command,
    interaction: options.interaction,
  });
  if (!runtime.ok) return runtime;
  return { ok: true, value: new DOMCheckedControlImpl(options, runtime.value) };
}
class DOMCheckedControlImpl<State, Event, Command, Value> implements DOMCheckedControl<State, Event, Value> {
  readonly #options: DOMCheckedControlOptions<State, Event, Command, Value>;
  readonly #runtime: SemanticController<State, Event, Command>; readonly #click: () => void;
  public constructor(options: DOMCheckedControlOptions<State, Event, Command, Value>, runtime: SemanticController<State, Event, Command>) {
    this.#options = options; this.#runtime = runtime; this.#click = (): void => { this.handleEvent(options.toggleEvent); };
    if (options.role !== undefined) options.element.setAttribute('role', options.role);
    options.element.addEventListener('click', this.#click); this.updateAttributes();
  }
  public getSnapshot(): RevisionSnapshot<State> { return this.#runtime.getSnapshot(); }
  public syncControlledValue(value: Value): Result<RevisionSnapshot<State>> {
    if (!this.#options.controlled) return { ok: false, error: { class: 'construction', code: 'uncontrolled-controller-sync', message: 'An uncontrolled checked control cannot be synchronized externally.' } };
    const result = this.#runtime.replace(this.#options.create(value)); if (result.ok) { this.updateAttributes(); this.#options.onUpdate?.(); } return result;
  }
  public handleEvent(event: Event): boolean { const result = this.#runtime.handle(event); this.updateAttributes(); if (result.ok) this.#options.onUpdate?.(); return result.ok; }
  public updateAttributes(): void { this.#options.element.setAttribute(this.#options.attribute, this.#options.format(this.#options.read(this.#runtime.getSnapshot().state))); setInteractionAttributes(this.#options.element, this.#options.interaction ?? {}, { native: true, readOnly: this.#options.supportsReadOnly }); }
  public disconnect(): void { this.#options.element.removeEventListener('click', this.#click); }
}
