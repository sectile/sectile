---
title: DOM Form API
description: DOM Form 연결 함수, 옵션, participant, 제출 결과와 공개 타입을 확인합니다.
---
<!-- scripts/generate-component-pages.mjs에서 생성함. -->
# DOM Form API

DOM Form 연결 함수, 옵션, participant, 제출 결과와 공개 타입을 확인합니다.

[DOM 폼 안내로 돌아가기](/ko/packages/form/dom/)

## API

DOM 패키지: `@sectile/dom/form`

### 함수

#### `defineFormSubmission`

```ts
function defineFormSubmission<const Schema extends FormSchema<object, object>, ID extends StableID = StableID>(definition: FormSchemaSubmissionDefinition<Schema, ID>): FormSchemaSubmissionDefinition<Schema, ID>
function defineFormSubmission<ID extends StableID = StableID>(definition: FormSubmissionDefinition<ID>): FormSubmissionDefinition<ID>
```

#### `createForm`

```ts
function createForm<ID extends StableID = StableID, Input extends object = FormValues, Output extends object = Input>(options: FormOptions<ID, Input, Output>): FormConnection<ID, Input, Output>
```

#### `tryCreateForm`

```ts
function tryCreateForm<ID extends StableID = StableID, Input extends object = FormValues, Output extends object = Input>(options: FormOptions<ID, Input, Output>): FormResult<FormConnection<ID, Input, Output>>
```

#### `appendFormFieldPath`

```ts
function appendFormFieldPath(base: FormFieldPath, relative: FormRelativePath): readonly FormPathSegment[]
```

#### `createFormFieldPath`

```ts
function createFormFieldPath(path: FormFieldPath, limits?: Partial<FormConstructionLimits>): readonly FormPathSegment[]
```

#### `createFormRelativePath`

```ts
function createFormRelativePath(path: FormRelativePath, limits?: Partial<FormConstructionLimits>): readonly FormPathSegment[]
```

#### `encodeFormFieldPath`

```ts
function encodeFormFieldPath(path: FormFieldPath): string
```

### 타입

#### `FormFieldPath`

```ts
type FormFieldPath = string | readonly FormPathSegment[]
```

#### `FormPathSegment`

```ts
type FormPathSegment = string | number
```

#### `FormRelativePath`

```ts
type FormRelativePath = FormPathSegment | readonly FormPathSegment[]
```

#### `FormValues`

```ts
type FormValues<Shape extends object = Record<string, unknown>> = Readonly<Shape>
```

#### `FormSchema`

```ts
type FormSchema<Input = unknown, Output = Input> = StandardSchemaV1<Input, Output>
```

#### `FormSchemaInput`

```ts
type FormSchemaInput<Schema extends StandardSchemaV1> = StandardSchemaV1.InferInput<Schema>
```

#### `FormSchemaOutput`

```ts
type FormSchemaOutput<Schema extends StandardSchemaV1> = StandardSchemaV1.InferOutput<Schema>
```

#### `FormReinitializeOptions`

| 이름 | 타입 | 필수 |
| --- | --- | --- |
| `preserve` | `{ readonly touched?: boolean; readonly validation?: boolean; readonly submission?: boolean; }` | — |

#### `FormValidationIssue`

| 이름 | 타입 | 필수 |
| --- | --- | --- |
| `message` | `string` | 필수 |
| `path` | `FormFieldPath` | — |
| `relatedPaths` | `readonly FormFieldPath[]` | — |

#### `FormValidationResult`

| 이름 | 타입 | 필수 |
| --- | --- | --- |
| `issues` | `readonly FormValidationIssue[]` | — |

#### `FormInteractionValidationTrigger`

```ts
type FormInteractionValidationTrigger = Exclude<FormValidationTrigger, 'submit'>
```

#### `FormValidateContext`

| 이름 | 타입 | 필수 |
| --- | --- | --- |
| `trigger` | `FormValidationTrigger` | 필수 |
| `intent` | `FormValidationIntent` | 필수 |
| `changedFieldId` | `ID \| null` | 필수 |
| `signal` | `AbortSignal` | 필수 |

#### `FormValidateHandler`

