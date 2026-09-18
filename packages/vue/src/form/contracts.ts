import type {
  FormState as DomainFormState,
  FormFieldState as DomainFormFieldState,
  FormFieldMetaInput as DomainFormFieldMetaInput,
  FormIssue as DomainFormIssue,
  FormReinitializeOptions,
  FormSubmissionFailure,
  FormValidationTrigger,
  FormValidationIntent,
  FormIssueSource,
} from '@sectile/form/state';
import type { StandardSchemaV1 } from '@sectile/form/schema';
import type { FormFieldPath } from '@sectile/form/path';
import type {
  VNodeProps,
  AllowedComponentProps,
  ComponentCustomProps,
  VNodeChild,
  ShallowRef,
} from 'vue';
import type { PrimitiveAs } from '../primitive.js';
import type { ConditionalPresenceProps } from '../presence/conditional-presence.js';

export interface FormState extends DomainFormState<string> {}

export interface FormFieldState extends DomainFormFieldState<string> {}

export interface FormFieldMetaInput extends DomainFormFieldMetaInput {}

export interface FormSubscribeOptions<Selected> {
  readonly equals?: (previous: Selected, next: Selected) => boolean;
}

export type FormSelectorFunction<Selected> = (state: FormState) => Selected;

export type FormFieldSelectorFunction<Selected> = (field: FormFieldState | null) => Selected;

export interface FormIssue extends DomainFormIssue<string> {}

export type FormValues<Shape extends object = Record<string, unknown>> = Readonly<Shape>;

export type FormSchema<
  Input extends object = Record<string, unknown>,
  Output extends object = Input,
> = StandardSchemaV1<FormValues<Input>, FormValues<Output>>;

export type FormSchemaInput<Schema extends StandardSchemaV1> =
  StandardSchemaV1.InferInput<Schema>;

export type FormSchemaOutput<Schema extends StandardSchemaV1> =
  StandardSchemaV1.InferOutput<Schema>;

export interface FormSubmitEvent<Values extends object = Record<string, unknown>> {
  readonly formData: FormData;
  readonly values: FormValues<Values>;
  readonly submitter: HTMLElement | null;
  readonly state: FormState;
  readonly reinitialize: (options?: FormReinitializeOptions) => void;
  readonly nativeEvent: SubmitEvent;
  readonly defaultPrevented: boolean;
  preventDefault(): void;
  stopPropagation(): void;
  stopImmediatePropagation(): void;
}

export interface FormIssueInput {
  readonly id?: string;
  readonly message: string;
  readonly path?: FormFieldPath;
  readonly relatedPaths?: readonly FormFieldPath[];
}

export type FormSubmitIssue = FormIssueInput;

export type FormSubmitResult =
  | void
  | { readonly ok: true }
  | {
      readonly ok: false;
      readonly failure?: FormSubmissionFailure;
      readonly issues?: readonly FormSubmitIssue[];
    };

export type FormSubmitHandler<Values extends object = Record<string, unknown>> =
  (event: FormSubmitEvent<Values>) => FormSubmitResult | PromiseLike<FormSubmitResult>;

export interface FormSubmissionDefinition {
  readonly schema?: never;
  readonly onSubmit: FormSubmitHandler<Record<string, unknown>>;
}

export interface FormSchemaSubmissionDefinition<Schema extends FormSchema<object, object>> {
  readonly schema: Schema;
  readonly onSubmit: FormSubmitHandler<FormSchemaOutput<Schema>>;
}

export function defineFormSubmission<const Schema extends FormSchema<object, object>>(
  definition: FormSchemaSubmissionDefinition<Schema>,
): FormSchemaSubmissionDefinition<Schema>;

export function defineFormSubmission(
  definition: FormSubmissionDefinition,
): FormSubmissionDefinition;

export function defineFormSubmission(
  definition: FormSubmissionDefinition | FormSchemaSubmissionDefinition<FormSchema<object, object>>,
): FormSubmissionDefinition | FormSchemaSubmissionDefinition<FormSchema<object, object>> {
  return Object.freeze({ ...definition });
}

export type FormSubmitErrorMapper = (
  reason: unknown,
) => FormSubmissionFailure | undefined;

export type FormResetHandler = () => void;

export type FormStateChangeHandler = (state: FormState) => void;

export type FormInteractionValidationTrigger = Exclude<FormValidationTrigger, 'submit'>;

export interface FormValidateContext {
  readonly trigger: FormValidationTrigger;
  readonly intent: FormValidationIntent;
  readonly changedFieldId: string | null;
  readonly signal: AbortSignal;
}

export interface FormValidationIssue {
  readonly message: string;
  readonly path?: FormFieldPath;
  readonly relatedPaths?: readonly FormFieldPath[];
}

export interface FormValidationResult {
  readonly issues?: readonly FormValidationIssue[];
}

export type FormValidateHandler<Values extends object = Record<string, unknown>> = (
  values: FormValues<Values>,
  context: FormValidateContext,
) => FormValidationResult | PromiseLike<FormValidationResult>;

export type FormSubmitStartedAction = () => number | null;

export type FormSubmitSucceededAction = (generation: number) => boolean;

export type FormSubmitFailedAction = (
  generation: number,
  result: {
    readonly failure?: FormSubmissionFailure;
    readonly issues?: readonly FormIssue[];
  },
) => boolean;

export type FormReplaceIssuesAction = (
  source: FormIssueSource,
  issues: readonly FormIssue[],
) => boolean;

export type FormResetAction = () => void;

export type FormReinitializeAction = (options?: FormReinitializeOptions) => void;

