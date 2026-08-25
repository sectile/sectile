<!-- scripts/generate-component-pages.mjs에서 생성함. -->
# Form

네이티브 컨트롤이 값을 소유한 채 필드 메타데이터, 검증 오류, 제출, 초기화를 조정합니다.

## 용법

### 구성 방식

Form은 다양한 입력 UI에 네이티브 `<form>` 제출·초기화·제약 조건 검사와 필드 메타데이터·오류 표시를 연결하는 조정 계층입니다.

| 구성 요소 | 역할 |
| --- | --- |
| `FormRoot` | 네이티브 form 요소, 참여 필드 레지스트리, 제출 및 초기화 상태를 소유합니다. |
| `FormField` | 하나의 필드 이름 또는 중첩 경로와 `id`, `required`, `disabled`, `readonly` 메타데이터를 선언합니다. |
| `FormLabel` | 일반 입력에는 `for`를, 복합 입력에는 `aria-labelledby`를 연결합니다. |
| `FormDescription` / `FormMessage` | 설명과 현재 오류를 `aria-describedby`, `aria-errormessage`에 연결합니다. |
| `FormSummary` / `FormSubmit` | 폼 전체 오류와 제출 동작을 노출합니다. |

Sectile 입력 컴포넌트는 공통 참여 규약을 통해 필드 메타데이터를 받습니다. 일반 `input`, `select`, `textarea`도 `FormField` 안에서 같은 제출에 참여합니다.

### 기본 폼

Sectile 필드와 입력으로 폼을 구성하고 중첩 값을 제출합니다.

<ComponentExample component="form" scenario="profile" title="기본 폼" description="Sectile 필드와 입력으로 폼을 구성하고 중첩 값을 제출합니다." :index="0" />

### 필드 메타데이터

`FormField`에 한 번 선언한 메타데이터는 입력의 기능에 맞게 분배됩니다. 입력에 같은 속성을 직접 선언하면 명시한 값이 우선합니다.

| 선언 | 연결되는 대상 |
| --- | --- |
| `id` | 입력 `id`, 레이블 `for`, 설명 및 오류 ID |
| `name` | 네이티브 제출 이름과 구조화된 값 경로 |
| `form` | 폼 밖에 렌더링된 제출 요소의 form 연결 |
| `required`, `disabled`, `readonly` | 해당 기능을 지원하는 시맨틱 입력과 숨은 제출 요소 |
| 레이블·설명·오류 상태 | `aria-labelledby`, `aria-describedby`, `aria-errormessage`, `aria-invalid` 및 관련 ARIA 상태 |

### 구조화된 제출 값

문자열 이름은 최상위 키가 되고, 문자열·숫자 배열은 객체와 배열 경로가 됩니다.

| 필드 이름 | `details.values` 결과 |
| --- | --- |
| `name="email"` | `values.email` |
| `:name="['profile', 'displayName']"` | `values.profile.displayName` |
| `:name="['members', 0, 'email']"` | `values.members[0].email` |

제출 콜백은 `event`, 구조화된 `values`, 원본 `formData`, `submitter`, 현재 폼 `state`를 함께 받습니다. 애플리케이션은 `values`를 기본 제출 객체로 사용하고, 파일 업로드와 네이티브 인코딩에는 `formData`를 활용할 수 있습니다.

### 상태와 검증

- 브라우저 제약 조건과 각 참여 입력의 검증 결과를 하나의 이슈 목록으로 합칩니다.
- `FormSummary`는 폼 전체 이슈를, `FormMessage`는 현재 필드 이슈를 표시합니다.
- 루트 슬롯의 `submitStarted`, `submitSucceeded`, `submitFailed`, `replaceIssues`로 비동기 및 서버 검증 상태를 반영할 수 있습니다.
- `TextField`는 `v-model.trim`, `v-model.number`, `v-model.lazy`를 지원합니다. 다른 입력은 각 컴포넌트의 값 타입과 모델 계약을 유지합니다.

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
  <li><code class="component-api-token">FormSubmit</code></li>
