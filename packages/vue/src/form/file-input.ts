import {
  computed, defineComponent, h, inject, mergeProps, onBeforeUnmount, onMounted, onScopeDispose,
  provide, shallowRef, useTemplateRef, watch,
  type ComputedRef, type EmitsToProps, type InjectionKey, type PropType, type PublicProps, type SlotsType, type VNodeChild,
} from 'vue';
import { tryCreateFileInput, type FileInputChangeSource, type FileInputConnection, type FileInputErrorCode } from '@sectile/dom/form/file-input';
import type { FacadeConnection } from '@sectile/core/adapter-runtime';
import type { SectileError } from '@sectile/core/result';
import type { FilePolicy, FilePolicyOptions, FileSelection } from '@sectile/form/files';
import { Primitive, type PrimitiveAs, type PrimitiveElementExpose } from '../primitive.js';
import { createComponentHandle, type ComponentHandle } from '../component-handle.js';
import { useHostActive } from '../host-provider.js';
import { useControlledStateInvariant } from '../internal/controlled-state.js';
import { useConnectionLifetime } from '../internal/connection-lifetime.js';
import { useNextTickTask } from '../internal/scheduled-task.js';
import { nativeInputControlCapabilities, useFormControl, useFormFieldDefaults } from './control.js';
import { partProps } from './part.js';

