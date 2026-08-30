---
title: DOM Chart 렌더링
description: 차트 상태를 기존 요소와 canvas에 연결하고 접근 가능한 브라우저 입력을 처리합니다.
---

<script setup>
import ChartPackageExample from '../../../.vitepress/theme/components/ChartPackageExample.vue'
</script>

# DOM 렌더링

`@sectile/dom/chart`는 차트 컨트롤러를 기존 root 요소와 canvas에 연결합니다. 크기 측정, 그리기, pointer와 키보드 입력, 접근성, 정리를 담당합니다.

<ChartPackageExample kind="bar" host="dom" />

## 설치

```sh
pnpm add @sectile/chart @sectile/dom
```

## Canvas 연결하기

```html
<div data-chart style="position: relative; height: 22rem">
  <canvas style="width: 100%; height: 100%"></canvas>
</div>
```

```ts
import { createChartController } from '@sectile/chart/controller'
import { createDOMChart } from '@sectile/dom/chart'

const root = document.querySelector<HTMLElement>('[data-chart]')!
const canvas = root.querySelector<HTMLCanvasElement>('canvas')!
const controller = createChartController({ model })

const chart = createDOMChart({
  root,
  canvas,
  controller,
  renderer: 'auto',
  accessibilityLabel: '요일별 주문량',
  getAccessibleDatumLabel: id => orderLabels[id],
})
```

`auto`는 WebGL2를 사용할 수 있으면 선택하고, 그렇지 않으면 Canvas2D로 전환합니다. 호환성 렌더러를 고정하려면 `canvas2d`를, fallback 대신 실패해야 하는 차트라면 `webgl2`를 사용합니다.

Root에는 실제 너비와 높이가 있어야 합니다. 연결 객체는 크기 변화를 관찰하고 device pixel ratio에 맞춰 canvas의 내부 해상도를 갱신합니다.

## 마크 스타일 지정하기

기본 색상, 점 반지름, 선 굵기를 바꾸려면 렌더러를 만듭니다.

```ts
import { createChartRenderer } from '@sectile/dom/chart'

const renderer = createChartRenderer(canvas, {
  mode: 'auto',
  style: {
    color: [0.33, 0.41, 0.92, 1],
    pointRadius: 4,
    lineWidth: 2,
  },
})

const chart = createDOMChart({ root, canvas, controller, renderer })
```

기본 렌더러는 데이터 마크 전체에 하나의 스타일을 적용합니다. 축, 레이블, 범례, 주석은 canvas 주변의 일반 DOM이나 SVG 콘텐츠로 추가할 수 있습니다. 레이어별 색상이나 채우기, 다른 그래픽 API가 필요하다면 사용자 정의 `ChartRenderer`를 전달하세요.

## 작업량 제한하기

일정한 내부 해상도가 필요하면 fixed 정책을 사용합니다. 데이터가 많은 차트에서 frame 예산에 맞춰 pixel 작업량을 줄이려면 adaptive 정책을 사용합니다.

```ts
renderPolicy: {
  type: 'adaptive',
  minimumRenderScale: 0.5,
  maximumRenderScale: 1,
  frameBudgetMs: 12,
  maximumRepresentatives: 100_000,
}
```

## 정리하기

```ts
chart.disconnect()
controller.dispose()
```

`disconnect()`는 listener와 observer를 제거하고, 대기 중인 frame을 취소하며, 연결 객체가 만든 렌더러를 해제합니다. 렌더러 객체를 직접 전달했다면 소유권은 애플리케이션에 있으므로 `renderer.disconnect()`도 호출해야 합니다.
