---
title: DOM Chart 렌더링
description: 기존 HTML에 차트를 그리고, 접근성 이름을 붙이며, 사용한 자원을 안전하게 정리합니다.
---

<script setup>
import ChartPackageExample from '../../../.vitepress/theme/components/ChartPackageExample.vue'
</script>

# DOM 렌더링

Vue 컴포넌트 없이 앱이 직접 HTML을 관리한다면 `@sectile/dom/chart`를 사용하세요. 차트 영역의 크기를 재고 Canvas에 그리며, 크기 변경에 맞춰 갱신하고, 키보드와 화면 읽기 프로그램에 필요한 요소도 만듭니다.

<ChartPackageExample kind="bar" host="dom" />

## 설치

```sh
pnpm add @sectile/chart @sectile/dom
```

## 기존 HTML 요소 연결하기

[데이터와 스케일](./model)의 `definition`과 `revenue` 데이터를 이어서 사용합니다. 차트 영역에는 높이를 지정하고 Canvas가 그 안을 채우게 합니다.

```html
<div data-chart>
  <canvas></canvas>
</div>
```

```css
[data-chart] {
  position: relative;
  height: 24rem;
}

[data-chart] canvas {
  display: block;
  width: 100%;
  height: 100%;
}
```

```ts
import { createChartController } from '@sectile/chart/controller'
import { createDOMChart } from '@sectile/dom/chart'

const root = document.querySelector('[data-chart]')
const canvas = root?.querySelector('canvas')

if (!(root instanceof HTMLElement) || !(canvas instanceof HTMLCanvasElement)) {
  throw new Error('차트 영역을 찾을 수 없습니다')
}

const controller = createChartController({
  definition,
  viewCapabilities: [{ axisID: 'date', minimumSpan: 86_400_000 }],
})
const revenueLabels = new Map(revenue.map(point => [
  point.id,
  `${point.date.toLocaleDateString()}: ${point.amount.toLocaleString()}`,
]))

const chart = createDOMChart({
  root,
  canvas,
  controller,
  renderer: 'auto',
  accessibilityLabel: '주간 매출',
  getAccessibleDatumLabel: id => revenueLabels.get(id) ?? String(id),
  navigation: { wheel: 'native', keyboard: true },
})

window.addEventListener('pagehide', () => {
  chart.disconnect()
  controller.dispose()
}, { once: true })
```

단일 페이지 앱에서는 `pagehide`를 기다리지 말고, 이 화면이나 컴포넌트를 제거할 때 같은 두 정리 함수를 호출하세요.

투영에 실패했을 때는 성공한 갱신과 다른 경로로 처리됩니다. 첫 투영이 실패하면 `tryCreateDOMChart()`가 해당 Chart 오류를 반환하고, 연결 과정에서 확보한 자원은 모두 정리됩니다. `createDOMChart()`는 같은 결과 오류를 던집니다. 한 번이라도 투영에 성공한 뒤의 실패는 마지막으로 성공한 화면을 그대로 유지합니다. 이때 `onProjectionError`를 지정하면 해당 Chart 오류를 받을 수 있습니다. 콜백을 지정하지 않았다면 실패가 발생한 `refresh()`나 `flush()`가 오류를 던지므로 조용히 무시되지 않습니다.

## 렌더러 선택하기

`auto`는 WebGL2를 쓸 수 있으면 사용하고, 그렇지 않으면 Canvas2D로 전환합니다. 대부분의 앱에는 이 기본값이 알맞습니다. 호환성 문제를 확인할 때는 `canvas2d`, 그래픽 가속을 쓸 수 없으면 앱이 실패해야 할 때는 `webgl2`를 선택하세요.

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

직접 만든 렌더러는 `createDOMChart`의 `renderer` 옵션으로 전달하고, 더 이상 쓰지 않을 때 `renderer.disconnect()`도 직접 호출합니다. 대신 `'auto'`, `'canvas2d'`, `'webgl2'` 문자열을 전달하면 차트 연결이 렌더러 생성과 정리를 맡습니다.

## 페이지 입력을 예측 가능하게 두기

기본값에서는 휠 입력을 페이지 스크롤에 남겨 두고 드래그, 두 손가락 확대·축소, 키보드 탐색을 끕니다. 차트에 필요한 입력만 켜세요. 드래그나 두 손가락 조작을 켤 때는 `controlAlternative: 'built-in'` 또는 `'external'`로 같은 동작을 수행할 수 있는 버튼도 제공해야 합니다.

## 프레임마다 그릴 양 제한하기

```ts
renderPolicy: {
  type: 'adaptive',
  minimumRenderScale: 0.5,
  maximumRenderScale: 1,
  frameBudgetMs: 12,
  maximumRepresentatives: 100_000,
}
```

그리기 항목 수는 [대규모 데이터](./performance)에 설명한 상세도 규칙을 따릅니다. 적응형 렌더링은 프레임 예산을 맞추려고 Canvas 해상도를 낮출 수 있지만 값, ID, 선택, 축의 표시 범위는 바꾸지 않습니다.

## 사용한 자원 정리하기

```ts
chart.disconnect()
controller.dispose()
renderer.disconnect() // 앱에서 직접 만든 renderer일 때만
```

`chart.disconnect()`는 이벤트 리스너와 크기 관찰자를 제거하고, 대기 중인 프레임을 취소하고, 접근성 요소와 차트 연결이 만든 그래픽 자원을 해제합니다. 여러 번 호출해도 안전합니다.
