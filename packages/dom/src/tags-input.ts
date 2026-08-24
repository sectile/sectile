import { createFacadeConnection, type FacadeConnection } from './internal/facade.js';
import { unwrap } from '@sectile/core/result';
import type { Result } from '@sectile/core';
import type { RevisionSnapshot } from '@sectile/core/revision';
import { applyTagsInputEvent, tryCreateTagsInputState, type TagsInputCommand, type TagsInputEvent, type TagsInputPolicies, type TagsInputState } from '@sectile/core/tags-input';
export type { TagsInputPolicies } from '@sectile/core/tags-input';
import { setInteractionAttributes } from './internal/interaction.js';
import { createSemanticController, type SemanticController } from './internal/semantic-controller.js';

export interface TagsInputOptions { readonly root: HTMLElement; readonly input: HTMLInputElement; readonly policies?: TagsInputPolicies; readonly disabled?: boolean; readonly readOnly?: boolean; readonly value?: readonly string[]; readonly defaultValue?: readonly string[]; readonly inputValue?: string; readonly defaultInputValue?: string; readonly label?: string; readonly onValueChange?: (value: readonly string[]) => void; readonly onInputValueChange?: (value: string) => void; readonly onUpdate?: () => void }
export interface TagsInputConnection { getSnapshot(): RevisionSnapshot<TagsInputState>; syncControlledValues(values: { readonly value?: readonly string[]; readonly inputValue?: string }): Result<RevisionSnapshot<TagsInputState>>; setTagAttributes(element: HTMLElement, index: number): void; handleEvent(event: TagsInputEvent): boolean; disconnect(): void }
export function createTagsInput(options: TagsInputOptions): FacadeConnection<TagsInputConnection> {
  return unwrap(tryCreateTagsInput(options));
}

export function tryCreateTagsInput(options: TagsInputOptions): Result<FacadeConnection<TagsInputConnection>> {
  return createFacadeConnection(options, (options) => tryCreateTagsInputConnection(options));
}

