---
title: 사용자 정의 컨트롤
description: 하나 또는 여러 요소로 만든 앱 컨트롤을 Vue FormField와 연결합니다.
---

# 사용자 정의 컨트롤

Sectile 입력 컴포넌트는 이미 `FormField`에 참여합니다. 이 페이지의 composable은 자체 DOM을 소유한 애플리케이션 컴포넌트에만 사용하세요.

## 네이티브 input 또는 textarea 하나

필드를 네이티브 입력 하나가 나타내면 `useNativeInputFormControl()`을 사용합니다. 반환된 props를 같은 요소에 적용합니다.

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

고정된 네이티브 template ref에는 Vue 3.5의 `useTemplateRef()`를 사용하세요. 얕은 DOM 참조를 만들고 요소 타입을 템플릿 가까이에 유지합니다.

## Callback·동적·외부 ref

Callback ref로 요소를 받거나, 요소 타입이 바뀌거나, collection에 속하거나, 다른 컴포넌트가 DOM을 전달한다면 `shallowRef()`를 사용합니다.

```ts
import { shallowRef } from 'vue'
import { useNativeInputFormControl } from '@sectile/vue/form'

const input = shallowRef<HTMLInputElement | null>(null)
const participation = useNativeInputFormControl(input)

function setInput(element: Element | null) {
  input.value = element instanceof HTMLInputElement ? element : null
}
```

DOM 요소를 깊은 반응형 `ref()`에 저장하지 마세요.

## 복합 컨트롤

여러 요소가 답 하나를 나타내면 `useCompositeFormControl()`을 사용합니다. 의미 root, 포커스를 받을 요소, 값을 제출하는 네이티브 요소를 지정합니다.

```vue
<script setup lang="ts">
import { ref, useTemplateRef } from 'vue'
import {
  provideFormControlOwner,
  useCompositeFormControl,
} from '@sectile/vue/form'

const value = ref(3)
const root = useTemplateRef<HTMLElement>('root')
const firstButton = useTemplateRef<HTMLButtonElement>('firstButton')
const submission = useTemplateRef<HTMLInputElement>('submission')

const participation = useCompositeFormControl({
  root,
  focusTarget: firstButton,
  submissions: () => [{ element: submission }],
  reset: () => { value.value = 3 },
  getValue: () => value.value,
})

provideFormControlOwner()
</script>

<template>
  <div ref="root" v-bind="participation.controlProps.value">
    <button ref="firstButton" type="button" @click="value = 1">1</button>
    <button type="button" @click="value = 2">2</button>
    <button type="button" @click="value = 3">3</button>
    <input ref="submission" type="hidden" :value="value" />
  </div>
</template>
```

`provideFormControlOwner()`는 하위 버튼이나 Sectile 컨트롤이 같은 `FormField`의 별도 답으로 등록되지 않게 합니다.

`getValue()`는 `dirty`를 계산할 때 비교할 값을 제공합니다. 컨트롤의 답 전체를 나타내는 원시값이나 변경 불가능한 값을 반환하세요. 별도의 비교 규칙이 필요하다면 `isValueEqual()`도 전달합니다.

```ts
const participation = useCompositeFormControl({
  root,
  getValue: () => query.value,
  isValueEqual: (current, baseline) => (
    typeof current === 'string'
    && typeof baseline === 'string'
    && current.trim() === baseline.trim()
  ),
})
```

일반 네이티브 입력에는 이 옵션이 필요하지 않습니다. Form이 값, checked 상태, 선택한 option, 선택한 파일을 알아서 기록합니다. Sectile 입력 컴포넌트도 기존 Form 연결을 통해 비교할 값을 제공합니다.

`reinitialize()`를 호출하면 그 시점의 `getValue()` 반환값이 새 기준이 됩니다. 사용자 정의 `reset()` 함수는 컨트롤 값을 바꾸고, Form은 모든 reset 함수가 끝난 뒤 결과값을 기준으로 기록합니다.

## 사용 경계

이 composable은 컴포넌트를 `FormField` 밖에서 사용하면 아무 작업도 하지 않습니다. 따라서 사용자 정의 컨트롤을 폼 안팎에서 같은 방식으로 재사용할 수 있습니다.

의미 요소, 포커스 대상, 검증 대상, 여러 이름 있는 제출 요소를 따로 지정해야 하는 저수준 컨트롤에는 `useFormControl()`을 사용하세요. `getValue`, `isValueEqual`을 포함한 전체 등록 옵션은 [Form API](./api)에서 확인할 수 있습니다.
