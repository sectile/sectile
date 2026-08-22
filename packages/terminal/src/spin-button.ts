import type { Result } from '@sectile/primitives';
import { createBoundedRange, type BoundedRangeInput, type QuantizedRange } from '@sectile/primitives/range';
import type { RevisionSnapshot } from '@sectile/primitives/revision';
import {
  applySpinButtonEvent,
  createSpinButtonState,
  type SpinButtonCommand,
  type SpinButtonEvent,
  type SpinButtonPolicies,
  type SpinButtonState,
} from '@sectile/primitives/spin-button';
import type { TerminalKeyboardInput } from './keyboard.js';
import { createSemanticController, type SemanticController } from './internal/semantic-controller.js';

export interface SpinButtonOptions extends BoundedRangeInput {
  readonly policies?: SpinButtonPolicies;
  readonly value?: string;
  readonly defaultValue?: string;
  readonly draft?: string | null;
  readonly defaultDraft?: string | null;
  readonly disabled?: boolean;
  readonly readOnly?: boolean;
  readonly onValueChange?: (value: string) => void;
  readonly onDraftChange?: (draft: string | null) => void;
  readonly onUpdate?: () => void;
}

export interface SpinButtonConnection {
  readonly range: QuantizedRange;
  getSnapshot(): RevisionSnapshot<SpinButtonState>;
  syncControlledValues(values: { readonly value?: string; readonly draft?: string | null }): Result<RevisionSnapshot<SpinButtonState>>;
  handleEvent(event: SpinButtonEvent): boolean;
  handleKeyboardInput(input: TerminalKeyboardInput): boolean;
  handleTextInput(text: string): boolean;
  getText(): string;
  getValue(): string;
}

export function createSpinButton(options: SpinButtonOptions): Result<SpinButtonConnection> {
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
    ? { ok: true, value: new TerminalSpinButton(options, range.value, runtime.value, valueControlled, draftControlled) }
    : runtime;
}

export function toSpinButtonEvent(input: TerminalKeyboardInput): SpinButtonEvent | null {
  if (input.key === 'up') return 'increment';
  if (input.key === 'down') return 'decrement';
  if (input.key === 'page-up') return 'page-up';
  if (input.key === 'page-down') return 'page-down';
  if (input.key === 'home') return 'home';
  if (input.key === 'end') return 'end';
  if (input.key === 'enter') return 'commit';
  if (input.key === 'escape') return 'cancel';
  return null;
}

class TerminalSpinButton implements SpinButtonConnection {
  readonly range: QuantizedRange;
  readonly #options: SpinButtonOptions;
  readonly #runtime: SemanticController<SpinButtonState, SpinButtonEvent, SpinButtonCommand>;
  readonly #valueControlled: boolean;
  readonly #draftControlled: boolean;
  public constructor(options: SpinButtonOptions, range: QuantizedRange, runtime: SemanticController<SpinButtonState, SpinButtonEvent, SpinButtonCommand>, valueControlled: boolean, draftControlled: boolean) { this.#options = options; this.range = range; this.#runtime = runtime; this.#valueControlled = valueControlled; this.#draftControlled = draftControlled; }
  public getSnapshot(): RevisionSnapshot<SpinButtonState> { return this.#runtime.getSnapshot(); }
  public syncControlledValues(values: { readonly value?: string; readonly draft?: string | null }): Result<RevisionSnapshot<SpinButtonState>> {
    if (this.#valueControlled !== (values.value !== undefined) || this.#draftControlled !== (values.draft !== undefined)) return { ok: false, error: { class: 'construction', code: 'controlled-shape-mismatch', message: 'Controlled spin button values must preserve their construction-time shape.' } };
    const state = this.getSnapshot().state;
    const result = this.#runtime.replace(createSpinButtonState(this.range, this.#valueControlled ? values.value as string : state.value, this.#draftControlled ? values.draft as string | null : state.draft));
    if (result.ok) this.#options.onUpdate?.();
    return result;
  }
  public handleEvent(event: SpinButtonEvent): boolean { const result = this.#runtime.handle(event); if (result.ok) this.#options.onUpdate?.(); return result.ok; }
  public handleKeyboardInput(input: TerminalKeyboardInput): boolean { const event = toSpinButtonEvent(input); return event === null ? false : this.handleEvent(event); }
  public handleTextInput(text: string): boolean { return this.handleEvent({ type: 'input', text }); }
  public getText(): string { const state = this.getSnapshot().state; return state.draft ?? state.value; }
  public getValue(): string { return this.getSnapshot().state.value; }
}
