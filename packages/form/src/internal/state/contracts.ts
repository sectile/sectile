import type { StableID } from '@sectile/core';

export type IssueSource = 'native' | 'field' | 'form' | 'validate' | 'schema' | 'server';

export type ValidationStatus = 'idle' | 'validating' | 'valid' | 'invalid';

export type SubmissionStatus = 'idle' | 'submitting' | 'succeeded' | 'failed';

export type ValidationTrigger = 'input' | 'blur' | 'submit';

export type ValidationIntent = 'interaction' | 'submission';

export type Validation =
  | {
      readonly generation: number;
      readonly status: 'idle';
      readonly trigger: null;
      readonly intent: null;
    }
  | {
      readonly generation: number;
      readonly status: Exclude<ValidationStatus, 'idle'>;
      readonly trigger: ValidationTrigger;
      readonly intent: ValidationIntent;
    };

export interface SubmissionFailure {
  readonly message: string;
}

export type Submission =
  | {
      readonly generation: number;
      readonly status: Exclude<SubmissionStatus, 'failed'>;
      readonly count: number;
      readonly failure: null;
    }
  | {
      readonly generation: number;
      readonly status: 'failed';
      readonly count: number;
      readonly failure: SubmissionFailure | null;
    };

export interface ReinitializeOptions {
  readonly preserve?: {
    readonly touched?: boolean;
    readonly validation?: boolean;
    readonly submission?: boolean;
  };
}

export interface Issue<ID extends StableID = StableID> {
  readonly id: StableID;
  readonly message: string;
  readonly source: IssueSource;
  readonly fieldId?: ID;
  readonly relatedFieldIds?: readonly ID[];
}

export interface FieldInput<ID extends StableID = StableID> {
  readonly id: ID;
  readonly name?: string | null;
  readonly touched?: boolean;
  readonly dirty?: boolean;
  readonly issues?: readonly Issue<ID>[];
}

export interface FieldMeta {
  readonly name?: string | null;
  readonly touched?: boolean;
  readonly dirty?: boolean;
}

export interface Field<ID extends StableID = StableID> {
  readonly id: ID;
  readonly name: string | null;
  readonly touched: boolean;
  readonly dirty: boolean;
  readonly valid: boolean;
  readonly issues: readonly Issue<ID>[];
  readonly relatedIssues: readonly Issue<ID>[];
}

export interface State<ID extends StableID = StableID> {
  readonly validation: Validation;
  readonly submission: Submission;
  readonly touched: boolean;
  readonly dirty: boolean;
  readonly valid: boolean;
  readonly fields: readonly Field<ID>[];
  readonly issues: readonly Issue<ID>[];
  readonly allIssues: readonly Issue<ID>[];
}

export type Event<ID extends StableID = StableID> =
  | { readonly type: 'register-field'; readonly field: FieldInput<ID> }
  | { readonly type: 'unregister-field'; readonly id: ID }
  | {
      readonly type: 'set-field-meta';
      readonly id: ID;
      readonly meta: FieldMeta;
    }
  | {
      readonly type: 'replace-field-issues';
      readonly id: ID;
      readonly source: IssueSource;
      readonly issues: readonly Issue<ID>[];
    }
  | { readonly type: 'upsert-field-issue'; readonly id: ID; readonly issue: Issue<ID> }
  | { readonly type: 'remove-field-issue'; readonly id: ID; readonly issueId: StableID }
  | { readonly type: 'clear-field-issues'; readonly id: ID; readonly source?: IssueSource }
  | { readonly type: 'reorder-fields'; readonly ids: readonly ID[] }
  | {
      readonly type: 'replace-issues';
      readonly source: IssueSource;
      readonly issues: readonly Issue<ID>[];
      readonly generation?: number;
    }
  | { readonly type: 'field-value-changed'; readonly id: ID }
  | { readonly type: 'validation-invalidated' }
  | {
      readonly type: 'validation-started';
      readonly trigger: ValidationTrigger;
      readonly intent: ValidationIntent;
    }
  | {
      readonly type: 'validation-completed';
      readonly trigger: ValidationTrigger;
      readonly intent: ValidationIntent;
      readonly generation: number;
    }
  | { readonly type: 'submit-started'; readonly generation: number }
  | { readonly type: 'submit-succeeded'; readonly generation: number }
  | {
      readonly type: 'submit-failed';
      readonly generation: number;
      readonly failure?: SubmissionFailure | null;
      readonly issues?: readonly Issue<ID>[];
    }
  | { readonly type: 'reinitialize'; readonly options?: ReinitializeOptions }
  | 'reset';

export type Command<ID extends StableID = StableID> =
  | { readonly type: 'focus-field'; readonly id: ID }
  | { readonly type: 'announce-summary'; readonly issueIds: readonly StableID[] }
  | { readonly type: 'announce-submission-failure' }
  | { readonly type: 'submit-requested'; readonly generation: number }
  | { readonly type: 'reset-field'; readonly id: ID };

export interface Update<ID extends StableID = StableID> {
  readonly state: State<ID>;
  readonly commands: readonly Command<ID>[];
}

export interface StateInput<ID extends StableID = StableID> {
  readonly validation?: Validation;
  readonly submission?: Submission;
  readonly fields?: readonly FieldInput<ID>[];
  readonly issues?: readonly Issue<ID>[];
}
