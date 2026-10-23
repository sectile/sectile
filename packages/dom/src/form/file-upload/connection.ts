// The facade and group import this leaf without a capability-module cycle.
import { createFacadeConnection, synchronizeControllerState, type FacadeConnection } from '@sectile/core/adapter-runtime';
import { createRevisionSnapshot, type RevisionSnapshot } from '@sectile/core/revision';
import { failResult, okResult, unwrap, type CoreErrorCode, type Result } from '@sectile/core/result';
import { applyFileUploadEvent, tryCreateFileUploadState, type FileUploadAttempt, type FileUploadErrorCode, type FileUploadEvent, type FileUploadState } from '@sectile/form/uploads';
import type { FileMetadata } from '@sectile/form/files';

export interface FileUploadProgressInput { readonly loaded: number; readonly total?: number }
export interface FileUploadRequest<T extends FileMetadata = FileMetadata> {
  readonly file: T;
  readonly attempt: FileUploadAttempt;
  readonly signal: AbortSignal;
  readonly reportProgress: (progress: FileUploadProgressInput) => Result<void, FileUploadHostErrorCode>;
}
export interface FileUploadTask<Receipt> {
  readonly result: PromiseLike<Receipt>;
  /** Synchronous task-resource release, called exactly once after return. */
  readonly dispose?: () => void;
}
export type FileUploadAdapter<T extends FileMetadata = FileMetadata, Receipt = unknown> = (request: FileUploadRequest<T>) => FileUploadTask<Receipt>;
export type FileUploadHostErrorCode = CoreErrorCode | FileUploadErrorCode
  | 'dom.file-upload-invalid' | 'dom.file-upload-unavailable' | 'dom.file-upload-inactive' | 'dom.file-upload-busy';
