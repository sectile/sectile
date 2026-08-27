---
title: Vue에서 가상화 화면 만들기
description: 평소 쓰던 Vue 마크업으로 큰 목록, 반응형 격자, 카드 모음, 자유 배치 화면을 만듭니다.
---

# Vue에서 가상화 화면 만들기

일반적인 세로·가로 목록에는 `VirtualList`를 사용합니다. 앱은 자료와 키, 각 행의 마크업만 전달합니다. Sectile은 현재 화면에 들어올 행만 만들고, 브라우저가 알려준 실제 높이로 다음 배치를 갱신합니다.

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { VirtualList } from '@sectile/vue/virtual'
import WorkItemRow from './WorkItemRow.vue'

interface WorkItem {
  id: string
  title: string
  description: string
}

const rows = ref<WorkItem[]>(loadWorkItems())
const rowKey = (row: WorkItem) => row.id
</script>

<template>
  <VirtualList
    :items="rows"
    :get-key="rowKey"
    :overscan="240"
    class="work-list"
  >
    <template #default="{ value }">
      <WorkItemRow :work="value" />
    </template>
  </VirtualList>
</template>

<style scoped>
.work-list { height: 32rem; }
</style>
```

`WorkItemRow`는 예시 앱에서 행 마크업을 렌더링합니다. `VirtualList` 슬롯은 원래 배열의 항목인 `value`와 함께 `index`, `key`, `placement`를 제공합니다.

DOM 실측 모드는 높이 prop을 생략한 선언적 마크업에서 바로 시작합니다. 처음에는 48px을 기준으로 화면을 잡고, 행이 나타나는 대로 브라우저에서 실제 높이를 읽어 배치를 고칩니다. 내용을 펼치거나 창 너비가 달라져 줄바꿈이 생기면 바뀐 높이도 자동으로 반영합니다.

높이를 이미 알고 있다면 상황에 맞는 속성을 고를 수 있습니다.

| 알고 있는 값 | 속성 | 동작 |
| --- | --- | --- |
| 모든 행의 정확한 높이 | `itemSize` | 실측 과정을 생략하고 고정 높이로 계산합니다. |
| 처음 배치에 쓸 대략적인 높이 | `estimateSize` | 예상값으로 먼저 그리고, 실제 높이를 읽어 바로잡습니다. 숫자 하나나 항목별 함수를 받을 수 있습니다. |
| DOM 실측 | 생략 | 48px에서 시작한 뒤 실제 높이로 바꿉니다. |

`itemSize`와 `estimateSize`는 서로 다른 실행 경로이므로 한 번에 하나만 사용합니다.

배열을 교체하면 안정적인 키를 기준으로 기존 측정값을 이어 씁니다. 삽입·삭제·이동 뒤에도 남아 있는 행의 측정값을 유지하고, 현재 보고 있는 행에 맞춰 스크롤을 보정합니다.

`as`, `contentAs`, `itemAs`로 만들어질 요소를 정하고 `itemAttributes`로 항목별 클래스, 접근성 속성, 자료 속성을 전달할 수 있습니다. Sectile은 위치 계산과 관찰에 필요한 스타일만 적용합니다.

## 격자·카드 모음·자유 배치

배치 방식마다 선언형 컴포넌트를 제공합니다. 네 컴포넌트 모두 `items`, `getKey`, 기본 슬롯을 같은 방식으로 사용합니다.

| 화면 | 컴포넌트 | 크기 처리 |
| --- | --- | --- |
| 한 줄 목록 | `VirtualList` | 항목의 실제 높이 또는 너비를 측정합니다. |
| 반응형 격자 | `VirtualGrid` | 화면 너비에 맞춰 열 수를 바꾸고, 같은 행에서 가장 높은 항목을 행 높이로 사용합니다. |
| 높이가 다른 카드 모음 | `VirtualMasonry` | 각 카드의 높이를 측정해 짧은 열부터 채웁니다. |
| 캔버스·다이어그램 | `VirtualSpatial` | 앱이 좌표를 정하고, Sectile이 화면과 겹치는 항목만 그립니다. DOM에서 실제 크기도 다시 읽을 수 있습니다. |

`VirtualGrid`와 `VirtualMasonry`는 `laneCount`를 생략하면 반응형으로 동작합니다. `minLaneSize`를 지키는 범위에서 화면 너비에 맞춰 열 수와 열 너비를 다시 계산합니다. 고정된 열 수가 필요한 화면만 `laneCount`를 전달합니다.

가상화 컴포넌트의 루트는 스크롤 영역입니다. `height`, `max-height`, flex 배치처럼 브라우저가 계산할 수 있는 화면 크기를 CSS로 정합니다.

```vue
<script setup lang="ts">
import { VirtualGrid } from '@sectile/vue/virtual'
</script>

