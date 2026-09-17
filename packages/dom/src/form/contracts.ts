import type {
  FormFieldMetaInput,
  FormFieldState,
  FormIssue,
  FormIssueSource,
  FormReinitializeOptions,
  FormState,
  FormSubmissionFailure,
  FormValidationIntent,
  FormValidationTrigger,
} from '@sectile/form/state';
import type { FormFieldPath } from '@sectile/form/path';
import type { FormValues } from '@sectile/form/values';
import type {
  FormSchema,
  FormSchemaOutput,
} from '@sectile/form/schema';
import type { StableID } from '@sectile/core';

export {
  appendFormFieldPath,
  createFormFieldPath,
  createFormRelativePath,
  encodeFormFieldPath,
  type FormFieldPath,
  type FormPathSegment,
  type FormRelativePath,
} from '@sectile/form/path';
export type { FormValues } from '@sectile/form/values';
export type {
  FormSchema,
  FormSchemaInput,
  FormSchemaOutput,
} from '@sectile/form/schema';
export type { FormReinitializeOptions } from '@sectile/form/state';

export interface FormValidationIssue {
  readonly message: string;
  readonly path?: FormFieldPath;
  readonly relatedPaths?: readonly FormFieldPath[];
}

export interface FormValidationResult {
  readonly issues?: readonly FormValidationIssue[];
}

export type FormInteractionValidationTrigger = Exclude<FormValidationTrigger, 'submit'>;

export interface FormValidateContext<ID extends StableID = StableID> {
  readonly trigger: FormValidationTrigger;
  readonly intent: FormValidationIntent;
  readonly changedFieldId: ID | null;
  readonly signal: AbortSignal;
}

export type FormValidateHandler<
  ID extends StableID = StableID,
  Values extends object = FormValues,
> = (
  values: Values,
  context: FormValidateContext<ID>,
) => FormValidationResult | PromiseLike<FormValidationResult>;
export type FormFocusHandler = () => boolean | void;
export type FormResetHandler = () => void;
export type FormReinitializeHandler = (options?: FormReinitializeOptions) => void;
export type FormAnnounceSummaryHandler<ID extends StableID = StableID> =
  (issues: readonly FormIssue<ID>[], failure: FormSubmissionFailure | null) => void;
export type FormStateChangeHandler<ID extends StableID = StableID> =
  (state: FormState<ID>) => void;
export type FormUpdateHandler = () => void;

export type FormSubmissionElement =
  | HTMLButtonElement
  | HTMLInputElement
  | HTMLSelectElement
  | HTMLTextAreaElement;

export interface FormParticipant<ID extends StableID = StableID> {
  readonly id: ID;
  readonly element: HTMLElement;
  readonly semanticControl?: HTMLElement;
  readonly focusTarget?: HTMLElement;
  readonly validationTarget?: HTMLElement;
  readonly submissionElements?: readonly FormSubmissionElement[];
  readonly name?: FormFieldPath | null;
  readonly focus?: FormFocusHandler;
  readonly reset?: FormResetHandler;
  readonly getValue?: (() => unknown) | undefined;
  readonly isValueEqual?: ((current: unknown, baseline: unknown) => boolean) | undefined;
}

export interface FormSubmitPayload<
  ID extends StableID = StableID,
  Values extends object = FormValues,
> {
  readonly event: SubmitEvent;
  readonly formData: FormData;
  readonly values: Values;
  readonly submitter: HTMLElement | null;
  readonly state: FormState<ID>;
  readonly reinitialize: FormReinitializeHandler;
}

export type FormSubmitResult<ID extends StableID = StableID> =
  | void
  | { readonly ok: true }
  | {
      readonly ok: false;
      readonly failure?: FormSubmissionFailure;
      readonly issues?: readonly FormIssue<ID>[];
    };

export type FormSubmitHandler<
  ID extends StableID = StableID,
  Values extends object = FormValues,
> = (
  payload: FormSubmitPayload<ID, Values>,
) => FormSubmitResult<ID> | PromiseLike<FormSubmitResult<ID>>;

export interface FormSubmissionDefinition<ID extends StableID = StableID> {
  readonly schema?: never;
  readonly onSubmit: FormSubmitHandler<ID, FormValues>;
}

export interface FormSchemaSubmissionDefinition<
  Schema extends FormSchema<object, object>,
  ID extends StableID = StableID,
> {
  readonly schema: Schema;
  readonly onSubmit: FormSubmitHandler<ID, FormSchemaOutput<Schema>>;
}

export function defineFormSubmission<
  const Schema extends FormSchema<object, object>,
  ID extends StableID = StableID,
