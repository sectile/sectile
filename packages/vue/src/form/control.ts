import {
  computed,
  getCurrentInstance,
  inject,
  onBeforeUpdate,
  onBeforeUnmount,
  onMounted,
  provide,
  shallowRef,
  Fragment,
  isVNode,
  type ComputedRef,
  type ShallowRef,
  type VNodeChild,
} from 'vue';

export type FormControlPathSegment = string | number;
export type FormControlRelativePath = FormControlPathSegment | readonly FormControlPathSegment[];
export type FormControlSubmissionElement =
  | HTMLButtonElement
  | HTMLInputElement
  | HTMLSelectElement
  | HTMLTextAreaElement;
export type FormLabelMode = 'for' | 'labelledby' | 'legend';
/** Components use this literal option key so unused initializers remain tree-shakable. */
export const formLabelModeKey = '__sectileFormLabelMode';

/** Inspect materialized native/Fragment children without evaluating component slots. */
export function visitFormComponents(children: VNodeChild, visit: (component: Readonly<Record<string, unknown>>) => boolean | void): void {
  const pending = [children];
  while (pending.length > 0) {
    const child = pending.pop();
    if (Array.isArray(child)) {
      for (let index = child.length - 1; index >= 0; index--) pending.push(child[index]);
    } else if (isVNode(child)) {
      const type = child.type;
      if (typeof type === 'string' || type === Fragment) pending.push(child.children as VNodeChild);
      else if ((typeof type === 'object' || typeof type === 'function') && visit(type as unknown as Record<string, unknown>) === false) return;
    }
  }
}
export type FormMetadataAttribute =
  | 'id'
  | 'name'
  | 'form'
  | 'required'
  | 'disabled'
  | 'readonly'
  | 'aria-describedby'
  | 'aria-errormessage'
  | 'aria-invalid'
  | 'aria-labelledby'
  | 'aria-disabled'
  | 'aria-required'
  | 'aria-readonly';

export interface FormControlCapabilities {
  readonly id?: boolean;
  readonly name?: boolean;
  readonly form?: boolean;
  readonly describedBy?: boolean;
  readonly invalid?: boolean;
  readonly labelledBy?: boolean;
  readonly required?: boolean;
  readonly disabled?: boolean;
  readonly readonly?: boolean;
}

export interface FormSubmissionCapabilities {
  readonly name?: boolean;
  readonly form?: boolean;
  readonly required?: boolean;
  readonly disabled?: boolean;
  readonly readonly?: boolean;
}

export type FormElementSource<ElementType extends HTMLElement = HTMLElement> =
  | Readonly<ShallowRef<ElementType | null | undefined>>
  | (() => ElementType | null);

export interface FormSubmissionRegistration {
  readonly element: FormElementSource<FormControlSubmissionElement>;
  readonly relativeName?: FormControlRelativePath;
  readonly capabilities?: FormSubmissionCapabilities;
  readonly explicit?: readonly FormMetadataAttribute[];
}

export type FormSubmissionSource =
  | readonly FormSubmissionRegistration[]
  | (() => readonly FormSubmissionRegistration[]);

export interface FormControlRegistration {
  readonly element: FormElementSource;
  readonly semanticControl?: FormElementSource;
  readonly focusTarget?: FormElementSource;
  readonly validationTarget?: FormElementSource;
  readonly submissions?: FormSubmissionSource;
  readonly labelMode?: FormLabelMode;
  readonly capabilities?: FormControlCapabilities;
  readonly explicit?: readonly FormMetadataAttribute[];
  readonly reset?: () => void;
  readonly prepareSubmission?: (() => void) | undefined;
  readonly getValue?: (() => unknown) | undefined;
  readonly isValueEqual?: ((current: unknown, baseline: unknown) => boolean) | undefined;
}

export interface FormControlParticipation {
  readonly participating: boolean;
  readonly controlProps: ComputedRef<Readonly<Record<string, unknown>>>;
  /** Publish accepted asynchronous control values, or their explicit reset baseline. */
  readonly refreshValue?: (mode?: 'value' | 'baseline') => void;
}

export interface FormFieldDefaults {
  readonly disabled: boolean;
  readonly readonly: boolean;
  readonly required: boolean;
}

export interface FormControlFieldContext {
  readonly registerControl: (registration: FormControlRegistration) => () => void;
  readonly attributesFor: (registration: FormControlRegistration) => Readonly<Record<string, unknown>>;
  readonly submissionAttributesFor: (submission: FormSubmissionRegistration) => Readonly<Record<string, unknown>>;
  readonly defaults?: Readonly<ShallowRef<FormFieldDefaults>>;
  readonly refreshControl?: (registration: FormControlRegistration, mode?: 'value' | 'baseline') => void;
}

