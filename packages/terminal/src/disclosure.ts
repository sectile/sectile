import { createFacadeConnection, type FacadeConnection } from '@sectile/core/adapter-runtime';
import { unwrap } from '@sectile/core/result';
import type { Result } from '@sectile/core';
import type { RevisionSnapshot } from '@sectile/core/revision';
import {
  applyDisclosureEvent, tryCreateDisclosureState,
  type DisclosureCommand, type DisclosureEvent, type DisclosureState,
} from '@sectile/core/disclosure';
import type { TerminalKeyboardInput } from './keyboard.js';
import { createSemanticController, type SemanticController } from '@sectile/core/adapter-runtime';

export interface DisclosureOptions {
  readonly open?: boolean;
  readonly defaultOpen?: boolean;
  readonly disabled?: boolean;
  readonly onOpenChange?: (open: boolean) => void;
  readonly onUpdate?: () => void;
}

export type DisclosureOpenChangeHandler = NonNullable<DisclosureOptions['onOpenChange']>;
export type DisclosureUpdateHandler = NonNullable<DisclosureOptions['onUpdate']>;
export interface DisclosureConnection {
  getSnapshot(): RevisionSnapshot<DisclosureState>;
  syncControlledValue(open: boolean): Result<RevisionSnapshot<DisclosureState>>;
  handleEvent(event: DisclosureEvent): boolean;
  handleKeyboardInput(input: TerminalKeyboardInput): boolean;
}
export function createDisclosure(options: DisclosureOptions = {}): FacadeConnection<DisclosureConnection> {
  return unwrap(tryCreateDisclosure(options));
}

export function tryCreateDisclosure(options: DisclosureOptions = {}): Result<FacadeConnection<DisclosureConnection>> {
  return createFacadeConnection(options, (options) => tryCreateDisclosureConnection(options));
}

function tryCreateDisclosureConnection(options: DisclosureOptions = {}): Result<DisclosureConnection> {
  const controlled = options.open !== undefined;
  const runtime = createSemanticController<DisclosureState, DisclosureEvent, DisclosureCommand, DisclosureCommand>({
    initial: tryCreateDisclosureState(options.open ?? options.defaultOpen ?? false),
    reducer: applyDisclosureEvent,
    reconcile: (previous, proposed) => tryCreateDisclosureState(controlled ? previous.open : proposed.open),
    notify: (previous, proposed) => { if (previous.open !== proposed.open) options.onOpenChange?.(proposed.open); },
    toEffect: (command) => command,
    interaction: options,
  });
  if (!runtime.ok) return runtime;
  return { ok: true, value: new TerminalDisclosureConnection(options, runtime.value, controlled) };
}
export function toDisclosureEvent(input: TerminalKeyboardInput): DisclosureEvent | null {
  return input.key === 'enter' || input.key === 'space' ? 'toggle' : null;
}
class TerminalDisclosureConnection implements DisclosureConnection {
  readonly #options: DisclosureOptions;
  readonly #runtime: SemanticController<DisclosureState, DisclosureEvent, DisclosureCommand>;
  readonly #controlled: boolean;
  public constructor(options: DisclosureOptions, runtime: SemanticController<DisclosureState, DisclosureEvent, DisclosureCommand>, controlled: boolean) {
    this.#options = options; this.#runtime = runtime; this.#controlled = controlled;
  }
  public getSnapshot(): RevisionSnapshot<DisclosureState> { return this.#runtime.getSnapshot(); }
  public syncControlledValue(open: boolean): Result<RevisionSnapshot<DisclosureState>> {
    if (!this.#controlled) return { ok: false, error: { class: 'construction', code: 'uncontrolled-controller-sync', message: 'An uncontrolled disclosure cannot be synchronized externally.' } };
    const result = this.#runtime.replace(tryCreateDisclosureState(open));
    if (result.ok) this.#options.onUpdate?.();
    return result;
  }
  public handleEvent(event: DisclosureEvent): boolean { const result = this.#runtime.handle(event); if (result.ok) this.#options.onUpdate?.(); return result.ok; }
  public handleKeyboardInput(input: TerminalKeyboardInput): boolean {
    const event = toDisclosureEvent(input); if (event === null) return false; return this.handleEvent(event);
  }
}