export type { FileInputChangeSource, FileInputErrorCode } from '@sectile/dom/form/file-input';
export type { FilePolicyOptions } from '@sectile/form/files';
export interface FileInputRootProps {
  readonly modelValue?: readonly File[];
  readonly defaultValue?: readonly File[];
  readonly policy?: FilePolicyOptions;
  readonly id?: string;
  readonly name?: string;
  readonly form?: string;
  readonly required?: boolean;
  readonly disabled?: boolean;
  readonly readonly?: boolean;
  readonly as?: PrimitiveAs;
  readonly asChild?: boolean;
}
export interface FileInputSlotProps {
  readonly files: readonly File[];
  /** Undefined until the native owner admits a nonempty authored selection. */
  readonly totalSize: number | undefined;
  readonly ready: boolean;
  readonly disabled: boolean;
  readonly readonly: boolean;
  readonly required: boolean;
  readonly faulted: boolean;
  readonly error: SectileError<FileInputErrorCode> | undefined;
}
export interface FileInputPartProps { readonly as?: PrimitiveAs; readonly asChild?: boolean }
export interface FileInputInputExpose { readonly element: HTMLInputElement | null }
export type FileInputRootEmits = {
  'update:modelValue': [files: readonly File[]];
  change: [files: readonly File[], source: FileInputChangeSource];
  reject: [error: SectileError<FileInputErrorCode>];
};
export interface FileInputRootSlots { default: (state: FileInputSlotProps) => VNodeChild }
export interface FileInputRootExpose extends PrimitiveElementExpose {
  readonly input: HTMLInputElement | null;
  readonly files: readonly File[];
  open(): boolean;
  focus(): boolean;
  clear(): boolean;
  selectFiles(files: ArrayLike<File>): boolean;
  refresh(): boolean;
}
type NativeFileInput = FacadeConnection<FileInputConnection>;
interface FileInputViewControl { element: HTMLElement | null; input: HTMLInputElement | null; native: NativeFileInput | undefined; files: readonly File[] }
const noFiles: readonly File[] = Object.freeze([]);
function projectElement<ElementType extends Element>(current: () => ElementType | null): { readonly element: ElementType | null } {
  return { get element() { return current(); } };
}
function createFileInputHandle(): ComponentHandle<FileInputViewControl, FileInputRootExpose> {
  return createComponentHandle(current => ({
    get element() { return current()?.element ?? null; },
    get input() { return current()?.input ?? null; },
    get files() { return current()?.native?.getSnapshot().state.files ?? current()?.files ?? noFiles; },
    open: () => current()?.native?.open() ?? false,
    focus: () => current()?.native?.focus() ?? false,
    clear: () => current()?.native?.clear().ok ?? false,
    selectFiles: files => current()?.native?.selectFiles(files).ok ?? false,
    refresh: () => { const native = current()?.native; return native?.getActive() ? native.refresh().ok : false; },
  }));
}
interface FileInputContext {
  readonly state: ComputedRef<FileInputSlotProps>;
  readonly inputProps: ComputedRef<Readonly<Record<string, unknown>>>;
  readonly actions: FileInputRootExpose;
  claimInput(): () => void;
  setInput(element: HTMLInputElement | null): void;
  claimDropzone(): () => void;
  setDropzone(element: HTMLElement | null): void;
}
const contextKey: InjectionKey<FileInputContext> = Symbol('SectileFileInput');
function useFileInputContext(name: string): FileInputContext {
  const context = inject(contextKey);
  if (!context) throw new TypeError(`${name} requires FileInputRoot.`);
  return context;
}
function createFileInputRoot() {
  return defineComponent({
  name: 'SectileFileInputRoot', inheritAttrs: false,
  props: {
    ...partProps,
    modelValue: { type: Array as PropType<readonly File[]>, default: undefined },
    defaultValue: { type: Array as PropType<readonly File[]>, default: undefined },
    policy: { type: Object as PropType<FilePolicyOptions>, default: undefined },
    id: { type: String, default: undefined }, name: { type: String, default: undefined }, form: { type: String, default: undefined },
    required: { type: Boolean, default: undefined }, disabled: { type: Boolean, default: undefined }, readonly: { type: Boolean, default: undefined },
  },
  emits: {
    'update:modelValue': (_files: readonly File[]): boolean => true,
    change: (_files: readonly File[], _source: FileInputChangeSource): boolean => true,
    reject: (_error: SectileError<FileInputErrorCode>): boolean => true,
  },
  slots: Object as SlotsType<{ default: (state: FileInputSlotProps) => VNodeChild }>,
  setup(props, { attrs, emit, expose, slots }) {
    const controlled = useControlledStateInvariant('FileInputRoot', 'modelValue', () => props.modelValue);
    const active = useHostActive(), defaults = useFormFieldDefaults();
    const interaction = computed(() => ({ disabled: props.disabled ?? defaults?.value.disabled ?? false,
      readOnly: props.readonly ?? defaults?.value.readonly ?? false, required: props.required ?? defaults?.value.required ?? false }));
    const input = shallowRef<HTMLInputElement | null>(null), dropzone = shallowRef<HTMLElement | null>(null);
    const selection = shallowRef<FileSelection<File>>(), policy = shallowRef<FilePolicy>(), error = shallowRef<SectileError<FileInputErrorCode>>();
    const ready = shallowRef(false), faulted = shallowRef(false), admissionFailed = shallowRef(false);
    const control: FileInputViewControl = { element: null, input: null, native: undefined, files: props.modelValue ?? props.defaultValue ?? noFiles };
    const handle = createFileInputHandle(); handle.set(control); expose(handle.view);
    let alive = true, epoch: object | undefined, initialFiles = props.modelValue ?? props.defaultValue ?? noFiles;
    let connectedInput: HTMLInputElement | null = null, pendingPolicy = false, pendingValue = false;
    let inputClaimed = false, dropzoneClaimed = false;
    let resetProposal = false;
    const resetProposalTask = useNextTickTask(() => { resetProposal = false; });
    const publish = (): void => {
      const native = control.native;
      if (!alive || !native) return;
      const previous = selection.value?.files;
      selection.value = native.getSnapshot().state; policy.value = native.getPolicy();
      control.files = selection.value.files;
      faulted.value = native.getFaulted(); ready.value = native.getActive();
      if (participation.participating && previous !== selection.value.files) valueTask.schedule();
    };
    const reject = (failure: SectileError<FileInputErrorCode>): void => { error.value = failure; emit('reject', failure); };
    const participation = useFormControl({
      element: input, semanticControl: input, focusTarget: input, validationTarget: input, labelMode: 'for',
      capabilities: { ...nativeInputControlCapabilities, readonly: false },
      getValue: () => control.native?.getSnapshot().state.files ?? selection.value?.files ?? initialFiles,
      prepareSubmission: () => {
        if (admissionFailed.value) throw error.value;
        const result = control.native?.refresh(); if (result && !result.ok) throw result.error;
        valueTask.cancel(); participation.refreshValue?.();
      },
    });
    const valueTask = useNextTickTask(() => participation.refreshValue?.());
    const release = (): void => {
      const held = control.native;
      if (alive && held && connectedInput === input.value) { held.suspend(); publish(); return; }
      epoch = undefined; const native = control.native; control.native = undefined; ready.value = false;
      connectedInput = null;
      try { if (alive && native) { selection.value = native.getSnapshot().state; control.files = selection.value.files; policy.value = native.getPolicy(); } }
      finally { native?.destroy(); }
    };
    const attach = ([element, available]: readonly [HTMLInputElement | null, boolean]): void => {
      if (!alive || !element || !available) return;
      if (control.native && connectedInput === element) { control.native.resume(); publish(); return; }
      const token = {}; epoch = token;
      if (admissionFailed.value) element.disabled = interaction.value.disabled;
      admissionFailed.value = false;
      const result = tryCreateFileInput({ element, ...interaction.value,
        policy: policy.value ?? props.policy ?? {},
        ...(controlled ? { value: selection.value?.files ?? props.modelValue ?? initialFiles } : { defaultValue: selection.value?.files ?? initialFiles }),
        ...(dropzone.value === null ? {} : { dropTarget: dropzone.value }),
        onUpdate() { if (alive && epoch === token) publish(); },
        onValueChange(files, source) { if (alive && epoch === token) {
          error.value = undefined; resetProposalTask.cancel(); resetProposal = controlled && source === 'reset';
          if (!controlled && source === 'reset') { valueTask.cancel(); participation.refreshValue?.('baseline'); }
          emit('update:modelValue', files); if (alive && epoch === token) emit('change', files, source);
          if (resetProposal && alive && epoch === token) resetProposalTask.schedule();
        } },
        onReject(failure) { if (alive && epoch === token) reject(failure); },
      });
      if (!alive || epoch !== token) { if (result.ok) result.value.destroy(); return; }
      if (!result.ok) { admissionFailed.value = true; element.disabled = true; reject(result.error); return; }
      control.native = result.value; connectedInput = element; error.value = undefined; publish();
      // Reattach admitted state first. Only requests made while no native owner
      // existed need admission; previously rejected props must not be replayed.
      const configurePolicy = pendingPolicy, configureValue = pendingValue;
      pendingPolicy = false; pendingValue = false;
      if (configurePolicy) result.value.syncPolicy(props.policy ?? {});
      if (configureValue && props.modelValue !== undefined) result.value.syncControlledValue(props.modelValue);
    };
    useConnectionLifetime({ read: () => [input.value, active.value] as const,
      equal: (a, b) => a[0] === b[0] && a[1] === b[1], connect: attach, disconnect: release,
      dispose() {
        alive = false; resetProposal = false; pendingPolicy = false; pendingValue = false; handle.release(); initialFiles = noFiles; selection.value = undefined; policy.value = undefined;
        error.value = undefined; control.files = noFiles; control.input = null; control.element = null; input.value = null; dropzone.value = null;
      },
    });
    watch(() => props.modelValue, files => {
      if (!controlled || files === undefined) return;
      if (!control.native) { initialFiles = files; pendingValue = selection.value !== undefined; return; }
      const reset = resetProposal; resetProposal = false;
      const result = control.native.syncControlledValue(files); if (result.ok) {
        error.value = undefined; publish();
        if (reset) { valueTask.cancel(); participation.refreshValue?.('baseline'); }
      }
    }, { flush: 'sync' });
    watch(() => props.policy, value => {
      if (control.native) { const result = control.native.syncPolicy(value ?? {}); if (result.ok) { error.value = undefined; publish(); } }
      else { pendingPolicy = selection.value !== undefined; if (admissionFailed.value) attach([input.value, active.value]); }
    });
    watch(interaction, value => { control.native?.syncInteraction(value); }, { flush: 'sync' });
    watch(dropzone, value => { control.native?.setDropTarget(value); }, { flush: 'post' });
    watch([() => props.form, () => props.name, () => props.id], () => { control.native?.refresh(); }, { flush: 'post' });
    const state = computed<FileInputSlotProps>(() => ({
      files: selection.value?.files ?? initialFiles, totalSize: selection.value?.totalSize ?? (initialFiles.length === 0 ? 0 : undefined),
      ready: ready.value, disabled: interaction.value.disabled, readonly: interaction.value.readOnly,
      required: interaction.value.required, faulted: faulted.value, error: error.value,
    }));
    const inputProps = computed(() => ({ ...participation.controlProps.value,
      ...(props.id === undefined ? {} : { id: props.id }), ...(props.name === undefined ? {} : { name: props.name }), ...(props.form === undefined ? {} : { form: props.form }),
      type: 'file', disabled: interaction.value.disabled || faulted.value || admissionFailed.value, required: interaction.value.required,
      accept: policy.value?.accept ?? props.policy?.accept, multiple: policy.value?.multiple ?? props.policy?.multiple ?? false,
      'data-scope': 'file-input', 'data-part': 'input',
    }));
    provide(contextKey, { state, inputProps, actions: handle.view,
      claimInput() { if (inputClaimed) throw new TypeError('FileInputRoot requires at most one FileInputInput.'); inputClaimed = true; return () => { inputClaimed = false; }; },
      setInput(value) { control.input = value; input.value = value; },
      claimDropzone() { if (dropzoneClaimed) throw new TypeError('FileInputRoot requires at most one FileInputDropzone.'); dropzoneClaimed = true; return () => { dropzoneClaimed = false; }; },
      setDropzone(value) { dropzone.value = value; },
    });
    return (): VNodeChild => h(Primitive, mergeProps(attrs, {
      as: props.as, asChild: props.asChild, elementRef: (value: unknown) => { control.element = value as HTMLElement | null; },
      inert: !active.value ? true : undefined, 'data-scope': 'file-input', 'data-part': 'root',
      'data-disabled': interaction.value.disabled ? '' : undefined, 'data-readonly': interaction.value.readOnly ? '' : undefined,
      'data-state': faulted.value || admissionFailed.value ? 'error' : ready.value ? 'ready' : 'pending',
    }), { default: () => slots.default?.(state.value) });
  },
  });
}
const Root = /* @__PURE__ */ createFileInputRoot();
type RootInstance = InstanceType<typeof Root> & FileInputRootExpose;
export type FileInputRootPublicProps = FileInputRootProps & PublicProps & EmitsToProps<FileInputRootEmits>;
export const FileInputRoot: new (props: FileInputRootPublicProps) => Omit<RootInstance, '$props'> & { readonly $props: FileInputRootPublicProps }
  = Root as unknown as new (props: FileInputRootPublicProps) => Omit<RootInstance, '$props'> & { readonly $props: FileInputRootPublicProps };

