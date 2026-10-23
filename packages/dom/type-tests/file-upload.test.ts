import { createFileUpload, type FileUploadAdapter, type FileUploadTask, type FileUploadRequest } from '@sectile/dom/form/file-upload';
interface AppFile extends File { readonly uploadID: 'invoice' }
interface Receipt { readonly remoteID: string }
declare const file: AppFile;
const adapter: FileUploadAdapter<AppFile, Receipt> = request => {
  const native: AppFile = request.file; const id: 'invoice' = native.uploadID; void id;
  const signal: AbortSignal = request.signal; void signal;
  request.reportProgress({ loaded: 0 });
  return { result: Promise.resolve({ remoteID: 'stored' }), dispose() {} };
};
const owner = createFileUpload({ file, adapter });
owner.start(); owner.cancel(); owner.reset();
const state = owner.getSnapshot().state;
if (state?.status === 'succeeded') { const id: string = state.receipt.remoteID; const native: AppFile = state.file; void id; void native; }
owner.subscribe(snapshot => { if (snapshot.state?.status === 'succeeded') { const id: string = snapshot.state.receipt.remoteID; void id; } });
const explicit = createFileUpload<AppFile, Receipt>({ file, adapter }); explicit.destroy(); owner.destroy();
// @ts-expect-error Adapter result receipts must match the configured receipt contract.
const badTask: FileUploadTask<Receipt> = { result: Promise.resolve({ otherID: 'wrong' }) }; void badTask;
declare const request: FileUploadRequest<AppFile>;
// @ts-expect-error Byte progress is numeric.
request.reportProgress({ loaded: '1' });
// @ts-expect-error Adapters must return task handles, not bare promises.
createFileUpload({ file, adapter: () => Promise.resolve('bare') });
