---
title: DOM 폼
description: Vue 없이 기존 HTML 폼에 Sectile Form 동작을 연결합니다.
---

# DOM 폼

DOM 통합과 optional Form peer를 설치합니다.

```sh
pnpm add @sectile/core @sectile/form @sectile/dom
```

## 기존 마크업 연결하기

일반 HTML부터 작성합니다. JavaScript가 로드되기 전에도 폼을 사용할 수 있습니다.

```html
<form id="account-form">
  <div id="account-summary"></div>

  <label for="account-email">이메일 주소</label>
  <input id="account-email" name="email" type="email" required>

  <button type="reset">초기화</button>
  <button type="submit">계정 저장</button>
</form>
```

연결 객체를 하나 만들고 필드 오류와 포커스 복구를 적용할 컨트롤을 지정합니다.

```ts
import { createForm, defineFormSubmission } from '@sectile/dom/form'

const formElement = document.querySelector<HTMLFormElement>('#account-form')!
const summary = document.querySelector<HTMLElement>('#account-summary')!
const email = document.querySelector<HTMLInputElement>('#account-email')!

const submission = defineFormSubmission({
  onSubmit: ({ formData }) => saveAccount(formData),
})

const form = createForm({
  form: formElement,
  summary,
  participants: [{ id: 'email', element: email }],
  ...submission,
})

window.addEventListener('pagehide', () => form.destroy(), { once: true })
```

participant로 지정하지 않은 이름 있는 컨트롤도 네이티브 `FormData`에는 포함됩니다. 필드 상태, 오류 대상, 초기화 연결, 사용자 정의 포커스가 필요할 때 participant를 등록하세요.

## 네이티브 제출과 관리형 제출

브라우저가 form의 `action`, `method`, `enctype`, `target`과 제출 버튼에서 덮어쓴 속성을 그대로 처리해야 하면 `onSubmit`을 생략합니다.

```ts
const form = createForm({ form: formElement })
```

JavaScript에서 저장하려면 `onSubmit`을 전달합니다. 제출 함수는 원본 `SubmitEvent`, 네이티브 `FormData`, 구조화된 `values`, submitter를 받습니다.

```ts
const form = createForm({
  form: formElement,
  onSubmit: async ({ formData, submitter, reinitialize }) => {
    await fetch('/account', {
      method: 'POST',
      body: formData,
      headers: submitter?.dataset.intent === 'draft'
        ? { 'X-Save-Mode': 'draft' }
        : undefined,
    })
    reinitialize()
  },
})
```

제출 함수에서 호출한 `reinitialize()`는 관리형 제출이 성공한 뒤에만 반영됩니다. 함수가 예외를 던지거나 Promise가 거부되거나 `{ ok: false }`를 반환하면 기존 변경 기준이 유지됩니다.

## dirty와 touched

폼 상태에 따라 앱 UI를 바꿔야 한다면 상태 변경을 구독합니다.

```ts
const unsubscribe = form.subscribe(({ state }) => {
  unsavedBadge.hidden = !state.dirty
  saveButton.disabled = state.submission.status === 'submitting'
})
```

`dirty`는 하나 이상의 participant 값이 기준값과 다르다는 뜻입니다. 모든 값을 원래대로 돌리면 다시 `false`가 됩니다. `touched`는 조작 여부를 따로 기록하므로 `dirty`가 `false`여도 `true`로 남을 수 있습니다.

생명주기 메타데이터는 `state.validation`(`generation`, `status`, `trigger`, `intent`)과 `state.submission`(`generation`, `status`, `count`, `failure`)으로 묶여 있습니다. 제출 `failure`는 저장 실패를 나타내지만 필드를 무효로 만들지 않습니다. 서버가 값을 거부했다면 validation 채널인 `issues`를 사용합니다.

검증 callback 이슈 하나는 주 `path`와 함께 `relatedPaths`를 가질 수 있습니다. 관리형 제출의 서버 이슈는 participant ID인 `fieldId`와 `relatedFieldIds`를 사용합니다. 두 경우 모두 summary에는 한 번만 나타나지만 일치하는 participant는 모두 무효가 됩니다. 주 participant나 관련 participant의 값이 바뀌면 서버 이슈가 해제되고, 무관한 participant 변경에는 남아 있습니다.

네이티브 input, textarea, select, checkbox, radio, file input은 값을 자동으로 기록합니다. 사용자 정의 participant는 값과 비교 규칙을 직접 제공할 수 있습니다.

```ts
interface RangeSnapshot {
  readonly start: number
  readonly end: number
}

const isRangeSnapshot = (value: unknown): value is RangeSnapshot => (
  typeof value === 'object'
  && value !== null
  && 'start' in value
  && 'end' in value
)

const unregister = form.registerParticipant({
  id: 'range',
  element: rangeRoot,
  getValue: () => ({ start: range.start, end: range.end }),
  isValueEqual: (current, baseline) => (
    isRangeSnapshot(current)
    && isRangeSnapshot(baseline)
    && current.start === baseline.start
    && current.end === baseline.end
  ),
})
```

사용자 정의 컨트롤이 네이티브 `input`이나 `change` 이벤트 없이 바뀌었다면 `refreshParticipant('range')`를 호출하세요.

## 현재 값을 새 기준으로 삼기

`reinitialize()`는 컨트롤 값을 바꾸지 않고 모든 participant의 현재 값을 새 기준으로 삼습니다.

```ts
form.reinitialize()
```

기본값으로 조작 기록, 검증 상태, 제출 상태도 함께 초기화됩니다. 필요한 상태만 유지할 수 있습니다.

```ts
form.reinitialize({
  preserve: {
    touched: true,
    validation: true,
    submission: true,
  },
})
```

컨트롤을 기본값으로 되돌리려면 `reset()`, 화면의 현재 값을 유지한 채 저장된 상태로 확정하려면 `reinitialize()`를 사용하세요. 전체 상태 계약은 [제출과 값 기준 관리](./submission)에서 설명합니다.

## 동적 컨트롤

연결 뒤 필드가 추가되면 `registerParticipant()`를 호출합니다. 반환된 정리 함수를 보관했다가 필드를 제거할 때 호출하세요.

```ts
const unregister = form.registerParticipant({
  id: 'phone',
  element: phoneInput,
})

// 입력을 화면에서 제거할 때
unregister()
```

검증 함수는 [검증과 오류](./validation), 비동기 결과와 서버 오류는 [제출과 값 기준 관리](./submission)에서 이어서 설명합니다.
