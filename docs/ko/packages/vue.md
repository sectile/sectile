# Vue

`@sectile/vue`는 Sectile DOM 의미 체계를 사용하는 스타일 없는 Vue 컴포넌트를 제공합니다. Vue의 모델 규칙을 따르고 접근 가능한 조합형 구성 요소와 안정적인 스타일 경계를 렌더링하되, 레이아웃과 시각 디자인은 응용 프로그램에 맡깁니다.

```sh
pnpm add @sectile/vue vue
```

컴포넌트별 공개 경로에서 필요한 구성 요소를 가져옵니다.

```ts
import { CheckboxIndicator, CheckboxRoot } from '@sectile/vue/checkbox'
```

## 실행 환경 기본값

`HostProvider`는 별도 래퍼 요소를 렌더링하지 않고 실행 환경 기본값을 하위 컴포넌트에 전달합니다. 일반적으로 응용 프로그램 루트 가까이에 한 번 두고, 방향이나 포털 경계가 다른 하위 영역에서만 중첩해 재정의합니다.

```vue
<script setup lang="ts">
import { HostProvider } from '@sectile/vue/host-provider'
</script>

<template>
  <HostProvider
    direction="rtl"
    portal-target="#overlays"
  >
    <RouterView />
  </HostProvider>
</template>
```

| Prop | 타입 | 기본값 | 설명 |
| --- | --- | --- | --- |
| `direction` | `'ltr' \| 'rtl'` | 상위 값, 없으면 `'ltr'` | 컴포넌트가 소유한 영역과 수평 키보드 탐색에 적용할 읽기 방향입니다. |
| `portalTarget` | `string \| HTMLElement` | 상위 값, 없으면 `'body'` | 팝업 Portal 파트가 사용할 기본 대상입니다. 각 Portal의 `to`가 있으면 그 값을 우선합니다. |
| `createId` | `() => string` | 상위 값, 없으면 Vue `useId()` | 서로 연결된 ARIA ID가 공유할 고유 접미사를 만듭니다. 호출할 때마다 SSR에서도 동일한 고유 값을 반환해야 합니다. |

응용 프로그램이 직접 만든 조합형 파트에서는 `useHostDirection`, `useHostPortalTarget`, `useHostId`로 확정된 값을 읽을 수 있습니다. 중첩한 Provider는 생략한 속성만 상위 값을 물려받습니다.

## 기본 사용법

Root가 상호작용 상태를 소유하고 하위 구성 요소에 공유합니다. `v-model`은 Vue의 제어 상태를 사용하고, `default-value`는 컴포넌트가 소유하는 비제어 상태를 만듭니다.

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { CheckboxIndicator, CheckboxRoot } from '@sectile/vue/checkbox'

const accepted = ref(false)
</script>

<template>
  <form class="terms" @submit.prevent>
    <CheckboxRoot
      v-model="accepted"
      class="terms__control"
      name="terms"
      required
      aria-label="약관 동의"
    >
      <CheckboxIndicator class="terms__indicator">✓</CheckboxIndicator>
    </CheckboxRoot>
    <span>약관에 동의합니다</span>
  </form>
</template>

<style scoped>
.terms {
  display: flex;
  align-items: center;
  gap: 0.625rem;
}

.terms__control {
  display: grid;
  width: 1.25rem;
  height: 1.25rem;
  place-items: center;
  border: 1px solid currentColor;
  border-radius: 0.25rem;
  background: transparent;
}

.terms__control[data-state='checked'] {
  background: currentColor;
}

.terms__indicator {
  color: white;
}
</style>
```

컴포넌트에는 시각 CSS가 포함되지 않습니다. 위 스타일은 응용 프로그램 소유이므로 동작을 바꾸지 않고 모두 교체할 수 있습니다.

## 제어 상태와 비제어 상태

응용 프로그램 상태가 기준이면 `v-model`을 사용합니다.

```vue
<CheckboxRoot v-model="accepted" />
```

이후의 변경을 컴포넌트가 소유해야 하면 `default-value`를 사용합니다.

```vue
<CheckboxRoot :default-value="true" />
```

두 소유 방식을 함께 전달하지 않습니다. 제어 컴포넌트는 `update:modelValue`로 제안된 값을 알리고, 부모가 그 값을 받아들일지 결정합니다.

## 렌더링 소유권

대부분의 공개 구성 요소는 `as`와 `as-child`를 받습니다. `as`는 렌더링할 요소를 고르고, `as-child`는 동작과 속성을 하나의 자식 요소에 합쳐 응용 프로그램이 요소를 완전히 소유하게 합니다.

```vue
<script setup lang="ts">
import {
  PopoverContent,
  PopoverRoot,
  PopoverTrigger,
} from '@sectile/vue/popover'
</script>

