---
title: DOM 연결
description: Virtual 배치 상태를 요소 또는 문서 스크롤 호스트와 연결하고 브라우저 측정과 스크롤 보정을 적용합니다.
---

# DOM 연결

`@sectile/dom/virtual`은 하나의 물리 스크롤 호스트와 하나의 배치 surface를 Virtual 상태에 연결합니다. 스크롤 호스트는 자체 스크롤 영역을 가진 `HTMLElement`일 수도 있고, 페이지 전체 스크롤을 나타내는 `Document`일 수도 있습니다. 어느 쪽을 선택해도 surface가 Virtual 좌표의 원점이므로 배치 로직에 별도 페이지 좌표 규칙을 넣을 필요가 없습니다.

## 설치와 가져오기

```sh
pnpm add @sectile/dom @sectile/virtual
```

```ts
import {
  createAxisMeasurementResolver,
  createVirtualizer,
  virtualItemStyle,
  virtualSurfaceStyle,
  type VirtualScrollport,
} from '@sectile/dom/virtual'
```

`VirtualScrollport`는 `HTMLElement | Document`입니다. 페이지 스크롤에는 `Document`를 사용합니다. `Window`는 별도의 공개 대상 형식으로 받지 않습니다.

## 요소 스크롤 영역에 연결하기

실제로 스크롤을 소유한 요소와 Virtual 좌표 `(0, 0)`의 기준이 되는 surface를 함께 전달합니다.

```ts
const virtualizer = createVirtualizer({
  scrollport: scrollElement,
  surface: surfaceElement,
  state: layout,
  strategy: linearLayoutStrategy,
  overscan: 240,
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
```

surface에는 반환된 placement에 해당하는 요소만 유지합니다. `registerItem()`은 화면에 만든 요소를 안정적인 ID와 연결하므로 이후 크기 변화가 해당 배치 상태에 반영됩니다.

## 페이지 스크롤 사용하기

일반 문서 흐름에 놓인 Virtual surface라면 해당 surface가 속한 `Document`를 그대로 전달합니다. Sectile은 선택한 문서 자체의 브라우저 뷰와 스크롤 환경을 사용합니다. 따라서 iframe 안의 문서도 바깥 전역 `window`에 의존하지 않고 같은 방식으로 연결할 수 있습니다.

```ts
const virtualizer = createVirtualizer({
  scrollport: document,
  surface: surfaceElement,
  state: layout,
  strategy: linearLayoutStrategy,
})
```

애플리케이션이 `window`의 `scroll` 이벤트를 다시 전달하거나 페이지 오프셋을 변환할 필요가 없습니다. 앵커 보정도 별도로 한 번 더 적용하지 않습니다. 페이지 스크롤, 물리 스크롤 쓰기, 브라우저의 범위 보정, 최종 viewport 확인은 DOM 연결이 한 좌표계에서 처리합니다.

외부 요소를 스크롤 영역으로 사용할 때도 같은 API를 사용합니다.

```ts
const virtualizer = createVirtualizer({
  scrollport: panelElement,
  surface: surfaceElement,
  state: layout,
  strategy: linearLayoutStrategy,
})
```

하나의 virtualizer는 하나의 물리 scrollport를 선택합니다. 중첩된 조상 스크롤 영역을 자동으로 찾아 조합하지는 않습니다.

## 고정·sticky 영역만큼 viewport 줄이기

고정 헤더나 sticky 영역이 layout viewport 일부를 계속 가린다면 `viewportInsets`로 가려지는 크기를 명시합니다.

```ts
const virtualizer = createVirtualizer({
  scrollport: document,
  surface: surfaceElement,
  state: layout,
  strategy: linearLayoutStrategy,
  viewportInsets: { top: 64 },
})
```

`viewportInsets`는 조회 범위, 대상 스크롤, 앵커 보정에 함께 반영됩니다. Sectile은 CSS를 읽어 fixed 또는 sticky 영역을 자동으로 찾지 않습니다.

