---
title: Chart 상호작용과 상태
description: 페이지 스크롤을 보존하면서 선택, cursor, immutable axis-domain view를 명시적으로 관리합니다.
---

<script setup>
import ChartPackageExample from '../../../.vitepress/theme/components/ChartPackageExample.vue'
</script>

# 상호작용과 상태

Selection은 “어떤 데이터가 중요한가?”에 답하고 axis view는 “domain의 어느 부분이 보이는가?”에 답합니다. 둘 다 renderer-neutral immutable 값입니다. DOM은 브라우저 입력을 같은 Core event로 번역합니다.

<ChartPackageExample kind="scatter" />

## Capability와 브라우저 gesture를 따로 켜기

Axis에 view capability가 있어야 탐색할 수 있습니다. 브라우저 binding은 그다음에 명시적으로 선택합니다.

```ts
const controller = createChartController({
  definition,
  viewCapabilities: [{
    axisID: 'date',
    minimumSpan: 86_400_000,
    update: 'follow-end',
  }],
})

const chart = createDOMChart({
  root,
  canvas,
  controller,
  navigation: { wheel: 'native', keyboard: true },
})
```

기본값인 `wheel: 'native'`에서는 차트 위에서도 페이지가 계속 스크롤됩니다. 직접 wheel 탐색을 기대하는 차트에만 `pan` 또는 `zoom`을 선택합니다. Drag나 pinch에는 built-in 또는 external single-pointer control alternative도 필요하므로 정밀 gesture 없이 같은 작업을 수행할 수 있습니다.

| 입력 binding | 권장 용도 |
| --- | --- |
| 보이는 pan/zoom/reset control | 발견 가능성과 접근성을 위한 기본 선택 |
| Keyboard | focus된 차트 탐색 |
| Drag pan | 보이는 대안이 있는 고밀도 직교 탐색 |
| Modifier wheel zoom | modifier를 명시한 desktop 분석 도구 |
| Pinch | 보이는 대안이 있는 touch 탐색 |
| Radial 탐색 | Pie와 Donut에는 적용하지 않음 |

## Domain event 직접 보내기

```ts
controller.dispatch({
  type: 'zoom-axis-view',
  axisID: 'date',
  factor: 1.5,
  anchor: 0.75,
  phase: 'settled',
})
```

Continuous view는 numeric minimum/maximum을 저장합니다. Categorical view는 안정적인 category 순서의 start/end window를 저장합니다. 따라서 pan과 zoom은 resize 뒤나 다른 renderer에서도 의미가 유지되며 mutable pixel transform이 아닙니다.

## 애플리케이션에서 상태 제어하기

Selection, cursor, active datum, 전체 `ChartViewState`를 controlled 값으로 둘 수 있습니다. Controlled event는 command를 발행하고 owner가 요청된 immutable 값을 적용합니다. Vue에서는 `v-model`, `v-model:cursor`, `v-model:active-datum`, `v-model:view`를 사용합니다.

Axis ID가 같은 여러 root에 하나의 controlled `view`를 전달하면 탐색 범위를 동기화할 수 있습니다. 데이터 교체 후 보이는 domain을 유지하려면 `update: 'preserve'`, 새 initial domain으로 돌아가려면 `reset`, 최신 값에 붙은 live time window에는 `follow-end`를 사용합니다.

데이터가 사라지면 Chart는 존재하지 않는 active, cursor, point-selection ID를 정리합니다. 애플리케이션이 소유한 controller는 수명이 끝날 때 dispose합니다.
