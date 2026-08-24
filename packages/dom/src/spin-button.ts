import { createFacadeConnection, type FacadeConnection } from './internal/facade.js';
import { unwrap } from '@sectile/core/result';
import type { Result } from '@sectile/core';
import { createBoundedRange, type BoundedRangeInput, type QuantizedRange } from '@sectile/core/range';
import type { RevisionSnapshot } from '@sectile/core/revision';
import {
  applySpinButtonEvent,
  createSpinButtonState,
  type SpinButtonCommand,
  type SpinButtonEvent,
  type SpinButtonPolicies,
  type SpinButtonState,
} from '@sectile/core/spin-button';
import { createSemanticController, type SemanticController } from './internal/semantic-controller.js';

export interface SpinButtonOptions extends BoundedRangeInput {
  readonly input: HTMLInputElement;
  readonly policies?: SpinButtonPolicies;
  readonly value?: string;
  readonly defaultValue?: string;
  readonly draft?: string | null;
  readonly defaultDraft?: string | null;
  readonly disabled?: boolean;
  readonly readOnly?: boolean;
  readonly label?: string;
  readonly onValueChange?: (value: string) => void;
  readonly onDraftChange?: (draft: string | null) => void;
  readonly onUpdate?: () => void;
}

export interface SpinButtonConnection {
  readonly range: QuantizedRange;
  getSnapshot(): RevisionSnapshot<SpinButtonState>;
  getText(): string;
  getValue(): string;
  syncControlledValues(values: { readonly value?: string; readonly draft?: string | null }): Result<RevisionSnapshot<SpinButtonState>>;
  handleEvent(event: SpinButtonEvent): boolean;
  refresh(): void;
  disconnect(): void;
}

export function createSpinButton(options: SpinButtonOptions): FacadeConnection<SpinButtonConnection> {
  return unwrap(tryCreateSpinButton(options));
}

export function tryCreateSpinButton(options: SpinButtonOptions): Result<FacadeConnection<SpinButtonConnection>> {
  return createFacadeConnection(options, (options) => tryCreateSpinButtonConnection(options));
}

function tryCreateSpinButtonConnection(options: SpinButtonOptions): Result<SpinButtonConnection> {
  const range = createBoundedRange(options);
  if (!range.ok) return range;
  const valueControlled = options.value !== undefined;
  const draftControlled = options.draft !== undefined;
  const runtime = createSemanticController<SpinButtonState, SpinButtonEvent, SpinButtonCommand, SpinButtonCommand>({
    initial: createSpinButtonState(range.value, options.value ?? options.defaultValue ?? range.value.lower, options.draft !== undefined ? options.draft : options.defaultDraft ?? null),
    reducer: (state, event) => applySpinButtonEvent(range.value, state, event, options.policies),
    reconcile: (previous, proposed) => createSpinButtonState(range.value, valueControlled ? previous.value : proposed.value, draftControlled ? previous.draft : proposed.draft),
    notify: (previous, proposed) => {
      if (previous.value !== proposed.value) options.onValueChange?.(proposed.value);
      if (previous.draft !== proposed.draft) options.onDraftChange?.(proposed.draft);
    },
    toEffect: (command) => command,
    interaction: options,
  });
  return runtime.ok
    ? { ok: true, value: new DOMSpinButton(options, range.value, runtime.value, valueControlled, draftControlled) }
    : runtime;
}

export function toSpinButtonEvent(input: { readonly key: string; readonly altKey?: boolean; readonly ctrlKey?: boolean; readonly metaKey?: boolean }): SpinButtonEvent | null {
  if (input.altKey || input.ctrlKey || input.metaKey) return null;
  if (input.key === 'ArrowUp') return 'increment';
  if (input.key === 'ArrowDown') return 'decrement';
  if (input.key === 'PageUp') return 'page-up';
  if (input.key === 'PageDown') return 'page-down';
  if (input.key === 'Home') return 'home';
  if (input.key === 'End') return 'end';
  if (input.key === 'Enter') return 'commit';
  if (input.key === 'Escape') return 'cancel';
  return null;
}

