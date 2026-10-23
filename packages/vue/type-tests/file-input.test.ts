import { h, useTemplateRef } from 'vue';
import { FileInputRoot, FileInputInput, FileInputTrigger, FileInputClear, FileInputDropzone,
  type FileInputRootProps, type FileInputRootPublicProps, type FileInputRootExpose, type FileInputRootSlots, type FileInputRootEmits,
} from '@sectile/vue/form/file-input';
import type { FormControlRegistration } from '@sectile/vue/form';
const files: readonly File[] = [new File(['body'], 'one.txt')];
const props: FileInputRootProps = { modelValue: files, policy: { accept: '.txt', multiple: true, maxFiles: 4 }, name: 'files' };
const consumerProps: FileInputRootPublicProps = { ...props, 'onUpdate:modelValue': value => { const file: File | undefined = value[0]; void file; },
  onChange: (value, source) => { const file: File | undefined = value[0]; void file; void source; } };
h(FileInputRoot, consumerProps);
h(FileInputInput); h(FileInputTrigger, { asChild: true }); h(FileInputClear); h(FileInputDropzone);
const root = useTemplateRef<InstanceType<typeof FileInputRoot>>('files');
const nativePart = useTemplateRef<InstanceType<typeof FileInputInput>>('native');
const trigger = useTemplateRef<InstanceType<typeof FileInputTrigger>>('trigger');
const dropzone = useTemplateRef<InstanceType<typeof FileInputDropzone>>('dropzone');
const nativeElement: HTMLInputElement | null = nativePart.value?.element ?? null;
const triggerElement: Element | null = trigger.value?.element ?? null, dropElement: Element | null = dropzone.value?.element ?? null;
void nativeElement; void triggerElement; void dropElement;
const view: FileInputRootExpose | null = root.value;
const input: HTMLInputElement | null = view?.input ?? null;
view?.clear(); view?.open(); view?.focus(); view?.refresh(); view?.selectFiles(files); void input;
const field: FormControlRegistration = { element: () => null, prepareSubmission() { view?.refresh(); } }; void field;
const slots: FileInputRootSlots = { default(state) {
  const file: File | undefined = state.files[0], total: number | undefined = state.totalSize;
  const pending: boolean = !state.ready; void file; void total; void pending;
  // @ts-expect-error Published selections are not writable lists.
  state.files.push(new File([], 'bad'));
  return 'Files';
} }; void slots;
const change: FileInputRootEmits['change'] = [files, 'drop']; void change;
// @ts-expect-error Native file models cannot contain filenames in place of Files.
h(FileInputRoot, { modelValue: ['one.txt'] });
// @ts-expect-error Native file values are arrays, including single mode.
h(FileInputRoot, { modelValue: files[0] });
// @ts-expect-error Public refs are read-only.
if (view) view.input = null;
