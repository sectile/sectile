---
title: Chart 모델과 scale
description: Immutable 차트 generation을 검증하고 domain 값을 viewport 좌표로 변환합니다.
---

# 모델과 scale

모든 layer와 datum은 전역에서 고유한 `StableID`를 가집니다. ID는 비어 있지 않은 문자열 또는 safe integer입니다. 응용 프로그램이 이미 조밀한 숫자 ID를 소유한다면 문자열 할당을 피할 수 있습니다. 교체와 patch 이후에도 같은 데이터를 나타내는 ID는 유지해야 합니다.

```ts
import { createChartModel, applyChartPatch } from '@sectile/chart/model'

let model = createChartModel({
  layers: [{
    id: 'revenue',
    profile: 'ordered-series',
    data: [
      { id: 101, x: 0, y: 12 },
      { id: 102, x: 1, y: 18 },
    ],
  }],
})

model = applyChartPatch(model, {
  expectedGeneration: model.generation,
  operations: [{ type: 'replace', layerID: 'revenue', index: 1, data: [{ id: 102, x: 1, y: 21 }] }],
})
```

생성 과정은 상태를 공개하기 전에 모든 좌표, 값, 프로필과 ID를 검증합니다. 실제 변경이 성공하면 `generation`이 증가하고 no-op이면 같은 객체를 유지합니다. `expectedGeneration`은 오래된 patch writer를 부분 변경 없이 거부합니다.

기본 상한은 layer 64개, datum 1,000,000개, patch operation 100,000개, 문자열 ID당 UTF-16 code unit 1,024개입니다. `ChartLimits`로 응용 프로그램에 맞는 상한을 지정할 수 있습니다.

## Scale

`/scale` subpath는 linear, logarithmic, temporal, categorical scale을 제공합니다. 각 scale은 `normalize`, `invert`, 제한된 `ticks`를 지원합니다. Tick 요청 상한은 10,000개입니다.

```ts
import { createLinearScale, createChartViewTransform } from '@sectile/chart/scale'

const x = createLinearScale(
  { minimum: 0, maximum: 100 },
  { start: 0, end: 800 },
)

const view = createChartViewTransform({ xScale: 2, xOffset: -120 })
```

Scale은 domain에서 viewport로 가는 mapping이고 `ChartViewTransform`은 그 이후 상호작용으로 발생한 pan과 zoom입니다. 둘 다 renderer에 의존하지 않습니다.

