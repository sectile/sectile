---
title: 선형 가상화
description: 항목 크기가 달라지는 세로·가로 목록을 만들고 ID를 기준으로 원하는 곳까지 이동합니다.
---

# 선형 가상화

목록, 피드, 순환 목록처럼 한 방향으로 이어지는 화면에는 선형 방식을 사용합니다. 세로와 가로, 정방향과 역방향, 항목 사이 간격, 항목마다 다른 크기, ID 기준 스크롤을 지원합니다.

## 전체 계산 예시

[가상화 첫 페이지](/ko/packages/virtual)의 고객 문의 기록이 아래 코드를 사용합니다. 완료된 기록을 포함한 5만 건을 예상 높이로 배치한 뒤, 화면에 들어온 행의 실제 높이를 측정합니다. 항목을 추가하거나 삭제하고 옮길 때도 같은 ID를 이어서 사용합니다.

<<< ../../../examples/virtual/linear-window.ts

화면에는 `plan.placements`에 든 항목만 만듭니다. 전체 ID 순서는 Core에 두고 `placement.id`를 화면 출력 키로 씁니다.

## 조회와 스크롤

```ts
import {
  linearScrollTarget,
  queryLinearLayout,
} from '@sectile/virtual/linear-layout'

const viewport = { x: 0, y: 12_000, width: 560, height: 480 }
const plan = queryLinearLayout(layout, { viewport, overscan: 240 })
const target = linearScrollTarget(layout, 'item-900', viewport, 'center')
```

미리 그릴 범위를 늘리면 DOM 요소도 늘어납니다. 대신 빠르게 스크롤해도 항목이 화면에 들어오기 전에 그릴 시간을 벌 수 있습니다. 처음에는 화면 하나 높이로 잡고, 실제 스크롤 속도와 그리는 데 걸린 시간을 보며 조절합니다.

## 항목 변경

Core의 `SequencePatch`를 `applyLinearPatch()`에 전달하면 됩니다. 항목을 넣을 때는 새 ID마다 임시 크기를 하나씩 함께 넘깁니다. 항목을 옮길 때는 기존 크기를 그대로 쓰며, 목적지 번호는 원본을 뺀 뒤의 순서를 기준으로 합니다. 현재 화면에서 기준으로 삼을 ID도 함께 넘기면 앞쪽 목록이 달라져도 읽고 있던 항목이 제자리에 남습니다.

서버에서 나눠 받는 자료의 범위는 Core의 `CollectionWindow`에 둡니다. 그릴 범위가 지금 받은 자료를 벗어났을 때만 `collectionWindowEventForLinearPlan()`을 호출합니다.
