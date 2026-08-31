---
title: Chart 대규모 데이터
description: Exact 또는 aggregate 의미를 선택하고, 그리기 작업을 정직하게 제한하며, 가장 큰 브라우저 사례를 검증합니다.
---

# 대규모 데이터

성능은 정직한 차트 계약에서 시작합니다. 보이는 모든 mark가 datum ID를 유지해야 하는지, 제품이 이름 붙은 aggregate와 상호작용해도 되는지 먼저 정합니다. 그다음 유용한 최대 viewport에 맞춰 representative 제한과 renderer 정책을 설정합니다.

## Exact 또는 aggregate 의미 선택하기

| 차트 | 기본값 | 확장 옵션 | 제한이 부족할 때 |
| --- | --- | --- | --- |
| Line | datum representative를 가진 극값 보존 viewport envelope | 기본 제공 | Envelope도 담지 못할 때만 거부 |
| Scatter | `projection="raw"` | `projection="density"` | Raw는 거부, density는 aggregate cell 발행 |
| Bar | 보이는 막대 exact | 없음 | 거부 |
| Heatmap | `projection="raw"` | `{ kind: 'aggregate', reduction }` | Raw는 거부, aggregate는 reduced cell 발행 |
| Pie | slice exact | 없음 | 거부 |
| Donut | slice exact | 없음 | 거부 |

Heatmap reduction은 `sum`, `mean`, `minimum`, `maximum`입니다. Aggregate hit는 source datum인 척하지 않고 count, bounds, reduction을 반환합니다.

```vue
<ChartScatter
  id="requests"
  :data="requests"
  x-axis="latency"
  y-axis="payload"
  projection="density"
/>

<ChartHeatmap
  id="traffic"
  :data="traffic"
  x-axis="day"
  y-axis="hour"
  :projection="{ kind: 'aggregate', reduction: 'mean' }"
/>
```

## 보이는 작업 제한하기

```ts
const chart = createDOMChart({
  root,
  canvas,
  controller,
  renderer: 'auto',
  renderPolicy: {
    type: 'fixed',
    renderScale: 1,
    maximumRepresentatives: 100_000,
  },
})
```

`maximumRepresentatives`는 source row 수만이 아니라 화면에서 유용한 세부 정도와 상호작용 의미를 기준으로 정합니다. Axis-domain view는 projection 전에 화면 밖의 직교 데이터를 제외합니다. Exact visible data가 제한을 넘으면 명시적으로 실패합니다.

## Pixel과 upload cost 제한하기

`auto`는 WebGL2를 우선하고 Canvas2D로 fallback합니다. WebGL2 renderer는 바뀌지 않은 geometry를 유지하고 변경된 batch만 upload할 수 있습니다. Canvas2D는 호환성 경로입니다. Adaptive rendering은 측정한 frame cost가 budget을 넘으면 선언된 범위 안에서 backing resolution을 낮춥니다.

```ts
renderPolicy: {
  type: 'adaptive',
  minimumRenderScale: 0.5,
  maximumRenderScale: 1,
  frameBudgetMs: 12,
  maximumRepresentatives: 100_000,
}
```

Adaptive scale은 값, ID, selection, accessible state, axis domain을 바꾸지 않습니다.

## 갱신과 retained state 의도하기

- Query 결과가 바뀌면 선언형 배열을 교체하고, 바뀌지 않은 layer 배열은 같은 참조로 유지합니다.
- Datum ID를 유지해 selection과 cursor가 교체 뒤에도 살아 있게 합니다.
- Producer가 작은 profile operation을 이미 소유하고 axis domain을 다시 조립할 필요가 없을 때만 저수준 patch를 사용합니다.
- 첫 hover latency가 중요하면 첫 pointer event 전에 hit-test query를 준비합니다.
- DOM connection을 disconnect하고 애플리케이션 소유 controller와 renderer를 dispose합니다.

기본 safety ceiling은 64개 layer와 1,000,000개 datum이며 projection은 최대 1,000,000 representative를 허용합니다. 이는 거부 한계이지 성능 약속이 아닙니다. Production budget을 정하기 전에 최대 실제 cardinality, update rate, viewport, device pixel ratio, 지원 browser와 대표 GPU 등급을 benchmark합니다.
