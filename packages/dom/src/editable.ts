import { createFacadeConnection, type FacadeConnection } from '@sectile/core/adapter-runtime';
import { unwrap } from '@sectile/core/result';
import type { Result } from '@sectile/core';
import type { RevisionSnapshot } from '@sectile/core/revision';
import { applyEditableEvent, tryCreateEditableState, type EditableCommand, type EditableEvent, type EditablePolicies, type EditableState } from '@sectile/core/editable';
import { createSemanticController, type SemanticController } from '@sectile/core/adapter-runtime';
import { setInteractionAttributes } from './interaction/attributes.js';

export interface EditableOptions {
  readonly root: HTMLElement; readonly preview: HTMLElement; readonly input: HTMLInputElement | HTMLTextAreaElement;
  readonly editTrigger?: HTMLElement; readonly submitTrigger?: HTMLElement; readonly cancelTrigger?: HTMLElement;
  readonly value?: string; readonly defaultValue?: string; readonly disabled?: boolean; readonly readOnly?: boolean;
  readonly submitOnBlur?: boolean; readonly policies?: EditablePolicies; readonly label?: string; readonly name?: string;
  readonly onValueChange?: (value: string) => void; readonly onEditingChange?: (editing: boolean) => void; readonly onUpdate?: () => void;
}

export type EditableValueChangeHandler = NonNullable<EditableOptions['onValueChange']>;
export type EditableEditingChangeHandler = NonNullable<EditableOptions['onEditingChange']>;
export type EditableUpdateHandler = NonNullable<EditableOptions['onUpdate']>;
/** Replacement binding/policy options; control mode, value and callbacks stay with the connection. */
export type EditableBindingOptions = Omit<EditableOptions, 'value' | 'defaultValue' | 'onValueChange' | 'onEditingChange' | 'onUpdate'>;
type MutableEditableBinding = { -readonly [K in keyof EditableBindingOptions]: EditableBindingOptions[K] };
const optionalBindingKeys = ['editTrigger', 'submitTrigger', 'cancelTrigger', 'disabled', 'readOnly', 'submitOnBlur', 'policies', 'label', 'name'] as const;
function copyOptionalBinding<K extends typeof optionalBindingKeys[number]>(source: EditableBindingOptions, target: MutableEditableBinding, key: K): void {
  const value = source[key];
  if (value !== undefined) target[key] = value;
}
function copyEditableBinding(source: EditableBindingOptions): EditableBindingOptions {
  const target: MutableEditableBinding = { root: source.root, preview: source.preview, input: source.input };
  for (const key of optionalBindingKeys) copyOptionalBinding(source, target, key);
  return target;
}
export interface EditableConnection { getSnapshot(): RevisionSnapshot<EditableState>; syncControlledValue(value: string): Result<RevisionSnapshot<EditableState>>;
  syncOptions(options: EditableBindingOptions): Result<RevisionSnapshot<EditableState>>;
  handleEvent(event: EditableEvent): boolean; refresh(): void; disconnect(): void }

export function createEditable(options: EditableOptions): FacadeConnection<EditableConnection> { return unwrap(tryCreateEditable(options)); }
export function tryCreateEditable(options: EditableOptions): Result<FacadeConnection<EditableConnection>> {
  // Publication must not retain the first native binding after a replacement.
  return createFacadeConnection<Pick<EditableOptions, 'onUpdate'>, EditableConnection>(
    options.onUpdate === undefined ? {} : { onUpdate: options.onUpdate },
    publication => tryCreateEditableConnection({ ...options, ...(publication.onUpdate === undefined ? {} : { onUpdate: publication.onUpdate }) }),
  );
}

