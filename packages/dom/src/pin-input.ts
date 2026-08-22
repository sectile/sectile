import type { Result } from '@sectile/core';
import type { RevisionSnapshot } from '@sectile/core/revision';
import { applyPinInputEvent, createPinInputState, type PinInputCommand, type PinInputEvent, type PinInputPolicies, type PinInputState } from '@sectile/core/pin-input';
import { setInteractionAttributes } from './internal/interaction.js';
import { createSemanticController, type SemanticController } from './internal/semantic-controller.js';

export interface PinInputOptions { readonly root: HTMLElement; readonly inputs: readonly HTMLInputElement[]; readonly policies?: PinInputPolicies; readonly disabled?: boolean; readonly readOnly?: boolean; readonly value?: string; readonly defaultValue?: string; readonly label?: string; readonly onValueChange?: (value: string) => void; readonly onComplete?: (value: string) => void; readonly onUpdate?: () => void }
export type PinInputEffect = PinInputCommand;
export interface PinInputConnection { getSnapshot(): RevisionSnapshot<PinInputState>; syncControlledValue(value: string): Result<RevisionSnapshot<PinInputState>>; handleEvent(event: PinInputEvent): boolean; disconnect(): void }
export function createPinInput(options: PinInputOptions): Result<PinInputConnection> {
  const controlled = options.value !== undefined;
  const runtime = createSemanticController<PinInputState, PinInputEvent, PinInputCommand, PinInputEffect>({
    interaction: options,
    interactionIntent: (event) => event === 'next' || event === 'previous' || (typeof event === 'object' && event.type === 'focus') ? 'navigate' : 'mutate',
    initial: createPinInputState(options.inputs.length, options.value ?? options.defaultValue ?? ''),
    reducer: (state, event) => applyPinInputEvent(options.inputs.length, state, event, options.policies),
    reconcile: (previous, proposed) => controlled ? createPinInputState(options.inputs.length, previous.values) : { ok: true, value: proposed },
    notify: (previous, proposed) => { const before = previous.values.join(''); const after = proposed.values.join(''); if (before !== after) options.onValueChange?.(after); },
    toEffect: (command) => command,
  });
  return runtime.ok ? { ok: true, value: new DOMPinInputConnection(options, runtime.value, controlled) } : runtime;
}
class DOMPinInputConnection implements PinInputConnection {
  readonly #listeners: Array<() => void> = [];
  readonly #options: PinInputOptions;
  readonly #runtime: SemanticController<PinInputState, PinInputEvent, PinInputEffect>;
  readonly #controlled: boolean;
  constructor(options: PinInputOptions, runtime: SemanticController<PinInputState, PinInputEvent, PinInputEffect>, controlled: boolean) {
    this.#options = options; this.#runtime = runtime; this.#controlled = controlled;
    options.root.setAttribute('role', 'group'); if (options.label !== undefined) options.root.setAttribute('aria-label', options.label);
    setInteractionAttributes(options.root, options, { readOnly: true });
    options.inputs.forEach((input, index) => {
      input.maxLength = 1; input.inputMode = 'numeric'; input.disabled = options.disabled === true; input.readOnly = options.readOnly === true;
      input.setAttribute('aria-label', `${options.label ?? 'PIN'} digit ${index + 1} of ${options.inputs.length}`);
      const focus = (): void => { this.handleEvent({ type: 'focus', index }); };
      const keydown = (event: KeyboardEvent): void => { const semantic = event.key === 'ArrowLeft' ? 'previous' : event.key === 'ArrowRight' ? 'next' : event.key === 'Backspace' ? 'backspace' : event.key === 'Delete' ? 'delete' : null; if (semantic !== null) { event.preventDefault(); this.handleEvent(semantic); } };
      const changed = (): void => { const character = Array.from(input.value).at(-1); if (character !== undefined) this.handleEvent({ type: 'input', value: character }); };
      input.addEventListener('focus', focus); input.addEventListener('keydown', keydown); input.addEventListener('input', changed);
      this.#listeners.push(() => { input.removeEventListener('focus', focus); input.removeEventListener('keydown', keydown); input.removeEventListener('input', changed); });
    });
    this.#render();
  }
  getSnapshot(): RevisionSnapshot<PinInputState> { return this.#runtime.getSnapshot(); }
  syncControlledValue(value: string): Result<RevisionSnapshot<PinInputState>> { if (!this.#controlled) return { ok: false, error: { class: 'construction', code: 'controlled-shape-mismatch', message: 'Only a controlled pin input accepts external values.' } }; const result = this.#runtime.replace(createPinInputState(this.#options.inputs.length, value)); if (result.ok) { this.#render(); this.#options.onUpdate?.(); } return result; }
  handleEvent(event: PinInputEvent): boolean { const result = this.#runtime.handle(event); if (!result.ok) return false; this.#render(); for (const effect of result.commands) { if (effect.type === 'focus-cell') queueMicrotask(() => this.#options.inputs[effect.index]?.focus()); else this.#options.onComplete?.(effect.value); } this.#options.onUpdate?.(); return true; }
  disconnect(): void { for (const remove of this.#listeners) remove(); }
  #render(): void { const state = this.#runtime.getSnapshot().state; this.#options.inputs.forEach((input, index) => { input.value = state.values[index] ?? ''; input.tabIndex = state.current === index ? 0 : -1; }); }
}
