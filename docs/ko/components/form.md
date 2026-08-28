<!-- scripts/generate-component-pages.mjs에서 생성함. -->
# Form

네이티브 컨트롤과 Sectile 컴포넌트로 접근 가능한 폼을 만들고 검증, 제출, 초기화를 함께 처리합니다.

## 용법

### 기본 구성

Form은 네이티브 `<form>`을 기반으로 입력의 레이블, 설명, 오류, 제출, 초기화를 연결합니다.

| 파트 | 용도 |
| --- | --- |
| `FormRoot` | 네이티브 form 속성, 검증 설정, 제출, 폼 상태 |
| `FormField` | 레이블이 있는 값 하나, 그룹 또는 복합 컨트롤 |
| `FormLabel` | 화면에 표시하는 레이블 또는 그룹 범례 |
| `FormDescription` | 필드와 연결된 도움말 |
| `FormMessage` | 현재 필드 오류 |
| `FormSummary` | 폼 전체 오류 요약 |
| `FormReset` / `FormSubmit` | 네이티브 초기화·제출 버튼 |

네이티브 `input`, `select`, `textarea`와 Sectile 입력 컴포넌트를 같은 폼에서 자유롭게 섞을 수 있습니다.

### 기본 폼

Sectile 필드와 입력으로 폼을 구성하고 중첩 값을 제출합니다.

<ComponentExample component="form" scenario="profile" title="기본 폼" description="Sectile 필드와 입력으로 폼을 구성하고 중첩 값을 제출합니다." :index="0" />

### 다음 단계

- 네이티브 입력, Sectile 컴포넌트, 그룹, 중첩 이름은 [필드와 컨트롤](/ko/packages/form/fields)에서 설명합니다.
- 브라우저 제약 조건, schema, 서버 오류는 [검증과 오류](/ko/packages/form/validation)에서 설명합니다.
- `defineFormSubmission()`, 파일, 비동기 상태, reset은 [제출과 초기화](/ko/packages/form/submission)에서 설명합니다.
- 앱에서 만든 입력을 연결하는 방법과 `useTemplateRef()`/`shallowRef()` 선택은 [사용자 정의 컨트롤](/ko/packages/form/custom-controls)에서 설명합니다.

`FormField`에 쓴 `name`, `required`, `disabled`, `readonly`는 하위 컨트롤의 기본값입니다. 같은 속성을 입력에 직접 지정하면 입력의 값이 우선합니다.

## 예시

### 입력 컴포넌트 조합

FormField가 공통 메타데이터를 제공하는 Select와 Switch를 함께 사용합니다.

<ComponentExample component="form" scenario="notifications" title="입력 컴포넌트 조합" description="FormField가 공통 메타데이터를 제공하는 Select와 Switch를 함께 사용합니다." :index="1" />

### 중첩 필드 경로

Sectile 입력을 중첩 필드 경로에 연결해 하나의 구조화된 제출로 구성합니다.

<ComponentExample component="form" scenario="team-invite" title="중첩 필드 경로" description="Sectile 입력을 중첩 필드 경로에 연결해 하나의 구조화된 제출로 구성합니다." :index="2" />

## API

Vue 패키지: `@sectile/vue/form`

<div class="component-api-group">
<strong class="component-api-label">컴포넌트</strong>
<ul class="component-api-list">
  <li><code class="component-api-token">FormRoot</code></li>
  <li><code class="component-api-token">FormField</code></li>
  <li><code class="component-api-token">FormLabel</code></li>
  <li><code class="component-api-token">FormDescription</code></li>
  <li><code class="component-api-token">FormMessage</code></li>
  <li><code class="component-api-token">FormSummary</code></li>
  <li><code class="component-api-token">FormReset</code></li>
  <li><code class="component-api-token">FormSubmit</code></li>
</ul>
</div>

<div class="component-api-group">
<strong class="component-api-label">고급 컨트롤 프리셋</strong>
<ul class="component-api-list">
  <li><code class="component-api-token">compositeControlCapabilities</code></li>
  <li><code class="component-api-token">hiddenInputSubmissionCapabilities</code></li>
  <li><code class="component-api-token">hiddenSelectSubmissionCapabilities</code></li>
  <li><code class="component-api-token">hiddenValueSubmissionCapabilities</code></li>
  <li><code class="component-api-token">nativeInputControlCapabilities</code></li>
</ul>
</div>

### 함수

#### `defineFormSubmission`

