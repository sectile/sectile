---
title: Vue Chart 구성
description: 반응형 차트를 렌더링하고 모델 변경과 차트 상태를 Vue에서 제어합니다.
---

<script setup>
import ChartPackageExample from '../../../.vitepress/theme/components/ChartPackageExample.vue'
</script>

# Vue 구성

`@sectile/vue/chart`는 headless root, canvas, composable을 제공합니다. Vue 반응성은 framework 경계에서 다루고, 차트 모델과 상호작용 동작은 다른 환경에서도 사용할 수 있게 유지합니다.

<ChartPackageExample kind="line" />

## 설치

```sh
pnpm add vue @sectile/chart @sectile/dom @sectile/vue
```

Chart는 DOM과 Vue 패키지의 선택적 peer입니다. 이 의존성은 Chart 진입점을 가져오는 애플리케이션에만 필요합니다.

## 차트 렌더링하기

```vue
<script setup lang="ts">
import type { ChartModel } from '@sectile/chart/model'
import { ChartCanvas, ChartRoot } from '@sectile/vue/chart'

const model = {
  layers: [{
    id: 'revenue',
    profile: 'ordered-series',
    data: [
      { id: 'jan', x: 1, y: 32 },
      { id: 'feb', x: 2, y: 41 },
      { id: 'mar', x: 3, y: 38 },
    ],
  }],
} satisfies ChartModel<string>

const options = { model }
</script>

<template>
  <ChartRoot
    :options="options"
    :dom="{ accessibilityLabel: '월별 매출' }"
    class="chart"
  >
    <ChartCanvas />
  </ChartRoot>
</template>

<style scoped>
.chart { position: relative; height: 22rem; }
.chart canvas { width: 100%; height: 100%; }
</style>
```

`options.model`에는 ref, computed 값, getter, 일반 모델을 전달할 수 있습니다. 반응형 값을 교체하면 기존 차트가 갱신되고 선택과 cursor의 ID도 새 데이터에 맞게 정리됩니다.

## 선택과 화면 제어하기

```vue
<script setup lang="ts">
import { ref } from 'vue'

const selection = ref({ type: 'points' as const, ids: [] as string[] })
const viewTransform = ref({ xScale: 1, yScale: 1, xOffset: 0, yOffset: 0 })
</script>

<template>
  <ChartRoot
    v-model="selection"
    v-model:view-transform="viewTransform"
    :options="options"
  >
    <ChartCanvas />
  </ChartRoot>
</template>
```

`v-model`은 선택을 제어합니다. `v-model:cursor`와 `v-model:view-transform`은 키보드 focus와 이동·확대를 제어합니다. `options` 안에 같은 값을 위한 writable ref를 함께 전달하면 안 됩니다.

## Slot에서 차트 상태 읽기

```vue
<ChartRoot v-slot="{ state, controller, projection }" :options="options">
  <ChartCanvas />
  <output>{{ state.activeDatum }}</output>
</ChartRoot>
```

기본 slot은 컨트롤러, revision snapshot, 현재 상태, 최신 투영을 제공합니다. 툴팁, 범례, 상태 문구처럼 차트에 반응하는 화면 요소를 만드는 데 사용할 수 있습니다.

컨트롤러가 component tree 밖에 있어야 한다면 `useChart()`를 사용합니다. Vue effect scope는 composable이 소유한 컨트롤러를 자동으로 정리합니다. `ChartRoot`는 mount 뒤에만 브라우저 리소스를 만들므로 SSR에서 안전합니다. 서버와 클라이언트에는 같은 초기 모델과 controlled 값을 전달하세요.
