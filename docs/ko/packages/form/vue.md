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

폼 전체 상태에 따라 달라지는 UI에는 `FormRoot` 슬롯을 사용합니다. 입력값은 계속 각 입력이 소유합니다.

```vue
<FormRoot v-bind="submission" v-slot="{ dirty, touched, valid, validation, submission }">
  <!-- fields -->
  <p v-if="dirty">저장하지 않은 변경 사항이 있습니다.</p>
  <p v-if="touched && !dirty">값을 바꾸지 않고 폼을 확인했습니다.</p>
  <FormSubmit :disabled="submission.status === 'submitting'">
    {{ submission.status === 'submitting' ? '저장 중…' : '저장' }}
  </FormSubmit>
</FormRoot>
```

`dirty`는 한 번이라도 수정했는지를 기록하지 않습니다. 현재 값이 폼의 기준값과 다른지만 비교하므로, 값을 바꿨다가 원래대로 돌리면 다시 `false`가 됩니다. `touched`는 조작 여부를 따로 기록하므로 이때도 `true`로 남을 수 있습니다.

`validation`에는 `generation`, `status`, `trigger`, `intent`가 들어 있습니다. `submission`에는 `generation`, `status`, `count`, `failure`가 들어 있습니다. 생명주기에 따라 UI를 바꿀 때는 이 스냅샷을 사용하세요. `submitted`와 `submitCount`는 `submission.count`에서 계산한 루트 슬롯 편의 값입니다.

## 사용자 정의 summary 구성하기

`FormSummary`는 제출 failure와 이슈 메시지를 기본으로 렌더링합니다. 슬롯에는 같은 생명주기 스냅샷과 canonical 이슈 projection이 제공되므로, dialog description이나 별도 summary 레이아웃도 Form 상태를 직접 사용할 수 있습니다.

```vue
<FormSummary v-slot="{ validation, submission, issues, serverIssues, firstIssue, valid }">
  <p v-if="submission.failure">{{ submission.failure.message }}</p>
  <p v-else-if="firstIssue">{{ firstIssue.message }}</p>
  <small v-if="!valid && validation.status === 'invalid'">
    전체 {{ issues.length }}개 중 서버 이슈 {{ serverIssues.length }}개
  </small>
</FormSummary>
```

하나의 이슈는 주 `path`와 여러 `relatedPaths`를 가질 수 있습니다. `issues`에는 한 번만 나타나고, 주 필드는 `issues`, 나머지 무효 필드는 `relatedIssues`로 이슈를 노출하면서 ARIA 메타데이터에서 summary를 참조합니다.

## 현재 값을 새 기준으로 삼기

화면의 현재 값을 새 출발점으로 확정하려면 `reinitialize()`를 호출합니다. 입력값 자체는 바꾸지 않습니다.

```vue
<FormRoot v-bind="submission" v-slot="{ dirty, reinitialize }">
  <!-- fields -->
  <p v-if="dirty">저장하지 않은 변경 사항이 있습니다.</p>
  <button type="button" @click="reinitialize()">현재 값을 기준으로 지정</button>
</FormRoot>
```

`FormRoot`의 컴포넌트 ref에서도 `reinitialize()`를 호출할 수 있습니다.

```vue
<script setup lang="ts">
import { useTemplateRef } from 'vue'

const form = useTemplateRef('form')
const acceptCurrentValues = () => form.value?.reinitialize()
</script>

<template>
  <FormRoot ref="form" v-bind="submission">
    <!-- fields -->
  </FormRoot>
  <button type="button" @click="acceptCurrentValues">현재 값을 기준으로 지정</button>
</template>
```

일반적인 저장 흐름에서는 제출 이벤트가 제공하는 `reinitialize()`를 호출하는 편이 간단합니다. 관리형 제출이 성공했을 때만 새 기준이 반영됩니다.

```ts
const submission = defineFormSubmission({
  onSubmit: async ({ formData, reinitialize }) => {
    await saveProfile(formData)
    reinitialize()
  },
})
```

상태 유지 옵션과 네이티브 reset과의 차이는 [제출과 값 기준 관리](./submission)에서 확인하세요.

## 이탈 경고와 작성 중 데이터 보관

Form은 값이 기준과 다른지를 `dirty`로 알려주고, 그다음 행동은 애플리케이션에 맡깁니다.

- CSR 이동은 사용하는 라우터의 이동 차단 기능에서 `dirty`를 확인합니다.
- 새로고침, 탭 닫기, 브라우저 종료는 `beforeunload` 이벤트 처리 함수에서 다룹니다. 경고 문구는 브라우저가 결정합니다.
- 작성 중 데이터는 앱에서 선택한 저장소에 보관한 뒤, 값을 소유한 각 컨트롤을 통해 복원합니다.
- 저장하거나 복원한 값을 확정하면 `reinitialize()`로 현재 값을 새 기준으로 삼습니다.

Form은 전역 이동 감시나 저장소 정책을 직접 설치하지 않습니다. 라우터 종류뿐 아니라 데이터 민감도, 보관 기간, 여러 탭 사이의 충돌 처리까지 앱마다 다르기 때문입니다.

## 속성 우선순위

`FormField`에 선언한 속성은 참여하는 컨트롤의 기본값입니다. 입력에 직접 쓴 속성이 우선하므로 특정 컨트롤만 예외로 만들 수 있습니다.

```vue
<FormField name="nickname" required>
  <TextField :required="false" />
</FormField>
```

다음으로 [필드와 컨트롤](./fields)을 읽고 필요한 [검증](./validation)과 [제출](./submission) 동작을 선택하세요.
