---
title: Vue Chart
description: Vue 컴포넌트와 반응형 데이터로 접근 가능한 Sectile 차트를 만듭니다.
---

<script setup>
import ChartPackageExample from '../../../.vitepress/theme/components/ChartPackageExample.vue'
</script>

# Vue 차트

`@sectile/vue/chart`는 차트, 축, 데이터 레이어, 조작 버튼, Canvas 렌더러를 위한 컴포넌트를 제공합니다. 데이터는 배열로 남기 때문에 데이터 하나마다 Vue 컴포넌트나 감시자가 생기지 않습니다.

<ChartPackageExample kind="line" host="vue" />

## 설치

```sh
pnpm add vue @sectile/chart @sectile/dom @sectile/vue
```

이 패키지들은 차트 진입점에만 필요합니다. 다른 `@sectile/vue` 컴포넌트에는 추가되지 않습니다.

## 주간 매출 차트 만들기

다음 예제에는 시간 축, 숫자 축, 키보드 탐색, 눈에 보이는 범위 조작 버튼, 데이터별 접근성 이름, 반응형 차트 영역이 들어 있습니다.

```vue
<script setup lang="ts">
import {
  ChartAxisTicks, ChartAxisView, ChartCartesian, ChartGrid, ChartLegend,
  ChartLine, ChartNavigation, ChartPanControl, ChartPlot, ChartRenderer,
  ChartResetView, ChartRoot, ChartViewControls, ChartXAxis, ChartYAxis,
  ChartZoomControl,
} from '@sectile/vue/chart'
import { computed, shallowRef } from 'vue'

const revenue = shallowRef([
  { id: 271, date: new Date('2026-07-06'), amount: 128_000 },
  { id: 272, date: new Date('2026-07-13'), amount: 142_000 },
  { id: 273, date: new Date('2026-07-20'), amount: 137_000 },
])

const revenueLabels = computed(() => new Map(revenue.value.map(point => [
  point.id,
  `${point.date.toLocaleDateString()}: ${point.amount.toLocaleString()}`,
])))

const dom = {
  renderer: 'auto',
  accessibilityLabel: '주간 매출',
  getAccessibleDatumLabel: (id: number) => revenueLabels.value.get(id) ?? String(id),
} as const
</script>

<template>
  <ChartRoot :dom="dom" class="revenue-chart">
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
    <ChartGrid />
    <ChartAxisTicks />
    <ChartLegend />
    <ChartPlot><ChartRenderer /></ChartPlot>
  </ChartRoot>
</template>

<style scoped>
.revenue-chart {
  position: relative;
  height: 24rem;
}

.revenue-chart :deep([data-part='plot']),
.revenue-chart :deep(canvas) {
  width: 100%;
  height: 100%;
}
</style>
```

축의 `field`가 `date`와 `amount`를 읽고, `id` 속성이 각 데이터를 구분합니다. 값이 객체 안쪽에 있거나 계산해야 할 때만 별도 함수를 전달하면 됩니다.

새 데이터를 받으면 `revenue.value`를 교체하세요. 같은 주간 데이터에는 같은 ID를 유지해야 갱신 뒤에도 선택 상태가 남습니다. `ChartRoot`가 제거되면 컨트롤러, 이벤트 리스너, 크기 관찰자, 그래픽 자원도 함께 정리됩니다.

## 파이 또는 도넛 차트 만들기

```vue
<ChartRoot :dom="{ accessibilityLabel: '예산 배분' }">
  <ChartRadial>
    <ChartPie id="budget" :data="budget" label="예산" />
  </ChartRadial>
  <ChartPlot><ChartRenderer /></ChartPlot>
</ChartRoot>
```

`id`, `value`, `label` 필드가 있는 데이터는 별도 연결 함수 없이 쓸 수 있습니다. 파이와 도넛에는 x축, y축, 이동, 확대·축소 기능을 넣지 않습니다.

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

기본 슬롯은 현재 `state`, `projection`, `definition` 값을 제공합니다. 차트 가까이에 툴팁이나 상태 표시를 만들 때 사용하세요. 페이지의 다른 컴포넌트에서는 `useChartSelector`, `useChartLayerSelector`, `useChartAxisSelector`로 필요한 값만 읽을 수 있습니다.

DOM 투영 오류도 `ChartRoot`의 기존 `onError`로 전달됩니다. 첫 투영에 실패하면 DOM 연결이 정상 상태로 남지 않습니다. 이미 한 번 성공한 뒤의 투영 오류는 마지막으로 성공한 화면을 유지하고, 이후 갱신이 성공하면 새 화면으로 바뀝니다. `dom.onProjectionError`도 지정했다면 DOM 경계의 콜백을 먼저 실행한 다음 같은 오류를 `ChartRoot.onError`에 전달합니다.

여러 차트 영역이나 컴포넌트 트리에서 하나의 컨트롤러를 공유해야 할 때만 `ChartProvider`나 `createChartComponents(controller)`를 사용하세요.

서버 렌더링 중에는 `ChartRoot`가 브라우저 자원을 만들지 않습니다. 서버와 첫 클라이언트 렌더링에 같은 차트 구성과 제어 상태를 전달하세요. 크기 측정과 Canvas 그리기는 하이드레이션 뒤 시작합니다.
