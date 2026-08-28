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
  options: { readonly reset?: () => void } = {},
): FormControlParticipation {
  return useFormControl({
    element: element as FormElementSource<HTMLInputElement>,
    semanticControl: element as FormElementSource<HTMLInputElement>,
    focusTarget: element as FormElementSource<HTMLInputElement>,
    validationTarget: element as FormElementSource<HTMLInputElement>,
    labelMode: 'for',
    capabilities: nativeInputControlCapabilities,
    ...(options.reset === undefined ? {} : { reset: options.reset }),
  });
}

export function useCompositeFormControl(options: {
  readonly root: FormElementSource;
  readonly focusTarget?: FormElementSource;
  readonly validationTarget?: FormElementSource;
  readonly submissions?: FormSubmissionSource;
  readonly labelMode?: FormLabelMode;
  readonly reset?: () => void;
}): FormControlParticipation {
  return useFormControl({
    element: options.root,
    semanticControl: options.root,
    focusTarget: options.focusTarget ?? options.root,
    validationTarget: options.validationTarget ?? options.root,
    labelMode: options.labelMode ?? 'labelledby',
    capabilities: compositeControlCapabilities,
    ...(options.submissions === undefined ? {} : { submissions: options.submissions }),
    ...(options.reset === undefined ? {} : { reset: options.reset }),
  });
}

export function provideFormControlOwner(): void {
  provide(formControlOwnerKey, true);
}

function explicitMetadataAttributes(
  vnodeProps: Readonly<Record<string, unknown>> | null,
): readonly FormMetadataAttribute[] {
  if (vnodeProps === null) return [];
  const aliases: Readonly<Record<FormMetadataAttribute, readonly string[]>> = {
    id: ['id'],
    name: ['name'],
    form: ['form'],
    required: ['required'],
    disabled: ['disabled'],
    readonly: ['readonly', 'readOnly'],
    'aria-describedby': ['aria-describedby', 'ariaDescribedby'],
    'aria-errormessage': ['aria-errormessage', 'ariaErrormessage'],
    'aria-invalid': ['aria-invalid', 'ariaInvalid'],
    'aria-labelledby': ['aria-labelledby', 'ariaLabelledby'],
    'aria-disabled': ['aria-disabled', 'ariaDisabled'],
    'aria-required': ['aria-required', 'ariaRequired'],
    'aria-readonly': ['aria-readonly', 'ariaReadonly'],
  };
  return (Object.entries(aliases) as [FormMetadataAttribute, readonly string[]][])
    .filter(([, names]) => names.some((name) => Object.hasOwn(vnodeProps, name)))
    .map(([attribute]) => attribute);
}