</ul>
</div>

### 함수

#### `useFormControl`

```ts
function useFormControl(registration: FormControlRegistration): FormControlParticipation
```

#### `provideFormControlOwner`

```ts
function provideFormControlOwner(): void
```

### Props

#### `FormRootProps`

| 속성 | 타입 | 기본값 | 설명 |
| --- | --- | --- | --- |
| `issues` | `readonly FormIssue[]` | `[]` | 애플리케이션이 제공하는 검증 이슈입니다. |

#### `FormFieldProps`

| 속성 | 타입 | 기본값 | 설명 |
| --- | --- | --- | --- |
| `disabled` | `boolean` | `undefined` | 사용자 조작을 막을지 여부입니다. |
| `readonly` | `boolean` | `undefined` | 값을 확인할 수 있지만 바꿀 수 없게 할지 여부입니다. |
| `required` | `boolean` | `undefined` | 제출 전에 올바른 값이 반드시 있어야 하는지 여부입니다. |
| `id` | `string` | `undefined` | 관련 파트를 연결하는 안정적인 ID입니다. |
| `name` | `FormFieldPath` | `undefined` | 네이티브 폼 제출에 사용할 이름입니다. |
| `form` | `string` | `undefined` | 컨트롤을 연결할 네이티브 form 요소의 ID입니다. |
| `validate` | `() => FormParticipantValidation<string>` | `undefined` | 현재 필드를 검증하고 애플리케이션 이슈를 반환하는 함수입니다. |
| `as` | `PrimitiveAs` | `undefined` | 이 파트가 렌더링할 요소 또는 컴포넌트입니다. |
| `asChild` | `boolean` | `undefined` | 래퍼를 만들지 않고 하나의 자식 요소에 파트 속성을 합칠지 여부입니다. |

#### `FormPartProps`

| 속성 | 타입 | 기본값 | 설명 |
| --- | --- | --- | --- |
| `as` | `PrimitiveAs` | 파트별로 다름 | 이 파트가 렌더링할 요소 또는 컴포넌트입니다. |
| `asChild` | `boolean` | `false` | 래퍼를 만들지 않고 하나의 자식 요소에 파트 속성을 합칠지 여부입니다. |

### 슬롯

#### `FormRootSlotProps`

| 값 | 타입 | 설명 |
| --- | --- | --- |
| `state` | `FormState` | 현재 전체 폼 상태입니다. |
| `reset` | `() => void` | 초깃값과 조작 상태로 되돌리는 함수입니다. |
| `submitStarted` | `() => boolean` | 제출 시도를 시작 상태로 기록하는 함수입니다. |
| `submitSucceeded` | `() => boolean` | 현재 제출을 성공으로 기록하는 함수입니다. |
| `submitFailed` | `(issues?: readonly FormIssue[]) => boolean` | 현재 제출을 실패로 기록하는 함수입니다. |
| `replaceIssues` | `(source: FormIssueSource, issues: readonly FormIssue[]) => boolean` | 한 출처의 검증 이슈를 바꾸는 함수입니다. |
| `dirty` | `boolean` | 현재 값이 초깃값과 다른지 여부입니다. |
| `status` | `FormState['status']` | 현재 제출 상태입니다. |
| `touched` | `boolean` | 사용자가 필드를 조작했는지 여부입니다. |
| `valid` | `boolean` | 현재 검증 이슈가 없는지 여부입니다. |
| `submitCount` | `number` | 제출을 시도한 횟수입니다. |
| `submitted` | `boolean` | 제출을 시도했는지 여부입니다. |

#### `FormFieldSlotProps`