```ts
function defineFormSubmission<const Schema extends FormSchema<object, object>>(definition: FormSchemaSubmissionDefinition<Schema>): FormSchemaSubmissionDefinition<Schema>
```

#### `provideFormControlOwner`

```ts
function provideFormControlOwner(): void
```

#### `useCompositeFormControl`

```ts
function useCompositeFormControl(options: {
  readonly root: FormElementSource;
  readonly focusTarget?: FormElementSource;
  readonly validationTarget?: FormElementSource;
  readonly submissions?: FormSubmissionSource;
  readonly labelMode?: FormLabelMode;
  readonly reset?: () => void;
}): FormControlParticipation
```

#### `useFormControl`

```ts
function useFormControl(registration: FormControlRegistration): FormControlParticipation
```

#### `useNativeInputFormControl`

```ts
function useNativeInputFormControl(element: Readonly<ShallowRef<HTMLInputElement | HTMLTextAreaElement | null | undefined>>, options: { readonly reset?: () => void } = {}): FormControlParticipation
```

### Props

#### `FormRootProps`

<dl class="component-api-definitions component-api-definitions--props">
<div class="component-api-definition">
<dt><code>issues</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>readonly FormIssueInput[]</code></span><span><span class="component-api-definition__label">기본값</span><code>[]</code></span></div>
<p>애플리케이션이 제공하는 검증 이슈입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>mapSubmitError</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>FormSubmitErrorMapper</code></span><span><span class="component-api-definition__label">기본값</span><code>undefined</code></span></div>
<p>제출 중 throw 또는 reject된 오류를 사용자에게 노출해도 되는 이슈로 변환하는 함수입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>onSubmit</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>FormSubmitHandler&lt;Output&gt;</code></span><span><span class="component-api-definition__label">기본값</span><code>undefined</code></span></div>
<p>검증을 통과한 네이티브 제출을 처리하고 비동기 성공 또는 서버 이슈를 반환하는 함수입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>revalidateOn</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>readonly FormInteractionValidationTrigger[]</code></span><span><span class="component-api-definition__label">기본값</span><code>['input']</code></span></div>
<p>검증 실패 후 기존 검증 의도를 다시 수행할 사용자 조작 이벤트입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>schema</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>FormSchema&lt;Input, Output&gt;</code></span><span><span class="component-api-definition__label">기본값</span><code>undefined</code></span></div>
<p>최종 제출 검증과 출력 변환에 사용할 Standard Schema입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>validate</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>FormValidateHandler&lt;Input&gt;</code></span><span><span class="component-api-definition__label">기본값</span><code>undefined</code></span></div>
<p>현재 필드를 검증하고 애플리케이션 이슈를 반환하는 함수입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>validateOn</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>readonly FormInteractionValidationTrigger[]</code></span><span><span class="component-api-definition__label">기본값</span><code>[]</code></span></div>
<p>첫 제출 전 검증을 수행할 사용자 조작 이벤트입니다.</p>
</dd>
</div>
</dl>

#### `FormFieldProps`

<dl class="component-api-definitions component-api-definitions--props">
<div class="component-api-definition">
<dt><code>as</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>PrimitiveAs</code></span><span><span class="component-api-definition__label">기본값</span><code>undefined</code></span></div>
<p>이 파트가 렌더링할 요소 또는 컴포넌트입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>asChild</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>boolean</code></span><span><span class="component-api-definition__label">기본값</span><code>undefined</code></span></div>
<p>하나뿐인 자식 요소에 파트 속성을 직접 합칠지 여부입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>disabled</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>boolean</code></span><span><span class="component-api-definition__label">기본값</span><code>undefined</code></span></div>
<p>사용자 조작을 막을지 여부입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>form</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>string</code></span><span><span class="component-api-definition__label">기본값</span><code>undefined</code></span></div>
<p>컨트롤을 연결할 네이티브 form 요소의 ID입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>id</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>string</code></span><span><span class="component-api-definition__label">기본값</span><code>undefined</code></span></div>
<p>관련 파트를 연결하는 안정적인 ID입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>name</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>FormFieldPath</code></span><span><span class="component-api-definition__label">기본값</span><code>undefined</code></span></div>
<p>네이티브 폼 제출에 사용할 이름입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>readonly</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>boolean</code></span><span><span class="component-api-definition__label">기본값</span><code>undefined</code></span></div>
<p>값 확인만 허용하는 읽기 전용 상태 여부입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>required</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>boolean</code></span><span><span class="component-api-definition__label">기본값</span><code>undefined</code></span></div>
<p>제출 전에 올바른 값이 반드시 있어야 하는지 여부입니다.</p>
</dd>
</div>
</dl>

