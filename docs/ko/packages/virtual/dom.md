---
title: DOM 연결
description: Virtual 배치 상태를 기존 DOM의 스크롤, 렌더링, 실제 크기 측정에 연결합니다.
---

# DOM 연결

`@sectile/dom/virtual`은 기존 마크업에 Virtual 배치를 연결합니다. 스크롤 위치를 읽고, 실제 요소 크기를 관찰하고, 변경 뒤의 보정값을 실제 스크롤에 적용합니다.

## 설치와 import

```sh
pnpm add @sectile/dom @sectile/virtual
```

```ts
import {
  createAxisMeasurementResolver,
  createVirtualizer,
  virtualContentStyle,
  virtualItemStyle,
} from '@sectile/dom/virtual'
```

## 연결

```ts
const virtualizer = createVirtualizer({
  root: scrollElement,
  state: layout,
  strategy: linearLayoutStrategy,
  overscan: 240,
  measure: createAxisMeasurementResolver('vertical'),
  onStateChange(next) {
    layout = next
  },
  onPlanChange(plan, connection) {
    Object.assign(contentElement.style, virtualContentStyle(plan))

    for (const placement of plan.placements) {
      const element = getOrCreateRow(placement.id)
      Object.assign(element.style, virtualItemStyle(placement, { width: true }))
      connection.registerItem(element, placement.id)
    }
  },
})
```

`onPlanChange`에서는 반환된 placement만 DOM에 유지합니다. `registerItem()`으로 요소와 안정적인 ID를 연결하면 크기 변화가 같은 배치 상태로 돌아옵니다.

## 자주 쓰는 메서드

| 메서드 | 역할 |
| --- | --- |
| `registerItem(element, id)` | DOM 요소를 placement ID와 연결 |
| `measure(batch)` | 직접 준비한 측정값 적용 |
| `mutate(change)` | 항목·트랙·좌표 변경 적용 |
| `scrollTo(id, alignment)` | ID 기준 이동 |
| `setOverscan(value)` | 화면 밖 준비 거리 변경 |
| `refresh()` | 다음 프레임에 viewport와 측정값 갱신 |
| `disconnect()` | 이벤트와 관찰 연결 종료 |

오른쪽에서 왼쪽으로 흐르는 화면이나 별도 좌표계를 사용하는 화면에는 `readViewport`와 `writeScroll`을 전달합니다.