<template>
  <PopoverRoot>
    <PopoverTrigger as-child>
      <button class="account-button">계정</button>
    </PopoverTrigger>
    <PopoverContent class="account-popover">
      계정 설정
    </PopoverContent>
  </PopoverRoot>
</template>
```

자식은 하나의 요소로 렌더링되어야 합니다. Sectile은 자체 이벤트 리스너, ARIA 속성, 데이터 속성을 자식의 기존 속성과 합칩니다.

## 슬롯 상태

Root와 구성 요소 슬롯은 현재 의미 상태를 노출합니다. 상호작용에 따라 내용이 바뀌어야 하면 슬롯 속성을 사용하고, CSS만 바뀌면 데이터 속성을 사용합니다.

```vue
<CheckboxRoot v-slot="{ isChecked, isIndeterminate }" default-value="indeterminate">
  <span v-if="isIndeterminate">일부 선택됨</span>
  <span v-else>{{ isChecked ? '선택됨' : '선택 안 됨' }}</span>
</CheckboxRoot>
```

슬롯 이름과 값은 컴포넌트마다 다르며 TypeScript가 가져온 컴포넌트에서 형식을 추론합니다.

## 폼과 기본 입력 요소

폼을 지원하는 컴포넌트는 브라우저의 제출 의미를 유지합니다. 예를 들어 `CheckboxRoot`는 `name`, `form`, `required` 중 하나 때문에 기본 체크박스가 필요할 때 시각적으로 숨긴 입력 요소를 렌더링합니다. 이 요소의 `checked`, `indeterminate`, `required`, `disabled`, 폼 속성은 의미 상태를 따릅니다.

텍스트 입력 컴포넌트는 Vue에서 편집 동작을 다시 만들지 않고 브라우저의 입력, 선택 영역, IME 조합 입력을 유지합니다. `autocomplete`, `inputmode`, `aria-label` 같은 일반 HTML 속성은 공개 Field 구성 요소에 전달합니다.

## 스타일 경계

모든 공개 구성 요소는 안정적인 데이터 속성을 노출합니다.

```html
<button
  data-scope="checkbox"
  data-part="root"
  data-state="checked"
></button>
```

- `data-scope`는 컴포넌트 종류를 나타냅니다.
- `data-part`는 공개 스타일 경계를 나타냅니다.
- `data-state`는 해당 구성 요소의 현재 의미 상태를 나타냅니다.
- `data-disabled`, `data-readonly`, `data-invalid` 같은 상태 표시는 활성 상태일 때만 나타납니다.

자동 생성된 컴포넌트 이름이나 내부 DOM 깊이보다 이 선택자를 사용합니다. 선택자와 테마 규칙은 [스타일링](/ko/guide/styling)에서 확인할 수 있습니다.

## DOM 의미 체계와 수명 주기

Vue 컴포넌트는 ARIA 속성, 정규화된 입력, 포커스 효과, 팝업 배치, 기본 요소 동작을 `@sectile/dom`에서 재사용합니다. 설정 과정에서 연결 객체를 만들고, 감시자로 제어 속성을 동기화하며, 렌더링 소유권이 끝나면 리스너를 해제합니다.

Vue 템플릿과 조합형 구성에는 `@sectile/vue`를 사용합니다. Vue 밖에서 마크업을 만들거나 사용자 정의 렌더러가 연결 객체의 수명 주기를 소유해야 하면 `@sectile/dom`을 직접 사용합니다.

## 컴포넌트 살펴보기

[컴포넌트 목록](/ko/components/)에는 각 컴포넌트의 예시, 공개 구성 요소, 키보드 동작, 접근성 규약, API가 정리되어 있습니다. 기본 예시로 시작한 뒤 Anatomy에서 스타일에 사용할 정확한 `data-scope`와 `data-part` 경계를 확인합니다.