surface 위치를 바꿀 수 있는 일반 header/footer 요소는 frame region으로 등록할 수 있습니다.

```ts
const unregisterHeader = virtualizer.registerFrame(headerElement)
```

등록한 frame region은 placement, measurement, item domain에 들어가지 않습니다. 요소가 사라질 때 반환된 정리 함수를 호출합니다.

## 관계없는 문서 흐름이 surface를 옮겼을 때

크기 변경, 등록된 frame 변화, viewport resize, 일반 스크롤처럼 Sectile이 소유한 신호는 자동으로 반영됩니다. 반면 Virtual 바깥의 다른 콘텐츠가 별도 신호 없이 surface 위치를 밀어냈다면 새 geometry 측정을 명시적으로 요청합니다.

```ts
virtualizer.refresh()
```

`refresh()`는 이런 비연속적인 문서 흐름 변화의 경계입니다. 매 스크롤마다 호출하거나 애플리케이션에서 별도의 `window` 스크롤 전달 계층을 만드는 용도가 아닙니다.

## 스크롤 처리와 비용

일반적인 `Document` 스크롤에서는 저장해 둔 surface frame을 다시 사용합니다. 물리 viewport를 읽고 Virtual 조회를 실행하지만 매 스크롤마다 요소의 사각형을 다시 측정하지 않습니다. 짧은 시간에 여러 스크롤 이벤트가 들어와도 frame 단위로 합쳐 처리합니다.

`Document`를 사용하는 virtualizer도 각각 독립된 연결입니다. 한 페이지에 활성 연결이 여러 개라면 전체 작업량은 연결 수와 각 연결이 조회·렌더하는 placement 수에 따라 늘어납니다. 이를 숨기기 위해 문서 전체 `MutationObserver`나 위치·크기를 계속 확인하는 polling을 추가하지 않습니다.

크기 측정과 앵커 보정은 선택한 스크롤 호스트를 기준으로 한 번에 처리됩니다. CSS `scroll-behavior`, 브라우저의 범위 보정(clamp)·snap, 기본 scroll anchoring 같은 효과가 개입할 수 있지만, 이를 보상하려고 애플리케이션에서 두 번째 페이지 스크롤·앵커 보정 계층을 추가할 필요는 없습니다.

Document 모드는 layout viewport를 기준으로 합니다. `VisualViewport`, pinch zoom, 가상 키보드에 따른 viewport 변화까지 같은 계약으로 보장하지는 않습니다.

## 자주 쓰는 메서드

| 메서드 | 역할 |
| --- | --- |
| `registerFrame(element)` | item domain 바깥의 제한된 frame region 관찰 |
| `registerItem(element, id)` | DOM 요소를 placement ID와 연결 |
| `measure(batch)` | 애플리케이션이 준비한 measurement 적용 |
| `mutate(change)` | item·track·좌표 변경 적용 |
| `scrollTo(id, alignment)` | ID를 기준으로 항목으로 이동 |
| `setOverscan(value)` | 화면 밖 준비 거리 변경 |
| `setViewportInsets(value)` | 지속적으로 가려지는 viewport 영역 변경 |
| `refresh()` | 다음 frame에서 host geometry 다시 측정 |
| `flush()` | 대기 중인 작업을 즉시 반영하고 plan 반환 |
| `disconnect()` | listener, observer, 예약 작업, registration 정리 |

애플리케이션 고유의 물리 좌표계가 필요한 경우에는 `readViewport`와 `writeScroll`을 직접 제공할 수 있습니다. 일반적인 페이지 스크롤에는 필요하지 않습니다. Virtual query는 계속 surface-local 좌표를 사용하고, 실제 스크롤의 물리 경계는 DOM 연결이 소유합니다.

매우 큰 논리 surface에서 생길 수 있는 브라우저의 물리 스크롤 범위 제한은 document scrollport 계약과 별도 문제입니다.
