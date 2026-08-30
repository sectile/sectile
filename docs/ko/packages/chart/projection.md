---
title: Chart 그리기와 hit testing
description: 그릴 마크 수를 제한하고 pointer 아래의 데이터를 찾으며 사용자 정의 렌더링을 준비합니다.
---

<script setup>
import ChartPackageExample from '../../../.vitepress/theme/components/ChartPackageExample.vue'
</script>

# 그리기와 hit testing

투영은 차트 데이터를 현재 viewport 좌표로 바꿉니다. DOM과 Vue 연결은 이 작업을 자동으로 수행합니다. 사용자 정의 렌더러, 툴팁 레이어, 주석 시스템, DOM이 아닌 실행 환경을 만들 때 투영 API를 직접 사용하면 됩니다.

<ChartPackageExample kind="heatmap" host="dom" />

## 투영 만들기

```ts
import { createChartModel } from '@sectile/chart/model'
import { createChartProjection } from '@sectile/chart/projection'

const state = createChartModel(model)
const projection = createChartProjection(state, {
  viewport: { width: 800, height: 480, devicePixelRatio: 2 },
  maximumRepresentatives: 50_000,
})
```

`maximumRepresentatives`는 그리기와 hit testing으로 넘어가는 데이터 수를 제한합니다. 원본이 더 크면 Chart가 모든 레이어에서 대표 항목을 결정적으로 고릅니다. 모델과 상호작용 상태는 그대로 유지되고, 이 투영에 담기는 세부 수준만 달라집니다.

## Pointer 아래의 데이터 찾기

```ts
import { hitTestChartProjection } from '@sectile/chart/query'

const [hit] = hitTestChartProjection(projection, {
  x: pointerX,
  y: pointerY,
  radius: 8,
  maximumHits: 1,
})

if (hit) showTooltip(hit.id)
```

가장 가까이 보이는 마크가 먼저 반환되고, 거리가 같으면 위쪽 레이어가 우선합니다. 점, 선, 직사각형, 셀, 방사형 프로필마다 실제 형태에 맞춰 판정합니다. 한 번의 쿼리는 최대 256개 결과를 반환합니다.

첫 쿼리는 반복 검색에 필요한 준비 작업을 수행합니다. 첫 pointer 상호작용에서도 이 비용을 피하려면 앞서 `prepareChartProjectionQueries(projection)`을 호출하세요.

## 사용자 정의 렌더러 사용하기

투영은 점, polyline, 직사각형, 셀, arc에 대한 공개 batch를 제공합니다. 사용자 정의 `ChartRenderer`는 같은 모델과 상호작용 동작을 유지하면서 batch를 이용해 레이어별 색상, 채우기, 주석, 다른 그래픽 API를 구현할 수 있습니다.

기본 Canvas 렌더러로 충분하다면 [DOM 렌더링](./dom)이나 [Vue 구성](./vue)을 사용하세요. 일반적인 차트를 만들 때 투영 batch를 직접 다룰 필요는 없습니다.
