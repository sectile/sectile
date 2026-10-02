import {
  computed,
  getCurrentInstance,
  inject,
  onBeforeUnmount,
  onMounted,
  provide,
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
  readonly getValue?: (() => unknown) | undefined;
  readonly isValueEqual?: ((current: unknown, baseline: unknown) => boolean) | undefined;
}

export interface FormControlParticipation {
  readonly participating: boolean;
  readonly controlProps: ComputedRef<Readonly<Record<string, unknown>>>;
}

export interface FormControlFieldContext {
  readonly registerControl: (registration: FormControlRegistration) => () => void;
  readonly attributesFor: (registration: FormControlRegistration) => Readonly<Record<string, unknown>>;
}

const formControlFieldContextKey = Symbol('SectileFormControlField');
const formControlOwnerKey = Symbol('SectileFormControlOwner');

export function provideFormControlFieldContext(context: FormControlFieldContext): void {
  provide(formControlFieldContextKey, context);
}

export function useFormControl(registration: FormControlRegistration): FormControlParticipation {
  const field = inject<FormControlFieldContext | null>(formControlFieldContextKey, null);
  const owned = inject(formControlOwnerKey, false);
  const instance = getCurrentInstance();
  const explicit = Object.freeze([
    ...new Set([
      ...(registration.explicit ?? []),
      ...explicitMetadataAttributes(instance?.vnode.props ?? null),
    ]),
  ]);
  const normalized = Object.freeze({ ...registration, explicit });
  const controlProps = computed<Readonly<Record<string, unknown>>>(() => (
    field !== null && !owned ? field.attributesFor(normalized) : Object.freeze({})
  ));
  let unregister: (() => void) | undefined;
  if (field !== null && !owned) {
    onMounted(() => { unregister = field.registerControl(normalized); });
    onBeforeUnmount(() => unregister?.());
  }
  return Object.freeze({ participating: field !== null && !owned, controlProps });
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

const formCallbackKeys = ['reset', 'getValue', 'isValueEqual'] as const;

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

function explicitMetadataAttributes(
  vnodeProps: Readonly<Record<string, unknown>> | null,
): readonly FormMetadataAttribute[] {
  const explicit: FormMetadataAttribute[] = [];
  if (vnodeProps !== null) {
    for (const attribute of metadataAttributes) {
      if (Object.hasOwn(vnodeProps, attribute) || Object.hasOwn(vnodeProps, metadataAliases[attribute])) {
        explicit.push(attribute);
      }
    }
  }
  return explicit;
}