```ts
type FormValidateHandler<ID extends StableID = StableID, Values extends object = FormValues> =
(
  values: Values,
  context: FormValidateContext<ID>,
) => FormValidationResult | PromiseLike<FormValidationResult>
```

#### `FormFocusHandler`

```ts
type FormFocusHandler = () => boolean | void
```

#### `FormResetHandler`

```ts
type FormResetHandler = () => void
```

#### `FormReinitializeHandler`

```ts
type FormReinitializeHandler = (options?: FormReinitializeOptions) => void
```

#### `FormAnnounceSummaryHandler`

```ts
type FormAnnounceSummaryHandler<ID extends StableID = StableID> = (issues: readonly FormIssue<ID>[], failure: FormSubmissionFailure | null) => void
```

#### `FormStateChangeHandler`

```ts
type FormStateChangeHandler<ID extends StableID = StableID> = (state: FormState<ID>) => void
```

#### `FormUpdateHandler`

```ts
type FormUpdateHandler = () => void
```

#### `FormSubmissionElement`

```ts
type FormSubmissionElement =
| HTMLButtonElement
  | HTMLInputElement
  | HTMLSelectElement
  | HTMLTextAreaElement
```

#### `FormParticipant`

| 이름 | 타입 | 필수 |
| --- | --- | --- |
| `id` | `ID` | 필수 |
| `element` | `HTMLElement` | 필수 |
| `semanticControl` | `HTMLElement` | — |
| `focusTarget` | `HTMLElement` | — |
| `validationTarget` | `HTMLElement` | — |
| `submissionElements` | `readonly FormSubmissionElement[]` | — |
| `name` | `FormFieldPath \| null` | — |
| `focus` | `FormFocusHandler` | — |
| `reset` | `FormResetHandler` | — |
| `getValue` | `(() => unknown) \| undefined` | — |
| `isValueEqual` | `((current: unknown, baseline: unknown) => boolean) \| undefined` | — |

#### `FormSubmitPayload`

| 이름 | 타입 | 필수 |
| --- | --- | --- |
| `event` | `SubmitEvent` | 필수 |
| `formData` | `FormData` | 필수 |
| `values` | `Values` | 필수 |
| `submitter` | `HTMLElement \| null` | 필수 |
| `state` | `FormState<ID>` | 필수 |
| `reinitialize` | `FormReinitializeHandler` | 필수 |

#### `FormSubmitResult`

```ts
type FormSubmitResult<ID extends StableID = StableID> =
| void
  | { readonly ok: true }
  | {
      readonly ok: false;
      readonly failure?: FormSubmissionFailure;
      readonly issues?: readonly FormIssue<ID>[];
    }
```

#### `FormSubmitHandler`

```ts
type FormSubmitHandler<ID extends StableID = StableID, Values extends object = FormValues> =
(
  payload: FormSubmitPayload<ID, Values>,
) => FormSubmitResult<ID> | PromiseLike<FormSubmitResult<ID>>
```

#### `FormSubmissionDefinition`

| 이름 | 타입 | 필수 |
| --- | --- | --- |
| `schema` | `never` | — |
| `onSubmit` | `FormSubmitHandler<ID, Readonly<Record<string, unknown>>>` | 필수 |

#### `FormSchemaSubmissionDefinition`

| 이름 | 타입 | 필수 |
| --- | --- | --- |
| `schema` | `Schema` | 필수 |
| `onSubmit` | `FormSubmitHandler<ID, FormSchemaOutput<Schema>>` | 필수 |

#### `FormSubmitErrorMapper`

```ts
type FormSubmitErrorMapper<ID extends StableID = StableID> =
(
  reason: unknown,
) => FormSubmissionFailure
```

#### `FormSubmitFailureResult`

| 이름 | 타입 | 필수 |
| --- | --- | --- |
| `failure` | `FormSubmissionFailure` | — |
| `issues` | `readonly FormIssue<ID>[]` | — |

#### `FormSnapshot`

| 이름 | 타입 | 필수 |
| --- | --- | --- |
| `revision` | `number` | 필수 |
| `state` | `FormState<ID>` | 필수 |

#### `FormSubscribeOptions`

| 이름 | 타입 | 필수 |
| --- | --- | --- |
| `equals` | `(previous: Selected, next: Selected) => boolean` | — |