#### `FormPartProps`

<dl class="component-api-definitions component-api-definitions--props">
<div class="component-api-definition">
<dt><code>as</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>PrimitiveAs</code></span><span><span class="component-api-definition__label">기본값</span>파트별로 다름</span></div>
<p>이 파트가 렌더링할 요소 또는 컴포넌트입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>asChild</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>boolean</code></span><span><span class="component-api-definition__label">기본값</span><code>false</code></span></div>
<p>하나뿐인 자식 요소에 파트 속성을 직접 합칠지 여부입니다.</p>
</dd>
</div>
</dl>

### 슬롯

#### `FormRootSlotProps`

<dl class="component-api-definitions component-api-definitions--slots">
<div class="component-api-definition">
<dt><code>dirty</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>boolean</code></span></div>
<p>현재 값이 초깃값과 다른지 여부입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>replaceIssues</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>FormReplaceIssuesAction</code></span></div>
<p>한 출처의 검증 이슈를 바꾸는 함수입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>reset</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>FormResetAction</code></span></div>
<p>초깃값과 조작 상태로 되돌리는 함수입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>state</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>FormState</code></span></div>
<p>현재 전체 폼 상태입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>submissionStatus</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>FormState['submissionStatus']</code></span></div>
<p>현재 제출 생명주기입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>submitCount</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>number</code></span></div>
<p>제출을 시도한 횟수입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>submitFailed</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>FormSubmitFailedAction</code></span></div>
<p>식별한 제출을 실패로 기록하는 함수입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>submitStarted</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>FormSubmitStartedAction</code></span></div>
<p>제출을 시작하고 generation 토큰을 반환하는 함수입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>submitSucceeded</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>FormSubmitSucceededAction</code></span></div>
<p>식별한 제출을 성공으로 기록하는 함수입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>submitted</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>boolean</code></span></div>
<p>제출을 시도했는지 여부입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>touched</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>boolean</code></span></div>
<p>사용자가 필드를 조작했는지 여부입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>valid</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>boolean</code></span></div>
<p>현재 입력의 검증 통과 여부입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>validationIntent</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>FormState['validationIntent']</code></span></div>
<p>현재 검증이 입력 과정용인지 최종 제출용인지 나타냅니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>validationStatus</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>FormState['validationStatus']</code></span></div>
<p>현재 검증 생명주기입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>validationTrigger</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>FormState['validationTrigger']</code></span></div>
<p>현재 또는 최근 검증을 시작한 이벤트입니다.</p>
</dd>
</div>
</dl>

#### `FormFieldSlotProps`

<dl class="component-api-definitions component-api-definitions--slots">
<div class="component-api-definition">
<dt><code>controlId</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>string</code></span></div>
<p>시맨틱 컨트롤에 지정한 ID입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>describedBy</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>string</code></span></div>
<p>컨트롤을 설명하는 공백 구분 ID입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>descriptionId</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>string</code></span></div>
<p>필드 도움말에 지정한 ID입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>dirty</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>boolean</code></span></div>
<p>현재 값이 초깃값과 다른지 여부입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>id</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>string</code></span></div>
<p>현재 필드 또는 항목의 안정적인 ID입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>issues</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>readonly FormIssue[]</code></span></div>
<p>현재 검증 이슈입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>labelId</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>string</code></span></div>
<p>필드 레이블에 지정한 ID입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>messageId</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>string</code></span></div>
<p>필드 오류 메시지에 지정한 ID입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>touched</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>boolean</code></span></div>
<p>사용자가 필드를 조작했는지 여부입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>valid</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>boolean</code></span></div>
<p>현재 입력의 검증 통과 여부입니다.</p>
</dd>
</div>
</dl>

### 이벤트

#### `FormSubmitEvent`

```ts
type FormSubmitEvent<Values extends object = Record<string, unknown>> =
Omit<
  DOMFormSubmitPayload<string, FormValues<Values>>,
  'event'
> & {
  readonly nativeEvent: SubmitEvent;
  readonly defaultPrevented: boolean;
  preventDefault(): void;
  stopPropagation(): void;
  stopImmediatePropagation(): void;
}
```

### 기타 타입

#### `FormState`

```ts
type FormState = FormConnection<string>['state']
```

#### `FormIssue`

