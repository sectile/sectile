import type { ErrorClass } from '@sectile/core';

export type FormErrorCode =
  | 'form-field-id-duplicate'
  | 'form-field-id-empty'
  | 'form-field-id-invalid'
  | 'form-field-id-missing'
  | 'form-field-order-invalid'
  | 'form-field-path-empty'
  | 'form-field-path-index-invalid'
  | 'form-field-path-root-invalid'
  | 'form-field-path-segment-invalid'
  | 'form-field-path-syntax-invalid'
  | 'form-issue-field-mismatch'
  | 'form-issue-id-duplicate'
  | 'form-issue-invalid'
  | 'form-issue-source-mismatch'
  | 'form-relative-path-empty'
  | 'form-result-unexpected'
  | 'form-submission-generation-exhausted'
  | 'form-submission-generation-invalid'
  | 'form-submission-generation-stale'
  | 'form-submission-status-invalid'
  | 'form-submit-count-invalid'
  | 'form-submit-issue-source-invalid'
  | 'form-submit-not-pending'
  | 'form-submit-not-requested'
  | 'form-validation-context-invalid'
  | 'form-validation-during-submit'
  | 'form-validation-generation-exhausted'
  | 'form-validation-generation-invalid'
  | 'form-validation-generation-stale'
  | 'form-validation-intent-invalid'
  | 'form-validation-not-pending'
  | 'form-validation-status-invalid'
  | 'form-validation-trigger-invalid'
  | 'form-value-path-collision';

export interface FormError<Code extends string = FormErrorCode> {
  readonly class: ErrorClass;
  readonly code: Code;
  readonly message: string;
  readonly details?: Readonly<Record<string, unknown>>;
}

export type FormResult<T, Code extends string = FormErrorCode> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: FormError<Code> };

export class FormResultError<Code extends string = FormErrorCode>
  extends Error implements FormError<Code> {
  public readonly class: ErrorClass;
  public readonly code: Code;
  public readonly details?: Readonly<Record<string, unknown>>;

  public constructor(error: FormError<Code>) {
    super(error.message, { cause: error });
    this.name = 'FormResultError';
    this.class = error.class;
    this.code = error.code;
    if (error.details !== undefined) this.details = error.details;
  }
}