function tryCreateEditableConnection(options: EditableOptions): Result<EditableConnection> {
  const controlled = options.value !== undefined; const initial = options.value ?? options.defaultValue ?? '';
  const binding: { current: EditableBindingOptions } = { current: copyEditableBinding(options) };
  const { onValueChange, onEditingChange } = options;
  const runtime = createSemanticController<EditableState, EditableEvent, EditableCommand, EditableCommand>({
    initial: tryCreateEditableState(initial), reducer: (state, event) => applyEditableEvent(state, event, binding.current.policies),
    reconcile: (previous, proposed) => tryCreateEditableState(controlled ? previous.value : proposed.value, proposed.editing ? proposed.draft : controlled ? previous.value : proposed.value, proposed.editing),
    notify: [
      (previous, proposed) => { if (previous.value !== proposed.value) onValueChange?.(proposed.value); },
      (previous, proposed) => { if (previous.editing !== proposed.editing) onEditingChange?.(proposed.editing); },
    ],
    toEffect: (command) => command, interaction: { ...(options.disabled === undefined ? {} : { disabled: options.disabled }),
      ...(options.readOnly === undefined ? {} : { readOnly: options.readOnly }) },
  });
  return runtime.ok ? { ok: true, value: new DOMEditable(binding, runtime.value, controlled, options.onUpdate) } : runtime;
}

