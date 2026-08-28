---
title: Form
description: DOM과 Vue에서 네이티브 값, 필드 메타데이터, 검증, 제출, 초기화를 조정합니다.
---

# Form

`@sectile/form`은 렌더러와 무관한 필드 경로, 네이티브 구조화 값, 이슈, 검증 generation, 제출 상태, 초기화 command를 소유합니다. 입력값이나 렌더링은 소유하지 않습니다. 값은 계속 네이티브 요소와 Sectile 컴포넌트가 관리합니다.

```sh
pnpm add @sectile/form
```

호스트 Form 어댑터를 사용하는 앱에서만 optional peer를 함께 설치합니다.

```sh
# DOM
pnpm add @sectile/core @sectile/form @sectile/dom

# Vue
pnpm add @sectile/core @sectile/form @sectile/dom @sectile/vue vue
```

일반 DOM·Vue import에는 `@sectile/form`이 필요하지 않습니다. Form은 `@sectile/dom/form`, `@sectile/vue/form`에서만 활성화됩니다. Terminal에는 Form 어댑터나 의존성이 없습니다.

## 공개 경계

| import | 책임 |
| --- | --- |
| `@sectile/form/path` | 안전한 필드·상대 경로와 네이티브 이름 인코딩 |
| `@sectile/form/values` | 순서가 있는 네이티브 항목으로 만드는 불변 구조화 값 |
| `@sectile/form/state` | 필드 레지스트리, 이슈, 검증·제출 generation, transition, command |
| `@sectile/form/schema` | Standard Schema 입력·출력 추론 타입 |
| `@sectile/form/error` | 패키지 고유 생성·전이 오류 |
| `@sectile/dom/form` | `HTMLFormElement`, `FormData`, 검증, 포커스, 제출, 외부 참여 요소 수명 주기 |
| `@sectile/vue/form` | 정적 Form 파트와 Vue 사용자 정의 컨트롤 참여 API |

패키지 루트는 타입 전용입니다. 런타임 함수는 명시적인 하위 경로에서 가져옵니다.

## Vue 구성

네이티브 컨트롤과 Sectile 컨트롤을 자유롭게 섞을 수 있습니다. `FormField` 메타데이터는 fallback이며 실제 컨트롤에 직접 쓴 속성이 우선합니다. `FormField` 밖에 있는 이름 있는 네이티브 컨트롤도 `FormData`에는 포함되지만 필드 상태, 이슈 라우팅, 조정된 포커스는 얻지 않습니다.

```vue
<script setup lang="ts">
import {
  FormField,
  FormLabel,
  FormRoot,
  FormSubmit,
  defineFormSubmission,
} from '@sectile/vue/form'
import { TextField } from '@sectile/vue/text'

const submission = defineFormSubmission({
  onSubmit: ({ formData }) => {
    console.log([...formData.entries()])
  },
})
</script>

<template>
  <FormRoot v-bind="submission">
    <FormField name="native" required>
      <FormLabel>네이티브 입력</FormLabel>
      <input />
    </FormField>

    <FormField :name="['profile', 'displayName']" required>
      <FormLabel>Sectile 입력</FormLabel>
      <TextField default-value="Mina" />
    </FormField>

    <input name="unwrapped" value="still-submitted" />
    <FormSubmit>저장</FormSubmit>
  </FormRoot>
</template>
```

네이티브 `fieldset`, radio group, checkbox group은 하나의 `FormField`로 묶습니다. 복합 Sectile 컨트롤은 시맨틱 root와 별도의 포커스·검증 대상, 반복·인덱스·범위 값을 위한 여러 숨은 제출 요소를 등록할 수 있습니다. 서로 무관한 컨트롤이 모호하게 여러 개 있으면 임의로 하나를 고르지 않고 복구 가능한 필드 진단을 만듭니다.

## 제출 타입

`defineFormSubmission()`은 schema와 handler를 `v-bind`로 한 번에 전달할 수 있는 불변 객체로 묶습니다. schema가 없으면 `values`는 정직한 `DOMFormValues`입니다. 런타임 키는 있지만 값 타입은 `unknown`이므로 `formData`를 직접 사용하거나 앱에서 값을 좁힙니다.

Standard Schema를 구현한 어떤 schema든 전달하면 handler에는 변환된 출력 타입이 추론됩니다.

```ts
import { defineFormSubmission } from '@sectile/vue/form'
import { accountSchema } from './account-schema' // Standard Schema 구현

export const accountSubmission = defineFormSubmission({
  schema: accountSchema,
  onSubmit: ({ values }) => {
    values.accountId // schema 출력에서 추론
  },
})
```

