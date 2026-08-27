---
title: Vue에서 가상 목록 만들기
description: useVirtualizer와 스타일을 앱에서 정하는 Vue 구성 요소로 배치 결과를 화면에 그립니다.
---

# Vue에서 가상 목록 만들기

`@sectile/vue/virtual`은 두 가지 방법으로 쓸 수 있습니다. 일반적인 목록이라면 `VirtualizerRoot`, `VirtualizerContent`, `VirtualizerItem`을 조합합니다. 배치 자료형이나 측정 과정, 좌표, 항목 변경을 코드에서 직접 다뤄야 한다면 `useVirtualizer`를 사용합니다.

```vue
<script setup lang="ts">
import { shallowRef } from 'vue'
import { createSequence } from '@sectile/core/sequence'
import { createExtentIndex } from '@sectile/virtual/extent-index'
import { createLinearLayout, linearLayoutStrategy } from '@sectile/virtual/linear-layout'
import {
  createAxisMeasurementResolver,
  VirtualizerContent,
  VirtualizerItem,
  VirtualizerRoot,
} from '@sectile/vue/virtual'

const items = Array.from({ length: 100_000 }, (_, index) => `item-${index}`)
const layout = shallowRef(createLinearLayout(
  createSequence(items),
  createExtentIndex(items.map(() => ({ kind: 'unknown' as const, fallback: 36 }))),
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

<style scoped>
.virtual-list { width: 20rem; height: 24rem; overflow: auto; }
</style>
```

루트는 `defaultState`에서 시작해 현재 배치 상태를 관리하고, 상태가 바뀔 때마다 밖으로 알립니다. `overscan` 값은 실행 중에도 바꿀 수 있습니다. 배치 방식과 측정 함수, `initialViewport`는 처음 연결할 때 정합니다.

서버에서도 첫 화면을 그리려면 서버와 브라우저가 함께 아는 `initialViewport`를 전달합니다. `initialViewport`를 전달한 화면은 서버에서 첫 구간을 계산하고, 브라우저에 연결된 뒤 실제 크기로 갱신합니다. 브라우저 크기를 기준으로 시작하는 화면은 연결 시점에 첫 구간을 그립니다.

목록 상자나 격자 같은 컴포넌트에는 전체 ID를 계속 전달합니다. 가상화는 화면에 만드는 항목에만 적용합니다. 하나의 요소가 가상화 항목이면서 목록 상자·피드·격자의 항목 역할도 해야 한다면 `asChild`를 사용합니다.