<template>
<VirtualGrid
  :items="products"
  :get-key="product => product.id"
  :min-lane-size="240"
  :max-lane-count="6"
  :lane-gap="16"
  :row-gap="16"
  class="product-grid"
>
  <template #default="{ value }">
    <ProductCard :product="value" />
  </template>
</VirtualGrid>
</template>
```

카드마다 높이가 다르고 빈자리를 줄이고 싶다면 마크업은 그대로 두고 컴포넌트만 바꿉니다. `VirtualMasonry`가 각 카드의 DOM 높이를 측정해 배치합니다.

```vue
<script setup lang="ts">
import { VirtualMasonry } from '@sectile/vue/virtual'
</script>

<template>
<VirtualMasonry
  :items="articles"
  :get-key="article => article.id"
  :min-lane-size="280"
  :lane-gap="20"
  :item-gap="20"
  class="article-board"
>
  <template #default="{ value }">
    <ArticleCard :article="value" />
  </template>
</VirtualMasonry>
</template>
```

자유 배치는 위치까지 자료의 일부인 화면에 사용합니다. `getRect`가 처음 배치할 좌표와 크기를 돌려주고, `measureSize`의 기본값인 `true`가 실제 DOM 크기로 너비와 높이를 갱신합니다. 항목을 옮길 때는 배열의 좌표만 바꾸면 됩니다.

```vue
<script setup lang="ts">
import { VirtualSpatial } from '@sectile/vue/virtual'
</script>

<template>
<VirtualSpatial
  :items="nodes"
  :get-key="node => node.id"
  :get-rect="node => ({
    x: node.x,
    y: node.y,
    width: node.estimatedWidth,
    height: node.estimatedHeight,
  })"
  :get-z-index="node => node.layer"
  class="diagram"
>
  <template #default="{ value }">
    <DiagramNode :node="value" />
  </template>
</VirtualSpatial>
</template>
```

## 배치 상태를 직접 다루기

기본 컴포넌트로 표현하기 어려운 병합 셀, 역방향 축, 별도의 배치 규칙이 필요하면 `VirtualizerRoot`, `VirtualizerContent`, `VirtualizerItem` 또는 `useVirtualizer`를 사용합니다. 이 경로는 기존 `@sectile/virtual` 상태와 전략을 그대로 받습니다.

```vue
<script setup lang="ts">
import { shallowRef } from 'vue'
import { createSequence } from '@sectile/core/sequence'
import { createUniformExtentIndex } from '@sectile/virtual/extent-index'
import { createLinearLayout, linearLayoutStrategy } from '@sectile/virtual/linear-layout'
import {
  createAxisMeasurementResolver,
  VirtualizerContent,
  VirtualizerItem,
  VirtualizerRoot,
} from '@sectile/vue/virtual'

const ids = Array.from({ length: 100_000 }, (_, index) => `item-${index}`)
const layout = shallowRef(createLinearLayout(
  createSequence(ids),
  createUniformExtentIndex(ids.length, { kind: 'unknown', fallback: 36 }),
  { crossExtent: 320 },
))
</script>

<template>
  <VirtualizerRoot
    :default-state="layout"
    :strategy="linearLayoutStrategy"
    :measure="createAxisMeasurementResolver('vertical')"
    :overscan="240"
    class="virtual-list"
    @state-change="layout = $event"
    v-slot="{ placements }"
  >
    <VirtualizerContent>
      <VirtualizerItem
        v-for="placement in placements"
        :key="placement.id"
        :placement="placement"
        size="width"
      >
        {{ placement.id }}
      </VirtualizerItem>
    </VirtualizerContent>
  </VirtualizerRoot>
</template>
```

서버에서 첫 구간까지 만들려면 서버와 브라우저가 함께 아는 `initialViewport`를 전달합니다. 브라우저에 연결된 뒤에는 실제 화면 크기로 갱신합니다.
