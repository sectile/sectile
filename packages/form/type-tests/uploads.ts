import { createFileUploadState, applyFileUploadEvent, type FileUploadState, type FileUploadAttempt, type FileUploadEvent } from '@sectile/form/uploads';
interface AppFile { readonly name: string; readonly size: number; readonly type: string; readonly itemID: 'invoice' }
interface Receipt { readonly remoteID: string }
declare const file: AppFile;
const initial = createFileUploadState<AppFile, Receipt>(file);
const id: 'invoice' = initial.file.itemID; void id;
const result = applyFileUploadEvent(initial, { type: 'start' });
if (result.ok && result.value.status === 'uploading') {
  const active: FileUploadState<AppFile, Receipt> = result.value;
  const attempt: FileUploadAttempt = result.value.attempt;
  applyFileUploadEvent(active, { type: 'succeed', attempt, receipt: { remoteID: 'done' } });
  // @ts-expect-error Receipt inference is owned by the state, not widened by events.
  applyFileUploadEvent(active, { type: 'succeed', attempt, receipt: { otherID: 'wrong' } });
  // @ts-expect-error An attempt cannot be a filename or local counter.
  applyFileUploadEvent(active, { type: 'progress', attempt: 'invoice', loaded: 1 });
}
const progress: FileUploadEvent<Receipt> = { type: 'progress', attempt: {} as FileUploadAttempt, loaded: 0 }; void progress;
// @ts-expect-error Consumers receive opaque attempt identities from a started state.
const forged: FileUploadAttempt = {}; void forged;
// @ts-expect-error Per-file progress never changes the admitted file reference.
initial.file = file;
// @ts-expect-error Queued states do not contain confirmed server receipts.
initial.receipt;
