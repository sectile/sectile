---
title: 측정과 기준 항목 유지
description: 내용에 따라 달라진 크기를 반영하면서 기준 항목의 위치와 최신 측정값을 유지합니다.
---

# 측정과 기준 항목 유지

임시로 잡아 둔 크기는 다음 순서로 실제 크기와 맞춥니다. 각 측정에는 순번이 붙습니다.

1. 최신 배치 상태와 화면 영역을 조회합니다.
2. 반환된 항목만 화면에 만듭니다.
3. 실행 환경에서 모든 항목 크기를 한꺼번에 읽습니다.
4. `plan.generation`과 `plan.anchor`를 넣은 측정 묶음 하나를 전달합니다.
5. 반환된 상태를 반영합니다.
6. 다음 화면을 그리기 전에 `scrollDelta`를 적용합니다.
7. 새 배치를 조회합니다.

```ts
const plan = queryLinearLayout(layout, { viewport, overscan: 200 })

const mutation = applyLinearMeasurements(layout, {
  generation: plan.generation,
  anchor: plan.anchor,
  measurements: [{ index: 0, extent: { kind: 'exact', value: 72 } }],
})

layout = mutation.state
scrollBy(mutation.scrollDelta.x, mutation.scrollDelta.y)
```

## 기준 ID가 필요한 이유

배치 결과는 화면에 보이는 첫 ID를 기준으로 잡고 화면 안에서의 상대 좌표를 기록합니다. 그 앞이나 주변의 크기가 바뀌면 같은 ID의 이전 사각형과 새 사각형을 비교합니다. `scrollDelta`는 상대 좌표를 그대로 유지하는 데 필요한 변화량입니다.

보정값은 같은 화면 갱신 안에서 즉시 적용합니다. 이렇게 하면 사용자가 읽던 항목이 제자리에 남고 다음 입력도 현재 좌표에서 이어집니다.

## 오래된 측정값

측정값이나 항목 변경을 받아들일 때마다 순번이 하나씩 늘어납니다. 현재 배치의 순번과 일치하는 측정 묶음만 반영합니다. 이전 순번의 결과가 도착하면 현재 화면의 항목을 다시 재어 최신 묶음을 만듭니다.

브라우저에서는 모든 크기를 읽은 뒤 스크롤 값을 씁니다. 항목마다 읽기와 쓰기를 번갈아 수행하면 브라우저 배치 계산을 여러 번 일으킵니다.
