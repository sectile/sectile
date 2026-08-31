---
title: Vue Chart 구성
description: 잠재적으로 많은 datum만 배열에 두고 차트 의미는 Vue template에서 선언합니다.
---

<script setup>
import ChartPackageExample from '../../../.vitepress/theme/components/ChartPackageExample.vue'
</script>

# Vue 구성

`@sectile/vue/chart`는 수가 적은 의미 구조인 coordinate, axis, layer, view capability, control, renderer를 compound component로 표현합니다. 수가 크게 늘 수 있는 datum collection만 배열로 전달합니다.

<ChartPackageExample kind="line" />

## 설치

```sh
pnpm add vue @sectile/chart @sectile/dom @sectile/vue
```

Chart와 DOM은 Vue의 optional peer이며 `@sectile/vue/chart`를 import할 때만 필요합니다.

## 프로덕션형 차트 선언하기

```vue
<script setup lang="ts">
import {
  ChartAxisView, ChartCartesian, ChartLine, ChartNavigation,
  ChartPanControl, ChartPlot, ChartRenderer, ChartResetView, ChartRoot,
  ChartViewControls, ChartXAxis, ChartYAxis, ChartZoomControl,
} from '@sectile/vue/chart'
import { shallowRef } from 'vue'

const revenue = shallowRef([
  { id: 271, date: new Date('2026-07-06'), amount: 128_000 },
  { id: 272, date: new Date('2026-07-13'), amount: 142_000 },
  { id: 273, date: new Date('2026-07-20'), amount: 137_000 },
])
</script>

<template>
  <ChartRoot :dom="{ renderer: 'auto', accessibilityLabel: '주간 매출' }">
    <ChartCartesian>
      <ChartXAxis id="date" scale="temporal" field="date" label="주">
        <ChartAxisView :minimum-span="86_400_000" update="follow-end" />
      </ChartXAxis>
      <ChartYAxis id="amount" scale="linear" field="amount" label="매출" />
      <ChartLine
        id="weekly-revenue"
        :data="revenue"
        x-axis="date"
        y-axis="amount"
        label="매출"
      />
      <ChartNavigation keyboard />
      <ChartViewControls axis="date">
        <ChartPanControl direction="backward">이전</ChartPanControl>
        <ChartZoomControl direction="in">확대</ChartZoomControl>
        <ChartZoomControl direction="out">축소</ChartZoomControl>
        <ChartResetView>초기화</ChartResetView>
      </ChartViewControls>
    </ChartCartesian>
    <ChartPlot><ChartRenderer /></ChartPlot>
  </ChartRoot>
</template>
```

Axis의 `field`가 이미 `date`와 `amount`를 읽는 방법을 설명하므로 `ChartLine`에서 `getX`와 `getY`를 반복하지 않습니다. Canonical `id` 필드가 있어 `getId`도 필요하지 않습니다. Nested 또는 computed 값에만 accessor를 전달합니다.

새 record를 발행하려면 `revenue.value`를 교체합니다. Declaration registry는 shallow prop identity를 관찰하며 datum마다 Vue component, watcher, registry record를 만들지 않습니다.

## Coordinate에 맞게 구성하기

```vue
<ChartRoot :dom="{ accessibilityLabel: '예산 배분' }">
  <ChartRadial>
    <ChartPie id="budget" :data="budget" label="예산" />
  </ChartRadial>
  <ChartPlot><ChartRenderer /></ChartPlot>
</ChartRoot>
```

Canonical `id`, `value`, `label` 필드가 있는 record는 accessor가 필요 없습니다. Pie와 Donut에는 `ChartXAxis`, `ChartYAxis`, `ChartAxisView`, 직교 navigation control을 넣지 않습니다.

## 상태 제어하고 공유하기

```vue
<ChartRoot
  v-model="selection"
  v-model:view="sharedView"
  v-model:cursor="cursor"
  @command="persistChartCommand"
>
  <!-- declarations -->
</ChartRoot>
```

가까운 tooltip이나 상태 표시는 root slot의 `state`, `projection`, resolved `definition`을 사용합니다. 먼 consumer에는 `useChartSelector`, `useChartLayerSelector`, `useChartAxisSelector`로 필요한 값만 발행합니다. 하나의 애플리케이션 소유 controller를 여러 root 또는 component subtree에서 쓸 때는 `ChartProvider`나 `createChartComponents(controller)`를 사용합니다.

`ChartRoot`는 mount 전에는 DOM resource를 만들지 않고 SSR에서 semantic state를 렌더링합니다. 서버와 첫 client render에 같은 declaration과 controlled 값을 전달합니다. 브라우저 측정과 Canvas 연결은 hydration 뒤 시작합니다.
