import { createFacadeConnection, synchronizeControllerState, type FacadeConnection } from '@sectile/core/adapter-runtime';
import { createRevisionSnapshot, type RevisionSnapshot } from '@sectile/core/revision';
import { requireInteraction, tryCreateInteractionState, type InteractionState, type InteractionStateInput } from '@sectile/core/interaction';
import { failResult, okResult, unwrap, type CoreErrorCode, type Result, type SectileError } from '@sectile/core/result';
import { tryCreateFilePolicy, type FilePolicy, type FilePolicyErrorCode, type FilePolicyOptions, type FileSelection } from '@sectile/form/files';
import { createDOMAttributeBinding, type DOMAttributeBinding } from '../../interaction/attributes.js';
import { tryCreateNativeFileListBinding, type NativeFileListBinding, type NativeFileListErrorCode } from './native-files.js';

export type FileInputChangeSource = 'input' | 'drop' | 'clear' | 'reset' | 'programmatic';
export type FileInputErrorCode = CoreErrorCode | FilePolicyErrorCode | NativeFileListErrorCode
  | 'dom.file-input-inactive' | 'dom.file-input-directory-rejected' | 'dom.file-input-drop-invalid';
export type FileInputSnapshot = RevisionSnapshot<FileSelection<File>>;
export interface FileInputOptions extends InteractionStateInput {
  readonly element: HTMLInputElement;
  readonly policy?: FilePolicyOptions;
  /** Presence selects controlled mode. File values are always arrays. */
  readonly value?: readonly File[];
  /** Initial uncontrolled files only; native form reset still clears them. */
  readonly defaultValue?: readonly File[];
  readonly dropTarget?: HTMLElement;
  readonly onValueChange?: (files: readonly File[], source: FileInputChangeSource) => void;
  readonly onReject?: (error: SectileError<FileInputErrorCode>) => void;
  readonly onUpdate?: () => void;
}
export interface FileInputConnection {
  getSnapshot(): FileInputSnapshot;
  getActive(): boolean;
  getFaulted(): boolean;
  getPolicy(): FilePolicy | undefined;
  syncPolicy(options?: FilePolicyOptions): Result<FileInputSnapshot, FileInputErrorCode>;
  syncControlledValue(files: readonly File[]): Result<FileInputSnapshot, FileInputErrorCode>;
  syncInteraction(input: InteractionStateInput): Result<InteractionState>;
  selectFiles(files: ArrayLike<File>): Result<FileInputSnapshot, FileInputErrorCode>;
  clear(): Result<FileInputSnapshot, FileInputErrorCode>;
  /** Flush a completed native reset and refresh the native form association. */
  refresh(): Result<FileInputSnapshot, FileInputErrorCode>;
  setDropTarget(element: HTMLElement | null): void;
  focus(): boolean;
  /** Native activation request; success does not assert that a dialog opened. */
  open(): boolean;
  suspend(): void;
  resume(): void;
}
const empty: FileSelection<File> = Object.freeze({ files: Object.freeze([]), totalSize: 0 });
function same(left: ArrayLike<File> | null, right: readonly File[]): boolean {
  if (!left || left.length !== right.length) return false;
  for (let i = 0; i < right.length; i++) if (left[i] !== right[i]) return false;
  return true;
}
function inactive(): Result<never, FileInputErrorCode> {
  return failResult('transition-rejection', 'dom.file-input-inactive', 'The file input connection is not active.');
}
// Copy fixed public option descriptors, not arbitrary keys or accessor values.
// Form remains the only policy validator/compiler; DOM adds native hints only.
const policyFields: Readonly<Record<keyof FilePolicyOptions, true>> = {
  accept: true, multiple: true, maxFiles: true, maxFileSize: true, maxTotalSize: true,
  maxAcceptCodeUnits: true, maxMetadataCodeUnits: true,
};
function policyWithHints(options: FilePolicyOptions | undefined, accept: string, multiple: boolean): Result<FilePolicy, FilePolicyErrorCode> {
  if (options !== undefined && (options === null || typeof options !== 'object')) return tryCreateFilePolicy(options);
  const input: FilePolicyOptions = {};
  try {
    if (Array.isArray(options)) return tryCreateFilePolicy(options);
    for (const key of Object.keys(policyFields)) {
      const descriptor = options === undefined ? undefined : Object.getOwnPropertyDescriptor(options, key);
      if (descriptor !== undefined && !(('value' in descriptor) && descriptor.value === undefined && (key === 'accept' || key === 'multiple'))) Object.defineProperty(input, key, descriptor);
      else if (key === 'accept' || key === 'multiple') Object.defineProperty(input, key, { value: key === 'accept' ? accept : multiple });
    }
  } catch { return tryCreateFilePolicy(options); }
  return tryCreateFilePolicy(input);
}
export function createFileInput(options: FileInputOptions): FacadeConnection<FileInputConnection> {
  return unwrap(tryCreateFileInput(options));
}
export function tryCreateFileInput(options: FileInputOptions): Result<FacadeConnection<FileInputConnection>, FileInputErrorCode> {
  return createFacadeConnection(options, construct);
}
function construct(options: FileInputOptions): Result<FileInputConnection, FileInputErrorCode> {
  const interaction = tryCreateInteractionState({ disabled: options.disabled ?? options.element.disabled, readOnly: options.readOnly ?? false });
  if (!interaction.ok) return interaction;
  const policy = policyWithHints(options.policy, options.element.accept, options.element.multiple);
  if (!policy.ok) return policy;
  const previous = policy.value.validate(options.element.files ?? []);
  if (!previous.ok) return previous;
  const initialValue = options.value === undefined ? options.defaultValue : options.value;
  const selection = initialValue === undefined ? previous : policy.value.validate(initialValue);
  if (!selection.ok) return selection;
  const binding = tryCreateNativeFileListBinding(options.element);
  if (!binding.ok) return binding;
  const initial = binding.value.write(selection.value.files, previous.value.files);
  if (!initial.ok) { binding.value.disconnect(); return initial; }
  const owner = new FileInputHost(options, interaction.value, policy.value, selection.value, binding.value);
  try { owner.resume(); return okResult(owner); }
  catch (error) { owner.disconnect(); throw error; }
}

