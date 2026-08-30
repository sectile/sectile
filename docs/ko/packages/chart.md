---
title: Chart
description: Immutable 데이터, packed projection과 host 소유 렌더링으로 큰 대화형 차트를 만듭니다.
---

# Chart

`@sectile/chart`는 유한한 차트 데이터를 immutable 상호작용 상태와 packed geometry로 바꿉니다. 차트의 의미와 제한된 계산은 Chart가 맡고, `@sectile/dom/chart`는 브라우저 입력과 Canvas 자원을, `@sectile/vue/chart`는 Vue 반응성과 component 수명을 맡습니다.

```sh
pnpm add @sectile/chart
```

## 프로필 선택하기

| 프로필 | 대표 차트 | 데이터 필드 | 투영 결과 |
| --- | --- | --- | --- |
| `point` | scatter, bubble, dot plot | `x`, `y` | point |
| `ordered-series` | line, area 경계, sparkline | 순서가 있는 `x`, `y` | polyline |
| `cartesian-segment` | bar, column, range bar, waterfall segment | `x1`, `y1`, `x2`, `y2` | rectangle |
| `grid-cell` | heatmap, matrix | `column`, `row`, `value` | cell |
| `radial-segment` | pie, donut, radial proportion | `value`, 선택적 반지름 | arc |

Area fill, stacked series, candlestick, box plot, histogram, gauge 등은 응용 프로그램에서 지원 프로필 layer를 하나 이상 파생해 구성할 수 있습니다. Network graph, geographic projection, contour, 3D scene, streaming ring buffer와 무제한 data source는 별도의 domain invariant가 필요하므로 현재 패키지의 지원 범위가 아닙니다.

## 책임 경계

Chart는 stable identity, 검증, generation, scale, 대표점 선택, packed projection, 정확한 hit test, selection, cursor, pan, zoom과 controlled value command를 맡습니다. 색상, axis, label, legend, 주변 layout, animation, network loading과 rendering 자원은 맡지 않습니다.

Root import는 type-only입니다. 실행 함수는 세부 subpath에서 가져와 사용하지 않는 동작이 소비자 bundle에 들어가지 않게 합니다.

```ts
import { createChartModel } from '@sectile/chart/model'
import { createChartController } from '@sectile/chart/controller'
```

## 이어서 읽기

- [모델과 scale](./chart/model)
- [투영과 query](./chart/projection)
- [상호작용과 controller](./chart/interaction)
- [DOM 렌더링](./chart/dom)
- [Vue 구성](./chart/vue)
- [성능 계약](./chart/performance)

