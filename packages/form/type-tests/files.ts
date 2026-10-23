import { createFilePolicy, tryCreateFilePolicy, type FileMetadata, type FilePolicyErrorCode, type FileSelection } from '@sectile/form/files';
import type { FilePolicy as RootFilePolicy } from '@sectile/form';
const policy: RootFilePolicy = createFilePolicy({ multiple: true, accept: '.pdf,application/pdf', maxFiles: 3, maxFileSize: 1024 });
const record = { name: 'invoice.pdf', type: 'application/pdf', size: 12, receipt: 'invoice' as const };
const result = policy.validate([record]);
if (result.ok) {
  const receipt: 'invoice' = result.value.files[0]!.receipt;
  const output: FileSelection<typeof record> = result.value;
  // @ts-expect-error Accepted lists are readonly snapshots.
  result.value.files.push(record);
  void [receipt, output];
} else { const code: FilePolicyErrorCode = result.error.code; void code; }
const metadata: FileMetadata = record; void metadata;
const indexed: ArrayLike<typeof record> = { length: 1, 0: record };
const indexedResult = policy.validate(indexed);
if (indexedResult.ok) { const receipt: 'invoice' = indexedResult.value.files[0]!.receipt; void receipt; }
const construction = tryCreateFilePolicy({ maxTotalSize: 0 });
if (construction.ok) construction.value.validate([]);
// @ts-expect-error Files need numeric byte sizes.
policy.validate([{ name: 'a.pdf', type: 'application/pdf', size: '12' }]);
// @ts-expect-error Multiple is a boolean, not a native attribute string.
createFilePolicy({ multiple: 'multiple' });