class DOMSpinButton implements SpinButtonConnection {
  readonly range: QuantizedRange;
  readonly #options: SpinButtonOptions;
  readonly #runtime: SemanticController<SpinButtonState, SpinButtonEvent, SpinButtonCommand>;
  readonly #valueControlled: boolean;
  readonly #draftControlled: boolean;
  readonly #input = (): void => { this.handleEvent({ type: 'input', text: this.#options.input.value }); };
  readonly #key = (event: KeyboardEvent): void => {
    const semantic = toSpinButtonEvent(event);
    if (semantic !== null) { event.preventDefault(); this.handleEvent(semantic); }
  };
  readonly #blur = (): void => {
    if (!this.handleEvent('commit')) this.handleEvent('cancel');
  };

  public constructor(options: SpinButtonOptions, range: QuantizedRange, runtime: SemanticController<SpinButtonState, SpinButtonEvent, SpinButtonCommand>, valueControlled: boolean, draftControlled: boolean) {
    this.#options = options;
    this.range = range;
    this.#runtime = runtime;
    this.#valueControlled = valueControlled;
    this.#draftControlled = draftControlled;
    options.input.addEventListener('input', this.#input);
    options.input.addEventListener('keydown', this.#key);
    options.input.addEventListener('blur', this.#blur);
    options.input.disabled = options.disabled ?? false;
    options.input.readOnly = options.readOnly ?? false;
    options.input.setAttribute('aria-disabled', String(options.disabled ?? false));
    options.input.setAttribute('aria-readonly', String(options.readOnly ?? false));
    this.refresh();
  }

  public getSnapshot(): RevisionSnapshot<SpinButtonState> { return this.#runtime.getSnapshot(); }
  public getText(): string { const state = this.getSnapshot().state; return state.draft ?? state.value; }
  public getValue(): string { return this.getSnapshot().state.value; }
  public syncControlledValues(values: { readonly value?: string; readonly draft?: string | null }): Result<RevisionSnapshot<SpinButtonState>> {
    if (this.#valueControlled !== (values.value !== undefined) || this.#draftControlled !== (values.draft !== undefined)) return { ok: false, error: { class: 'construction', code: 'controlled-shape-mismatch', message: 'Controlled spin button values must preserve their construction-time shape.' } };
    const state = this.getSnapshot().state;
    const result = this.#runtime.replace(createSpinButtonState(this.range, this.#valueControlled ? values.value as string : state.value, this.#draftControlled ? values.draft as string | null : state.draft));
    if (result.ok) { this.refresh(); this.#options.onUpdate?.(); }
    return result;
  }
  public handleEvent(event: SpinButtonEvent): boolean {
    const result = this.#runtime.handle(event);
    this.#options.input.setAttribute('aria-invalid', String(!result.ok && event === 'commit'));
    this.refresh();
    if (result.ok) this.#options.onUpdate?.();
    return result.ok;
  }
  public refresh(): void {
    const state = this.getSnapshot().state;
    this.#options.input.setAttribute('role', 'spinbutton');
    this.#options.input.setAttribute('aria-valuemin', this.range.lower);
    this.#options.input.setAttribute('aria-valuemax', this.range.upper);
    this.#options.input.setAttribute('aria-valuenow', state.value);
    this.#options.input.setAttribute('aria-valuetext', state.value);
    if (this.#options.label !== undefined) this.#options.input.setAttribute('aria-label', this.#options.label);
    const text = this.getText();
    if (this.#options.input.value !== text) this.#options.input.value = text;
  }
  public disconnect(): void {
    this.#options.input.removeEventListener('input', this.#input);
    this.#options.input.removeEventListener('keydown', this.#key);
    this.#options.input.removeEventListener('blur', this.#blur);
  }
}
