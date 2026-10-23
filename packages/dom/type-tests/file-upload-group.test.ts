import { createFileUploadGroup, type FileUploadAdapter, type FileUploadGroupSnapshot, type FileUploadItemSnapshot } from '@sectile/dom/form/file-upload';
interface AppFile extends File { readonly uploadID: 'invoice' }
interface Receipt { readonly remoteID: string }
declare const file: AppFile;
declare const adapter: FileUploadAdapter<AppFile, Receipt>;
const group = createFileUploadGroup({ items: [{ id: 'a', file }, { id: 'b', file }], adapter, concurrency: 2,
  onItemUpdate(id, snapshot) { const key: 'a' | 'b' = id; void key;
    if (snapshot?.state.status === 'succeeded') { const remoteID: string = snapshot.state.receipt.remoteID; const item: AppFile = snapshot.state.file; void remoteID; void item; }
  } });
group.start(['a']); group.cancel(['b']); group.reset(); group.setConcurrency(3); group.syncItems([{ id: 'a', file }]);
const snapshot: FileUploadGroupSnapshot<'a' | 'b'> = group.getSnapshot(); void snapshot;
const item: FileUploadItemSnapshot<AppFile, Receipt> | undefined = group.getItemSnapshot('a'); void item;
// @ts-expect-error A group retains its application ID vocabulary.
group.start(['missing']);
// @ts-expect-error File subtype identity is not weakened by a membership update.
group.syncItems([{ id: 'a', file: new File([], 'plain') }]);
// @ts-expect-error Summary counters are immutable.
group.state.counts.succeeded = 10;
group.destroy();
