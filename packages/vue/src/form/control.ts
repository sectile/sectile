import {
  computed,
  getCurrentInstance,
  inject,
  onBeforeUpdate,
  onBeforeUnmount,
  onMounted,
  provide,
  shallowRef,
  type ComputedRef,
  type ShallowRef,
} from 'vue';

export type FormControlPathSegment = string | number;
export type FormControlRelativePath = FormControlPathSegment | readonly FormControlPathSegment[];
export type FormControlSubmissionElement =
  | HTMLButtonElement
  | HTMLInputElement
  | HTMLSelectElement
  | HTMLTextAreaElement;
export type FormLabelMode = 'for' | 'labelledby' | 'legend';
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
interface FormControlResetContext { readonly field: FormControlFieldContext; readonly reset: () => void }

// Isolate the reader from the provider's props, participants and Form controller.
function fieldDefaultsView(source: Readonly<ShallowRef<FormFieldDefaults>>): ComputedRef<FormFieldDefaults> {
  return computed(() => source.value);
}

/** Read inherited control defaults without registering another semantic control. */
export function useFormFieldDefaults(): ComputedRef<FormFieldDefaults> | undefined {
  const source = inject<FormControlFieldContext | null>(formControlFieldContextKey, null)?.defaults;
  return source === undefined || inject(formControlOwnerKey, false) ? undefined : fieldDefaultsView(source);
}

/** A derived control decorates its inner owner's registration, not a second control. */
export function provideFormControlReset(reset: () => void): void {
  const field = inject<FormControlFieldContext | null>(formControlFieldContextKey, null);
  if (field !== null) provide<FormControlResetContext>(formControlResetKey, { field, reset });
}

export function provideFormControlFieldContext(context: FormControlFieldContext): void {
  provide(formControlFieldContextKey, context);
}

/** Project an existing composite owner's native submission; never register another control. */
export function useFormSubmissionProps(submission: FormSubmissionRegistration): ComputedRef<Readonly<Record<string, unknown>>> {
  const field = inject<FormControlFieldContext | null>(formControlFieldContextKey, null);
  return computed(() => field?.submissionAttributesFor(submission) ?? {});
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
  const field = inject<FormControlFieldContext | null>(formControlFieldContextKey, null);
  const owned = inject(formControlOwnerKey, false);
  const resetOwner = inject<FormControlResetContext | null>(formControlResetKey, null);
  if (field === null || owned) return Object.freeze({
    participating: false, controlProps: computed<Readonly<Record<string, unknown>>>(() => Object.freeze({})),
  });
  const explicit = useFormMetadataPresence(registration.explicit);
  const normalized = { ...registration, get explicit() { return explicit.value; } };
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
  return useFormControl(withFormCallbacks({
    element: element as FormElementSource<HTMLInputElement>,
    semanticControl: element as FormElementSource<HTMLInputElement>,
    focusTarget: element as FormElementSource<HTMLInputElement>,
    validationTarget: element as FormElementSource<HTMLInputElement>,
    labelMode: 'for',
    capabilities: nativeInputControlCapabilities,
  }, options));
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
