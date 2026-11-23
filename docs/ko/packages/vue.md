---
title: Vue
description: Vue 상태와 컴포넌트 수명 주기 안에서 Sectile 상호작용을 구성하고 폼, Portal, 선택 도메인 패키지를 연결합니다.
---

# Vue

`@sectile/vue`는 Sectile 상호작용을 Vue 컴포넌트로 연결합니다. Vue의 상태와 이벤트 규칙을 따르고, 각 상호작용에 필요한 접근성 구조와 동작을 렌더링하며, 시각 테마 대신 공개 스타일 속성을 노출합니다.

Vue가 렌더링 트리와 컴포넌트 수명 주기를 소유할 때 이 패키지를 사용합니다. Vue 밖에서 애플리케이션이 직접 마크업을 만들거나 다른 렌더링 계층이 브라우저 연결을 소유해야 한다면 [`@sectile/dom`](/ko/packages/dom)을 사용합니다.

## 설치

```sh
pnpm add @sectile/vue vue
```

컴포넌트 제품군마다 공개 경로가 나뉘어 있습니다.

```ts
import { CheckboxIndicator, CheckboxRoot } from '@sectile/vue/checkbox'
import { PopoverContent, PopoverRoot, PopoverTrigger } from '@sectile/vue/popover'
```

지원하는 공개 경로 전체는 [Vue API 참조](/ko/api/vue)에 정리되어 있습니다. Form, Temporal, Virtual, Tabular, Chart는 해당 Vue 연결을 사용할 때만 각각의 추가 패키지가 필요합니다.

## 날짜와 시간의 편집 형식 지정하기

`DateTimePickerRoot`와 `DateTimeRangePickerRoot`에 `precision="minute"`을 지정하면 초와 밀리초가 없는 값을 분 단위로 편집할 수 있습니다. `TemporalProvider`가 있으면 그 로캘을 따릅니다. 제공자가 없으면 날짜와 24시간제 시각을 `T`로 이어 표시합니다.

구분 문자까지 지정하려면 Temporal에서 형식을 만든 뒤 두 피커 루트 중 하나에 `:format="format"`으로 전달합니다.

```ts
import { createDateFieldFormat } from '@sectile/temporal/date-field'
import { createDateTimeFieldFormat } from '@sectile/temporal/date-time-field'
import { createTimeFieldFormat } from '@sectile/temporal/time-field'

const time = createTimeFieldFormat({ precision: 'minute', literals: ['', '·', ''] })
const format = createDateTimeFieldFormat({
  date: createDateFieldFormat({ order: ['year', 'month', 'day'] }),
  time,
  separator: ' @ ',
})
```

범위 피커에서 날짜와 시간을 합친 시작 및 종료 입력은 읽기 전용입니다. 날짜와 시간을 따로 편집하려면 각각의 입력을 사용하고, 선택 방식도 제공하려면 달력과 각 끝점의 시간 선택 목록을 구성합니다.

`DateTimeField`와 `DateTimeRangeFieldRoot`에는 같은 `format`을 쓸 수 있습니다. `TimeField`, `TimeRangeFieldRoot`, `TimePickerRoot`에는 `time`을 전달합니다. 명시한 형식이 `precision`과 제공자 설정보다 우선합니다. 단일 필드에 `native`를 지정하면 브라우저가 ISO 값과 화면에 표시할 형식을 관리합니다. TimePicker는 확정된 형식을 입력과 선택 목록에 함께 적용합니다. 정밀도를 잃는 형식 변경은 거부하고 현재 입력과 값을 유지합니다.

## 제어 상태 컴포넌트 구성하기

`Root`는 하위 구성 요소가 함께 쓰는 상호작용 상태를 소유합니다. 최종 값을 애플리케이션 상태가 결정한다면 `v-model`을 사용합니다. 아래 체크박스는 `name`과 `required`도 지정했으므로 브라우저 폼 제출에도 참여합니다.

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { CheckboxIndicator, CheckboxRoot } from '@sectile/vue/checkbox'

const accepted = ref(false)

function save() {
  if (!accepted.value) return
  console.log('약관 동의 완료')
}
</script>

<template>
  <form class="terms" @submit.prevent="save">
    <div class="terms__row">
      <CheckboxRoot
        v-model="accepted"
        class="terms__control"
        name="terms"
        required
        aria-label="이용 약관 동의"
      >
        <CheckboxIndicator class="terms__indicator">✓</CheckboxIndicator>
      </CheckboxRoot>
      <span>이용 약관에 동의합니다</span>
    </div>

    <button type="submit" :disabled="!accepted">계속</button>
  </form>
</template>

<style scoped>
.terms {
  display: grid;
  gap: 1rem;
  justify-items: start;
}

