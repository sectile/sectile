import { createFacadeConnection, type FacadeConnection } from './internal/facade.js';
import { unwrap } from '@sectile/core/result';
import type { Result } from '@sectile/core';
import type { RevisionSnapshot } from '@sectile/core/revision';
import { applyEditableEvent, createEditableState, type EditableCommand, type EditableEvent, type EditablePolicies, type EditableState } from '@sectile/core/editable';
import { createSemanticController, type SemanticController } from './internal/semantic-controller.js';
import { setInteractionAttributes } from './internal/interaction.js';

export interface EditableOptions {
  readonly root: HTMLElement; readonly preview: HTMLElement; readonly input: HTMLInputElement | HTMLTextAreaElement;
  readonly editTrigger?: HTMLElement; readonly submitTrigger?: HTMLElement; readonly cancelTrigger?: HTMLElement;
  readonly value?: string; readonly defaultValue?: string; readonly disabled?: boolean; readonly readOnly?: boolean;
  readonly submitOnBlur?: boolean; readonly policies?: EditablePolicies; readonly label?: string; readonly name?: string;
  readonly onValueChange?: (value: string) => void; readonly onEditingChange?: (editing: boolean) => void; readonly onUpdate?: () => void;
}
export interface EditableConnection { getSnapshot(): RevisionSnapshot<EditableState>; syncControlledValue(value: string): Result<RevisionSnapshot<EditableState>>; handleEvent(event: EditableEvent): boolean; refresh(): void; disconnect(): void }

export function createEditable(options: EditableOptions): FacadeConnection<EditableConnection> { return unwrap(tryCreateEditable(options)); }
export function tryCreateEditable(options: EditableOptions): Result<FacadeConnection<EditableConnection>> { return createFacadeConnection(options, (resolved) => tryCreateEditableConnection(resolved)); }

function tryCreateEditableConnection(options: EditableOptions): Result<EditableConnection> {
  const controlled = options.value !== undefined; const initial = options.value ?? options.defaultValue ?? '';
  const runtime = createSemanticController<EditableState, EditableEvent, EditableCommand, EditableCommand>({
    initial: createEditableState(initial), reducer: (state, event) => applyEditableEvent(state, event, options.policies),
    reconcile: (previous, proposed) => createEditableState(controlled ? previous.value : proposed.value, proposed.editing ? proposed.draft : controlled ? previous.value : proposed.value, proposed.editing),
    notify: (previous, proposed) => { if (previous.value !== proposed.value) options.onValueChange?.(proposed.value); if (previous.editing !== proposed.editing) options.onEditingChange?.(proposed.editing); },
    toEffect: (command) => command, interaction: options,
  });
  return runtime.ok ? { ok: true, value: new DOMEditable(options, runtime.value, controlled) } : runtime;
}

class DOMEditable implements EditableConnection {
  readonly #options: EditableOptions; readonly #runtime: SemanticController<EditableState, EditableEvent, EditableCommand>; readonly #controlled: boolean;
  readonly #start = (): void => { this.handleEvent('start-edit'); }; readonly #input = (): void => { this.handleEvent({ type: 'input', text: this.#options.input.value }); };
  readonly #submit = (): void => { this.handleEvent('commit'); }; readonly #cancel = (): void => { this.handleEvent('cancel'); };
  readonly #keydown = (nativeEvent: Event): void => { const event = nativeEvent as KeyboardEvent; if (event.key === 'Escape') { event.preventDefault(); this.handleEvent('cancel'); } else if (event.key === 'Enter' && this.#options.input.tagName !== 'TEXTAREA') { event.preventDefault(); this.handleEvent('commit'); } };
  readonly #blur = (): void => { if (this.#options.submitOnBlur === true) this.handleEvent('commit'); };
  public constructor(options: EditableOptions, runtime: SemanticController<EditableState, EditableEvent, EditableCommand>, controlled: boolean) {
    this.#options = options; this.#runtime = runtime; this.#controlled = controlled;
    options.preview.addEventListener('click', this.#start); options.editTrigger?.addEventListener('click', this.#start); options.input.addEventListener('input', this.#input); options.input.addEventListener('keydown', this.#keydown); options.input.addEventListener('blur', this.#blur); options.submitTrigger?.addEventListener('click', this.#submit); options.cancelTrigger?.addEventListener('click', this.#cancel);
    setInteractionAttributes(options.preview, options); setInteractionAttributes(options.input, options, { native: true }); if (options.editTrigger !== undefined) setInteractionAttributes(options.editTrigger, options, { native: true }); if (options.submitTrigger !== undefined) setInteractionAttributes(options.submitTrigger, options, { native: true }); if (options.cancelTrigger !== undefined) setInteractionAttributes(options.cancelTrigger, options, { native: true }); this.refresh();
  }
  public getSnapshot(): RevisionSnapshot<EditableState> { return this.#runtime.getSnapshot(); }
  public syncControlledValue(value: string): Result<RevisionSnapshot<EditableState>> { if (!this.#controlled) return { ok: false, error: { class: 'construction', code: 'uncontrolled-controller-sync', message: 'An uncontrolled editable cannot be synchronized externally.' } }; const state = this.getSnapshot().state; const result = this.#runtime.replace(createEditableState(value, state.editing ? state.draft : value, state.editing)); if (result.ok) { this.refresh(); this.#options.onUpdate?.(); } return result; }
  public handleEvent(event: EditableEvent): boolean { const result = this.#runtime.handle(event); this.#options.input.setAttribute('aria-invalid', String(!result.ok && event === 'commit')); this.refresh(); if (result.ok) { for (const command of result.commands) { if (command.type === 'focus-input') this.#options.input.focus(); if (command.type === 'focus-preview') this.#options.preview.focus(); } this.#options.onUpdate?.(); } return result.ok; }
  public refresh(): void { const state = this.getSnapshot().state; this.#options.root.dataset['scope'] = 'editable'; this.#options.root.dataset['state'] = state.editing ? 'editing' : 'idle'; this.#options.preview.hidden = state.editing; this.#options.preview.tabIndex = this.#options.disabled === true ? -1 : 0; this.#options.input.hidden = !state.editing; this.#options.input.value = state.draft; this.#options.input.disabled = this.#options.disabled ?? false; this.#options.input.readOnly = this.#options.readOnly ?? false; if (this.#options.label !== undefined) this.#options.input.setAttribute('aria-label', this.#options.label); if (this.#options.name !== undefined) this.#options.input.name = this.#options.name; if (this.#options.editTrigger !== undefined) this.#options.editTrigger.hidden = state.editing; if (this.#options.submitTrigger !== undefined) this.#options.submitTrigger.hidden = !state.editing; if (this.#options.cancelTrigger !== undefined) this.#options.cancelTrigger.hidden = !state.editing; }
  public disconnect(): void { this.#options.preview.removeEventListener('click', this.#start); this.#options.editTrigger?.removeEventListener('click', this.#start); this.#options.input.removeEventListener('input', this.#input); this.#options.input.removeEventListener('keydown', this.#keydown); this.#options.input.removeEventListener('blur', this.#blur); this.#options.submitTrigger?.removeEventListener('click', this.#submit); this.#options.cancelTrigger?.removeEventListener('click', this.#cancel); }
}
