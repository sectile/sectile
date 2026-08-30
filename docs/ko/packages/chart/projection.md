---
title: Chart 투영과 query
description: 제한된 packed geometry를 만들고 immutable spatial index로 조회합니다.
---

# 투영과 query

`createChartProjection()`은 model generation을 typed array batch로 바꿉니다. 다섯 layout은 point position, polyline position, rectangle, cell, arc입니다. Canvas2D와 WebGL2는 객체 graph를 다시 만들지 않고 이 배열을 직접 사용합니다.

```ts
import { createChartProjection } from '@sectile/chart/projection'
import { hitTestChartProjection } from '@sectile/chart/query'

const projection = createChartProjection(model, {
  viewport: { width: 800, height: 480, devicePixelRatio: 2 },
  maximumRepresentatives: 50_000,
})

const [nearest] = hitTestChartProjection(projection, {
  x: 240,
  y: 160,
  radius: 8,
})
```

`maximumRepresentatives`는 모든 layer가 비례해 나누는 결정적 전역 budget입니다. 기본값은 model 크기와 100,000 중 작은 값이고 절대 상한은 1,000,000입니다. 둘 이상의 datum이 있는 layer는 균등 표본에서 첫 값과 마지막 값을 유지합니다.

Projection diagnostics는 원본 datum, 대표 datum과 방출된 primitive 수를 제공합니다. Controller는 최신 기본 scale 요청 한 건만 cache합니다.

## Hit test

Query는 projection마다 immutable Morton 순서 bounding-volume hierarchy 하나를 지연 생성합니다. Broad phase bounds가 무관한 primitive를 제거한 뒤 프로필별 정확한 검사가 point, polyline segment, rectangle, cell, arc를 처리합니다. 결과는 거리, 위쪽 layer, primitive 순서로 정렬되며 최대 256개입니다.

첫 hit test의 index 생성 비용을 input path 밖에서 먼저 지불하려면 `prepareChartProjectionQueries(projection)`을 호출합니다.