class FormControlValueRefresh {
  #field: FormControlFieldContext | undefined;
  #registration: FormControlRegistration | undefined;
  public constructor(field: FormControlFieldContext, registration: FormControlRegistration) { this.#field = field; this.#registration = registration; }
  public refresh = (mode: 'value' | 'baseline' = 'value'): void => {
    if (this.#registration) this.#field?.refreshControl?.(this.#registration, mode);
  };
  public release(): void { this.#field = undefined; this.#registration = undefined; }
}
const inactiveRefresh = (): void => {};

const formControlFieldContextKey = Symbol('SectileFormControlField');
const formControlOwnerKey = Symbol('SectileFormControlOwner');
const formControlResetKey = Symbol('SectileFormControlReset');
const formControlFlagsKey = Symbol('SectileFormControlFlags');
const controlMetadataKey = /* @__PURE__ */ Symbol('SectileControlMetadata');
type MetadataControlRegistration = FormControlRegistration & { [controlMetadataKey]?: Readonly<Record<string, unknown>> | undefined };
export function formControlMetadata(registration: FormControlRegistration): Readonly<Record<string, unknown>> | undefined {
  return (registration as MetadataControlRegistration)[controlMetadataKey];
}
interface FormControlFlagsContext {
  readonly defaults: ComputedRef<FormFieldDefaults>;
  readonly explicit: ComputedRef<readonly FormMetadataAttribute[]>;
}
type NativeControlRegistration = FormControlRegistration & { [formControlFlagsKey]?: ComputedRef<readonly FormMetadataAttribute[]> | undefined };
const formFlagKeys = ['disabled', 'readonly', 'required'] as const;
const submissionMetadataKey = /* @__PURE__ */ Symbol('SectileSubmissionMetadata');
type SubmissionMetadataElement = HTMLElement & { [submissionMetadataKey]?: Readonly<ShallowRef<readonly FormMetadataAttribute[]>> };

/** A native part owns metadata that cannot be inferred from absent DOM attributes. */
export function useFormSubmissionMetadata(owned: readonly FormMetadataAttribute[] = []): (element: FormControlSubmissionElement | null) => void {
  const explicit = useFormMetadataPresence(owned);
  let current: SubmissionMetadataElement | null = null;
  const release = (): void => {
    if (current?.[submissionMetadataKey] === explicit) delete current[submissionMetadataKey];
    current = null;
  };
  onBeforeUnmount(release);
  return element => {
    if (element === current) return;
    release(); current = element;
    if (current !== null) current[submissionMetadataKey] = explicit;
  };
}

export function formSubmissionMetadata(element: HTMLElement): readonly FormMetadataAttribute[] | undefined {
  return (element as SubmissionMetadataElement)[submissionMetadataKey]?.value;
}
interface FormControlResetContext { readonly field: FormControlFieldContext; readonly reset: () => void }

function useParticipatingField(): FormControlFieldContext | null {
  return inject(formControlOwnerKey, false) ? null : inject<FormControlFieldContext | null>(formControlFieldContextKey, null);
}

// Isolate the reader from the provider's props, participants and Form controller.
function fieldDefaultsView(source: Readonly<ShallowRef<FormFieldDefaults>>): ComputedRef<FormFieldDefaults> {
  return computed(() => source.value);
}

/** Read inherited control defaults without registering another semantic control. */
export function useFormFieldDefaults(): ComputedRef<FormFieldDefaults> | undefined {
  const source = useParticipatingField()?.defaults;
  return source === undefined ? undefined : fieldDefaultsView(source);
}

/** Match inherited native metadata with the controller's interaction policies. */
export function useFormControlFlags(props: Readonly<{ [Key in keyof FormFieldDefaults]?: boolean | undefined }>): ComputedRef<FormFieldDefaults> {
  const defaults = useParticipatingField()?.defaults;
  const explicit = useFormMetadataPresence();
  const flags = computed<FormFieldDefaults>(previous => {
    const next = {} as { -readonly [Key in keyof FormFieldDefaults]: boolean };
    for (const key of formFlagKeys) next[key] = explicit.value.includes(key) ? props[key] === true : defaults?.value[key] ?? props[key] === true;
    return previous !== undefined && formFlagKeys.every(key => previous[key] === next[key]) ? previous : Object.freeze(next);
  });
  provide<FormControlFlagsContext>(formControlFlagsKey, {
    defaults: flags,
    explicit: computed(() => formFlagKeys.filter(key => explicit.value.includes(key))),
  });
  return flags;
}

/** A derived control decorates its inner owner's registration, not a second control. */
export function provideFormControlReset(reset: () => void): void {
  const field = inject<FormControlFieldContext | null>(formControlFieldContextKey, null);
  if (field !== null) provide<FormControlResetContext>(formControlResetKey, { field, reset });
}

export function provideFormControlFieldContext(context: FormControlFieldContext): void {
  provide(formControlFieldContextKey, context);
  provide(formControlOwnerKey, false);
  provide(formControlFlagsKey, null);
}

/** Project an existing composite owner's native submission; never register another control. */
export function useFormSubmissionProps(
  submission: FormSubmissionRegistration,
  props?: Readonly<Partial<Record<'name' | 'form' | 'required' | 'disabled' | 'readonly', unknown>>>,
): ComputedRef<Readonly<Record<string, unknown>>> {
  const project = useFormSubmissionProjection(props);
  return computed(() => project(submission));
}

/** Project indexed submissions at render time without adding a Form dependency to controls. */
export function useFormSubmissionProjection(
  props?: Readonly<Partial<Record<'name' | 'form' | 'required' | 'disabled' | 'readonly', unknown>>>,
): (submission: FormSubmissionRegistration) => Readonly<Record<string, unknown>> {
  const project = useSubmissionDefaultsProjection();
  const explicit = props === undefined ? undefined : useFormMetadataPresence();
  return submission => {
    const attributes = project(submission);
    if (props !== undefined) for (const key of ['name', 'form', 'required', 'disabled', 'readonly'] as const) {
      if (submission.capabilities?.[key] === true && (explicit!.value.includes(key) || attributes[key] === undefined)) attributes[key] = props[key];
    }
    return attributes;
  };
}

/** Field-only projection for composite parts that own their interaction policies. */
export function useFormSubmissionDefaults(submission: FormSubmissionRegistration): ComputedRef<Readonly<Record<string, unknown>>> {
  const field = useParticipatingField();
  return computed(() => field?.submissionAttributesFor(submission) ?? {});
}

function useSubmissionDefaultsProjection(): (submission: FormSubmissionRegistration) => Record<string, unknown> {
  const field = useParticipatingField();
  const scoped = inject<FormControlFlagsContext | null>(formControlFlagsKey, null);
  return submission => {
    const inherited = { ...field?.submissionAttributesFor(submission) };
    if (field !== null && scoped !== null) for (const key of formFlagKeys) {
      if (submission.capabilities?.[key] === true && scoped.explicit.value.includes(key)) inherited[key] = scoped.defaults.value[key];
    }
    return inherited;
  };
}

/** Preserve authored undefined separately from an absent native metadata attribute. */
export function useFormMetadataPresence(fixedExplicit: readonly FormMetadataAttribute[] = []): Readonly<ShallowRef<readonly FormMetadataAttribute[]>> {
  const instance = getCurrentInstance();
  const fixed = [...fixedExplicit];
  const authored = metadataAttributes.map(attribute => hasMetadataAttribute(instance?.vnode.props ?? null, attribute));
  const collectExplicit = (): readonly FormMetadataAttribute[] => Object.freeze([
    ...new Set([
      ...fixed,
      ...metadataAttributes.filter((_attribute, index) => authored[index]),
    ]),
  ]);
  const explicit = shallowRef(collectExplicit());
  onBeforeUpdate(() => {
    let changed = false;
    for (let index = 0; index < metadataAttributes.length; index++) {
      const next = hasMetadataAttribute(instance?.vnode.props ?? null, metadataAttributes[index]!);
      if (next !== authored[index]) { authored[index] = next; changed = true; }
    }
    if (changed) explicit.value = collectExplicit();
  });
  return explicit;
}

export function useFormControl(registration: FormControlRegistration): FormControlParticipation {
  const field = useParticipatingField();
  const resetOwner = inject<FormControlResetContext | null>(formControlResetKey, null);
  if (field === null) return Object.freeze({
    participating: false, controlProps: computed<Readonly<Record<string, unknown>>>(() => Object.freeze({})),
  });
  const explicit = useFormMetadataPresence(registration.explicit);
  const scoped = (registration as NativeControlRegistration)[formControlFlagsKey];
  const combinedExplicit = scoped === undefined ? explicit : computed(() => [...new Set([...scoped.value, ...explicit.value])]);
  const normalized = { ...registration, [controlMetadataKey]: getCurrentInstance()?.props, get explicit() { return combinedExplicit.value; } };
  if (resetOwner?.field === field) {
    const reset = normalized.reset;
    normalized.reset = () => { resetOwner.reset(); reset?.(); };
  }
  Object.freeze(normalized);
  const controlProps = computed<Readonly<Record<string, unknown>>>(() => field.attributesFor(normalized));
  let unregister: (() => void) | undefined;
  let refresher: FormControlValueRefresh | undefined, disposed = false;
  onMounted(() => { unregister = field.registerControl(normalized); });
  onBeforeUnmount(() => { disposed = true; try { unregister?.(); } finally { unregister = undefined; refresher?.release(); } });
  return Object.freeze({ participating: true, controlProps, get refreshValue() {
    if (disposed) return inactiveRefresh;
    refresher ??= new FormControlValueRefresh(field, normalized);
    return refresher.refresh;
  } });
}

export const nativeInputControlCapabilities = Object.freeze({
  id: true,
  name: true,
  form: true,
  describedBy: true,
  invalid: true,
  required: true,
  disabled: true,
  readonly: true,
}) satisfies FormControlCapabilities;

export const compositeControlCapabilities = Object.freeze({
  id: true,
  describedBy: true,
  invalid: true,
  labelledBy: true,
}) satisfies FormControlCapabilities;

export const hiddenInputSubmissionCapabilities = Object.freeze({
  name: true,
  form: true,
  required: true,
  disabled: true,
}) satisfies FormSubmissionCapabilities;

export const hiddenSelectSubmissionCapabilities = hiddenInputSubmissionCapabilities;

export const hiddenValueSubmissionCapabilities = Object.freeze({
  name: true,
  form: true,
  disabled: true,
}) satisfies FormSubmissionCapabilities;

export function useNativeInputFormControl(
  element: Readonly<ShallowRef<HTMLInputElement | HTMLTextAreaElement | null | undefined>>,
  options: {
    readonly reset?: () => void;
    readonly prepareSubmission?: () => void;
    readonly getValue?: () => unknown;
    readonly isValueEqual?: (current: unknown, baseline: unknown) => boolean;
  } = {},
): FormControlParticipation {
  const registration: NativeControlRegistration = {
    [formControlFlagsKey]: inject<FormControlFlagsContext | null>(formControlFlagsKey, null)?.explicit,
    element: element as FormElementSource<HTMLInputElement>,
    semanticControl: element as FormElementSource<HTMLInputElement>,
    focusTarget: element as FormElementSource<HTMLInputElement>,
    validationTarget: element as FormElementSource<HTMLInputElement>,
    labelMode: 'for',
    capabilities: nativeInputControlCapabilities,
  };
  return useFormControl(withFormCallbacks(registration, options));
}

export function useCompositeFormControl(options: {
  readonly root: FormElementSource;
  readonly focusTarget?: FormElementSource;
  readonly validationTarget?: FormElementSource;
  readonly submissions?: FormSubmissionSource;
  readonly labelMode?: FormLabelMode;
  readonly reset?: () => void;
  readonly prepareSubmission?: () => void;
  readonly getValue?: () => unknown;
  readonly isValueEqual?: (current: unknown, baseline: unknown) => boolean;
}): FormControlParticipation {
  return useFormControl(withFormCallbacks({
    element: options.root,
    semanticControl: options.root,
    focusTarget: options.focusTarget ?? options.root,
    validationTarget: options.validationTarget ?? options.root,
    labelMode: options.labelMode ?? 'labelledby',
    capabilities: compositeControlCapabilities,
    ...(options.submissions === undefined ? {} : { submissions: options.submissions }),
  }, options));
}

const formCallbackKeys = ['reset', 'prepareSubmission', 'getValue', 'isValueEqual'] as const;

function withFormCallbacks(
  registration: FormControlRegistration,
  options: Pick<FormControlRegistration, typeof formCallbackKeys[number]>,
): FormControlRegistration {
  const target = registration as unknown as Record<string, unknown>;
  for (const key of formCallbackKeys) {
    const callback = options[key];
    if (callback !== undefined) target[key] = callback;
  }
  return registration;
}

export function provideFormControlOwner(): void {
  provide(formControlOwnerKey, true);
}

/** An independent surface retains its Form root, while explicit fields establish fresh participation. */
export function provideFormControlBoundary(): void {
  provide(formControlFieldContextKey, null);
  provide(formControlOwnerKey, false);
  provide(formControlFlagsKey, null);
}

const metadataAliases: Readonly<Record<FormMetadataAttribute, string>> = {
  id: 'id', name: 'name', form: 'form', required: 'required', disabled: 'disabled',
  readonly: 'readOnly',
  'aria-describedby': 'ariaDescribedby',
  'aria-errormessage': 'ariaErrormessage',
  'aria-invalid': 'ariaInvalid',
  'aria-labelledby': 'ariaLabelledby',
  'aria-disabled': 'ariaDisabled',
  'aria-required': 'ariaRequired',
  'aria-readonly': 'ariaReadonly',
};
const metadataAttributes = Object.keys(metadataAliases) as FormMetadataAttribute[];

function hasMetadataAttribute(
  vnodeProps: Readonly<Record<string, unknown>> | null,
  attribute: FormMetadataAttribute,
): boolean {
  return vnodeProps !== null && (Object.hasOwn(vnodeProps, attribute) || Object.hasOwn(vnodeProps, metadataAliases[attribute]));
}
