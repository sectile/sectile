import type { Result } from '@sectile/primitives';
import type { RevisionSnapshot } from '@sectile/primitives/revision';
import {
  applyDisclosureEvent, createDisclosureState,
  type DisclosureCommand, type DisclosureEvent, type DisclosureState,
} from '@sectile/primitives/disclosure';
import { createSemanticController, type SemanticController } from './internal/semantic-controller.js';

export interface DisclosureOptions {
  readonly trigger: HTMLElement;
  readonly panel?: HTMLElement;
  readonly open?: boolean;
  readonly defaultOpen?: boolean;
  readonly panelID?: string;
  readonly onOpenChange?: (open: boolean) => void;
  readonly onUpdate?: () => void;
}
export interface DisclosureConnection {
  getSnapshot(): RevisionSnapshot<DisclosureState>;
  syncControlledValue(open: boolean): Result<RevisionSnapshot<DisclosureState>>;
  handleEvent(event: DisclosureEvent): boolean;
  updateAttributes(): void;
  disconnect(): void;
}

export function createDisclosure(options: DisclosureOptions): Result<DisclosureConnection> {
  const controlled = options.open !== undefined;
  const runtime = createSemanticController<DisclosureState, DisclosureEvent, DisclosureCommand, DisclosureCommand>({
    initial: createDisclosureState(options.open ?? options.defaultOpen ?? false),
    reducer: applyDisclosureEvent,
    reconcile: (previous, proposed) => createDisclosureState(controlled ? previous.open : proposed.open),
    notify: (previous, proposed) => {
      if (previous.open !== proposed.open) options.onOpenChange?.(proposed.open);
    },
    toEffect: (command) => command,
  });
  if (!runtime.ok) return runtime;
  return { ok: true, value: new DOMDisclosureConnection(options, runtime.value, controlled) };
}

class DOMDisclosureConnection implements DisclosureConnection {
  readonly #options: DisclosureOptions;
  readonly #runtime: SemanticController<DisclosureState, DisclosureEvent, DisclosureCommand>;
  readonly #controlled: boolean;
  readonly #click: () => void;

  public constructor(
    options: DisclosureOptions,
    runtime: SemanticController<DisclosureState, DisclosureEvent, DisclosureCommand>,
    controlled: boolean,
  ) {
    this.#options = options;
    this.#runtime = runtime;
    this.#controlled = controlled;
    this.#click = (): void => { this.handleEvent('toggle'); };
    options.trigger.addEventListener('click', this.#click);
    this.updateAttributes();
  }
  public getSnapshot(): RevisionSnapshot<DisclosureState> { return this.#runtime.getSnapshot(); }
  public syncControlledValue(open: boolean): Result<RevisionSnapshot<DisclosureState>> {
    if (!this.#controlled) return uncontrolled();
    const result = this.#runtime.replace(createDisclosureState(open));
    if (result.ok) { this.updateAttributes(); this.#options.onUpdate?.(); }
    return result;
  }
  public handleEvent(event: DisclosureEvent): boolean {
    this.#runtime.handle(event);
    this.updateAttributes();
    this.#options.onUpdate?.();
    return true;
  }
  public updateAttributes(): void {
    const open = this.#runtime.getSnapshot().state.open;
    this.#options.trigger.setAttribute('aria-expanded', String(open));
    if (this.#options.panelID !== undefined) this.#options.trigger.setAttribute('aria-controls', this.#options.panelID);
    if (this.#options.panel !== undefined) this.#options.panel.hidden = !open;
  }
  public disconnect(): void { this.#options.trigger.removeEventListener('click', this.#click); }
}

function uncontrolled<State>(): Result<RevisionSnapshot<State>> {
  return { ok: false, error: { class: 'construction', code: 'uncontrolled-controller-sync', message: 'An uncontrolled disclosure cannot be synchronized externally.' } };
}