export type FileUploadSnapshot<T extends FileMetadata = FileMetadata, Receipt = unknown> = RevisionSnapshot<FileUploadState<T, Receipt> | null>;
export interface FileUploadOptions<T extends FileMetadata = FileMetadata, Receipt = unknown> {
  readonly file: T;
  readonly adapter: FileUploadAdapter<NoInfer<T>, Receipt>;
  readonly onUpdate?: () => void;
  readonly onCleanupError?: (error: unknown) => void;
}
export interface FileUploadConnection<T extends FileMetadata = FileMetadata, Receipt = unknown> {
  getSnapshot(): FileUploadSnapshot<T, Receipt>;
  start(): Result<FileUploadSnapshot<T, Receipt>, FileUploadHostErrorCode>;
  cancel(): Result<FileUploadSnapshot<T, Receipt>, FileUploadHostErrorCode>;
  reset(): Result<FileUploadSnapshot<T, Receipt>, FileUploadHostErrorCode>;
}
interface Ticket {
  controller: AbortController | undefined;
  dispose: (() => void) | undefined;
  progress: ((progress: FileUploadProgressInput) => Result<void, FileUploadHostErrorCode>) | undefined;
  settle: ((succeeded: boolean, value: unknown) => void) | undefined;
  retired: boolean;
}
function failure(code: FileUploadHostErrorCode): Result<never, FileUploadHostErrorCode> {
  return failResult('transition-rejection', code, 'The upload host cannot execute this operation.');
}
function reportAsync(error: unknown): void { queueMicrotask(() => { throw error; }); }
// Foreign progress callbacks and unresolved promises retain only this revocable
// ticket. They must not capture the owner, request, file or adapter task.
function reporter(ticket: Ticket): FileUploadRequest['reportProgress'] {
  return progress => ticket.progress?.(progress) ?? failure('dom.file-upload-inactive');
}
function observe(result: PromiseLike<unknown>, ticket: Ticket): void {
  if (result === null || typeof result !== 'object' && typeof result !== 'function') throw new TypeError('Upload task.result must be PromiseLike.');
  const then = result.then;
  if (typeof then !== 'function') throw new TypeError('Upload task.result must be PromiseLike.');
  const pending = new Promise<unknown>((resolve, reject) => { Reflect.apply(then, result, [resolve, reject]); });
  const deliver = (succeeded: boolean, value: unknown): void => {
    try { ticket.settle?.(succeeded, value); } catch (error) { reportAsync(error); }
  };
  void pending.then(value => deliver(true, value), error => deliver(false, error));
}
export function createFileUpload<T extends FileMetadata, Receipt = unknown>(options: FileUploadOptions<T, Receipt>): FacadeConnection<FileUploadConnection<T, Receipt>> {
  return unwrap(tryCreateFileUpload(options));
}
export function tryCreateFileUpload<T extends FileMetadata, Receipt = unknown>(options: FileUploadOptions<T, Receipt>): Result<FacadeConnection<FileUploadConnection<T, Receipt>>, FileUploadHostErrorCode> {
  return createFacadeConnection(options, construct<T, Receipt>);
}
function construct<T extends FileMetadata, Receipt>(options: FileUploadOptions<T, Receipt>): Result<FileUploadConnection<T, Receipt>, FileUploadHostErrorCode> {
  if (typeof options.adapter !== 'function' || options.onCleanupError !== undefined && typeof options.onCleanupError !== 'function') return failure('dom.file-upload-invalid');
  const initial = tryCreateFileUploadState<T, Receipt>(options.file);
  return initial.ok ? okResult(new UploadHost(options, initial.value)) : initial;
}
class UploadHost<T extends FileMetadata, Receipt> implements FileUploadConnection<T, Receipt> {
  #snapshot: FileUploadSnapshot<T, Receipt>;
  #adapter: FileUploadAdapter<T, Receipt> | undefined;
  #notify: FileUploadOptions<T, Receipt>['onUpdate'];
  #cleanupError: FileUploadOptions<T, Receipt>['onCleanupError'];
  #ticket: Ticket | undefined;
  #connected = true;
  #invoking = false;
  #retiring = false;
  constructor(options: FileUploadOptions<T, Receipt>, initial: FileUploadState<T, Receipt>) {
    this.#snapshot = createRevisionSnapshot(initial); this.#adapter = options.adapter;
    this.#notify = options.onUpdate; this.#cleanupError = options.onCleanupError;
  }
  getSnapshot(): FileUploadSnapshot<T, Receipt> { return this.#snapshot; }
  #publish(snapshot: FileUploadSnapshot<T, Receipt>): void {
    if (!this.#connected || this.#snapshot !== snapshot) return;
    try { this.#notify?.(); }
    catch (error) {
      const state = this.#snapshot.state;
      if (state?.status === 'uploading') this.#apply({ type: 'fail', attempt: state.attempt, error });
      this.#retire(true);
      throw error;
    }
  }
  #apply(event: FileUploadEvent<Receipt>): Result<FileUploadSnapshot<T, Receipt>, FileUploadHostErrorCode> {
    const state = this.#snapshot.state;
    if (!this.#connected || state === null) return failure('dom.file-upload-inactive');
    const result = applyFileUploadEvent(state, event);
    if (!result.ok) return result;
    if (result.value === state) return okResult(this.#snapshot);
    const next = synchronizeControllerState<FileUploadState<T, Receipt> | null, FileUploadErrorCode>(this.#snapshot, result);
    if (next.ok) this.#snapshot = next.value;
    return next;
  }
  #reportCleanup(error: unknown): void {
    try { if (this.#cleanupError) this.#cleanupError(error); else reportAsync(error); }
    catch (failure) { reportAsync(failure); }
  }
  #dispose(dispose: () => void): void { try { dispose(); } catch (error) { this.#reportCleanup(error); } }
  #retire(abort: boolean): void {
    const ticket = this.#ticket;
    if (!ticket) return;
    this.#ticket = undefined; ticket.retired = true; ticket.progress = undefined; ticket.settle = undefined;
    const controller = ticket.controller, dispose = ticket.dispose;
    ticket.controller = undefined; ticket.dispose = undefined;
    this.#retiring = true;
    try {
      try { if (abort) controller?.abort(); } catch (error) { this.#reportCleanup(error); }
      if (dispose) this.#dispose(dispose);
    } finally { this.#retiring = false; }
  }
  #finish(ticket: Ticket, attempt: FileUploadAttempt, succeeded: boolean, value: unknown, abort = false): void {
    if (!this.#connected || this.#ticket !== ticket) return;
    const next = this.#apply(succeeded ? { type: 'succeed', attempt, receipt: value as Receipt } : { type: 'fail', attempt, error: value });
    this.#retire(abort);
    if (!next.ok) { this.disconnect(); reportAsync(next.error); return; }
    this.#publish(next.value);
  }
  #progress(ticket: Ticket, attempt: FileUploadAttempt, progress: FileUploadProgressInput): Result<void, FileUploadHostErrorCode> {
    if (!this.#connected || this.#ticket !== ticket) return failure('dom.file-upload-inactive');
    let loaded: number, total: number | undefined;
    try { loaded = progress.loaded; total = progress.total; }
    catch { return failure('form-upload-event-invalid'); }
    const previous = this.#snapshot, next = this.#apply({ type: 'progress', attempt, loaded,
      ...(total === undefined ? {} : { total }) });
    if (!next.ok) return next;
    if (next.value !== previous) this.#publish(next.value);
    return okResult(undefined);
  }
  start(): Result<FileUploadSnapshot<T, Receipt>, FileUploadHostErrorCode> {
    if (!this.#connected) return failure('dom.file-upload-inactive');
    if (this.#invoking || this.#retiring) return failure('dom.file-upload-busy');
    let controller: AbortController;
    try { controller = new AbortController(); } catch { return failure('dom.file-upload-unavailable'); }
    const next = this.#apply({ type: 'start' });
    if (!next.ok) return next;
    const state = next.value.state;
    if (state?.status !== 'uploading') return failure('dom.file-upload-inactive');
    const ticket: Ticket = { controller, dispose: undefined, progress: undefined, settle: undefined, retired: false };
    ticket.progress = progress => this.#progress(ticket, state.attempt, progress);
    ticket.settle = (succeeded, value) => this.#finish(ticket, state.attempt, succeeded, value);
    this.#ticket = ticket; this.#invoking = true;
    try {
      this.#publish(next.value);
      if (!this.#connected || this.#ticket !== ticket || !this.#adapter) return okResult(this.#snapshot);
      try {
        const task = this.#adapter({ file: state.file, attempt: state.attempt, signal: controller.signal, reportProgress: reporter(ticket) });
        if (task === null || typeof task !== 'object') throw new TypeError('Upload adapter must return a task.');
        let result: PromiseLike<Receipt> | undefined, invalidResult = false, resultFailure: unknown;
        try { result = task.result; } catch (error) { invalidResult = true; resultFailure = error; }
        let invalidCleanup = false, cleanupFailure: unknown;
        try {
          const dispose = task.dispose;
          if (dispose !== undefined && typeof dispose !== 'function') throw new TypeError('Upload task.dispose must be a function.');
          if (dispose) {
            const release = (): void => { Reflect.apply(dispose, task, []); };
            if (ticket.retired) this.#dispose(release); else ticket.dispose = release;
          }
        } catch (error) { invalidCleanup = true; cleanupFailure = error; }
        if (invalidResult) this.#finish(ticket, state.attempt, false, resultFailure, true);
        else {
          observe(result!, ticket);
          if (invalidCleanup) this.#finish(ticket, state.attempt, false, cleanupFailure, true);
        }
      } catch (error) { this.#finish(ticket, state.attempt, false, error, true); }
      return okResult(this.#snapshot);
    } finally { this.#invoking = false; }
  }
  cancel(): Result<FileUploadSnapshot<T, Receipt>, FileUploadHostErrorCode> { return this.#stop('cancel'); }
  reset(): Result<FileUploadSnapshot<T, Receipt>, FileUploadHostErrorCode> { return this.#stop('reset'); }
  #stop(type: 'cancel' | 'reset'): Result<FileUploadSnapshot<T, Receipt>, FileUploadHostErrorCode> {
    const previous = this.#snapshot, next = this.#apply({ type });
    if (!next.ok) return next;
    this.#retire(true);
    if (next.value !== previous) this.#publish(next.value);
    return next;
  }
  disconnect(): void {
    if (!this.#connected) return;
    this.#connected = false; this.#adapter = undefined; this.#notify = undefined;
    this.#snapshot = createRevisionSnapshot(null, this.#snapshot.revision);
    try { this.#retire(true); } finally { this.#cleanupError = undefined; }
  }
}
