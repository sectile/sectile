---
title: Form API
description: Form의 Vue 컴포넌트, prop, slot, 이벤트, 함수와 공개 타입을 확인합니다.
---
<!-- scripts/generate-component-pages.mjs에서 생성함. -->
# Form API

Form의 Vue 컴포넌트, prop, slot, 이벤트, 함수와 공개 타입을 확인합니다.

[Form 개요로 돌아가기](/ko/packages/form)

## API

Vue 패키지: `@sectile/vue/form`

<div class="component-api-group">
<strong class="component-api-label">컴포넌트</strong>
<ul class="component-api-list">
  <li><code class="component-api-token">FormRoot</code></li>
  <li><code class="component-api-token">FormSelector</code></li>
  <li><code class="component-api-token">FormFieldSelector</code></li>
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

#### `useFormSelector`

```ts
function useFormSelector<Selected>(selector: FormSelectorFunction<Selected>, options: FormSubscribeOptions<Selected> = {}): Readonly<ShallowRef<Selected>>
```

#### `useFormFieldSelector`

```ts
function useFormFieldSelector<Selected>(id: string, selector: FormFieldSelectorFunction<Selected>, options: FormSubscribeOptions<Selected> = {}): Readonly<ShallowRef<Selected>>
```

#### `useFormFieldController`

```ts
function useFormFieldController(id: string): FormFieldController
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
  readonly getValue?: () => unknown;
  readonly isValueEqual?: (current: unknown, baseline: unknown) => boolean;
}): FormControlParticipation
```

#### `useFormControl`

```ts
function useFormControl(registration: FormControlRegistration): FormControlParticipation
```

#### `useNativeInputFormControl`

```ts
function useNativeInputFormControl(element: Readonly<ShallowRef<HTMLInputElement | HTMLTextAreaElement | null | undefined>>, options: {
    readonly reset?: () => void;
    readonly getValue?: () => unknown;
    readonly isValueEqual?: (current: unknown, baseline: unknown) => boolean;
  } = {}): FormControlParticipation
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
<p>제출 중 throw 또는 reject된 오류를 사용자에게 노출해도 되는 failure로 변환하는 함수입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>onSubmit</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>FormSubmitHandler&lt;Output&gt;</code></span><span><span class="component-api-definition__label">기본값</span><code>undefined</code></span></div>
<p>검증을 통과한 네이티브 제출을 처리하고 성공, 제출 failure 또는 서버 이슈를 반환하는 함수입니다.</p>
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

#### `FormSelectorProps`

<dl class="component-api-definitions component-api-definitions--props">
<div class="component-api-definition">
<dt><code>equals</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>NonNullable&lt;FormSubscribeOptions&lt;Selected&gt;['equals']&gt;</code></span><span><span class="component-api-definition__label">기본값</span><code>undefined</code></span></div>
<p>선택한 두 상태 스냅샷이 같은지 판정하는 함수입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>select</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>FormSelectorFunction&lt;Selected&gt;</code></span><span><span class="component-api-definition__label">기본값</span>필수</span></div>
<p>슬롯에 노출할 폼 또는 필드 상태를 선택하는 함수입니다.</p>
</dd>
</div>
</dl>

#### `FormFieldSelectorProps`

<dl class="component-api-definitions component-api-definitions--props">
<div class="component-api-definition">
<dt><code>equals</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>NonNullable&lt;FormSubscribeOptions&lt;Selected&gt;['equals']&gt;</code></span><span><span class="component-api-definition__label">기본값</span><code>undefined</code></span></div>
<p>선택한 두 상태 스냅샷이 같은지 판정하는 함수입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>id</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>string</code></span><span><span class="component-api-definition__label">기본값</span>필수</span></div>
<p>관련 파트를 연결하는 안정적인 ID입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>select</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>FormFieldSelectorFunction&lt;Selected&gt;</code></span><span><span class="component-api-definition__label">기본값</span>필수</span></div>
<p>슬롯에 노출할 폼 또는 필드 상태를 선택하는 함수입니다.</p>
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
<p>현재 값이 기준값과 다른지 여부입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>reinitialize</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>FormReinitializeAction</code></span></div>
<p>현재 값을 새 변경 기준으로 삼고, 유지하도록 지정하지 않은 폼 상태를 초기화하는 함수입니다.</p>
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
<p>네이티브 form reset을 실행하고 Form 상태를 비웁니다. 제어 값은 계속 애플리케이션이 관리합니다.</p>
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
<dt><code>submission</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>FormState['submission']</code></span></div>
<p>현재 제출 생명주기 스냅샷입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>submitCount</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>number</code></span></div>
<p>submission.count에서 계산한 제출 시도 횟수입니다.</p>
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
<dt><code>validation</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>FormState['validation']</code></span></div>
<p>현재 검증 생명주기 스냅샷입니다.</p>
</dd>
</div>
</dl>

#### `FormFieldSlotProps`

<dl class="component-api-definitions component-api-definitions--slots">
<div class="component-api-definition">
<dt><code>clearIssues</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>(source?: FormIssueSource) =&gt; boolean</code></span></div>
<p>현재 필드의 검증 이슈를 비우는 함수입니다.</p>
</dd>
</div>
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
<p>현재 값이 기준값과 다른지 여부입니다.</p>
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
<p>현재 canonical 검증 이슈입니다.</p>
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
<dt><code>relatedIssues</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>readonly FormIssue[]</code></span></div>
<p>다른 필드가 소유하지만 현재 필드도 무효로 만드는 이슈입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>removeIssue</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>(issueId: Parameters&lt;FormConnection&lt;string&gt;['removeFieldIssue']&gt;[1]) =&gt; boolean</code></span></div>
<p>ID로 필드 이슈 하나를 제거하는 함수입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>replaceIssues</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>(source: FormIssueSource, issues: readonly FormIssue[]) =&gt; boolean</code></span></div>
<p>한 출처의 검증 이슈를 바꾸는 함수입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>setMeta</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>(meta: FormFieldMetaInput) =&gt; boolean</code></span></div>
<p>현재 필드의 수정 가능한 메타 상태를 갱신하는 함수입니다.</p>
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
<dt><code>upsertIssue</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>(issue: FormIssue) =&gt; boolean</code></span></div>
<p>필드 이슈 하나를 추가하거나 교체하는 함수입니다.</p>
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

#### `FormSummarySlotProps`

<dl class="component-api-definitions component-api-definitions--slots">
<div class="component-api-definition">
<dt><code>firstIssue</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>FormIssue | null</code></span></div>
<p>첫 canonical 이슈이며 없으면 null입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>issues</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>readonly FormIssue[]</code></span></div>
<p>현재 canonical 검증 이슈입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>serverIssues</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>readonly FormIssue[]</code></span></div>
<p>현재 canonical 서버 이슈입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>submission</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>FormState['submission']</code></span></div>
<p>현재 제출 생명주기 스냅샷입니다.</p>
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
<dt><code>validation</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>FormState['validation']</code></span></div>
<p>현재 검증 생명주기 스냅샷입니다.</p>
</dd>
</div>
</dl>

#### `FormSubmitSlotProps`

<dl class="component-api-definitions component-api-definitions--slots">
<div class="component-api-definition">
<dt><code>canSubmit</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>boolean</code></span></div>
<p>폼이 유효하고 제출 중이 아닌지 여부입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>submission</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>FormState['submission']</code></span></div>
<p>현재 제출 생명주기 스냅샷입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>submitting</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>boolean</code></span></div>
<p>폼 제출이 진행 중인지 여부입니다.</p>
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

| 이름 | 타입 | 필수 |
| --- | --- | --- |
| `values` | `Readonly<Values>` | 필수 |
| `state` | `FormState<string>` | 필수 |
| `formData` | `FormData` | 필수 |
| `submitter` | `HTMLElement \| null` | 필수 |
| `reinitialize` | `FormReinitializeHandler` | 필수 |
| `nativeEvent` | `SubmitEvent` | 필수 |
| `defaultPrevented` | `boolean` | 필수 |
| `preventDefault` | `() => void` | 필수 |
| `stopPropagation` | `() => void` | 필수 |
| `stopImmediatePropagation` | `() => void` | 필수 |

### 기타 타입

#### `FormState`

```ts
type FormState = FormConnection<string>['state']
```

#### `FormFieldState`

```ts
type FormFieldState = NonNullable<ReturnType<FormConnection<string>['getField']>>
```

#### `FormFieldMetaInput`

```ts
type FormFieldMetaInput = Parameters<FormConnection<string>['setFieldMeta']>[1]
```

#### `FormSubscribeOptions`

```ts
type FormSubscribeOptions<Selected> = DOMFormSubscribeOptions<Selected>
```

#### `FormSelectorFunction`

```ts
type FormSelectorFunction<Selected> = (state: FormState) => Selected
```

#### `FormFieldSelectorFunction`

```ts
type FormFieldSelectorFunction<Selected> = (field: FormFieldState | null) => Selected
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

