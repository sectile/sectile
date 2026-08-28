---
title: Vue 폼
description: Vue Form 파트로 네이티브 입력과 Sectile 컴포넌트를 함께 구성합니다.
---

# Vue 폼

Form과 Vue·DOM 패키지를 함께 설치합니다.

```sh
pnpm add @sectile/core @sectile/form @sectile/dom @sectile/vue vue
```

Form 파트는 전용 진입점에서 가져옵니다.

```ts
import {
  FormDescription,
  FormField,
  FormLabel,
  FormMessage,
  FormReset,
  FormRoot,
  FormSubmit,
  FormSummary,
  defineFormSubmission,
} from '@sectile/vue/form'
```

## 폼 구조부터 만들기

`FormRoot`는 네이티브 `<form>`을 렌더링합니다. 레이블이 있는 입력마다 `FormField`를 사용하고, 필드 오류는 `FormMessage`, 폼 전체 오류는 폼 앞부분의 `FormSummary`에 표시합니다.

```vue
<script setup lang="ts">
import {
  FormDescription,
  FormField,
  FormLabel,
  FormMessage,
  FormRoot,
  FormSubmit,
  FormSummary,
  defineFormSubmission,
} from '@sectile/vue/form'
import { TextField } from '@sectile/vue/text'

const submission = defineFormSubmission({
  onSubmit: ({ formData }) => updateAccount(formData),
})
</script>

<template>
  <FormRoot v-bind="submission" autocomplete="on">
    <FormSummary />

    <FormField name="email" required>
      <FormLabel>이메일 주소</FormLabel>
      <TextField type="email" autocomplete="email" />
      <FormDescription>계정 알림을 이 주소로 보냅니다.</FormDescription>
      <FormMessage />
    </FormField>

    <FormField name="timezone">
      <FormLabel>시간대</FormLabel>
      <select>
        <option value="Asia/Seoul">서울</option>
        <option value="Europe/London">런던</option>
      </select>
      <FormMessage />
    </FormField>

    <FormSubmit>계정 저장</FormSubmit>
  </FormRoot>
</template>
```

이 예시는 Sectile 텍스트 필드와 네이티브 `<select>`를 의도적으로 섞었습니다. 두 입력 모두 같은 `FormData`에 포함됩니다.

## 파트 한눈에 보기

| 파트 | 용도 |
| --- | --- |
| `FormRoot` | 네이티브 form 속성, 검증 설정, 제출, 폼 상태 |
| `FormField` | 레이블이 있는 값 하나, 그룹 또는 복합 컨트롤 |
| `FormLabel` | 화면에 표시하는 레이블 또는 그룹 범례 |
| `FormDescription` | 필드와 연결된 도움말 |
| `FormMessage` | 현재 필드 오류 |
| `FormSummary` | 폼 전체 오류 요약 |
| `FormSubmit` | 네이티브 제출 버튼 |
| `FormReset` | 네이티브 초기화 버튼 |

## 슬롯에서 폼 상태 읽기

폼 전체 상태에 따라 달라지는 UI에는 root 슬롯을 사용합니다. 입력값은 계속 각 입력이 소유합니다.

```vue
<FormRoot v-bind="submission" v-slot="{ dirty, valid, submissionStatus }">
  <!-- fields -->
  <p v-if="dirty">저장하지 않은 변경 사항이 있습니다.</p>
  <FormSubmit :disabled="submissionStatus === 'submitting'">
    {{ submissionStatus === 'submitting' ? '저장 중…' : '저장' }}
  </FormSubmit>
</FormRoot>
```

## 속성 우선순위

`FormField`에 선언한 속성은 참여하는 컨트롤의 기본값입니다. 입력에 직접 쓴 속성이 우선하므로 특정 컨트롤만 예외로 만들 수 있습니다.

```vue
<FormField name="nickname" required>
  <TextField :required="false" />
</FormField>
```

다음으로 [필드와 컨트롤](./fields)을 읽고 필요한 [검증](./validation)과 [제출](./submission) 동작을 선택하세요.
