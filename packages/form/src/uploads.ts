import { failResult, okResult } from '@sectile/core/result';
import { FormResultError, type FormResult } from './error.js';
import { createFilePolicy, type FileMetadata, type FilePolicyErrorCode } from './files.js';

declare const attemptBrand: unique symbol;
declare const receiptType: unique symbol;
/** Identity belongs to one start, not a filename, row index or retry count. */
export interface FileUploadAttempt { readonly [attemptBrand]: true }
export interface FileUploadProgress {
  readonly loaded: number;
  /** Unknown until the adapter reports a total; never inferred from file.size. */
  readonly total: number | null;
}
interface FileUploadBase<T extends FileMetadata, Receipt> extends FileUploadProgress {
  readonly file: T;
  /** Type-only: narrowing an active state must retain its future receipt type. */
  readonly [receiptType]?: Receipt;
}
export type FileUploadState<T extends FileMetadata = FileMetadata, Receipt = unknown> = FileUploadBase<T, Receipt> & (
  | { readonly status: 'queued' | 'canceled' }
  | { readonly status: 'uploading'; readonly attempt: FileUploadAttempt }
  | { readonly status: 'succeeded'; readonly receipt: Receipt }
  | { readonly status: 'failed'; readonly error: unknown }
);
export type FileUploadEvent<Receipt = unknown> =
  | { readonly type: 'start' | 'cancel' | 'reset' }
  | { readonly type: 'progress'; readonly attempt: FileUploadAttempt; readonly loaded: number; readonly total?: number }
  | { readonly type: 'succeed'; readonly attempt: FileUploadAttempt; readonly receipt: Receipt }
  | { readonly type: 'fail'; readonly attempt: FileUploadAttempt; readonly error: unknown };
export type FileUploadErrorCode = FilePolicyErrorCode | 'form-upload-event-invalid'
  | 'form-upload-transition-rejected' | 'form-upload-attempt-stale' | 'form-upload-progress-invalid';

// One immutable default matcher; it retains no admitted file or caller options.
const defaultUploadPolicy = /* @__PURE__ */ createFilePolicy();
export function tryCreateFileUploadState<T extends FileMetadata, Receipt = unknown>(file: T): FormResult<FileUploadState<T, Receipt>, FileUploadErrorCode> {
  const admitted = defaultUploadPolicy.validate([file]);
  return admitted.ok ? okResult(Object.freeze({ file: admitted.value.files[0]!, status: 'queued', loaded: 0, total: null })) : admitted;
}
export function createFileUploadState<T extends FileMetadata, Receipt = unknown>(file: T): FileUploadState<T, Receipt> {
  const result = tryCreateFileUploadState<T, Receipt>(file);
  if (!result.ok) throw new FormResultError(result.error);
  return result.value;
}
function reject(code: FileUploadErrorCode): FormResult<never, FileUploadErrorCode> {
  return failResult('transition-rejection', code, 'The upload update does not belong to an available attempt or valid transition.');
}
function bytes(value: unknown): value is number { return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0; }

/** Pure O(1) per-file transition. The host owns scheduling, transport and cleanup. */
export function applyFileUploadEvent<T extends FileMetadata, Receipt>(
  state: FileUploadState<T, Receipt>, event: FileUploadEvent<NoInfer<Receipt>>,
): FormResult<FileUploadState<T, Receipt>, FileUploadErrorCode> {
  if (event === null || typeof event !== 'object') return reject('form-upload-event-invalid');
  try {
  const type = event.type;
  switch (type) {
    case 'reset': return state.status === 'queued' ? okResult(state)
      : okResult(Object.freeze({ file: state.file, status: 'queued', loaded: 0, total: null }));
    case 'cancel': {
      if (state.status === 'canceled') return okResult(state);
      if (state.status !== 'queued' && state.status !== 'uploading') return reject('form-upload-transition-rejected');
      return okResult(Object.freeze({ file: state.file, status: 'canceled', loaded: state.loaded, total: state.total }));
    }
    case 'start': {
      if (state.status === 'uploading' || state.status === 'succeeded') return reject('form-upload-transition-rejected');
      const attempt = Object.freeze({}) as FileUploadAttempt;
      return okResult(Object.freeze({ file: state.file, status: 'uploading', attempt, loaded: 0, total: null }));
    }
    case 'progress': case 'succeed': case 'fail': {
      if (state.status !== 'uploading' || event.attempt !== state.attempt) return reject('form-upload-attempt-stale');
      if (type === 'succeed') return okResult(Object.freeze({ file: state.file, status: 'succeeded', loaded: state.loaded, total: state.total, receipt: event.receipt }));
      if (type === 'fail') return okResult(Object.freeze({ file: state.file, status: 'failed', loaded: state.loaded, total: state.total, error: event.error }));
      const loaded = event.loaded, reportedTotal = event.total, total = reportedTotal ?? state.total;
      if (!bytes(loaded) || loaded < state.loaded || reportedTotal !== undefined && !bytes(reportedTotal)
        || total !== null && (loaded > total || state.total !== null && total !== state.total)) return reject('form-upload-progress-invalid');
      return loaded === state.loaded && total === state.total ? okResult(state)
        : okResult(Object.freeze({ file: state.file, status: 'uploading', attempt: state.attempt, loaded, total }));
    }
    default: return reject('form-upload-event-invalid');
  }
  } catch { return reject('form-upload-event-invalid'); }
}
