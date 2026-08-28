---
title: 제출과 초기화
description: 네이티브·관리형 제출을 선택하고 FormData와 schema를 처리하며 값을 예측 가능하게 초기화합니다.
---

# 제출과 초기화

일반 브라우저 이동과 JavaScript가 관리하는 저장 중 하나를 선택할 수 있습니다. 두 방식 모두 네이티브 form과 submitter 의미를 사용합니다.

## 관리형 제출

`defineFormSubmission()`은 선택적 schema와 callback을 함께 묶습니다. 반환값을 `v-bind`로 `FormRoot`에 전달합니다.

```ts
const submission = defineFormSubmission({
  onSubmit: async ({ formData, submitter }) => {
    await saveProfile(formData, {
      mode: submitter?.dataset.intent === 'draft' ? 'draft' : 'publish',
    })
  },
})
```

Schema가 없으면 `formData`를 우선 사용하세요. 파일, 반복 이름, checkbox·radio 생략, disabled 컨트롤, 클릭한 제출 버튼을 정확히 표현합니다.

```ts
const avatar = formData.get('avatar')
if (avatar instanceof File) await uploadAvatar(avatar)

const interests = formData.getAll('interest')
```

## 타입이 있는 schema 출력

Standard Schema를 전달하면 `values`는 schema가 변환한 출력 타입입니다.

```ts
const submission = defineFormSubmission({
  schema: checkoutSchema,
  onSubmit: ({ values }) => {
    values.quantity // schema 변환 뒤 number로 추론
    return placeOrder(values)
  },
})
```

제출 callback이 타입 경계입니다. `FormRoot`와 `FormField`는 일반적인 정적 Vue 컴포넌트로 유지됩니다.

## 비동기 상태

Root 슬롯의 `submissionStatus`를 읽어 저장 진행 상태를 표시하고 추가 클릭을 막습니다.

```vue
<FormRoot v-bind="submission" v-slot="{ submissionStatus }">
  <!-- fields -->
  <FormSubmit :disabled="submissionStatus === 'submitting'">
    {{ submissionStatus === 'submitting' ? '저장 중…' : '저장' }}
  </FormSubmit>
</FormRoot>
```

실패 결과는 필드 또는 폼 오류를 반환할 수 있습니다. 성공 결과는 `{ ok: true }` 또는 반환값 없음으로 표현할 수 있습니다.

## 네이티브 제출

브라우저의 기본 이동을 사용하려면 `onSubmit`을 생략합니다.

```vue
<FormRoot action="/checkout" method="post" enctype="multipart/form-data">
  <!-- fields -->
  <FormSubmit>주문하기</FormSubmit>
</FormRoot>
```

`formaction`, `formmethod`, `formenctype`, `formtarget`, `formnovalidate` 같은 제출 버튼 override도 그대로 사용할 수 있습니다.

## 초기화

`FormReset`은 네이티브 reset 버튼을 렌더링합니다.

```vue
<FormReset>변경 취소</FormReset>
```

Reset은 네이티브 컨트롤과 비제어 Sectile 컴포넌트를 기본값으로 되돌립니다. 제어 컴포넌트의 값은 애플리케이션이 계속 소유하므로 제품에서 함께 초기화해야 하면 `onReset`에서 `v-model`을 갱신하세요.

```vue
<script setup lang="ts">
const enabled = ref(true)
const resetControlledValues = () => { enabled.value = true }
</script>

<template>
  <FormRoot v-bind="submission" :on-reset="resetControlledValues">
    <FormField name="enabled">
      <SwitchRoot v-model="enabled" value="yes"><SwitchThumb /></SwitchRoot>
    </FormField>
    <FormReset>초기화</FormReset>
  </FormRoot>
</template>
```