```ts
type FormIssue = NonNullable<FormOptions<string>['issues']>[number]
```

#### `FormIssueSource`

```ts
type FormIssueSource = Parameters<FormConnection<string>['replaceIssues']>[0]
```

#### `FormValues`

```ts
type FormValues<Shape extends object = Record<string, unknown>> = DOMFormValues<Shape>
```

#### `FormSchema`

```ts
type FormSchema<Input extends object = Record<string, unknown>, Output extends object = Input> = DOMFormSchema<FormValues<Input>, FormValues<Output>>
```

#### `FormSchemaInput`

```ts
type FormSchemaInput<Schema extends FormSchema> = Schema extends DOMFormSchema<infer Input extends object, object> ? Input : never
```

#### `FormSchemaOutput`

```ts
type FormSchemaOutput<Schema extends FormSchema> = Schema extends DOMFormSchema<object, infer Output extends object> ? Output : never
```

#### `FormIssueInput`

| 이름 | 타입 | 필수 |
| --- | --- | --- |
| `id` | `string` | — |
| `message` | `string` | 필수 |
| `path` | `FormFieldPath` | — |

#### `FormSubmitIssue`

```ts
type FormSubmitIssue = FormIssueInput
```

#### `FormSubmitResult`

```ts
type FormSubmitResult =
| void
  | { readonly ok: true }
  | { readonly ok: false; readonly issues?: readonly FormSubmitIssue[] }
```

#### `FormSubmitHandler`

```ts
type FormSubmitHandler<Values extends object = Record<string, unknown>> = (event: FormSubmitEvent<Values>) => FormSubmitResult | PromiseLike<FormSubmitResult>
```

#### `FormSubmissionDefinition`

| 이름 | 타입 | 필수 |
| --- | --- | --- |
| `schema` | `never` | — |
| `onSubmit` | `FormSubmitHandler<Record<string, unknown>>` | 필수 |

#### `FormSchemaSubmissionDefinition`

| 이름 | 타입 | 필수 |
| --- | --- | --- |
| `schema` | `Schema` | 필수 |
| `onSubmit` | `FormSubmitHandler<DOMFormSchemaOutput<Schema>>` | 필수 |

#### `FormSubmitErrorMapper`

```ts
type FormSubmitErrorMapper =
(
  reason: unknown,
) => FormSubmitIssue | readonly FormSubmitIssue[] | undefined
```

#### `FormResetHandler`

```ts
type FormResetHandler = () => void
```

#### `FormStateChangeHandler`

```ts
type FormStateChangeHandler = (state: FormState) => void
```

#### `FormValidateContext`

```ts
type FormValidateContext = DOMFormValidateContext<string>
```

#### `FormValidationIssue`

```ts
type FormValidationIssue = DOMFormValidationIssue
```

#### `FormValidationResult`

```ts
type FormValidationResult = DOMFormValidationResult
```

#### `FormValidateHandler`

```ts
type FormValidateHandler<Values extends object = Record<string, unknown>> = DOMFormValidateHandler<string, FormValues<Values>>
```

#### `FormSubmitStartedAction`

```ts
type FormSubmitStartedAction = () => number | null
```

#### `FormSubmitSucceededAction`

```ts
type FormSubmitSucceededAction = (generation: number) => boolean
```

#### `FormSubmitFailedAction`

```ts
type FormSubmitFailedAction =
(
  generation: number,
  issues?: readonly FormIssue[],
) => boolean
```

#### `FormReplaceIssuesAction`

```ts
type FormReplaceIssuesAction =
(
  source: FormIssueSource,
  issues: readonly FormIssue[],
) => boolean
```

#### `FormResetAction`

```ts
type FormResetAction = () => void
```

#### `FormRootComponent`

#### `FormControlCapabilities`

| 이름 | 타입 | 필수 |
| --- | --- | --- |
| `id` | `boolean` | — |
| `describedBy` | `boolean` | — |
| `invalid` | `boolean` | — |
| `labelledBy` | `boolean` | — |
| `required` | `boolean` | — |
| `disabled` | `boolean` | — |
| `readonly` | `boolean` | — |

#### `FormControlParticipation`

| 이름 | 타입 | 필수 |
| --- | --- | --- |
| `participating` | `boolean` | 필수 |
| `controlProps` | `ComputedRef<Readonly<Record<string, unknown>>>` | 필수 |

#### `FormControlRegistration`