const Input = /* @__PURE__ */ defineComponent({
  name: 'SectileFileInputInput', inheritAttrs: false,
  setup(_props, { attrs, expose }) {
    const context = useFileInputContext('FileInputInput'), release = context.claimInput();
    const element = useTemplateRef<HTMLInputElement>('input');
    const handle = createComponentHandle<HTMLInputElement, FileInputInputExpose>(projectElement);
    expose(handle.view);
    onMounted(() => { handle.set(element.value); context.setInput(element.value); });
    onBeforeUnmount(() => { context.setInput(null); });
    onScopeDispose(() => { release(); handle.release(); });
    return (): VNodeChild => { const { value: _value, defaultValue: _defaultValue, readonly: _readonly, readOnly: _readOnly, ...nativeAttrs } = attrs;
      return h('input', mergeProps(nativeAttrs, context.inputProps.value, { ref: 'input' })); };
  },
});
type InputInstance = InstanceType<typeof Input> & FileInputInputExpose;
export const FileInputInput: new (props: PublicProps) => InputInstance = Input as unknown as new (props: PublicProps) => InputInstance;
function createFileAction(clear: boolean) {
  return defineComponent({
    name: clear ? 'SectileFileInputClear' : 'SectileFileInputTrigger', inheritAttrs: false,
    props: { ...partProps, as: { ...partProps.as, default: 'button' } },
    slots: Object as SlotsType<{ default: (state: FileInputSlotProps) => VNodeChild }>,
    setup(props, { attrs, expose, slots }) {
      const context = useFileInputContext(clear ? 'FileInputClear' : 'FileInputTrigger');
      const handle = createComponentHandle<Element, PrimitiveElementExpose>(projectElement); expose(handle.view); onScopeDispose(handle.release);
      return (): VNodeChild => {
        const state = context.state.value, blocked = !state.ready || state.disabled || state.readonly || state.faulted || clear && state.files.length === 0;
        return h(Primitive, mergeProps(attrs, { as: props.as, asChild: props.asChild, type: 'button', disabled: blocked,
          elementRef(value: unknown) { handle.set(value as Element | null); },
          'aria-disabled': blocked ? 'true' : undefined, 'data-scope': 'file-input', 'data-part': clear ? 'clear' : 'trigger',
          onClick(event: Event) { if (!event.defaultPrevented && !blocked) { if (clear) context.actions.clear(); else context.actions.open(); } },
        }), { default: () => slots.default?.(state) });
      };
    },
  });
}
type ActionInstance = InstanceType<ReturnType<typeof createFileAction>> & PrimitiveElementExpose;
export const FileInputTrigger: new (props: FileInputPartProps & PublicProps) => ActionInstance = /* @__PURE__ */ createFileAction(false) as unknown as new (props: FileInputPartProps & PublicProps) => ActionInstance;
export const FileInputClear: new (props: FileInputPartProps & PublicProps) => ActionInstance = /* @__PURE__ */ createFileAction(true) as unknown as new (props: FileInputPartProps & PublicProps) => ActionInstance;
const Dropzone = /* @__PURE__ */ defineComponent({
  name: 'SectileFileInputDropzone', inheritAttrs: false, props: partProps,
  slots: Object as SlotsType<{ default: (state: FileInputSlotProps) => VNodeChild }>,
  setup(props, { attrs, expose, slots }) {
    const context = useFileInputContext('FileInputDropzone'), release = context.claimDropzone();
    const handle = createComponentHandle<HTMLElement, PrimitiveElementExpose>(projectElement); expose(handle.view);
    onBeforeUnmount(() => context.setDropzone(null)); onScopeDispose(() => { release(); handle.release(); });
    return (): VNodeChild => h(Primitive, mergeProps(attrs, { as: props.as, asChild: props.asChild,
      elementRef(value: unknown) { handle.set(value as HTMLElement | null); context.setDropzone(value as HTMLElement | null); },
      'data-scope': 'file-input', 'data-part': 'dropzone',
    }), { default: () => slots.default?.(context.state.value) });
  },
});
type DropzoneInstance = InstanceType<typeof Dropzone> & PrimitiveElementExpose;
export const FileInputDropzone: new (props: FileInputPartProps & PublicProps) => DropzoneInstance = Dropzone as unknown as new (props: FileInputPartProps & PublicProps) => DropzoneInstance;
