---
title: 브라우저에 가상 목록 연결하기
description: 배치 계산을 브라우저의 크기 측정과 스크롤, 화면 요소에 연결합니다.
---

# 브라우저에 가상 목록 연결하기

`@sectile/dom/virtual`은 Virtual의 배치 계산을 브라우저와 연결합니다. 요소의 크기 변화를 모아 화면 갱신 시점을 정합니다. 자료와 마크업은 앱이 소유합니다.

```ts
import {
  createAxisMeasurementResolver,
  createVirtualizer,
  virtualContentStyle,
  virtualItemStyle,
} from '@sectile/dom/virtual'
import { linearLayoutStrategy } from '@sectile/virtual/linear-layout'

const virtualizer = createVirtualizer({
  root: scrollElement,
  state: linearState,
  strategy: linearLayoutStrategy,
  overscan: 240,
  measure: createAxisMeasurementResolver('vertical'),
  onStateChange(state) {
    linearState = state
  },
  onPlanChange(plan, connection) {
    Object.assign(contentElement.style, virtualContentStyle(plan))
    reconcileItems(plan.placements, (element, placement) => {
      Object.assign(element.style, virtualItemStyle(placement, { width: true }))
      return connection.registerItem(element, placement.id)
    })
  },
})
```

한 화면을 갱신하는 동안 루트와 항목의 크기 변화를 모읍니다. 크기를 한꺼번에 읽고 상태를 한 번 바꾼 다음, 읽던 항목의 위치에 맞춰 스크롤을 조정하고 새 배치 결과를 내보냅니다.

## 자주 쓰는 함수

- `registerItem()`은 화면 요소를 안정적인 ID와 연결합니다.
- `measure()`는 행·열 크기처럼 배치 방식에 맞춘 측정값을 전달합니다.
- `mutate()`는 항목이나 좌표 조건을 바꾸면서 읽던 항목의 위치를 유지합니다.
- `scrollTo()`는 전체 ID 가운데 목표를 받아 현재 화면 밖의 항목으로도 이동합니다.
- `setOverscan()`은 현재 배치를 유지하면서 화면 밖 준비 범위를 바꿉니다.
- `disconnect()`는 크기 관찰과 이벤트 처리를 끝냅니다.

기본 화면 영역은 0 이상의 물리 좌표 `scrollLeft`와 `scrollTop`을 사용합니다. 오른쪽에서 왼쪽으로 흐르는 화면이나 별도 좌표 체계에는 `readViewport`와 `writeScroll`을 전달합니다.
