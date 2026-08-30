---
title: Chart 대규모 데이터
description: 차트 데이터가 늘어나도 그리기, 상호작용, 메모리와 브라우저 작업량을 제한합니다.
---

# 대규모 데이터

먼저 기본 렌더러와 한도로 시작하세요. 원본 데이터가 한 frame에서 모두 그릴 필요가 없는 규모까지 커질 수 있다면 대표 항목 한도를 설정하고, pixel 작업이 여전히 병목일 때만 adaptive 해상도를 적용합니다.

## 렌더러 선택하기

| 상황 | 권장 모드 |
| --- | --- |
| 데이터가 많거나 자주 다시 그리는 차트 | `auto` 또는 `webgl2` |
| 비교적 작은 차트와 넓은 브라우저 호환성 | `auto` 또는 `canvas2d` |
| WebGL 관련 문제를 진단하는 경우 | `canvas2d` |
| WebGL2가 필수이고 fallback을 허용하지 않는 경우 | `webgl2` |

`auto`는 WebGL2를 우선 사용하고 Canvas2D로 전환합니다. 구체적인 호환성 또는 진단 이유가 없다면 `auto`를 유지하는 편이 좋습니다.

## 화면의 세부 수준 제한하기

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

`maximumRepresentatives`는 한 투영에서 그리기와 hit testing으로 넘어가는 데이터 수를 제한합니다. 선택과 원본 모델은 정확한 ID를 그대로 유지합니다. 원본 행 수만 보지 말고, 차트에서 실제로 구분할 수 있는 최대 세부 수준을 기준으로 값을 정하세요.

## Frame 예산 지키기

```ts
renderPolicy: {
  type: 'adaptive',
  minimumRenderScale: 0.5,
  maximumRenderScale: 1,
  frameBudgetMs: 12,
  maximumRepresentatives: 100_000,
}
```

Adaptive 렌더링은 그리기 시간이 목표를 넘으면 정해 둔 범위 안에서 canvas 내부 해상도를 낮춥니다. 차트 값, 선택, 이동, 확대, 접근성 상태는 바뀌지 않습니다.

## 의도에 맞게 갱신하기

- 다음 데이터 전체가 이미 있다면 모델을 교체합니다.
- 상류 작업이 작은 삽입, 제거, 교체라면 patch를 적용합니다.
- 상호작용 상태가 갱신 뒤에도 유지되도록 ID를 안정적으로 관리합니다.
- 첫 hover 응답 시간이 중요하면 첫 pointer 이벤트 전에 투영 쿼리를 준비합니다.
- 화면을 제거할 때 DOM 연결을 끊고 애플리케이션이 소유한 컨트롤러와 렌더러를 해제합니다.

## 한도 확인하기

기본 모델은 64개 레이어 전체에서 데이터 1,000,000개까지 허용합니다. 하나의 patch에는 작업 100,000개까지 담을 수 있습니다. 한 번의 hit test는 최대 256개 결과를 반환합니다. 접근성용 DOM 목록은 기본 1,000개이며 최대 10,000개까지 설정할 수 있습니다.

이 값들은 안전 한도이지 권장 표시 개수가 아닙니다. 제품의 최대 규모가 더 작다면 애플리케이션 한도를 낮추고, 지원하는 브라우저와 GPU에서 가장 큰 실제 데이터로 확인하세요.
