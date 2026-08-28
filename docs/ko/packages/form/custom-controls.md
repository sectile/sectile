---
title: 사용자 정의 컨트롤
description: 앱에서 만든 단일·복합 Vue 컨트롤을 FormField와 연결합니다.
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

## 사용 경계

이 composable은 컴포넌트를 `FormField` 밖에서 사용하면 아무 작업도 하지 않습니다. 따라서 사용자 정의 컨트롤을 폼 안팎에서 같은 방식으로 재사용할 수 있습니다.

의미 요소, 포커스 대상, 검증 대상, 여러 이름 있는 제출 요소를 따로 지정해야 하는 저수준 컨트롤에는 `useFormControl()`을 사용하세요. 전체 등록 옵션은 [Form 컴포넌트 API](/ko/components/form)에서 확인할 수 있습니다.
