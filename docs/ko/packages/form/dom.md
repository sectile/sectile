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

브라우저가 form의 `action`, `method`, `enctype`, `target`, 제출 버튼 override를 그대로 처리해야 하면 `onSubmit`을 생략합니다.

```ts
const form = createForm({ form: formElement })
```

JavaScript에서 저장하려면 `onSubmit`을 전달합니다. callback은 원본 `SubmitEvent`, 네이티브 `FormData`, 구조화된 `values`, submitter를 받습니다.

```ts
const form = createForm({
  form: formElement,
  onSubmit: async ({ formData, submitter }) => {
    await fetch('/account', {
      method: 'POST',
      body: formData,
      headers: submitter?.dataset.intent === 'draft'
        ? { 'X-Save-Mode': 'draft' }
        : undefined,
    })
  },
})
```

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

검증 callback은 [검증과 오류](./validation), 비동기 결과와 서버 오류는 [제출과 초기화](./submission)에서 이어서 설명합니다.