#### `FormReinitializeOptions`

| 이름 | 타입 | 필수 |
| --- | --- | --- |
| `preserve` | `{ readonly touched?: boolean; readonly validation?: boolean; readonly submission?: boolean; } \| undefined` | — |

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
| `relatedPaths` | `readonly FormFieldPath[]` | — |

#### `FormSubmitIssue`

```ts
type FormSubmitIssue = FormIssueInput
```

#### `FormSubmitResult`

```ts
type FormSubmitResult =
| void
  | { readonly ok: true }
  | {
      readonly ok: false;
      readonly failure?: FormSubmissionFailure;
      readonly issues?: readonly FormSubmitIssue[];
    }
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
) => FormSubmissionFailure | undefined
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
  result: {
    readonly failure?: FormSubmissionFailure;
    readonly issues?: readonly FormIssue[];
  },
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

#### `FormReinitializeAction`

```ts
type FormReinitializeAction = (options?: FormReinitializeOptions) => void
```

#### `FormRootComponent`

```ts
interface FormRootComponent {
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
```

#### `FormFieldController`

| 이름 | 타입 | 필수 |
| --- | --- | --- |
| `state` | `Readonly<ShallowRef<FormFieldState \| null>>` | 필수 |
| `setMeta` | `boolean` | 필수 |
| `replaceIssues` | `boolean` | 필수 |
| `upsertIssue` | `boolean` | 필수 |
| `removeIssue` | `boolean` | 필수 |
| `clearIssues` | `boolean` | 필수 |

#### `FormSelectorComponent`

```ts
interface FormSelectorComponent {
  new <Selected>(props: FormSelectorProps<Selected>): {
    $props: FormSelectorProps<Selected>;
    $slots: { default?: (props: { readonly selected: Selected }) => VNodeChild };
  };
}
```

#### `FormFieldSelectorComponent`

```ts
interface FormFieldSelectorComponent {
  new <Selected>(props: FormFieldSelectorProps<Selected>): {
    $props: FormFieldSelectorProps<Selected>;
    $slots: { default?: (props: { readonly selected: Selected }) => VNodeChild };
  };
}
```

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
| `getValue` | `(() => unknown) \| undefined` | — |
| `isValueEqual` | `((current: unknown, baseline: unknown) => boolean) \| undefined` | — |

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
