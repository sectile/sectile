---
title: Form
description: 네이티브 HTML 컨트롤과 Sectile 컴포넌트로 접근 가능한 폼을 만들고 검증과 제출을 연결합니다.
---

# Form

Sectile Form은 네이티브 HTML 컨트롤과 Sectile 컴포넌트에 레이블, 설명, 오류, 검증, 제출, 초기화 동작을 연결합니다. 여러 입력을 하나의 접근 가능한 폼으로 다뤄야 할 때 사용합니다.

## 환경 선택

| 애플리케이션 | 설치 | 시작 문서 |
| --- | --- | --- |
| Vue | `pnpm add @sectile/core @sectile/form @sectile/dom @sectile/vue vue` | [Vue 폼](./form/vue) |
| Vue를 쓰지 않는 브라우저 | `pnpm add @sectile/core @sectile/form @sectile/dom` | [DOM 폼](./form/dom) |

`@sectile/form`은 DOM과 Vue 패키지의 optional peer입니다. Form 진입점을 import하지 않는 앱에는 설치할 필요가 없습니다.

## 완성된 Vue 폼

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
  onSubmit: async ({ formData }) => {
    await saveProfile(formData)
  },
})
</script>

<template>
  <FormRoot v-bind="submission">
    <FormSummary />

    <FormField name="displayName" required>
      <FormLabel>표시 이름</FormLabel>
      <TextField autocomplete="name" />
      <FormDescription>다른 워크스페이스 구성원에게 표시됩니다.</FormDescription>
      <FormMessage />
    </FormField>

    <FormSubmit>프로필 저장</FormSubmit>
  </FormRoot>
</template>
```

`FormField`는 공통 필드 속성을 전달하지만 입력값은 계속 실제 입력 컴포넌트가 소유합니다. 네이티브 입력, Sectile 입력, 두 종류를 섞은 폼을 같은 방식으로 구성할 수 있습니다.

## 작업별 안내

| 작업 | 문서 |
| --- | --- |
| Vue 템플릿에서 폼 만들기 | [Vue 폼](./form/vue) |
| 기존 HTML 폼 연결하기 | [DOM 폼](./form/dom) |
| 네이티브·Sectile 입력, 그룹, 중첩 이름 함께 쓰기 | [필드와 컨트롤](./form/fields) |
| 브라우저·schema·앱·서버 오류 표시하기 | [검증과 오류](./form/validation) |
| 파일, 비동기 저장, 네이티브 이동, 초기화 처리하기 | [제출과 초기화](./form/submission) |
| 앱 컴포넌트를 `FormField`와 연결하기 | [사용자 정의 컨트롤](./form/custom-controls) |
| hydration 문제 없이 서버 렌더링하기 | [SSR과 hydration](./form/ssr) |

모든 Vue 파트, prop, slot, 공개 타입은 [Form 컴포넌트 레퍼런스](/ko/components/form)에서 확인할 수 있습니다.