export interface FormRootProps<
  Input extends object = Record<string, unknown>,
  Output extends object = Input,
> {
  readonly issues?: readonly FormIssueInput[];
  readonly schema?: FormSchema<Input, Output>;
  readonly validate?: FormValidateHandler<Input>;
  readonly validateOn?: readonly FormInteractionValidationTrigger[];
  readonly revalidateOn?: readonly FormInteractionValidationTrigger[];
  readonly onSubmit?: FormSubmitHandler<Output>;
  readonly mapSubmitError?: FormSubmitErrorMapper;
}

export interface FormRootSlotProps {
  readonly state: FormState;
  readonly validation: FormState['validation'];
  readonly submission: FormState['submission'];
  readonly valid: boolean;
  readonly touched: boolean;
  readonly dirty: boolean;
  readonly submitted: boolean;
  readonly submitCount: number;
  readonly submitStarted: FormSubmitStartedAction;
  readonly submitSucceeded: FormSubmitSucceededAction;
  readonly submitFailed: FormSubmitFailedAction;
  readonly replaceIssues: FormReplaceIssuesAction;
  readonly reinitialize: FormReinitializeAction;
  readonly reset: FormResetAction;
}

export type FormRootPublicProps<
  Input extends object = Record<string, unknown>,
  Output extends object = Input,
> = FormRootProps<Input, Output>
  & VNodeProps
  & AllowedComponentProps
  & ComponentCustomProps
  & {
    readonly onReset?: () => unknown;
    readonly onStateChange?: (state: FormState) => unknown;
  };

export interface FormRootComponent {
  new <Input extends object = Record<string, unknown>, Output extends object = Input>(props: FormRootPublicProps<Input, Output>): {
    $props: FormRootPublicProps<Input, Output>;
    $slots: {
      default?: (props: FormRootSlotProps) => VNodeChild;
    };
    submitStarted: FormSubmitStartedAction;
    submitSucceeded: FormSubmitSucceededAction;
    submitFailed: FormSubmitFailedAction;
    replaceIssues: FormReplaceIssuesAction;
    reinitialize: FormReinitializeAction;
    reset: FormResetAction;
  };
}

export interface FormFieldProps {
  readonly id?: string;
  readonly name?: FormFieldPath;
  readonly form?: string;
  readonly required?: boolean;
  readonly disabled?: boolean;
  readonly readonly?: boolean;
  readonly as?: PrimitiveAs;
  readonly asChild?: boolean;
}

export type FormFieldPublicProps =
  FormFieldProps
  & VNodeProps
  & AllowedComponentProps
  & ComponentCustomProps;

export interface FormFieldSlotProps {
  readonly id: string;
  readonly controlId: string;
  readonly labelId: string;
  readonly descriptionId: string;
  readonly messageId: string;
  readonly describedBy: string;
  readonly valid: boolean;
  readonly touched: boolean;
  readonly dirty: boolean;
  readonly issues: readonly FormIssue[];
  readonly relatedIssues: readonly FormIssue[];
  readonly setMeta: (meta: FormFieldMetaInput) => boolean;
  readonly replaceIssues: (source: FormIssueSource, issues: readonly FormIssue[]) => boolean;
  readonly upsertIssue: (issue: FormIssue) => boolean;
  readonly removeIssue: (issueId: string | number) => boolean;
  readonly clearIssues: (source?: FormIssueSource) => boolean;
}

export interface FormFieldController {
  readonly state: Readonly<ShallowRef<FormFieldState | null>>;
  setMeta(meta: FormFieldMetaInput): boolean;
  replaceIssues(source: FormIssueSource, issues: readonly FormIssue[]): boolean;
  upsertIssue(issue: FormIssue): boolean;
  removeIssue(issueId: string | number): boolean;
  clearIssues(source?: FormIssueSource): boolean;
}

export interface FormSelectorProps<Selected> {
  readonly select: FormSelectorFunction<Selected>;
  readonly equals?: NonNullable<FormSubscribeOptions<Selected>['equals']>;
}

export interface FormSelectorComponent {
  new <Selected>(props: FormSelectorProps<Selected>): {
    $props: FormSelectorProps<Selected>;
    $slots: { default?: (props: { readonly selected: Selected }) => VNodeChild };
  };
}

export interface FormFieldSelectorProps<Selected> {
  readonly id: string;
  readonly select: FormFieldSelectorFunction<Selected>;
  readonly equals?: NonNullable<FormSubscribeOptions<Selected>['equals']>;
}

export interface FormFieldSelectorComponent {
  new <Selected>(props: FormFieldSelectorProps<Selected>): {
    $props: FormFieldSelectorProps<Selected>;
    $slots: { default?: (props: { readonly selected: Selected }) => VNodeChild };
  };
}

export interface FormSummarySlotProps {
  readonly validation: FormState['validation'];
  readonly submission: FormState['submission'];
  readonly issues: readonly FormIssue[];
  readonly serverIssues: readonly FormIssue[];
  readonly firstIssue: FormIssue | null;
  readonly valid: boolean;
}

export interface FormSubmitSlotProps {
  readonly valid: boolean;
  readonly submitting: boolean;
  readonly canSubmit: boolean;
  readonly submission: FormState['submission'];
}

export interface FormPartProps {
  readonly as?: PrimitiveAs;
  readonly asChild?: boolean;
}

export interface FormMessageProps extends FormPartProps, ConditionalPresenceProps {}

export interface FormSummaryProps extends FormPartProps, ConditionalPresenceProps {}
