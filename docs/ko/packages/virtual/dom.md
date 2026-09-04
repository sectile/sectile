---
title: DOM 연결
description: Virtual layout state를 명시적인 scrollport와 surface에 연결하고 브라우저 측정과 scroll 보정을 적용합니다.
---

# DOM 연결

`@sectile/dom/virtual`은 물리 scrollport와 layout surface를 Virtual state에 연결합니다. scrollport는 브라우저 스크롤을 담당하고, surface는 layout 좌표의 원점이면서 plan의 content size를 받습니다. 선택적인 header/footer는 item domain 바깥의 frame region으로 남습니다.

## 설치와 import

```sh
pnpm add @sectile/dom @sectile/virtual
```

```ts
import {
  createAxisMeasurementResolver,
  createVirtualizer,
  virtualItemStyle,
  virtualSurfaceStyle,
} from '@sectile/dom/virtual'
```

## 연결

```ts
const virtualizer = createVirtualizer({
  scrollport: scrollElement,
  surface: surfaceElement,
  state: layout,
  strategy: linearLayoutStrategy,
  overscan: 240,
  viewportInsets: { top: 48 },
  measure: createAxisMeasurementResolver('vertical'),
  onStateChange(next) {
    layout = next
  },
  onPlanChange(plan, connection) {
    Object.assign(surfaceElement.style, virtualSurfaceStyle(plan))

    for (const placement of plan.placements) {
      const element = getOrCreateRow(placement.id)
      Object.assign(element.style, virtualItemStyle(placement, { width: true }))
      connection.registerItem(element, placement.id)
    }
  },
})

const unregisterHeader = virtualizer.registerFrame(headerElement)
```

`onPlanChange`에서는 반환된 placement만 surface에 유지합니다. `registerItem()`은 mount된 element를 안정적인 ID에 연결해 크기 변화를 owning layout으로 되돌립니다. `registerFrame()`은 일반 header/footer geometry를 frame evidence로 등록할 뿐 placement, measurement, anchor item으로 만들지 않습니다. frame이 unmount되면 반환된 disposer를 호출합니다.

sticky 또는 overlay UI가 viewport 일부를 계속 가린다면 `viewportInsets`로 그 영역을 명시합니다. Connection은 computed style을 보고 sticky 여부를 추론하지 않습니다.

## 자주 쓰는 메서드

| 메서드 | 역할 |
| --- | --- |
| `registerFrame(element)` | item domain 바깥의 bounded frame region 관찰 |
| `registerItem(element, id)` | DOM element를 placement ID와 연결 |
| `measure(batch)` | 직접 준비한 measurement 적용 |
| `mutate(change)` | item·track·좌표 변경 적용 |
| `scrollTo(id, alignment)` | ID 기준 이동 |
| `setOverscan(value)` | 화면 밖 준비 거리 변경 |
| `setViewportInsets(value)` | 지속적인 viewport 가림 영역 변경 |
| `refresh()` | 다음 frame의 frame/viewport geometry 무효화 |
| `flush()` | 대기 중인 작업을 즉시 반영하고 plan 반환 |
| `disconnect()` | listener, observer, scheduled work, registration 정리 |

RTL scroller나 별도 물리 좌표계를 사용하는 화면에는 `readViewport`와 `writeScroll`을 전달합니다. Virtual layout query는 surface-local 좌표를 유지하며, 물리 scroll clamp는 DOM이 실제 scroll을 쓸 때만 적용합니다.