| 이름 | 타입 | 필수 |
| --- | --- | --- |
| `element` | `FormElementSource` | 필수 |
| `semanticControl` | `FormElementSource` | — |
| `focusTarget` | `FormElementSource` | — |
| `validationTarget` | `FormElementSource` | — |
| `submissions` | `FormSubmissionSource` | — |
| `labelMode` | `FormLabelMode` | — |
| `capabilities` | `FormControlCapabilities` | — |
| `explicit` | `readonly FormMetadataAttribute[]` | — |
| `reset` | `() => void` | — |

#### `FormElementSource`

```ts
type FormElementSource<ElementType extends HTMLElement = HTMLElement> =
| Readonly<ShallowRef<ElementType | null | undefined>>
  | (() => ElementType | null)
```

#### `FormLabelMode`

```ts
type FormLabelMode = 'for' | 'labelledby' | 'legend'
```

#### `FormMetadataAttribute`

```ts
type FormMetadataAttribute =
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
  | 'aria-readonly'
```

#### `FormSubmissionCapabilities`

| 이름 | 타입 | 필수 |
| --- | --- | --- |
| `name` | `boolean` | — |
| `form` | `boolean` | — |
| `required` | `boolean` | — |
| `disabled` | `boolean` | — |
| `readonly` | `boolean` | — |

#### `FormSubmissionRegistration`

| 이름 | 타입 | 필수 |
| --- | --- | --- |
| `element` | `FormElementSource<FormControlSubmissionElement>` | 필수 |
| `relativeName` | `FormControlRelativePath` | — |
| `capabilities` | `FormSubmissionCapabilities` | — |
| `explicit` | `readonly FormMetadataAttribute[]` | — |

#### `FormSubmissionSource`

```ts
type FormSubmissionSource =
| readonly FormSubmissionRegistration[]
  | (() => readonly FormSubmissionRegistration[])
```

## 파트

공통 범위: <code class="component-scope-token">[data-scope="form"]</code>. 컴포넌트 내부로 스타일을 제한할 때 파트 선택자와 함께 사용합니다.

<div class="component-parts-table">
<table>
<thead>
<tr><th scope="col">파트</th><th scope="col">선택자</th><th scope="col">역할</th><th scope="col">추가 속성</th></tr>
</thead>
<tbody>
<tr>
  <td><code class="component-part-token">root</code></td>
  <td><code>[data-part="root"]</code></td>
  <td>컴포넌트 경계와 내부 파트를 묶습니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
<tr>
  <td><code class="component-part-token">field</code></td>
  <td><code>[data-part="field"]</code></td>
  <td>Field 스타일 영역을 노출합니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
<tr>
  <td><code class="component-part-token">label</code></td>
  <td><code>[data-part="label"]</code></td>
  <td>컴포넌트 조작부의 레이블입니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
<tr>
  <td><code class="component-part-token">description</code></td>
  <td><code>[data-part="description"]</code></td>
  <td>연결된 콘텐츠나 결정 내용을 설명합니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
<tr>
  <td><code class="component-part-token">message</code></td>
  <td><code>[data-part="message"]</code></td>
  <td>Message 스타일 영역을 노출합니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
<tr>
  <td><code class="component-part-token">summary</code></td>
  <td><code>[data-part="summary"]</code></td>
  <td>Summary 스타일 영역을 노출합니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
<tr>
  <td><code class="component-part-token">reset</code></td>
  <td><code>[data-part="reset"]</code></td>
  <td>네이티브 폼 값과 연결된 폼 상태를 초기화합니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
<tr>
  <td><code class="component-part-token">submit</code></td>
  <td><code>[data-part="submit"]</code></td>
  <td>연결된 검증을 거쳐 네이티브 폼을 제출합니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
</tbody>
</table>
</div>

## 키보드 동작

| 키 | 동작 |
| --- | --- |
| <kbd>Tab</kbd> / <kbd>Shift+Tab</kbd> | 네이티브 폼 컨트롤을 문서 순서대로 이동합니다. |
| <kbd>Enter</kbd> | 제출 가능한 네이티브 컨트롤에서 폼을 제출하고 검증합니다. |

## 접근성

네이티브 폼과 컨트롤의 의미를 유지하면서 레이블·설명·오류 메시지·오류 요약이 검증 상태를 전달하고 첫 번째 잘못된 컨트롤로 포커스를 옮깁니다.

[관련 WAI-ARIA 패턴](https://html.spec.whatwg.org/multipage/forms.html#forms)에서 호스트 접근성 규칙을 확인할 수 있습니다.