function tryCreateTagsInputConnection(options: TagsInputOptions): Result<TagsInputConnection> {
  const controlled = { value: options.value !== undefined, input: options.inputValue !== undefined };
  const runtime = createSemanticController<TagsInputState, TagsInputEvent, TagsInputCommand, TagsInputCommand>({ interaction: options, interactionIntent: (event) => event === 'next' || event === 'previous' || event === 'focus-input' || (typeof event === 'object' && event.type === 'focus-tag') ? 'navigate' : 'mutate', initial: tryCreateTagsInputState(options.value ?? options.defaultValue ?? [], options.inputValue ?? options.defaultInputValue ?? ''), reducer: (state, event) => applyTagsInputEvent(state, event, options.policies), reconcile: (previous, proposed) => tryCreateTagsInputState(controlled.value ? previous.tags : proposed.tags, controlled.input ? previous.draft : proposed.draft, proposed.current), notify: (previous, proposed) => { if (previous.tags.join('\u0000') !== proposed.tags.join('\u0000')) options.onValueChange?.(proposed.tags); if (previous.draft !== proposed.draft) options.onInputValueChange?.(proposed.draft); }, toEffect: (command) => command });
  return runtime.ok ? { ok: true, value: new DOMTagsInputConnection(options, runtime.value, controlled) } : runtime;
}
class DOMTagsInputConnection implements TagsInputConnection {
  readonly #options: TagsInputOptions; readonly #runtime: SemanticController<TagsInputState, TagsInputEvent, TagsInputCommand>; readonly #controlled: { value: boolean; input: boolean };
  #composing = false;
  #addAfterComposition = false;
  #ignoreNextCompositionInput = false;
  readonly #inputHandler = (event: Event): void => {
    const inputEvent = event as InputEvent;
    if (this.#composing || inputEvent.isComposing) return;
    const ignoreCompositionTail = this.#ignoreNextCompositionInput
      && (inputEvent.inputType === 'insertCompositionText' || inputEvent.inputType === undefined);
    this.#ignoreNextCompositionInput = false;
    if (ignoreCompositionTail) this.#render();
    else this.handleEvent({ type: 'input', value: this.#options.input.value });
  };
  readonly #compositionStart = (): void => {
    this.#composing = true;
    this.#addAfterComposition = false;
    this.#ignoreNextCompositionInput = false;
  };
  readonly #compositionEnd = (): void => {
    if (!this.#composing) return;
    const value = this.#options.input.value;
    const add = this.#addAfterComposition;
    this.#composing = false;
    this.#addAfterComposition = false;
    this.#ignoreNextCompositionInput = true;
    this.handleEvent({ type: 'input', value });
    if (add) queueMicrotask(() => this.handleEvent({ type: 'add', value }));
  };
  readonly #keydown = (event: KeyboardEvent): void => { const fromInput = event.target === this.#options.input; if (this.#composing || event.isComposing) { if (fromInput && event.key === 'Enter') this.#addAfterComposition = true; return; } const state = this.#runtime.getSnapshot().state; let semantic: TagsInputEvent | null = null; if (fromInput && (event.key === 'Enter' || event.key === ',')) semantic = { type: 'add' }; else if ((event.key === 'Backspace' || event.key === 'Delete') && state.current !== null) semantic = 'remove-current'; else if (fromInput && event.key === 'Backspace' && this.#options.input.value.length === 0) semantic = 'previous'; else if (event.key === 'ArrowLeft') semantic = 'previous'; else if (event.key === 'ArrowRight') semantic = 'next'; if (semantic !== null) { event.preventDefault(); this.handleEvent(semantic); } };
  readonly #click = (event: MouseEvent): void => { const target = event.target instanceof Element ? event.target.closest<HTMLElement>('[data-tags-input-index]') : null; if (target !== null && this.#options.root.contains(target)) this.handleEvent({ type: 'remove', index: Number(target.dataset['tagsInputIndex']) }); };
  constructor(options: TagsInputOptions, runtime: SemanticController<TagsInputState, TagsInputEvent, TagsInputCommand>, controlled: { value: boolean; input: boolean }) { this.#options = options; this.#runtime = runtime; this.#controlled = controlled; options.root.setAttribute('role', 'group'); if (options.label !== undefined) options.root.setAttribute('aria-label', options.label); setInteractionAttributes(options.root, options, { readOnly: true }); options.input.disabled = options.disabled === true; options.input.readOnly = options.readOnly === true; options.input.addEventListener('input', this.#inputHandler); options.input.addEventListener('compositionstart', this.#compositionStart); options.input.addEventListener('compositionend', this.#compositionEnd); options.root.addEventListener('keydown', this.#keydown); options.root.addEventListener('click', this.#click); this.#render(); }
  getSnapshot(): RevisionSnapshot<TagsInputState> { return this.#runtime.getSnapshot(); }
  syncControlledValues(values: { readonly value?: readonly string[]; readonly inputValue?: string }): Result<RevisionSnapshot<TagsInputState>> { if (this.#controlled.value !== (values.value !== undefined) || this.#controlled.input !== (values.inputValue !== undefined)) return { ok: false, error: { class: 'construction', code: 'controlled-shape-mismatch', message: 'Controlled tags input values must preserve their construction-time shape.' } }; const state = this.#runtime.getSnapshot().state; const result = this.#runtime.replace(tryCreateTagsInputState(this.#controlled.value ? values.value ?? [] : state.tags, this.#controlled.input ? values.inputValue ?? '' : state.draft, state.current)); if (result.ok) { this.#render(); this.#options.onUpdate?.(); } return result; }
  setTagAttributes(element: HTMLElement, index: number): void { const state = this.#runtime.getSnapshot().state; element.dataset['tagsInputIndex'] = String(index); element.setAttribute('role', 'button'); element.setAttribute('aria-label', `Remove ${state.tags[index] ?? 'tag'}`); element.tabIndex = state.current === index ? 0 : -1; }
  handleEvent(event: TagsInputEvent): boolean { const result = this.#runtime.handle(event); if (!result.ok) return false; this.#render(); for (const effect of result.commands) { if (effect.type === 'focus-input') queueMicrotask(() => this.#options.input.focus()); else if (effect.type === 'focus-tag') queueMicrotask(() => this.#options.root.querySelector<HTMLElement>(`[data-tags-input-index="${effect.index}"]`)?.focus()); } this.#options.onUpdate?.(); return true; }
  disconnect(): void { this.#options.input.removeEventListener('input', this.#inputHandler); this.#options.input.removeEventListener('compositionstart', this.#compositionStart); this.#options.input.removeEventListener('compositionend', this.#compositionEnd); this.#options.root.removeEventListener('keydown', this.#keydown); this.#options.root.removeEventListener('click', this.#click); }
  #render(): void { if (!this.#composing) this.#options.input.value = this.#runtime.getSnapshot().state.draft; }
}