/** Native effects and resource lifetime only; admission remains the Form policy. */
class FileInputHost implements FileInputConnection {
  #element: HTMLInputElement | undefined;
  #binding: NativeFileListBinding | undefined;
  #attributes: DOMAttributeBinding | undefined;
  #policy: FilePolicy | undefined;
  #nativeAccept: string;
  #nativeMultiple: boolean;
  #interaction: InteractionState;
  #snapshot: FileInputSnapshot;
  #controlled: boolean;
  #observing = false;
  #form: HTMLFormElement | null = null;
  #dropTarget: HTMLElement | null = null;
  #pendingReset: Event | undefined;
  #resetQueued = false;
  #onChange: FileInputOptions['onValueChange'];
  #onReject: FileInputOptions['onReject'];
  #onUpdate: FileInputOptions['onUpdate'];
  public constructor(options: FileInputOptions, interaction: InteractionState, policy: FilePolicy, selection: FileSelection<File>, binding: NativeFileListBinding) {
    this.#element = options.element; this.#binding = binding; this.#policy = policy; this.#interaction = interaction;
    this.#nativeAccept = options.element.accept; this.#nativeMultiple = options.element.multiple;
    this.#snapshot = createRevisionSnapshot(selection); this.#controlled = options.value !== undefined;
    this.#dropTarget = options.dropTarget ?? null;
    this.#onChange = options.onValueChange; this.#onReject = options.onReject; this.#onUpdate = options.onUpdate;
    this.#attributes = createDOMAttributeBinding(options.element);
    this.#project();
  }
  #project(): void {
    this.#attributes?.apply({ accept: this.#policy?.accept, multiple: this.#policy?.multiple ? '' : undefined,
      disabled: this.#interaction.disabled || this.#binding?.faulted ? '' : undefined,
      'data-scope': 'file-input', 'data-part': 'input', 'data-readonly': this.#interaction.readOnly ? '' : undefined });
  }
  public getActive(): boolean { return this.#observing && this.#element !== undefined; }
  public getFaulted(): boolean { return this.#binding?.faulted ?? false; }
  public getPolicy(): FilePolicy | undefined { return this.#policy; }
  public syncPolicy(options?: FilePolicyOptions): Result<FileInputSnapshot, FileInputErrorCode> {
    if (!this.#element) return inactive();
    const policy = options === undefined ? policyWithHints(undefined, this.#nativeAccept, this.#nativeMultiple) : tryCreateFilePolicy(options);
    if (!policy.ok) return this.#report(policy);
    const admitted = policy.value.validate(this.#snapshot.state.files);
    if (!admitted.ok) return this.#report(admitted);
    this.#policy = policy.value; this.#project(); this.#refreshForm(); this.#onUpdate?.();
    return okResult(this.#snapshot);
  }
  public getSnapshot(): FileInputSnapshot { this.#settleReset(); return this.#snapshot; }
  #guard(): Result<true, FileInputErrorCode> {
    if (!this.getActive()) return inactive();
    const result = requireInteraction(this.#interaction, 'mutate');
    if (!result.ok) return result;
    if (this.#element!.matches(':disabled')) return failResult('transition-rejection', 'interaction-disabled', 'Disabled controls reject file selection.');
    return result;
  }
  #write(files: readonly File[]): Result<void, FileInputErrorCode> {
    const binding = this.#binding;
    if (!binding) return inactive();
    const before = binding.faulted, result = binding.write(files, this.#snapshot.state.files);
    // Project only after recording the quarantine; a disabled binding must not
    // accidentally become submittable through normal interaction projection.
    if (before !== binding.faulted) { this.#project(); this.#onUpdate?.(); }
    return result;
  }
  #report<T>(result: Result<T, FileInputErrorCode>): Result<T, FileInputErrorCode> {
    if (!result.ok) this.#onReject?.(result.error);
    return result;
  }
  #accept(selection: FileSelection<File>): Result<FileInputSnapshot, FileInputErrorCode> {
    if (same(selection.files, this.#snapshot.state.files)) {
      if (!this.getFaulted() && same(this.#element?.files ?? null, selection.files)) return okResult(this.#snapshot);
      const restored = this.#write(selection.files);
      return restored.ok ? okResult(this.#snapshot) : restored;
    }
    const next = synchronizeControllerState(this.#snapshot, okResult(selection));
    if (!next.ok) return next;
    const write = this.#write(selection.files);
    if (!write.ok) return write;
    if (!this.#element) return inactive();
    this.#snapshot = next.value;
    this.#onUpdate?.();
    return okResult(this.#snapshot);
  }
  #propose(files: ArrayLike<File>, source: FileInputChangeSource, native = false): Result<FileInputSnapshot, FileInputErrorCode> {
    if (!this.#policy || !this.#element) return inactive();
    const admitted = this.#policy.validate(files);
    if (!admitted.ok) {
      const restored = native ? this.#write(this.#snapshot.state.files) : okResult(undefined);
      return this.#report(restored.ok ? admitted : restored);
    }
    if (same(admitted.value.files, this.#snapshot.state.files)) return this.#report(this.#accept(admitted.value));
    if (this.#controlled) {
      const genuine = this.#binding!.validate(admitted.value.files);
      if (!genuine.ok) return this.#report(genuine);
      // Native picker candidates must never escape a refused/throwing proposal.
      const previous = this.#snapshot;
      const restored = this.#write(this.#snapshot.state.files);
      if (!restored.ok) return this.#report(restored);
      if (this.#snapshot !== previous || !this.#element) return okResult(this.#snapshot);
    } else {
      const accepted = this.#accept(admitted.value);
      if (!accepted.ok) return this.#report(accepted);
      if (this.#snapshot.state !== admitted.value || !this.#element) return okResult(this.#snapshot);
    }
    this.#onChange?.(admitted.value.files, source);
    return okResult(this.#snapshot);
  }
  public syncControlledValue(files: readonly File[]): Result<FileInputSnapshot, FileInputErrorCode> {
    if (!this.#element || !this.#policy) return inactive();
    if (!this.#controlled) return failResult('construction', 'uncontrolled-value-update', 'Uncontrolled file inputs cannot be synchronized externally.');
    const refreshed = this.refresh(); if (!refreshed.ok) return refreshed;
    const selection = this.#policy.validate(files);
    return this.#report(selection.ok ? this.#accept(selection.value) : selection);
  }
  public syncInteraction(input: InteractionStateInput): Result<InteractionState> {
    const result = tryCreateInteractionState(input);
    if (result.ok && this.#element) { this.#interaction = result.value; this.#project(); this.#refreshForm(); }
    return result;
  }
  public selectFiles(files: ArrayLike<File>): Result<FileInputSnapshot, FileInputErrorCode> {
    const current = this.refresh(); if (!current.ok) return current;
    const guard = this.#guard(); return guard.ok ? this.#propose(files, 'programmatic') : guard;
  }
  public clear(): Result<FileInputSnapshot, FileInputErrorCode> {
    const current = this.refresh(); if (!current.ok) return current;
    const guard = this.#guard(); return guard.ok ? this.#propose(empty.files, 'clear') : guard;
  }
  #onInput = (): void => {
    if (!this.getActive() || !this.#element) return;
    const guard = this.#guard();
    if (!guard.ok) { this.#report(this.#write(this.#snapshot.state.files)); return; }
    this.#propose(this.#element.files ?? [], 'input', true);
  };
  #onCancel = (): void => { if (this.getActive()) this.#report(this.#write(this.#snapshot.state.files)); };
  #onClick = (event: Event): void => { if (!this.#guard().ok) event.preventDefault(); };
  #onReset = (event: Event): void => {
    if (!this.getActive()) return;
    this.#pendingReset = event;
    if (this.#resetQueued) return;
    this.#resetQueued = true;
    queueMicrotask(() => { this.#resetQueued = false; if (this.getActive()) this.#settleReset(); });
  };
  #refreshForm(): void {
    const form = this.#observing ? this.#element?.form ?? null : null;
    if (form === this.#form) return;
    this.#form?.removeEventListener('reset', this.#onReset);
    this.#form = form;
    form?.addEventListener('reset', this.#onReset);
  }
  public refresh(): Result<FileInputSnapshot, FileInputErrorCode> {
    const settled = this.#settleReset();
    if (!settled.ok || !this.getFaulted()) return settled;
    const restored = this.#write(this.#snapshot.state.files);
    return this.#report(restored.ok ? okResult(this.#snapshot) : restored);
  }
  #settleReset(): Result<FileInputSnapshot, FileInputErrorCode> {
    if (!this.#element) return inactive();
    this.#refreshForm();
    const event = this.#pendingReset;
    if (!event || event.eventPhase !== 0) return okResult(this.#snapshot);
    this.#pendingReset = undefined;
    if (event.defaultPrevented || event.target !== this.#element.form) return okResult(this.#snapshot);
    // Browser reset clears file controls regardless of disabled/readOnly.
    return this.#propose(empty.files, 'reset', true);
  }
  #onDragOver = (event: DragEvent): void => {
    if (this.#guard().ok && event.dataTransfer?.types.includes('Files')) event.preventDefault();
  };
  #onDrop = (event: DragEvent): void => {
    const transfer = event.dataTransfer;
    if (!transfer?.types.includes('Files')) return;
    event.preventDefault();
    if (!this.#guard().ok) return;
    for (const item of transfer.items) {
      if (item.kind === 'file' && item.webkitGetAsEntry?.()?.isDirectory) {
        this.#report(failResult('transition-rejection', 'dom.file-input-directory-rejected', 'Directory drops are not file selections.')); return;
      }
    }
    const files = transfer.files;
    if (!files.length) { this.#report(failResult('transition-rejection', 'dom.file-input-drop-invalid', 'The drop did not contain readable files.')); return; }
    this.#propose(files, 'drop');
  };
  #bindDrop(bind: boolean): void {
    const target = this.#dropTarget;
    if (!target) return;
    if (bind) { target.addEventListener('dragover', this.#onDragOver); target.addEventListener('drop', this.#onDrop); }
    else { target.removeEventListener('dragover', this.#onDragOver); target.removeEventListener('drop', this.#onDrop); }
  }
  public setDropTarget(element: HTMLElement | null): void {
    if (!this.#element || element === this.#dropTarget) return;
    this.#bindDrop(false); this.#dropTarget = element;
    if (this.#observing) {
      try { this.#bindDrop(true); }
      catch (error) { this.#bindDrop(false); this.#dropTarget = null; throw error; }
    }
  }
  public focus(): boolean {
    const element = this.#element;
    if (!this.getActive() || !element || element.matches(':disabled')) return false;
    element.focus(); return element.ownerDocument.activeElement === element;
  }
  public open(): boolean {
    if (!this.#guard().ok) return false;
    this.#element!.click(); return true;
  }
  public suspend(): void {
    if (!this.#observing) return;
    this.#observing = false; this.#pendingReset = undefined;
    const element = this.#element!;
    element.removeEventListener('input', this.#onInput); element.removeEventListener('change', this.#onInput);
    element.removeEventListener('cancel', this.#onCancel); element.removeEventListener('click', this.#onClick);
    this.#bindDrop(false); this.#refreshForm();
  }
  public resume(): void {
    if (this.#observing || !this.#element) return;
    const element = this.#element;
    const restored = !this.getFaulted() && same(element.files, this.#snapshot.state.files)
      ? okResult(undefined) : this.#write(this.#snapshot.state.files);
    if (!restored.ok) { this.#report(restored); return; }
    this.#observing = true;
    try {
      element.addEventListener('input', this.#onInput); element.addEventListener('change', this.#onInput);
      element.addEventListener('cancel', this.#onCancel); element.addEventListener('click', this.#onClick);
      this.#bindDrop(true); this.#refreshForm();
    } catch (error) { this.suspend(); throw error; }
  }
  public disconnect(): void {
    if (!this.#element) return;
    this.suspend();
    const quarantined = this.#binding?.faulted, element = this.#element;
    this.#binding?.disconnect();
    try { this.#attributes?.disconnect(); }
    finally {
      if (quarantined) element.disabled = true;
      this.#element = undefined; this.#binding = undefined; this.#attributes = undefined; this.#policy = undefined;
      this.#dropTarget = null; this.#form = null; this.#pendingReset = undefined;
      this.#onChange = undefined; this.#onReject = undefined; this.#onUpdate = undefined;
      this.#nativeAccept = ''; this.#nativeMultiple = false;
      this.#snapshot = createRevisionSnapshot(empty);
    }
  }
}
