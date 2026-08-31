---
title: DOM Chart 렌더링
description: 기존 element를 접근 가능하고 페이지 입력을 방해하지 않는 Canvas 차트에 연결합니다.
---

<script setup>
import ChartPackageExample from '../../../.vitepress/theme/components/ChartPackageExample.vue'
</script>

# DOM 렌더링

`@sectile/dom/chart`는 기존 root를 측정하고 controller를 project하며 data mark와 축·접근성 overlay를 만들고, 브라우저 입력과 resource 정리를 담당합니다.

<ChartPackageExample kind="bar" host="dom" />

## 설치

```sh
pnpm add @sectile/chart @sectile/dom
```

## 기존 element 연결하기

```html
<div data-chart>
  <canvas></canvas>
</div>
```

```ts
import { createChartController } from '@sectile/chart/controller'
import { createDOMChart } from '@sectile/dom/chart'

const root = document.querySelector<HTMLElement>('[data-chart]')!
const canvas = root.querySelector<HTMLCanvasElement>('canvas')!
const controller = createChartController({
  definition,
  viewCapabilities: [{ axisID: 'date', minimumSpan: 86_400_000 }],
})

const chart = createDOMChart({
  root,
  canvas,
  controller,
  renderer: 'auto',
  accessibilityLabel: '주간 매출',
  getAccessibleDatumLabel: id => revenueLabels.get(id) ?? String(id),
  navigation: { wheel: 'native', keyboard: true },
})
```

애플리케이션 CSS에서 root에 실제 layout size를 주고 canvas가 이를 채우게 합니다. Connection은 root 크기와 device pixel ratio 변경을 관찰합니다. 표시되는 예제 코드는 통합 계약이 잘 보이도록 제품 스타일을 제외합니다.

## Renderer 선택하기

`auto`는 가능한 경우 WebGL2를 쓰고 Canvas2D로 fallback합니다. 호환성 진단에는 `canvas2d`, 가속 불가를 명시적 실패로 다뤄야 하면 `webgl2`를 선택합니다.

```ts
import { createChartRenderer } from '@sectile/dom/chart'

const renderer = createChartRenderer(canvas, {
  mode: 'auto',
  style: {
    color: [0.18, 0.42, 0.86, 1],
    pointRadius: 4,
    lineWidth: 2,
  },
})
```

사용할 때 renderer object를 `createDOMChart`에 전달합니다. 빌린 renderer는 애플리케이션 소유이며 mode 문자열로 만든 renderer는 connection 소유입니다.

## 페이지 입력을 예측 가능하게 두기

기본값은 native wheel, drag 없음, pinch 없음, keyboard navigation 없음입니다. 각 binding을 따로 켭니다. 직접 drag 또는 pinch에는 `controlAlternative: 'built-in'`이나 `'external'`이 필요합니다. External 대안은 버튼을 controller view event에 연결합니다.

## Frame 작업 제한하기

```ts
renderPolicy: {
  type: 'adaptive',
  minimumRenderScale: 0.5,
  maximumRenderScale: 1,
  frameBudgetMs: 12,
  maximumRepresentatives: 100_000,
}
```

Representative 제한은 [대규모 데이터](./performance)의 exact/aggregate 계약을 따릅니다. Adaptive scale은 backing pixel cost만 바꾸며 데이터, selection, view domain은 바꾸지 않습니다.

## 소유 resource 정리하기

```ts
chart.disconnect()
controller.dispose()
renderer.disconnect() // 애플리케이션 소유 renderer일 때만
```

`disconnect()`는 listener와 observer를 제거하고 대기 중인 frame을 취소하며 overlay node와 connection 소유 graphics resource를 해제합니다. 여러 번 호출해도 안전합니다.