| 값 | 타입 | 설명 |
| --- | --- | --- |
| `issues` | `readonly FormIssue[]` | 현재 검증 이슈입니다. |
| `controlId` | `string` | 시맨틱 컨트롤에 지정한 ID입니다. |
| `describedBy` | `string` | 컨트롤을 설명하는 공백 구분 ID입니다. |
| `descriptionId` | `string` | 필드 도움말에 지정한 ID입니다. |
| `dirty` | `boolean` | 현재 값이 초깃값과 다른지 여부입니다. |
| `id` | `string` | 현재 필드 또는 항목의 안정적인 ID입니다. |
| `labelId` | `string` | 필드 레이블에 지정한 ID입니다. |
| `messageId` | `string` | 필드 오류 메시지에 지정한 ID입니다. |
| `touched` | `boolean` | 사용자가 필드를 조작했는지 여부입니다. |
| `valid` | `boolean` | 현재 검증 이슈가 없는지 여부입니다. |

### 이벤트

#### `FormRoot`

| 이벤트 | 페이로드 | 설명 |
| --- | --- | --- |
| `submit` | `FormSubmitDetails<string>` | 네이티브 폼 제출이 검증을 통과할 때 발생합니다. |
| `reset` | — | 컴포넌트 상태를 초기화한 뒤 발생합니다. |
| `state-change` | `FormState<string>` | 공개 상태 스냅샷이 바뀔 때마다 발생합니다. |

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

#### `FormSubmissionCapabilities`

| 이름 | 타입 | 필수 |
| --- | --- | --- |
| `name` | `boolean` | — |
| `form` | `boolean` | — |
| `required` | `boolean` | — |
| `disabled` | `boolean` | — |
| `readonly` | `boolean` | — |

#### `FormElementSource`

```ts
type FormElementSource<ElementType extends HTMLElement = HTMLElement> =
| Ref<ElementType | null>
  | (() => ElementType | null)
```

#### `FormSubmissionRegistration`

| 이름 | 타입 | 필수 |
| --- | --- | --- |
| `element` | `FormElementSource<FormSubmissionElement>` | 필수 |
| `relativeName` | `FormRelativePath` | — |
| `capabilities` | `FormSubmissionCapabilities` | — |
| `explicit` | `readonly FormMetadataAttribute[]` | — |

#### `FormSubmissionSource`

```ts
type FormSubmissionSource =
| readonly FormSubmissionRegistration[]
  | (() => readonly FormSubmissionRegistration[])
```

#### `FormControlRegistration`

| 이름 | 타입 | 필수 |
| --- | --- | --- |
| `element` | `FormElementSource` | 필수 |
| `semanticControl` | `FormElementSource` | — |
| `focusTarget` | `FormElementSource` | — |
| `submissions` | `FormSubmissionSource` | — |
| `labelMode` | `FormLabelMode` | — |
| `capabilities` | `FormControlCapabilities` | — |
| `explicit` | `readonly FormMetadataAttribute[]` | — |

#### `FormControlParticipation`

| 이름 | 타입 | 필수 |
| --- | --- | --- |
| `participating` | `boolean` | 필수 |
| `controlProps` | `ComputedRef<Readonly<Record<string, unknown>>>` | 필수 |

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
  <td><code class="component-part-token">submit</code></td>
  <td><code>[data-part="submit"]</code></td>
  <td>Submit 스타일 영역을 노출합니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
</tbody>
</table>
</div>

## 키보드 동작

| 키 | 동작 |
| --- | --- |
| <kbd>Tab</kbd> / <kbd>Shift+Tab</kbd> | 네이티브 폼 컨트롤을 문서 순서대로 이동합니다. |
| <kbd>Enter</kbd> | 제출 가능한 네이티브 컨트롤에서 폼을 제출하고 등록된 필드를 검증합니다. |

## 접근성

네이티브 폼과 컨트롤의 의미를 유지하면서 레이블·설명·오류 메시지·오류 요약이 검증 상태를 전달하고 첫 번째 잘못된 컨트롤로 포커스를 옮깁니다.

[관련 WAI-ARIA 패턴](https://html.spec.whatwg.org/multipage/forms.html#forms)에서 호스트 접근성 규칙을 확인할 수 있습니다.