타입이 지정된 컴포넌트 factory는 없습니다. `FormRoot`와 `FormField`는 정적이며, 런타임 필드 경로를 SFC 전체 schema 경로로 추론할 수 있다고 과장하지 않습니다. 명시적 주석이 필요한 고급 용례를 위해 handler·definition 타입은 그대로 공개합니다.

## 참여 방식

| 구성 | 동작 |
| --- | --- |
| 네이티브 전용 | `input`, `textarea`, `select`, fieldset, radio, checkbox가 브라우저 의미를 그대로 사용합니다. |
| Sectile 전용 | 각 컴포넌트가 제어·비제어 값 소유권을 유지하고 실제 대상을 등록합니다. |
| 혼합 | 모든 successful control이 문서 순서의 같은 네이티브 `FormData`에 들어갑니다. |
| 직접 배치한 이름 있는 컨트롤 | 제출에는 참여하지만 향상된 필드 상태는 만들지 않습니다. |
| 사용자 정의 단일 컨트롤 | `useNativeInputFormControl` 또는 `useFormControl`로 네이티브 요소 하나를 등록합니다. `FormField` 밖에서는 helper가 아무 작업도 하지 않습니다. |
| 사용자 정의 복합 컨트롤 | root, 포커스, 검증, 제출 요소, 상대 이름, 선택적 reset hook을 등록합니다. 중첩 참여 컨트롤을 렌더링하기 전에 `provideFormControlOwner()`를 호출합니다. |
| Teleport·외부 컨트롤 | Vue context와 네이티브 `form` 연결을 유지합니다. DOM 어댑터는 등록된 외부 대상을 직접 관찰합니다. |

고정된 네이티브 template ref에는 Vue 3.5의 `useTemplateRef()`를 우선 사용합니다. callback ref, 동적·사용자 정의 요소, collection, 외부에서 받은 DOM handle에는 `shallowRef()`를 사용합니다. DOM 노드를 깊은 반응형 `ref`에 저장하지 않습니다.

```vue
<script setup lang="ts">
import { useTemplateRef } from 'vue'
import { useNativeInputFormControl } from '@sectile/vue/form'

const input = useTemplateRef<HTMLInputElement>('input')
const participation = useNativeInputFormControl(input)
</script>

<template>
  <input ref="input" v-bind="participation.controlProps.value" />
</template>
```

## 값, 검증, 제출, 초기화

- 네이티브 `FormData`가 진실의 원천입니다. 중첩 dot/bracket 경로, 배열 인덱스, 반복 이름, submitter 항목, 파일, disabled·unchecked 생략, 문서 순서를 보존합니다.
- 잘못되거나 충돌하는 경로와 prototype에 민감한 경로는 원본 `FormData`를 버리지 않고 안전한 폼 전체 이슈가 됩니다.
- native, custom, schema, application, server 이슈는 source별로 공존합니다. 정확한 경로와 가장 긴 prefix가 메시지·포커스 소유 필드를 정합니다.
- `onSubmit`이 없으면 원래 action, method, enctype, target, submitter를 유지해 네이티브 제출을 계속합니다. 비동기 검증 뒤에도 같은 제출을 한 번만 재개합니다.
- `onSubmit`이 있으면 동기·비동기 JavaScript 성공·실패를 추적하고, 중복 제출을 막으며 reset·unmount 뒤 늦은 완료를 무시합니다.
- reset은 네이티브와 비제어 Sectile 기본값을 복원하고, 제어 값 소유권을 보존하며, 조정 상태를 비우고 참여 hook을 문서 순서로 한 번씩 호출합니다.

SSR은 안정적인 네이티브 의미를 출력합니다. 참여 등록은 mount 뒤 시작되고 hydration은 필드를 중복 등록하거나 제어 값을 가져가지 않습니다.

## 0.8 마이그레이션

| 이전 API | 새 API |
| --- | --- |
| `@sectile/core/form` | 용도에 따라 `@sectile/form/state`, `@sectile/form/path`, `@sectile/form/values` |
| DOM root Form export | `@sectile/dom/form` |
| Vue root Form export | `@sectile/vue/form` |
| `createTypedForm`, `TypedForm*`, typed-path factory | 정적 `FormRoot`/`FormField`와 `defineFormSubmission()` |
| submit handler 타입을 주 API로 직접 주석 | `defineFormSubmission({ schema?, onSubmit })` |
| Terminal Form API | 제거, Terminal 어댑터 대체품 없음 |

DOM·Vue Form 사용자는 optional peer인 `@sectile/form`을 직접 설치해야 합니다. 자세한 사용법은 [Form 컴포넌트 레퍼런스](/ko/components/form)를 참고하세요.
