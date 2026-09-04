# Vue

`@sectile/vue`는 Sectile DOM 의미 체계를 사용하는 Vue 컴포넌트를 제공합니다. Vue의 모델 규칙을 따르고 접근 가능한 조합형 구성 요소와 안정적인 스타일 경계를 렌더링합니다. 레이아웃과 시각 디자인은 응용 프로그램이 소유합니다.

```sh
pnpm add @sectile/vue vue
```

컴포넌트별 공개 경로에서 필요한 구성 요소를 가져옵니다.

```ts
import { CheckboxIndicator, CheckboxRoot } from '@sectile/vue/checkbox'
```

## 실행 환경 기본값

`HostProvider`는 Context를 통해 실행 환경 기본값을 하위 컴포넌트에 전달합니다. 일반적으로 응용 프로그램 루트 가까이에 한 번 두고, 방향이나 포털 경계가 다른 하위 영역에서 중첩해 재정의합니다.

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
| `direction` | `'ltr' \| 'rtl'` | 상위 값 또는 기본값 `'ltr'` | 컴포넌트가 소유한 영역과 수평 키보드 탐색에 적용할 읽기 방향입니다. |
| `portalTarget` | `string \| HTMLElement` | 상위 값 또는 기본값 `'body'` | 팝업 Portal 파트가 사용할 기본 대상입니다. 각 Portal의 `to`가 있으면 그 값을 우선합니다. |
| `createId` | `() => string` | 상위 값 또는 Vue `useId()` | 서로 연결된 ARIA ID가 공유할 고유 접미사를 만듭니다. 호출할 때마다 SSR에서도 동일한 고유 값을 반환해야 합니다. |

응용 프로그램이 직접 만든 조합형 파트에서는 `useHostDirection`, `useHostPortalTarget`, `useHostId`로 확정된 값을 읽을 수 있습니다. 중첩한 Provider는 생략한 속성만 상위 값을 물려받습니다.

## 날짜와 시간 컴포넌트

날짜 입력란, 시간 입력란, 달력, 선택기를 사용할 때 `@sectile/temporal`을 설치합니다. 각 제품군은 세분화된 `@sectile/vue/temporal/*` 진입점에서 가져오며 기본 Vue 패키지는 날짜와 시간 계산에 의존하지 않습니다.

```sh
pnpm add @sectile/core @sectile/temporal @sectile/vue vue
```

```vue
<script setup lang="ts">
import { DatePickerRoot } from '@sectile/vue/temporal/date-picker'
import { TemporalProvider } from '@sectile/vue/temporal/temporal-provider'
</script>

<template>
  <TemporalProvider :reference-date="{ year: 2026, month: 8, day: 28 }">
    <DatePickerRoot />
  </TemporalProvider>
</template>
```

`TemporalProvider`는 하위 영역 전체에 결정적인 기준 날짜 하나를 전달합니다. 특정 선택기에 다른 달력 기준이 필요하면 해당 root의 `referenceDate`가 우선합니다.

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

시각 CSS는 응용 프로그램이 소유합니다. 위 스타일을 다른 CSS로 교체해도 컴포넌트 동작은 그대로 유지됩니다.

## 제어 상태와 비제어 상태

응용 프로그램 상태가 기준이면 `v-model`을 사용합니다.

```vue
<CheckboxRoot v-model="accepted" />
```

이후의 변경을 컴포넌트가 소유해야 하면 `default-value`를 사용합니다.

```vue
<CheckboxRoot :default-value="true" />
```

내부 관리와 외부 관리 가운데 한 가지 소유 방식을 선택합니다. 제어 컴포넌트는 `update:modelValue`로 제안된 값을 알리고, 부모가 그 값을 받아들일지 결정합니다.

마운트된 root의 소유 방식은 고정됩니다. 모델 prop을 `undefined`에서 값으로 바꾸거나, 전달하던 모델 prop을 제거하면 오류입니다. 응용 프로그램이 소유 방식을 의도적으로 바꿀 때는 root를 다시 마운트합니다.

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

기본 슬롯의 유효한 형태는 네이티브 요소 또는 지원 가능한 컴포넌트 하나입니다. Sectile은 투명한 fragment와 중첩 배열을 탐색하고, 주석과 공백뿐인 텍스트는 VNode 트리에 보존합니다. 채택한 요소까지 이어지는 fragment 경로만 복제하므로 key, scoped slot 메타데이터, hydration 구조도 유지됩니다.

자식 속성은 Vue가 한 번만 병합합니다. 기존 class·style과 Sectile 값은 합성되고 두 ref가 모두 유지되며, 충돌하는 role, ARIA 속성, 데이터 속성, 내부 ID는 Sectile 값이 우선합니다. 자식 listener가 먼저 실행되며 `preventDefault()`를 호출하면 자식 listener가 해당 동작의 제어권을 유지합니다.

컴포넌트 자식이 요소 root 하나를 렌더링하면 `$el`을 사용할 수 있습니다. Fragment 또는 multi-root 컴포넌트는 대상 요소에 `$attrs`를 전달하고 그 요소를 명시적으로 expose해야 합니다. 이 계약을 위반하면 마운트 단계에서 즉시 오류를 냅니다.

