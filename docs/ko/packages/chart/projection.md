---
title: Chart 그리기와 hit testing
description: 차트 의미를 제한된 public batch로 투영하고 정확한 datum hit와 aggregate hit를 구분합니다.
---

<script setup>
import ChartPackageExample from '../../../.vitepress/theme/components/ChartPackageExample.vue'
</script>

# 그리기와 hit testing

DOM과 Vue는 자동으로 projection을 만듭니다. Custom graphics, tooltip, annotation, export 또는 다른 host를 만들 때 직접 사용합니다.

<ChartPackageExample kind="heatmap" host="dom" />

## 선언형 차트 투영하기

```ts
import { createChartController } from '@sectile/chart/controller'

const controller = createChartController({ definition })
const projection = controller.project({
  viewport: { width: 960, height: 540, devicePixelRatio: 2 },
  maximumRepresentatives: 50_000,
})

if (!projection.ok) showChartError(projection.error)
```

성공한 projection은 제한된 point, polyline, rectangle, cell 또는 arc batch를 제공합니다. Data-space geometry와 layer revision도 유지하므로 custom renderer는 viewport만 바뀔 때 변경되지 않은 geometry를 재사용할 수 있습니다.

`maximumRepresentatives`는 정확성 경계이며 조용한 sampling 옵션이 아닙니다. Line은 극값을 보존하는 viewport envelope를 만들 수 있습니다. Scatter density와 heatmap aggregation은 명시적 aggregate representative를 만듭니다. Exact scatter, bar, raw heatmap, pie, donut은 모든 보이는 mark를 담지 못하는 제한을 거부합니다.

## 두 hit 종류 모두 처리하기

```ts
import { hitTestChartProjection } from '@sectile/chart/query'

const [hit] = hitTestChartProjection(projection.value, {
  x: pointerX,
  y: pointerY,
  radius: 8,
  maximumHits: 1,
})

if (hit?.kind === 'datum') {
  showDatumTooltip(hit.id)
} else if (hit?.kind === 'aggregate') {
  showAggregateTooltip({
    count: hit.representative.count,
    bounds: hit.representative.bounds,
    reduction: hit.representative.reduction,
  })
}
```

Aggregate에는 가짜 datum ID가 없습니다. Count, data-space bounds, reduction이 정직한 상호작용 결과입니다. 결과는 가까운 순서이며 같은 거리에서는 뒤쪽 layer가 우선합니다. Query 하나는 최대 256개 hit를 반환합니다.

첫 query는 immutable spatial index를 lazy하게 준비합니다. 첫 hover latency가 중요하면 projection 직후 `prepareChartProjectionQueries(projection)`을 호출합니다.

## 필요할 때만 custom renderer 쓰기

기본 mark style 하나로 부족하거나 다른 graphics API가 필요할 때 public `ChartRenderer` 계약을 구현합니다. Public batch와 revision metadata를 사용하고 packed 내부 저장소에 의존하지 않습니다. 일반적인 축, legend, 접근 가능한 상호작용, Canvas 그리기에는 [DOM 렌더링](./dom)이나 [Vue 구성](./vue)을 사용합니다.