class DOMEditable implements EditableConnection {
  readonly #binding: { current: EditableBindingOptions };
  readonly #onUpdate: EditableUpdateHandler | undefined;
  get #options(): EditableBindingOptions { return this.#binding.current; }
  #connected = true;
  readonly #runtime: SemanticController<EditableState, EditableEvent, EditableCommand>;
  readonly #controlled: boolean;
  #composing = false;
  readonly #start = (): void => { this.handleEvent('start-edit'); };
  readonly #input = (): void => { this.#handleNativeInput(); };
  readonly #compositionStart = (): void => { this.#composing = true; };
  readonly #compositionEnd = (): void => { this.#composing = false; };
  readonly #submit = (): void => { this.handleEvent('commit'); };
  readonly #cancel = (): void => { this.handleEvent('cancel'); };
  readonly #keydown = (nativeEvent: Event): void => {
    const event = nativeEvent as KeyboardEvent;
    if (this.#composing || event.isComposing) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      this.handleEvent('cancel');
    } else if (event.key === 'Enter' && this.#options.input.tagName !== 'TEXTAREA') {
      event.preventDefault();
      this.handleEvent('commit');
    }
  };
  readonly #blur = (): void => {
    if (!this.#composing && this.#options.submitOnBlur === true) this.handleEvent('commit');
  };

  public constructor(
    binding: { current: EditableBindingOptions },
    runtime: SemanticController<EditableState, EditableEvent, EditableCommand>,
    controlled: boolean,
    onUpdate: EditableUpdateHandler | undefined,
  ) {
    this.#binding = binding;
    this.#onUpdate = onUpdate;
    this.#runtime = runtime;
    this.#controlled = controlled;
    this.#connect();
  }

  #connect(): void {
    const options = this.#options;
    options.preview.addEventListener('click', this.#start);
    options.editTrigger?.addEventListener('click', this.#start);
    options.input.addEventListener('input', this.#input);
    options.input.addEventListener('compositionstart', this.#compositionStart);
    options.input.addEventListener('compositionend', this.#compositionEnd);
    options.input.addEventListener('keydown', this.#keydown);
    options.input.addEventListener('blur', this.#blur);
    options.submitTrigger?.addEventListener('click', this.#submit);
    options.cancelTrigger?.addEventListener('click', this.#cancel);
    setInteractionAttributes(options.preview, options);
    setInteractionAttributes(options.input, options, true);
    if (options.editTrigger !== undefined) setInteractionAttributes(options.editTrigger, options, true);
    if (options.submitTrigger !== undefined) setInteractionAttributes(options.submitTrigger, options, true);
    if (options.cancelTrigger !== undefined) setInteractionAttributes(options.cancelTrigger, options, true);
    this.refresh();
  }

  public getSnapshot(): RevisionSnapshot<EditableState> { return this.#runtime.getSnapshot(); }

  public syncOptions(input: EditableBindingOptions): Result<RevisionSnapshot<EditableState>> {
    if (!this.#connected) return { ok: false, error: { class: 'resource-rejection', code: 'connection-destroyed', message: 'A disconnected editable cannot be updated.' } };
    const options = copyEditableBinding(input);
    const interaction = this.#runtime.syncInteraction(options);
    if (!interaction.ok) return interaction;
    const previous = this.#options;
    const changed = previous.root !== options.root || previous.preview !== options.preview || previous.input !== options.input
      || previous.editTrigger !== options.editTrigger || previous.submitTrigger !== options.submitTrigger || previous.cancelTrigger !== options.cancelTrigger;
    if (changed) this.#disconnectListeners();
    this.#binding.current = options;
    if (changed) { this.#composing = false; this.#connect(); }
    else {
      setInteractionAttributes(options.preview, options);
      for (const trigger of [options.editTrigger, options.submitTrigger, options.cancelTrigger]) if (trigger) setInteractionAttributes(trigger, options, true);
      this.#refresh(false);
    }
    this.#onUpdate?.();
    return { ok: true, value: this.getSnapshot() };
  }

  public syncControlledValue(value: string): Result<RevisionSnapshot<EditableState>> {
    if (!this.#controlled) return { ok: false, error: { class: 'construction', code: 'uncontrolled-controller-sync', message: 'An uncontrolled editable cannot be synchronized externally.' } };
    const state = this.getSnapshot().state;
    const result = this.#runtime.replace(tryCreateEditableState(
      value,
      state.editing ? state.draft : value,
      state.editing,
    ));
    if (result.ok) {
      this.refresh();
      this.#onUpdate?.();
    }
    return result;
  }

  public handleEvent(event: EditableEvent): boolean {
    const result = this.#runtime.handle(event);
    this.#options.input.setAttribute('aria-invalid', String(!result.ok && event === 'commit'));
    this.refresh();
    if (result.ok) {
      for (const command of result.commands) {
        if (command.type === 'focus-input') this.#options.input.focus();
        if (command.type === 'focus-preview') this.#options.preview.focus();
      }
      this.#onUpdate?.();
    }
    return result.ok;
  }

  public refresh(): void {
    this.#refresh(true);
  }

  public disconnect(): void {
    if (!this.#connected) return;
    this.#disconnectListeners();
    this.#connected = false;
  }

  #disconnectListeners(): void {
    this.#options.preview.removeEventListener('click', this.#start);
    this.#options.editTrigger?.removeEventListener('click', this.#start);
    this.#options.input.removeEventListener('input', this.#input);
    this.#options.input.removeEventListener('compositionstart', this.#compositionStart);
    this.#options.input.removeEventListener('compositionend', this.#compositionEnd);
    this.#options.input.removeEventListener('keydown', this.#keydown);
    this.#options.input.removeEventListener('blur', this.#blur);
    this.#options.submitTrigger?.removeEventListener('click', this.#submit);
    this.#options.cancelTrigger?.removeEventListener('click', this.#cancel);
  }

  #handleNativeInput(): boolean {
    const result = this.#runtime.handle({ type: 'input', text: this.#options.input.value });
    if (!result.ok) {
      this.#refresh(true);
      return false;
    }
    this.#refresh(false);
    this.#onUpdate?.();
    return true;
  }

  #refresh(writeText: boolean): void {
    const state = this.getSnapshot().state;
    this.#options.root.dataset['scope'] = 'editable';
    this.#options.root.dataset['state'] = state.editing ? 'editing' : 'idle';
    this.#options.preview.hidden = state.editing;
    this.#options.preview.tabIndex = this.#options.disabled === true ? -1 : 0;
    this.#options.input.hidden = !state.editing;
    if (writeText && !this.#composing && this.#options.input.value !== state.draft) {
      this.#options.input.value = state.draft;
    }
    this.#options.input.disabled = this.#options.disabled ?? false;
    this.#options.input.readOnly = this.#options.readOnly ?? false;
    if (this.#options.label !== undefined) this.#options.input.setAttribute('aria-label', this.#options.label);
    if (this.#options.name !== undefined) this.#options.input.name = this.#options.name;
    if (this.#options.editTrigger !== undefined) this.#options.editTrigger.hidden = state.editing;
    if (this.#options.submitTrigger !== undefined) this.#options.submitTrigger.hidden = !state.editing;
    if (this.#options.cancelTrigger !== undefined) this.#options.cancelTrigger.hidden = !state.editing;
  }
}

export type { EditablePolicies, EditableState } from '@sectile/core/editable';