```vue
<script setup lang="ts">
import { ref } from 'vue'
import type { PrimitiveElementExpose } from '@sectile/vue/primitive'

defineOptions({ inheritAttrs: false })
const element = ref<PrimitiveElementExpose['element']>(null)
defineExpose({ element })
</script>

<template>
  <span aria-hidden="true">→</span>
  <button ref="element" v-bind="$attrs"><slot /></button>
</template>
```

Portal 파트의 `defer`는 같은 mount 또는 update tick 안에서 뒤늦게 렌더링되는 대상을 지원합니다. 탐색 범위는 현재 tick이며, `body`나 이미 마운트된 대상을 쓸 때는 `false`로 두면 됩니다. Vue의 [deferred Teleport 문서](https://vuejs.org/guide/built-ins/teleport.html#deferred-teleport)도 함께 참고하세요.

## 가상화 collection

`@sectile/vue/virtual/core`는 타입이 보존되는 `useVirtualizer` composable과 세 가지 headless 파트를 제공합니다. 선언형 layout은 `list`, `grid`, `masonry`, `spatial` 진입점을 각각 사용합니다. `VirtualizerRoot`는 scroll viewport, `VirtualizerContent`는 전체 content 크기, `VirtualizerItem`은 placement 하나의 배치와 측정을 맡습니다.

```sh
pnpm add @sectile/core @sectile/virtual @sectile/vue vue
```

```vue
<script setup lang="ts">
import { shallowRef } from 'vue'
import { createSequence } from '@sectile/core/sequence'
import { createExtentIndex } from '@sectile/virtual/extent-index'
import {
  createLinearLayout,
  linearLayoutStrategy,
} from '@sectile/virtual/linear-layout'
import {
  createAxisMeasurementResolver,
  VirtualizerContent,
  VirtualizerItem,
  VirtualizerRoot,
} from '@sectile/vue/virtual/core'
import { ListboxItem, ListboxRoot } from '@sectile/vue/listbox'

const items = Array.from({ length: 100_000 }, (_, index) => `item-${index}`)
const extents = createExtentIndex(items.map(() => ({
  kind: 'unknown' as const,
  fallback: 36,
})))
const layout = shallowRef(createLinearLayout(
  createSequence(items),
  extents,
  { crossExtent: 320 },
))
const measure = createAxisMeasurementResolver('vertical')
</script>

<template>
  <VirtualizerRoot
    :default-state="layout"
    class="virtual-listbox"
    :strategy="linearLayoutStrategy"
    :measure="measure"
    :overscan="240"
    @state-change="layout = $event"
    v-slot="{ placements, scrollTo }"
  >
    <ListboxRoot
      :items="items"
      @highlight="id => id && scrollTo(id)"
    >
      <VirtualizerContent>
        <VirtualizerItem
          v-for="placement in placements"
          :key="placement.id"
          :placement="placement"
          size="width"
          as-child
        >
          <ListboxItem :value="placement.id">
            {{ placement.id }}
          </ListboxItem>
        </VirtualizerItem>
      </VirtualizerContent>
    </ListboxRoot>
  </VirtualizerRoot>
</template>

<style scoped>
.virtual-listbox {
  width: 20rem;
  height: 24rem;
  overflow: auto;
}
</style>
```

`size="width"`는 cross axis 너비만 고정하므로 item 높이는 content에 따라 달라지고 측정할 수 있습니다. 가로 layout은 보통 `size="height"`를 사용합니다. 크기가 고정된 2차원 region은 `both`, 응용 프로그램이 크기를 소유하면 기본값 `none`을 사용합니다.

`VirtualizerRoot`는 `defaultState`로 초기화한 뒤 현재 layout state를 소유하고, 확정된 state마다 `stateChange`를 보냅니다. Frame 내부 측정과 anchor 보정은 transient state에서 한 번에 끝냅니다. Mount된 layout은 슬롯 method로 변경하고, layout 자체를 교체하려면 root를 다시 mount합니다.

`strategy`, `measure`, `initialViewport`는 생성 시점 option입니다. Mount된 root는 처음 받은 값으로 활성 connection을 유지하며 변경 요청에는 경고를 냅니다. `overscan`은 반응형으로 유지됩니다. 완전한 generic 타입, 수동 grid-track 측정, 사용자 정의 RTL 좌표, geometry mutation을 응용 프로그램 코드에서 직접 다뤄야 하면 `useVirtualizer`를 사용합니다. Composable의 `state` ref와 `overscan` source는 반응형이고 strategy와 host integration callback은 connection마다 고정됩니다. SSR plan에는 결정적인 `initialViewport`를 전달합니다. 생략하면 mount 뒤에 초기 window를 렌더링합니다.

## SSR과 hydration 계약

SSR 지원 범위는 검증 증거를 기준으로 정합니다. 현재 server-to-client hydration 매트릭스는 중첩 Fragment의 `asChild` 채택, deferred Select/Toast Teleport, host가 생성한 ID 관계, 열린 상태와 닫힌 상태의 conditional presence, 숨겨진 form control을 검증합니다. 이 시나리오는 Vue mismatch 경고 0건과 함께 의도한 동일성, 대상 구조, presence 상태, 네이티브 제출 값을 유지해야 합니다. 기준 목록과 증거 경로는 `packages/vue/testing/hydration-contract.json`에 있습니다.

Dialog, Alert Dialog, Drawer, Popover, Tooltip, Select는 기본적으로 닫힌 동안에도 Content와, 해당하는 경우 Overlay DOM을 유지합니다. 의미상 close는 즉시 끝나므로 focus 복귀, modal 격리, layer 소유권 같은 상호작용 효과는 시각적 exit가 끝나기 전에 해제됩니다. 닫혔지만 CSS exit를 위해 아직 present한 surface에는 Vue가 `inert`와 접근성 숨김을 반영하고, positioning은 rendered presence가 끝날 때까지만 유지합니다. `unmountOnExit`을 지정하면 exit 완료 뒤 popup part를 제거합니다. 지정하지 않으면 같은 DOM node를 숨긴 채 유지해 reopen 때 다시 사용하므로 DOM 내부 상태를 보존할 수 있습니다.

Toast item도 같은 브라우저 presence 관찰자를 사용하지만 `unmountOnExit` 대신 keyed collection 수명을 따릅니다. 닫힌 item은 CSS exit 동안 `inert`와 접근성 숨김 상태로 남고, exit가 끝나면 렌더링 collection에서 제거됩니다. 완료 전에 같은 toast ID가 다시 활성화되면 현재 element의 오래된 exit generation을 취소합니다. Menu, Combobox, Cascade Select, picker surface는 계속 즉시 닫히며 이 계약 때문에 delayed exit나 새 visibility prop이 추가되지 않습니다.

이벤트 API 이름은 `positionChange`, `interactOutside`처럼 camelCase를 사용합니다. Vue 템플릿에서는 `@position-change`, `@interact-outside`처럼 kebab-case로 수신하고, render function과 JSX에서는 `onPositionChange`, `onInteractOutside`를 사용합니다.

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

텍스트 입력 컴포넌트는 브라우저의 입력, 선택 영역, IME 조합 입력을 그대로 사용합니다. `autocomplete`, `inputmode`, `aria-label` 같은 일반 HTML 속성은 공개 Field 구성 요소에 전달합니다.

폼 전체를 조정하려면 optional peer인 `@sectile/form`을 설치하고 `@sectile/vue/form`에서 정적 파트를 가져옵니다. 일반 Vue 컴포넌트 import에는 이 peer가 필요하지 않습니다.

```sh
pnpm add @sectile/core @sectile/form @sectile/dom @sectile/vue vue
```

```vue
<script setup lang="ts">
import { FormField, FormRoot, FormSubmit, defineFormSubmission } from '@sectile/vue/form'

const submission = defineFormSubmission({
  onSubmit: ({ formData }) => console.log(Object.fromEntries(formData)),
})
</script>

<template>
  <FormRoot v-bind="submission">
    <FormField name="email" required><input type="email" /></FormField>
    <FormSubmit>저장</FormSubmit>
  </FormRoot>
</template>
```

한 폼에서 네이티브와 Sectile 컨트롤을 섞을 수 있습니다. 먼저 [Vue 폼 안내](/ko/packages/form/vue/)를 보고, 그룹·중첩 이름·외부 연결 입력은 [필드와 컨트롤](/ko/packages/form/vue/fields)을 참고하세요.

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

Vue는 Core의 완전한 공개 실행 환경 투영입니다. 저장소 완전성 검사는 모든 공개 Core 컴포넌트 경로에 Vue 증거가 있는지 확인합니다. Vue 테스트는 prop과 controller option의 연결, 모델 변경 제안, 동적 컬렉션 보정, 네이티브 폼 직렬화, SSR ID, hydration, Teleport 소유권을 따로 검증합니다.

Vue 템플릿과 조합형 구성에는 `@sectile/vue`를 사용합니다. Vue 밖에서 마크업을 만들거나 사용자 정의 렌더러가 연결 객체의 수명 주기를 소유해야 하면 `@sectile/dom`을 직접 사용합니다.

`@sectile/vue/reorder`는 `SequenceReorderRoot`/`SequenceReorderItem`과 `TreeReorderRoot`/`TreeReorderItem`을 제공합니다. DOM 키보드·포인터 계약을 재사용하면서 `update:items` 또는 `update:nodes`를 발생시킵니다. Feed 구간 요청은 응답에 다시 넣어야 하는 request generation을 포함하고, Form 제출 완료 함수는 `submitStarted`가 반환한 generation으로만 현재 제출을 완료합니다.

## 컴포넌트 살펴보기

[컴포넌트 목록](/ko/components/)에는 각 컴포넌트의 예시, 공개 구성 요소, 키보드 동작, 접근성 규약, API가 정리되어 있습니다. 기본 예시로 시작한 뒤 Anatomy에서 스타일에 사용할 정확한 `data-scope`와 `data-part` 경계를 확인합니다.
