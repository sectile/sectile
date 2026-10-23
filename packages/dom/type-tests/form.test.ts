import type { FormConnection, FormParticipant } from '@sectile/dom/form';
import { createFileInput, tryCreateFileInput, type FileInputChangeSource } from '@sectile/dom/form/file-input';
import { createFilePolicy } from '@sectile/form/files';

declare const nativeFiles: FileList;
const fileAdmission = createFilePolicy({ multiple: true }).validate(nativeFiles);
if (fileAdmission.ok) { const nativeFile: File | undefined = fileAdmission.value.files[0]; void nativeFile; }

declare const form: FormConnection<'email', { email: string }>;
const active: boolean = form.getActive();
form.suspend(); form.resume(); form.destroy();
const refreshed: boolean = form.refreshParticipantActivity('email');
form.refreshParticipant('email', 'value'); form.refreshParticipant('email', 'baseline');
const existingRefresh: Pick<FormConnection<'email'>, 'refreshParticipant'> = { refreshParticipant(id) { return id === 'email'; } }; void existingRefresh;
// @ts-expect-error Refresh scopes are a closed public vocabulary.
form.refreshParticipant('email', 'arbitrary');
form.registerParticipant({ id: 'email', element: document.createElement('input'), get active() { return false; } });
void refreshed;
void active;

const fileInput = createFileInput({ element: document.createElement('input'), value: [],
  policy: { multiple: true, maxFiles: 5, accept: '.txt' }, onValueChange(files, source) {
    const file: File | undefined = files[0]; const typedSource: FileInputChangeSource = source; void file; void typedSource;
    // @ts-expect-error Native files are readonly, not an editable collection.
    files.push(new File([], 'bad'));
  },
});
fileInput.syncControlledValue([new File([], 'first.txt')]);
fileInput.syncPolicy({ accept: '.csv', maxFileSize: 2048 });
const nativePolicy = fileInput.getPolicy(); void nativePolicy;
fileInput.selectFiles(nativeFiles); fileInput.setDropTarget(document.createElement('div'));
const participant: FormParticipant<'file'> = { id: 'file', element: document.createElement('input'), prepareSubmission: () => {
  const ready = fileInput.refresh(); if (!ready.ok) throw ready.error;
} };
void participant;
// @ts-expect-error Text values cannot stand in for native files.
fileInput.syncControlledValue(['fake-file']);
// @ts-expect-error The platform owner requires an actual input element.
tryCreateFileInput({ element: document.createElement('button') });
fileInput.destroy();
