---
title: Chart 데이터와 스케일
description: 차트 레이어를 구성하고 안정적인 ID를 선택하며 데이터와 viewport 변환을 다룹니다.
---

# 데이터와 스케일

차트 모델은 여러 레이어로 이루어집니다. 각 레이어는 하나의 프로필을 선택하고, 각 데이터에는 같은 대상을 나타내는 동안 바뀌지 않는 ID가 필요합니다.

```ts
import type { ChartModel } from '@sectile/chart/model'

const model = {
  layers: [{
    id: 'revenue',
    profile: 'ordered-series',
    data: [
      { id: '2026-01', x: 1, y: 32 },
      { id: '2026-02', x: 2, y: 41 },
      { id: '2026-03', x: 3, y: 38 },
    ],
  }],
} satisfies ChartModel<string>
```

ID에는 비어 있지 않은 문자열이나 안전한 정수를 사용할 수 있습니다. 데이터에 안정적인 숫자 키가 이미 있다면 문자열로 바꿀 필요가 없습니다. 레이어와 데이터는 차트 전체에서 같은 ID 공간을 사용하므로 모든 ID가 서로 달라야 합니다.

## 데이터 갱신하기

애플리케이션이 다음 데이터 전체를 받는다면 모델을 교체하면 됩니다. 삽입, 제거, 교체가 작은 작업 단위로 주어질 때는 patch를 적용할 수 있습니다.

```ts
const result = controller.applyPatch({
  operations: [{
    type: 'replace',
    layerID: 'revenue',
    index: 2,
    data: [{ id: '2026-03', x: 3, y: 46 }],
  }],
})

if (!result.ok) showChartError(result.error)
```

갱신은 전부 반영되거나, 일부도 공개하지 않은 채 거부됩니다. 여러 작성자가 경쟁할 수 있다면 현재 모델의 generation을 `expectedGeneration`으로 전달해 오래된 patch를 명확하게 거부할 수 있습니다.

## 스케일 직접 사용하기

DOM과 Vue 연결은 viewport 투영을 자동으로 만듭니다. 사용자 정의 축을 만들거나, pointer 좌표를 도메인 값으로 되돌리거나, 직접 투영 과정을 구성할 때 스케일을 가져와 사용하면 됩니다.

```ts
import { createLinearScale } from '@sectile/chart/scale'

const x = createLinearScale(
  { minimum: 0, maximum: 100 },
  { start: 0, end: 800 },
)

const pixel = x.normalize(25) // 200
const value = x.invert(200)   // 25
```

Chart는 선형, 로그, 시간, 범주형 스케일을 제공합니다. 모든 스케일은 도메인 값을 viewport 좌표로 바꾸고, 좌표를 다시 값으로 되돌리며, 개수가 제한된 tick을 만들 수 있습니다.

## 입력 한도

기본값은 레이어 64개, 데이터 1,000,000개, patch 하나당 작업 100,000개까지 허용합니다. 제품의 최대 규모가 더 작다면 한도를 낮춰 두는 편이 좋습니다. 잘못된 좌표, 중복 ID, 프로필과 맞지 않는 필드, 설정한 한도를 넘는 입력은 차트가 바뀌기 전에 거부됩니다.

애플리케이션이 신뢰하는 데이터에는 예외를 던지는 함수를 사용하면 됩니다. 사용자 입력이나 전송 데이터를 해석하는 과정에서 잘못된 값이 예상된다면 대응하는 `try*` 함수를 사용하세요.