>(
  definition: FormSchemaSubmissionDefinition<Schema, ID>,
): FormSchemaSubmissionDefinition<Schema, ID>;
export function defineFormSubmission<ID extends StableID = StableID>(
  definition: FormSubmissionDefinition<ID>,
): FormSubmissionDefinition<ID>;
export function defineFormSubmission(
  definition: FormSubmissionDefinition | FormSchemaSubmissionDefinition<FormSchema<object, object>>,
): FormSubmissionDefinition | FormSchemaSubmissionDefinition<FormSchema<object, object>> {
  return Object.freeze({ ...definition });
}

export type FormSubmitErrorMapper<ID extends StableID = StableID> = (
  reason: unknown,
) => FormSubmissionFailure;

export interface FormSubmitFailureResult<ID extends StableID = StableID> {
  readonly failure?: FormSubmissionFailure;
  readonly issues?: readonly FormIssue<ID>[];
}

export interface FormSnapshot<ID extends StableID = StableID> {
  readonly revision: number;
  readonly state: FormState<ID>;
}

export interface FormSubscribeOptions<Selected> {
  readonly equals?: (previous: Selected, next: Selected) => boolean;
}

export type FormSelector<ID extends StableID, Selected> =
  (state: FormState<ID>) => Selected;

export type FormFieldSelector<ID extends StableID, Selected> =
  (field: FormFieldState<ID> | null) => Selected;

export type FormSelectionListener<Selected> =
  (selected: Selected, previous: Selected) => void;

export interface FormOptions<
  ID extends StableID = StableID,
  Input extends object = FormValues,
  Output extends object = Input,
> {
  readonly form: HTMLFormElement;
  readonly summary?: HTMLElement;
  readonly renderSummaryContent?: boolean;
  readonly manageSummaryVisibility?: boolean;
  readonly participants?: readonly FormParticipant<ID>[];
  readonly issues?: readonly FormIssue<ID>[];
  readonly schema?: FormSchema<Input, Output>;
  readonly validate?: FormValidateHandler<ID, Input>;
  readonly validateOn?: readonly FormInteractionValidationTrigger[];
  readonly revalidateOn?: readonly FormInteractionValidationTrigger[];
  readonly onSubmit?: FormSubmitHandler<ID, Output>;
  readonly mapSubmitError?: FormSubmitErrorMapper<ID>;
  readonly onReset?: FormResetHandler;
  readonly onAnnounceSummary?: FormAnnounceSummaryHandler<ID>;
  readonly onStateChange?: FormStateChangeHandler<ID>;
  readonly onUpdate?: FormUpdateHandler;
  readonly onSubscriptionError?: (error: unknown) => void;
}

export type FormReconfigureOptions<
  ID extends StableID = StableID,
  Input extends object = FormValues,
  Output extends object = Input,
> = Omit<FormOptions<ID, Input, Output>, 'form' | 'participants' | 'issues'>;

export interface FormConnection<
  ID extends StableID = StableID,
  Input extends object = FormValues,
  Output extends object = Input,
> {
  readonly state: FormState<ID>;
  getSnapshot(): FormSnapshot<ID>;
  getFormData(submitter?: HTMLElement | null): FormData;
  reconfigure(options: FormReconfigureOptions<ID, Input, Output>): void;
  registerParticipant(participant: FormParticipant<ID>): () => void;
  refreshParticipant(id: ID): boolean;
  getField(id: ID): FormFieldState<ID> | null;
  setFieldMeta(id: ID, meta: FormFieldMetaInput): boolean;
  replaceFieldIssues(id: ID, source: FormIssueSource, issues: readonly FormIssue<ID>[]): boolean;
  upsertFieldIssue(id: ID, issue: FormIssue<ID>): boolean;
  removeFieldIssue(id: ID, issueId: StableID): boolean;
  clearFieldIssues(id: ID, source?: FormIssueSource): boolean;
  replaceIssues(source: FormIssueSource, issues: readonly FormIssue<ID>[]): boolean;
  submitStarted(): number | null;
  submitSucceeded(generation: number): boolean;
  submitFailed(generation: number, result: FormSubmitFailureResult<ID>): boolean;
  reinitialize(options?: FormReinitializeOptions): void;
  reset(): void;
  subscribeForm<Selected>(
    selector: FormSelector<ID, Selected>,
    listener: FormSelectionListener<Selected>,
    options?: FormSubscribeOptions<Selected>,
  ): () => void;
  subscribeField<Selected>(
    id: ID,
    selector: FormFieldSelector<ID, Selected>,
    listener: FormSelectionListener<Selected>,
    options?: FormSubscribeOptions<Selected>,
  ): () => void;
  destroy(): void;
}
