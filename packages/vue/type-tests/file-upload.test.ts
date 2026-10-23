import { shallowRef } from 'vue';
import { useFileUpload, useFileUploadGroup, type FileUploadAdapter, type UseFileUploadReturn, type UseFileUploadGroupReturn } from '@sectile/vue/form/file-upload';
interface AppFile extends File { readonly uploadID: 'invoice' }
interface Receipt { readonly remoteID: string }
declare const file: AppFile;
declare const adapter: FileUploadAdapter<AppFile, Receipt>;
const source = shallowRef(file), uploader = shallowRef(adapter);
const upload = useFileUpload({ file: source, adapter: uploader });
const typed: UseFileUploadReturn<AppFile, Receipt> = upload; void typed;
upload.start(); upload.cancel(); upload.reset();
const state = upload.snapshot.value?.state;
if (state?.status === 'succeeded') { const id: string = state.receipt.remoteID; const file: AppFile = state.file; void id; void file;
  // @ts-expect-error Receipt inference is not unknown or any after narrowing.
  const invalid: number = state.receipt.remoteID; void invalid;
}
const getter = useFileUpload({ file: () => file, adapter, active: shallowRef(true) }); void getter;
// @ts-expect-error Public state refs are readonly.
upload.snapshot.value = undefined;
// @ts-expect-error Native file subtype requirements must match the file source.
useFileUpload({ file: new File([], 'plain'), adapter });

const group = useFileUploadGroup({ items: [{ id: 'invoice', file }, { id: 'receipt', file }], adapter: uploader, concurrency: shallowRef(2) });
const typedGroup: UseFileUploadGroupReturn<'invoice' | 'receipt', AppFile, Receipt> = group; void typedGroup;
const row = group.useItem(shallowRef<'invoice' | 'receipt'>('invoice'));
const item = row.value?.state;
if (item?.status === 'succeeded') { const remoteID: string = item.receipt.remoteID; const appFile: AppFile = item.file; void remoteID; void appFile;
  // @ts-expect-error Group receipt inference preserves the adapter result.
  const invalid: number = item.receipt.remoteID; void invalid;
}
group.start(['invoice']); group.cancel(['receipt']); group.reset();
const queried = group.getItem('invoice')?.state;
if (queried?.status === 'succeeded') { const result: Receipt = queried.receipt; const original: AppFile = queried.file; void result; void original; }
// @ts-expect-error Queries preserve the same literal ID vocabulary as subscriptions.
group.getItem('missing');
// @ts-expect-error ID vocabulary is retained at action and row boundaries.
group.useItem('missing');
// @ts-expect-error Actions cannot address an unregistered ID vocabulary.
group.start(['missing']);
// @ts-expect-error Row refs are readonly.
row.value = undefined;
// @ts-expect-error Adapter subtype requirements also apply to group files.
useFileUploadGroup({ items: [{ id: 'a', file: new File([], 'plain') }], adapter });
