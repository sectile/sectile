import { failResult, okResult, type Result } from '@sectile/core/result';

export type NativeFileListErrorCode = 'dom.file-input-capability-missing' | 'dom.file-input-file-invalid'
  | 'dom.file-input-write-failed' | 'dom.file-input-rollback-failed' | 'dom.file-input-disconnected';
export interface NativeFileListBinding {
  readonly faulted: boolean;
  validate(files: readonly File[]): Result<void, NativeFileListErrorCode>;
  /** Both lists have already passed the canonical Form policy. */
  write(files: readonly File[], rollback: readonly File[]): Result<void, NativeFileListErrorCode>;
  disconnect(): void;
}
type FileNameGetter = (this: File) => unknown;
function failure(code: NativeFileListErrorCode): Result<never, NativeFileListErrorCode> {
  return failResult(code === 'dom.file-input-capability-missing' ? 'construction' : 'transition-rejection', code, 'Native file selection could not be synchronized.');
}
function same(list: FileList | null, files: readonly File[]): boolean {
  if (list === null || list.length !== files.length) return false;
  for (let index = 0; index < files.length; index++) if (list[index] !== files[index]) return false;
  return true;
}
function nativeFile(file: File, FileType: typeof File, name: FileNameGetter | undefined): boolean {
  if (file instanceof FileType) return true;
  try { return name !== undefined && typeof name.call(file) === 'string'; } catch { return false; }
}
function prepare(files: readonly File[], FileType: typeof File, Transfer: typeof DataTransfer, name: FileNameGetter | undefined): Result<FileList, NativeFileListErrorCode> {
  try {
    const transfer = new Transfer();
    for (let index = 0; index < files.length; index++) {
      const file = files[index]!;
      if (!nativeFile(file, FileType, name)) return failure('dom.file-input-file-invalid');
      if (transfer.items.add(file) === null) return failure('dom.file-input-write-failed');
    }
    const list = transfer.files;
    return same(list, files) ? okResult<FileList, NativeFileListErrorCode>(list) : failure('dom.file-input-write-failed');
  } catch { return failure('dom.file-input-write-failed'); }
}

/** Probe a detached input only; never clear the caller's selection to detect support. */
export function tryCreateNativeFileListBinding(input: HTMLInputElement): Result<NativeFileListBinding, NativeFileListErrorCode> {
  try {
    if (input.tagName !== 'INPUT' || input.type !== 'file') return failure('dom.file-input-capability-missing');
    const view = input.ownerDocument.defaultView;
    if (!view || typeof view.File !== 'function' || typeof view.DataTransfer !== 'function') return failure('dom.file-input-capability-missing');
    const name = Object.getOwnPropertyDescriptor(view.File.prototype, 'name')?.get as FileNameGetter | undefined;
    const probe = input.ownerDocument.createElement('input'); probe.type = 'file'; probe.multiple = true;
    const file = new view.File([], 'sectile-file-capability'), prepared = prepare([file], view.File, view.DataTransfer, name);
    if (!prepared.ok) return failure('dom.file-input-capability-missing');
    probe.files = prepared.value;
    if (!same(probe.files, [file])) return failure('dom.file-input-capability-missing');
    return okResult<NativeFileListBinding, NativeFileListErrorCode>(new NativeFiles(input, view.File, view.DataTransfer, name));
  } catch { return failure('dom.file-input-capability-missing'); }
}

class NativeFiles implements NativeFileListBinding {
  #input: HTMLInputElement | undefined;
  #FileType: typeof File | undefined;
  #Transfer: typeof DataTransfer | undefined;
  #name: FileNameGetter | undefined;
  #faulted = false;
  #disabledBeforeFault = false;
  public constructor(input: HTMLInputElement, FileType: typeof File, Transfer: typeof DataTransfer, name: FileNameGetter | undefined) {
    this.#input = input; this.#FileType = FileType; this.#Transfer = Transfer; this.#name = name;
  }
  public get faulted(): boolean { return this.#faulted; }
  public validate(files: readonly File[]): Result<void, NativeFileListErrorCode> {
    if (!this.#input || !this.#FileType) return failure('dom.file-input-disconnected');
    try {
      for (let index = 0; index < files.length; index++) if (!nativeFile(files[index]!, this.#FileType, this.#name)) return failure('dom.file-input-file-invalid');
      return okResult(undefined);
    } catch { return failure('dom.file-input-file-invalid'); }
  }
  public write(files: readonly File[], rollback: readonly File[]): Result<void, NativeFileListErrorCode> {
    const input = this.#input, FileType = this.#FileType, Transfer = this.#Transfer;
    if (!input || !FileType || !Transfer) return failure('dom.file-input-disconnected');
    if (input.type !== 'file') return failure('dom.file-input-capability-missing');
    const proposed = prepare(files, FileType, Transfer, this.#name);
    if (!proposed.ok) return this.#preparationFailure(input, rollback, proposed);
    const previous = files === rollback ? proposed : prepare(rollback, FileType, Transfer, this.#name);
    if (!previous.ok) return this.#preparationFailure(input, rollback, previous);
    try {
      if (input.type !== 'file') return failure('dom.file-input-capability-missing');
      input.files = proposed.value;
      if (!same(input.files, files)) throw new Error('file assignment was not preserved');
      if (this.#faulted) {
        if (input.disabled) input.disabled = this.#disabledBeforeFault;
        this.#faulted = false;
      }
      return okResult<void, NativeFileListErrorCode>(undefined);
    } catch {
      if (input.type !== 'file') return failure('dom.file-input-capability-missing');
      try { input.files = previous.value; if (same(input.files, rollback)) return failure('dom.file-input-write-failed'); } catch { /* Quarantine below. */ }
      return this.#quarantine(input);
    }
  }
  #preparationFailure(input: HTMLInputElement, rollback: readonly File[], result: Result<never, NativeFileListErrorCode>): Result<void, NativeFileListErrorCode> {
    try { if (same(input.files, rollback)) return result; } catch { /* Quarantine below. */ }
    return this.#quarantine(input);
  }
  #quarantine(input: HTMLInputElement): Result<never, NativeFileListErrorCode> {
    if (!this.#faulted) this.#disabledBeforeFault = input.disabled;
    this.#faulted = true;
    try { input.value = ''; } catch { /* Disabling still prevents unsafe native submission. */ }
    try { input.disabled = true; } catch { /* The explicit failure remains authoritative. */ }
    return failure('dom.file-input-rollback-failed');
  }
  public disconnect(): void {
    // A failed native control is not silently made submittable by disposal.
    this.#input = undefined; this.#FileType = undefined; this.#Transfer = undefined; this.#name = undefined;
  }
}