#### `FormSelector`

```ts
type FormSelector<ID extends StableID, Selected> = (state: FormState<ID>) => Selected
```

#### `FormFieldSelector`

```ts
type FormFieldSelector<ID extends StableID, Selected> = (field: FormFieldState<ID> | null) => Selected
```

#### `FormSelectionListener`

```ts
type FormSelectionListener<Selected> = (selected: Selected, previous: Selected) => void
```

#### `FormOptions`

| 이름 | 타입 | 필수 |
| --- | --- | --- |
| `form` | `HTMLFormElement` | 필수 |
| `summary` | `HTMLElement` | — |
| `renderSummaryContent` | `boolean` | — |
| `participants` | `readonly FormParticipant<ID>[]` | — |
| `issues` | `readonly FormIssue<ID>[]` | — |
| `schema` | `FormSchema<Input, Output>` | — |
| `validate` | `FormValidateHandler<ID, Input>` | — |
| `validateOn` | `readonly FormInteractionValidationTrigger[]` | — |
| `revalidateOn` | `readonly FormInteractionValidationTrigger[]` | — |
| `onSubmit` | `FormSubmitHandler<ID, Output>` | — |
| `mapSubmitError` | `FormSubmitErrorMapper<ID>` | — |
| `onReset` | `FormResetHandler` | — |
| `onAnnounceSummary` | `FormAnnounceSummaryHandler<ID>` | — |
| `onStateChange` | `FormStateChangeHandler<ID>` | — |
| `onUpdate` | `FormUpdateHandler` | — |
| `onSubscriptionError` | `(error: unknown) => void` | — |

#### `FormReconfigureOptions`

```ts
type FormReconfigureOptions<ID extends StableID = StableID, Input extends object = FormValues, Output extends object = Input> = Omit<FormOptions<ID, Input, Output>, 'form' | 'participants' | 'issues'>
```

#### `FormConnection`

| 이름 | 타입 | 필수 |
| --- | --- | --- |
| `state` | `FormState<ID>` | 필수 |
| `getSnapshot` | `() => FormSnapshot<ID>` | 필수 |
| `getFormData` | `(submitter?: HTMLElement \| null) => FormData` | 필수 |
| `reconfigure` | `(options: FormReconfigureOptions<ID, Input, Output>) => void` | 필수 |
| `registerParticipant` | `(participant: FormParticipant<ID>) => () => void` | 필수 |
| `refreshParticipant` | `(id: ID) => boolean` | 필수 |
| `getField` | `(id: ID) => FormFieldState<ID> \| null` | 필수 |
| `setFieldMeta` | `(id: ID, meta: FormFieldMetaInput) => boolean` | 필수 |
| `replaceFieldIssues` | `(id: ID, source: FormIssueSource, issues: readonly FormIssue<ID>[]) => boolean` | 필수 |
| `upsertFieldIssue` | `(id: ID, issue: FormIssue<ID>) => boolean` | 필수 |
| `removeFieldIssue` | `(id: ID, issueId: StableID) => boolean` | 필수 |
| `clearFieldIssues` | `(id: ID, source?: FormIssueSource) => boolean` | 필수 |
| `replaceIssues` | `(source: FormIssueSource, issues: readonly FormIssue<ID>[]) => boolean` | 필수 |
| `submitStarted` | `() => number \| null` | 필수 |
| `submitSucceeded` | `(generation: number) => boolean` | 필수 |
| `submitFailed` | `(generation: number, result: FormSubmitFailureResult<ID>) => boolean` | 필수 |
| `reinitialize` | `(options?: FormReinitializeOptions) => void` | 필수 |
| `reset` | `() => void` | 필수 |
| `subscribeForm` | `<Selected>(selector: FormSelector<ID, Selected>, listener: FormSelectionListener<Selected>, options?: FormSubscribeOptions<Selected>) => () => void` | 필수 |
| `subscribeField` | `<Selected>(id: ID, selector: FormFieldSelector<ID, Selected>, listener: FormSelectionListener<Selected>, options?: FormSubscribeOptions<Selected>) => () => void` | 필수 |
| `destroy` | `() => void` | 필수 |
