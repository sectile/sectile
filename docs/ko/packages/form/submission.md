---
title: 제출과 값 기준 관리
description: 네이티브·관리형 제출을 선택하고 FormData와 schema를 처리하며 저장된 값을 새 기준으로 삼습니다.
---

# 제출과 값 기준 관리

일반 브라우저 이동과 JavaScript가 관리하는 저장 중 하나를 선택할 수 있습니다. 두 방식 모두 네이티브 form과 submitter 의미를 사용합니다.

## 관리형 제출

`defineFormSubmission()`은 선택적 schema와 제출 함수를 함께 묶습니다. 반환값을 `v-bind`로 `FormRoot`에 전달합니다.

```ts
const submission = defineFormSubmission({
  onSubmit: async ({ formData, submitter, reinitialize }) => {
    await saveProfile(formData, {
      mode: submitter?.dataset.intent === 'draft' ? 'draft' : 'publish',
    })
    reinitialize()
  },
})
```

제출 함수 안에서 `reinitialize()`를 호출하면 방금 저장한 값을 새로운 변경 기준으로 삼습니다. 관리형 제출이 성공했을 때만 적용되며, 오류가 발생하거나 `{ ok: false }`를 반환하면 기존 기준값과 `dirty` 상태가 유지됩니다.

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

제출 함수가 타입 경계가 됩니다. `FormRoot`와 `FormField`는 일반적인 정적 Vue 컴포넌트로 유지됩니다.

## 검증과 제출 상태

`FormRoot`는 응집된 `validation`과 `submission` 스냅샷을 제공합니다. 저장 진행 상태를 표시하고 추가 클릭을 막으려면 `submission.status`를 읽습니다.

```vue
<FormRoot v-bind="submission" v-slot="{ submission }">
  <!-- fields -->
  <FormSubmit :disabled="submission.status === 'submitting'">
    {{ submission.status === 'submitting' ? '저장 중…' : '저장' }}
  </FormSubmit>
</FormRoot>
```

함께 바뀌어야 하는 값은 다음 공개 스냅샷에 묶여 있습니다.

```ts
state.validation // { generation, status, trigger, intent }
state.submission // { generation, status, count, failure }
```

루트 슬롯의 `submitted`와 `submitCount`는 `submission.count`에서 계산한 편의 값입니다. 성공 결과는 `{ ok: true }` 또는 반환값 없음으로 표현할 수 있습니다.

## 저장 실패 알리기

실패 결과는 저장 결과와 잘못된 입력을 구분합니다.

```ts
return {
  ok: false,
  failure: { message: '서비스를 잠시 사용할 수 없습니다.' },
}
```

이 결과는 `submission.status`를 `failed`로 바꾸고 메시지를 `submission.failure`에 보관합니다. 유효한 폼을 무효로 만들거나 필드로 포커스를 옮기지는 않습니다. 서버가 특정 값을 거부했다면 `issues`를 반환하세요. 메시지 하나가 여러 필드와 관련됐다면 `path`와 `relatedPaths`를 함께 사용할 수 있습니다. `FormSummary`는 두 실패 유형을 모두 렌더링하고 슬롯에도 각각 노출합니다.

## 현재 값을 새 기준으로 삼기

화면의 값은 그대로 두고 그 값을 폼의 새 출발점으로 삼으려면 `reinitialize()`를 호출합니다. 기본 동작은 `dirty`를 해제하고 조작 기록, 검증 상태, 제출 상태를 초기화하는 것입니다.

이 함수는 `FormRoot` 슬롯과 컴포넌트 ref에서 모두 사용할 수 있습니다.

```vue
<FormRoot v-bind="submission" v-slot="{ dirty, reinitialize }">
  <!-- fields -->
  <p v-if="dirty">저장하지 않은 변경 사항이 있습니다.</p>
  <button type="button" @click="reinitialize()">
    현재 값을 기준으로 지정
  </button>
</FormRoot>
```

일부 상태를 유지해야 한다면 옵션을 전달합니다.

```ts
reinitialize({
  preserve: {
    touched: true,
    validation: true,
    submission: true,
  },
})
```

| 옵션 | 유지하는 상태 |
| --- | --- |
| `touched` | 필드를 조작한 기록 |
| `validation` | 브라우저·검증 함수·schema의 검증 상태와 오류 |
| `submission` | 제출 generation, 상태, 시도 횟수, failure, 서버 이슈 |

폼과 필드에 직접 지정한 오류는 옵션과 관계없이 남습니다. `dirty`는 언제나 `false`가 됩니다. 현재 입력값 자체가 새 기준이 되기 때문입니다.

## 네이티브 제출

브라우저의 기본 이동을 사용하려면 `onSubmit`을 생략합니다.

```vue
<FormRoot action="/checkout" method="post" enctype="multipart/form-data">
  <!-- fields -->
  <FormSubmit>주문하기</FormSubmit>
</FormRoot>
```

`formaction`, `formmethod`, `formenctype`, `formtarget`, `formnovalidate`처럼 제출 버튼에서 덮어쓰는 속성도 그대로 사용할 수 있습니다.

## 값을 기본값으로 되돌리기

`FormReset`은 네이티브 reset 버튼을 렌더링합니다.

```vue
<FormReset>변경 취소</FormReset>
```

`reset`은 네이티브 컨트롤과 비제어 Sectile 컴포넌트를 기본값으로 되돌립니다. 제어 컴포넌트의 값은 애플리케이션이 계속 소유하므로 제품에서 함께 초기화해야 하면 `onReset`에서 `v-model`을 갱신하세요.

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

Reset 처리가 끝나면 그 결과값이 새로운 변경 기준이 됩니다.

## reset과 reinitialize 선택하기

| 목적 | 사용할 기능 | 값 | 상태 |
| --- | --- | --- | --- |
| 편집 내용을 버리고 컨트롤 기본값으로 돌아가기 | `reset()` 또는 `FormReset` | 네이티브·비제어 값은 기본값으로 돌아갑니다. 제어 값은 애플리케이션에서 갱신해야 합니다. | 폼 상태를 비우고 reset 결과값을 새 기준으로 삼습니다. |
| 화면의 현재 값을 유지한 채 저장 완료로 처리하기 | `reinitialize()` | 바뀌지 않습니다. | `dirty`를 해제하고, 별도로 유지하지 않은 조작·검증·제출 상태를 초기화합니다. |

새로고침이나 CSR 이동 전에 띄우는 경고, 작성 중 데이터 보관은 애플리케이션에서 처리합니다. 경고 여부는 `dirty`로 판단하고, 저장하거나 복원한 값을 새 기준으로 확정할 때 `reinitialize()`를 호출하세요.