.terms__row {
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

컴포넌트는 키보드·포인터 입력과 접근성 속성을 관리합니다. `accepted` 값과 폼 제출 흐름, 시각 스타일은 애플리케이션이 소유합니다.

## 제어 상태와 비제어 상태 구분하기

부모가 제안된 값을 받아 저장한다면 `v-model`을 사용합니다.

```vue
<CheckboxRoot v-model="accepted" />
```

마운트된 `Root`가 이후 값을 직접 소유하게 하려면 `default-value`를 사용합니다.

```vue
<CheckboxRoot :default-value="true" />
```

한 번 마운트된 `Root`의 소유 방식은 바꾸지 않습니다. 애플리케이션이 제어 상태와 비제어 상태 사이를 의도적으로 전환해야 한다면 해당 `Root`를 다시 마운트합니다.

화면 내용 자체가 상태에 따라 달라져야 할 때는 슬롯에서 노출하는 상태를 사용할 수 있습니다. CSS만 달라지면 공개 데이터 속성을 사용하는 편이 단순합니다.

```vue
<CheckboxRoot v-slot="{ isChecked, isIndeterminate }" default-value="indeterminate">
  <span v-if="isIndeterminate">일부 선택됨</span>
  <span v-else>{{ isChecked ? '선택됨' : '선택 안 됨' }}</span>
</CheckboxRoot>
```

슬롯에서 받을 수 있는 값은 컴포넌트마다 다르며 TypeScript가 가져온 컴포넌트의 타입에서 추론합니다.

## 여러 구성 요소로 화면 조합하기

Popover, Dialog, Select, Menu, Combobox 같은 복합 컴포넌트는 `Root`, `Trigger`, `Content`와 필요한 보조 구성 요소로 나뉩니다. 정해진 한 가지 HTML 구조를 강제하지 않으면서 관련 동작을 같은 상태로 묶을 수 있습니다.

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

`as-child`를 사용하면 애플리케이션이 만든 자식 요소가 실제 상호작용 요소가 되고 Sectile의 동작과 속성을 함께 받습니다. 이때 하나의 요소를 소유하는 자식을 사용합니다. 자식 요소 전체를 넘길 필요가 없다면 `as`로 렌더링할 요소만 바꿀 수 있습니다.

팝업의 Portal 구성 요소는 기본적으로 `body`에 렌더링됩니다. 애플리케이션이 오버레이를 별도 컨테이너에 모은다면 `HostProvider`에서 공통 대상을 지정할 수 있습니다.

## 공통 실행 환경 기본값 지정하기

`HostProvider`는 별도 래퍼 요소를 추가하지 않고 읽기 방향, 기본 Portal 대상, 선택적인 ID 생성 함수를 하위 영역에 전달합니다.

```vue
<script setup lang="ts">
import { HostProvider } from '@sectile/vue/host-provider'
</script>

<template>
  <HostProvider direction="rtl" portal-target="#overlays">
    <RouterView />
  </HostProvider>
</template>
```

중첩한 `HostProvider`는 생략한 값을 상위에서 물려받습니다. 개별 컴포넌트가 Portal 대상을 직접 지정하면 그 값이 공통 기본값보다 우선합니다. 별도 ID 생성 함수를 주지 않으면 Vue의 `useId()`를 사용합니다.

## 공개 속성으로 상태와 모션 표현하기

Sectile Vue 컴포넌트에는 시각 테마가 포함되지 않습니다. 복합 구성 요소는 `data-scope`, `data-part`를 안정적인 스타일 경계로 노출하고, 상태가 있는 구성 요소는 필요에 따라 `data-state`, `data-disabled`, `data-readonly`, `data-invalid` 같은 속성을 반영합니다.

```css
[data-scope='checkbox'][data-part='root'] {
  border: 1px solid var(--control-border);
}

[data-scope='checkbox'][data-part='root'][data-state='checked'] {
  background: var(--control-accent);
}
```

화면 내용이 바뀌어야 하면 슬롯 상태를 사용하고 CSS만 바뀌면 데이터 속성을 사용합니다. 공통 선택자 규칙은 [스타일링](/ko/guides/styling), 상태와 표시 여부에 따른 전환 효과와 동작 줄이기 설정은 [모션](/ko/guides/motion)에서 다룹니다.

## 브라우저 기본 동작 유지하기

폼을 지원하는 컨트롤은 브라우저 제출 규칙을 유지합니다. 예를 들어 `CheckboxRoot`는 폼 참여에 필요한 경우 시각적으로 숨긴 기본 체크박스 입력 요소를 함께 렌더링합니다. 텍스트 입력 컴포넌트도 브라우저의 입력, 선택 영역, IME 조합 입력을 다시 구현하지 않고 그대로 사용합니다.

`autocomplete`, `inputmode`, `name`, `form` 같은 일반 HTML 속성과 접근성 이름은 해당 공개 입력 구성 요소나 `Root`에 전달합니다. 따라서 한 폼 안에서 기본 HTML 입력 요소와 Sectile 컴포넌트를 함께 사용할 수 있습니다.

폼 전체의 검증, 오류, 초기화, 제출 상태까지 조정하려면 선택 패키지인 `@sectile/form`을 설치하고 [`@sectile/vue/form`](/ko/packages/form/vue/)을 사용합니다.

## 필요한 도메인만 추가하기

기본 Vue 패키지는 Core와 DOM에 의존합니다. 다른 도메인 패키지는 해당 Vue 연결을 사용할 때만 추가합니다.

| 필요한 기능 | 추가 패키지 | Vue 공개 경로 | 안내 |
| --- | --- | --- | --- |
| 폼 검증과 제출 | `@sectile/form` | `@sectile/vue/form` | [Vue 폼](/ko/packages/form/vue/) |
| 날짜, 시간, 달력, 선택기 | `@sectile/temporal` | 예: `@sectile/vue/temporal/date-picker` | [Temporal](/ko/packages/temporal) |
| 가상화 화면 | `@sectile/virtual` | `@sectile/vue/virtual/list`, `grid`, `masonry`, `spatial` | [Virtual Vue 연결](/ko/packages/virtual/vue) |
| 표와 그리드 | `@sectile/tabular` | `@sectile/vue/data-table`, `data-grid`, `data-tree-grid` | [Vue로 Tabular 사용하기](/ko/packages/tabular/vue) |
| 차트 | `@sectile/chart` | `@sectile/vue/chart` | [Vue 차트](/ko/packages/chart/vue) |

각 도메인의 화면 표현과 무관한 규칙은 해당 패키지가 계속 맡습니다. Vue 연결은 그 규칙을 컴포넌트, `ref`, 슬롯, 이벤트, 브라우저 효과, Vue 수명 주기에 연결합니다.

## SSR과 하이드레이션 일관성 유지하기

Vue 컴포넌트는 서버 렌더링 중에 브라우저 전용 자원을 만들지 않습니다. 서버에서 만든 구조와 첫 브라우저 렌더링이 일치하도록 제어 값, 기본 상태, 읽기 방향, ID처럼 초기 구조에 영향을 주는 입력을 같게 유지합니다.

애플리케이션 전체에서 같은 실행 환경 기본값이 필요하면 `HostProvider`를 사용합니다. Temporal 컨트롤의 첫 달력 화면을 일정하게 만들어야 한다면 `TemporalProvider`나 명시적인 `referenceDate`를 사용할 수 있습니다. 서버에서 Virtual 항목을 미리 렌더링하는 경우에는 Virtual 안내에서 요구하는 초기 화면 범위를 지정합니다.

Portal 구성 요소는 Vue Teleport 동작을 따릅니다. 대상이 같은 Vue 마운트나 갱신 주기 안에서 조금 늦게 만들어질 때만 `defer`를 사용합니다. 이미 존재하는 대상에는 지연 설정이 필요하지 않습니다.

## 컴포넌트 정리는 Vue 수명 주기에 맡기기

Sectile Vue 컴포넌트가 만든 브라우저·도메인 연결은 해당 컴포넌트의 렌더링 수명이 끝날 때 함께 정리됩니다. 연결 객체가 소유한 리스너, 관찰자, 구독, 렌더링 자원도 이때 해제됩니다.

반대로 애플리케이션이 컴포넌트 밖에서 직접 만든 자원은 계속 애플리케이션이 소유합니다. 그런 자원은 생성한 Vue 수명 주기와 같은 경계에서 정리합니다.

Vue가 렌더링 트리를 소유한다면 `@sectile/vue`를 사용합니다. 요소 수명이나 브라우저 연결을 애플리케이션이 직접 소유해야 하는 경우에만 `@sectile/dom`이나 화면 표현과 무관한 패키지 API를 직접 사용합니다.

## 작업별 다음 문서

- 개별 컨트롤의 상호작용 미리보기와 Vue 사용 코드는 [컴포넌트](/ko/components/)에서 확인할 수 있습니다.
- 제어 상태와 비제어 상태의 공통 규칙은 [상태 소유권](/ko/guides/state-ownership)에서 다룹니다.
- 공개 상태 선택자와 전환 효과는 [스타일링](/ko/guides/styling)과 [모션](/ko/guides/motion)을 참고하세요.
- 정확한 Vue 공개 패키지 경로는 [Vue API 참조](/ko/api/vue)에서 확인할 수 있습니다.
